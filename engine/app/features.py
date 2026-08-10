"""Turn a member's raw ExerCube history into one flat feature row.

This is the input side of the ML step. Nothing here trains or predicts. It
reads a member's past workouts from the static Sphery export and reduces them
to a fixed set of numbers that describe the member's current fitness state:
how hard they train, how they score, how their heart responds and recovers.

Design notes grounded in the real export (profiled Jul 2026), not assumptions:
- `Workouts.score` is the performance metric with real variance (avg ~197k,
  max ~1.4M). `bodyScore` and `brainScore` are 0-1 ratios, not 0-100 scores
  (14,654 of 14,667 completed workouts sit at or below 2). `brainScore` carries
  real signal inside that range: user 535 moves 0.67 -> 0.93 across 108
  sessions. `bodyScore` has a strong ceiling effect (0.96-0.99 for the same
  member), so it is weak as a movement-quality signal on its own
  so we never use it.
- `Workouts.hrAverage` is only populated on ~10% of workouts (~2,009 rows), so
  every HR feature is nullable and we record how many HR workouts backed it.
- `HealthData.hrRestingPulse` and `HealthData.hrMax` are always NULL, so we
  estimate: max HR from observed workout maxima (Tanaka 208 - 0.7*age as the
  cold-start prior), resting HR from the lowest sustained HR in HrStats.
- `RaceConfigs.hrTarget` is a fraction of max HR (0.5-1.0), not bpm.
- Age is always computed from dob (the `age` column is unused).

The output row is deliberately model-agnostic: the same features feed whatever
label we train on next (score response, HR response, or archetype cluster).
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Optional

from .db import _age_from_dob, _connect


def _tanaka_max_hr(age: Optional[int]) -> Optional[float]:
    """Cold-start prior for max HR when we have no observed maximum."""
    if age is None:
        return None
    return 208.0 - 0.7 * age


@dataclass
class MemberFeatures:
    """One flat row describing a member's current training state.

    Every field traces to a real column or a documented estimate. HR fields are
    Optional because most workouts carry no HR; `hr_workouts` says how much
    evidence backs them so a model (or a human) can down-weight thin data.
    """

    user_id: int

    # --- who they are (HealthData) ---
    age: Optional[int]
    gender: Optional[str]
    weight_kg: Optional[int]
    height_cm: Optional[int]

    # --- how much history we have (Workouts, completed only) ---
    workouts_completed: int

    # --- how they perform (Workouts.score, zeros excluded as no-shows) ---
    avg_score: Optional[float]
    std_score: Optional[float]
    avg_brain_score: Optional[float]

    # --- how their heart responds (Workouts.hrAverage where present) ---
    hr_workouts: int
    avg_hr: Optional[float]
    est_max_hr: Optional[float]
    est_rest_hr: Optional[float]
    hr_recovery_bpm: Optional[float]  # avg bpm drop during a pause (HrStats)

    # --- how they spend effort across HR zones (timeInTier1..5 as shares) ---
    zone1_share: Optional[float]
    zone2_share: Optional[float]
    zone3_share: Optional[float]
    zone4_share: Optional[float]
    zone5_share: Optional[float]

    # --- what they've been prescribed (RaceConfigs) ---
    avg_difficulty: Optional[float]
    avg_hr_target: Optional[float]  # fraction of max HR (0.5-1.0)
    avg_duration_s: Optional[float]

    def to_row(self) -> dict:
        """Flat dict for a dataframe / model input."""
        return asdict(self)

    def pretty(self) -> str:
        def fmt(v: object) -> str:
            if v is None:
                return "  --"
            if isinstance(v, float):
                return f"{v:,.2f}"
            return str(v)

        lines = [
            f"Member {self.user_id}",
            "  who:      "
            f"age={fmt(self.age)}  gender={fmt(self.gender)}  "
            f"weight={fmt(self.weight_kg)}kg  height={fmt(self.height_cm)}cm",
            f"  history:  {self.workouts_completed} completed workouts, "
            f"{self.hr_workouts} with HR",
            "  perform:  "
            f"avg_score={fmt(self.avg_score)}  std={fmt(self.std_score)}  "
            f"brain={fmt(self.avg_brain_score)}",
            "  heart:    "
            f"avg_hr={fmt(self.avg_hr)}  est_max={fmt(self.est_max_hr)}  "
            f"est_rest={fmt(self.est_rest_hr)}  recovery={fmt(self.hr_recovery_bpm)}bpm",
            "  zones:    "
            f"z1={fmt(self.zone1_share)} z2={fmt(self.zone2_share)} "
            f"z3={fmt(self.zone3_share)} z4={fmt(self.zone4_share)} "
            f"z5={fmt(self.zone5_share)}",
            "  prescribed: "
            f"difficulty={fmt(self.avg_difficulty)}  "
            f"hr_target={fmt(self.avg_hr_target)}  "
            f"duration={fmt(self.avg_duration_s)}s",
        ]
        return "\n".join(lines)


def get_member_features(user_id: int) -> MemberFeatures:
    """Reduce a member's whole ExerCube history to one feature row."""
    with _connect() as conn, conn.cursor() as cur:
        # Who they are. dob drives age; the age column is intentionally unused.
        cur.execute(
            "SELECT dob, gender, weight, height FROM HealthData WHERE userId = %s LIMIT 1",
            (user_id,),
        )
        health = cur.fetchone() or {}
        age = _age_from_dob(health.get("dob"))

        # Performance + zone time from completed workouts. score=0 rows are
        # started-but-not-really-played sessions, so we exclude them from the
        # score average (NULLIF) but still count zone time from all completed.
        cur.execute(
            """
            SELECT
                COUNT(*)                                   AS n_completed,
                AVG(NULLIF(score, 0))                      AS avg_score,
                STDDEV(NULLIF(score, 0))                   AS std_score,
                AVG(NULLIF(brainScore, 0))                 AS avg_brain,
                AVG(timeInTier1)                           AS z1,
                AVG(timeInTier2)                           AS z2,
                AVG(timeInTier3)                           AS z3,
                AVG(timeInTier4)                           AS z4,
                AVG(timeInTier5)                           AS z5
            FROM Workouts
            WHERE userId = %s AND completedWorkout = 1
            """,
            (user_id,),
        )
        perf = cur.fetchone() or {}

        # Heart response, only from workouts that actually tracked HR.
        cur.execute(
            """
            SELECT
                COUNT(*)      AS n_hr,
                AVG(hrAverage) AS avg_hr,
                MAX(hrMax)     AS obs_max_hr
            FROM Workouts
            WHERE userId = %s AND completedWorkout = 1 AND hrAverage > 0
            """,
            (user_id,),
        )
        hr = cur.fetchone() or {}

        # Resting HR proxy: the lowest round-minimum HR the member ever held.
        # hrMin is 0 on rows where the belt dropped out, so we floor at 30 bpm
        # before taking the minimum, otherwise every sensor gap reads as resting.
        cur.execute(
            "SELECT MIN(hrMin) AS floor_hr FROM HrStats WHERE userId = %s AND hrMin >= 30",
            (user_id,),
        )
        rest = cur.fetchone() or {}

        # Recovery: how far HR falls during a pause (start minus end). Only rows
        # with both pause readings present and a real drop count.
        cur.execute(
            """
            SELECT AVG(pauseStartHR - pauseEndHR) AS recovery
            FROM HrStats
            WHERE userId = %s
              AND pauseStartHR > 0 AND pauseEndHR > 0
              AND pauseStartHR >= pauseEndHR
            """,
            (user_id,),
        )
        rec = cur.fetchone() or {}

        # What they've been prescribed, across their configs.
        cur.execute(
            """
            SELECT
                AVG(r.difficulty) AS avg_diff,
                AVG(NULLIF(r.hrTarget, 0)) AS avg_hrt,
                AVG(NULLIF(r.duration, 0)) AS avg_dur
            FROM RaceConfigs r
            JOIN Workouts w ON w.id = r.workoutId
            WHERE w.userId = %s AND w.completedWorkout = 1
            """,
            (user_id,),
        )
        cfg = cur.fetchone() or {}

    # Estimate max HR: observed maximum wins; Tanaka fills the cold start.
    obs_max = hr.get("obs_max_hr")
    est_max_hr = float(obs_max) if obs_max else _tanaka_max_hr(age)

    # Resting HR floor (already guarded >= 30 in SQL).
    floor_hr = rest.get("floor_hr")
    est_rest_hr = float(floor_hr) if floor_hr else None

    # Zone shares: normalize the five tier-time averages to fractions of total.
    zones = [perf.get(f"z{i}") or 0.0 for i in range(1, 6)]
    total_zone = sum(zones)
    if total_zone > 0:
        z1, z2, z3, z4, z5 = (z / total_zone for z in zones)
    else:
        z1 = z2 = z3 = z4 = z5 = None

    def as_float(v: object) -> Optional[float]:
        return float(v) if v is not None else None

    return MemberFeatures(
        user_id=user_id,
        age=age,
        gender=health.get("gender"),
        weight_kg=health.get("weight"),
        height_cm=health.get("height"),
        workouts_completed=int(perf.get("n_completed") or 0),
        avg_score=as_float(perf.get("avg_score")),
        std_score=as_float(perf.get("std_score")),
        avg_brain_score=as_float(perf.get("avg_brain")),
        hr_workouts=int(hr.get("n_hr") or 0),
        avg_hr=as_float(hr.get("avg_hr")),
        est_max_hr=est_max_hr,
        est_rest_hr=est_rest_hr,
        hr_recovery_bpm=as_float(rec.get("recovery")),
        zone1_share=z1,
        zone2_share=z2,
        zone3_share=z3,
        zone4_share=z4,
        zone5_share=z5,
        avg_difficulty=as_float(cfg.get("avg_diff")),
        avg_hr_target=as_float(cfg.get("avg_hrt")),
        avg_duration_s=as_float(cfg.get("avg_dur")),
    )


if __name__ == "__main__":
    import sys

    uid = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    print(get_member_features(uid).pretty())
