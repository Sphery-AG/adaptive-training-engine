"""Fitness estimate: a member's history -> one explainable state snapshot.

Promoted from _explore_estimate.py (Aug 6). This is the "ML estimates state"
half of the architecture: features come from features.py, and this module
turns them into a fitness level the rules engine and the app can use.

The estimate is population-grounded, not absolute: a member's average score is
placed among all members with real history (15+ completed workouts) and the
percentile drives the level label. Every number carries its evidence
(workouts analyzed, HR-tracked workouts) and a plain-language rationale, per
the project rule that every output explains itself.

The export is static, so the population score distribution is computed once
per process (lru_cache) instead of per request.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from functools import lru_cache
from typing import Optional

from .db import _connect
from .features import MemberFeatures, get_member_features

# Members need this much history before they anchor the population curve.
POPULATION_MIN_WORKOUTS = 15

LEVELS = [
    (90, "Elite"),
    (75, "Advanced"),
    (50, "Strong"),
    (25, "Developing"),
    (0, "Building"),
]


@lru_cache(maxsize=1)
def population_scores(min_workouts: int = POPULATION_MIN_WORKOUTS) -> tuple[float, ...]:
    """Average score per member, for everyone with enough completed workouts."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT AVG(NULLIF(score, 0)) AS s
            FROM Workouts WHERE completedWorkout = 1
            GROUP BY userId HAVING COUNT(*) >= %s
            """,
            (min_workouts,),
        )
        return tuple(float(r["s"]) for r in cur.fetchall() if r["s"] is not None)


def percentile_of(avg_score: float) -> tuple[int, int]:
    scores = population_scores()
    below = sum(1 for s in scores if s < avg_score)
    return round(100 * below / len(scores)), len(scores)


def level_for(pct: int) -> str:
    for cutoff, label in LEVELS:
        if pct >= cutoff:
            return label
    return LEVELS[-1][1]


def effort_habit(f: MemberFeatures) -> Optional[str]:
    """How the member habitually spends their heart-rate budget."""
    if f.zone5_share is None:
        return None
    hard = f.zone5_share + (f.zone4_share or 0)
    if f.zone5_share >= 0.45:
        return f"trains hot: {round(f.zone5_share * 100)}% of time at max effort"
    if hard >= 0.4:
        return f"pushes hard: {round(hard * 100)}% of time at high intensity"
    return "keeps most work in the moderate zones"


def recovery_quality(rec: Optional[float]) -> Optional[str]:
    if rec is None:
        return None
    if rec >= 15:
        return "quick"
    if rec >= 8:
        return "steady"
    return "slow"


@dataclass
class FitnessEstimate:
    """What the app shows on the Progress tab, with the evidence attached."""

    user_id: int
    ready: bool  # False = cold start, questionnaire must carry the plan

    # The headline.
    level: Optional[str] = None
    percentile: Optional[int] = None  # fitter than this % of regulars
    population_n: int = 0

    # Evidence behind it.
    workouts_analyzed: int = 0
    hr_workouts: int = 0
    avg_score: Optional[float] = None
    score_swing: Optional[float] = None
    avg_brain_score: Optional[float] = None

    # Heart profile (estimates documented in features.py).
    est_rest_hr: Optional[float] = None
    est_max_hr: Optional[float] = None
    max_hr_source: Optional[str] = None  # "observed" | "tanaka" | None
    hr_recovery_bpm: Optional[float] = None
    recovery_quality: Optional[str] = None

    # Habits.
    effort_habit: Optional[str] = None
    zone_shares: Optional[list[float]] = None  # z1..z5 fractions

    # Every estimate explains itself.
    rationale: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


def estimate_for_member(user_id: int) -> FitnessEstimate:
    f = get_member_features(user_id)

    if not f.avg_score or f.workouts_completed < 3:
        return FitnessEstimate(
            user_id=user_id,
            ready=False,
            workouts_analyzed=f.workouts_completed,
            rationale=[
                f"Only {f.workouts_completed} completed workouts on record; "
                "at least 3 with scores are needed before history can drive the plan. "
                "The questionnaire carries the first plan instead."
            ],
        )

    pct, n = percentile_of(f.avg_score)
    level = level_for(pct)

    obs_max = f.est_max_hr is not None and f.hr_workouts > 0
    rationale = [
        f"Level {level}: average score {round(f.avg_score):,} across "
        f"{f.workouts_completed} completed sessions places this member above "
        f"{pct}% of the {n} members with regular training history.",
    ]
    if f.est_max_hr is not None:
        rationale.append(
            f"Max HR ~{round(f.est_max_hr)} bpm "
            + (
                f"observed across {f.hr_workouts} HR-tracked workouts."
                if obs_max
                else "estimated from age (Tanaka), no HR-tracked workouts yet."
            )
        )
    if f.est_rest_hr is not None:
        rationale.append(
            f"Resting HR ~{round(f.est_rest_hr)} bpm, the lowest sustained "
            "heart rate held in past sessions."
        )
    if f.hr_recovery_bpm is not None:
        rationale.append(
            f"Heart rate drops {round(f.hr_recovery_bpm)} bpm during pauses "
            f"({recovery_quality(f.hr_recovery_bpm)} recovery)."
        )
    habit = effort_habit(f)
    if habit:
        rationale.append(f"Effort habit: {habit}.")

    zones = None
    if f.zone1_share is not None:
        zones = [
            round(z, 4)
            for z in (f.zone1_share, f.zone2_share, f.zone3_share, f.zone4_share, f.zone5_share)
        ]

    return FitnessEstimate(
        user_id=user_id,
        ready=True,
        level=level,
        percentile=pct,
        population_n=n,
        workouts_analyzed=f.workouts_completed,
        hr_workouts=f.hr_workouts,
        avg_score=round(f.avg_score, 1),
        score_swing=round(f.std_score, 1) if f.std_score else None,
        avg_brain_score=round(f.avg_brain_score, 1) if f.avg_brain_score else None,
        est_rest_hr=round(f.est_rest_hr, 1) if f.est_rest_hr else None,
        est_max_hr=round(f.est_max_hr, 1) if f.est_max_hr else None,
        max_hr_source=("observed" if obs_max else "tanaka") if f.est_max_hr else None,
        hr_recovery_bpm=round(f.hr_recovery_bpm, 1) if f.hr_recovery_bpm else None,
        recovery_quality=recovery_quality(f.hr_recovery_bpm),
        effort_habit=habit,
        zone_shares=zones,
        rationale=rationale,
    )
