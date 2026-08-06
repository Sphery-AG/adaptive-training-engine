"""Adaptive updates: a completed session -> an adjusted plan, with the reason.

The rules ladder, most direct evidence first:

1. Heart rate from the completed session (result.hrAverage) against the
   session's prescribed bpm band: clearly under -> the member absorbed the
   work, raise difficulty; clearly over -> ease off.
2. Perceived effort, when the app sends it ("easy" | "right" | "hard").
3. Score trend from the member's real history (static export): the average
   of their most recent completed scores against their long-run average.
   Improving -> nudge up; declining -> ease.

Whatever fires, the change is small (one difficulty step), scoped (only
future sessions of the same stimulus, never past ones), respectful of
deloads (never raised), and always explained in plain language.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from .db import _connect

# Evidence thresholds. HR: how far outside the prescribed band (bpm) counts
# as clear signal. Trend: fractional change in recent vs long-run score.
HR_SLACK_BPM = 5
TREND_UP = 1.10
TREND_DOWN = 0.75
RECENT_WINDOW = 5


class SessionResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    hr_average: Optional[float] = Field(default=None, alias="hrAverage")
    perceived_effort: Optional[str] = Field(default=None, alias="perceivedEffort")
    score: Optional[float] = None


class UpdatePlanRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    sphery_user_id: Optional[int] = Field(default=None, alias="spheryUserId")
    plan: dict
    resolved: list = Field(default_factory=list)
    completed_session_id: str = Field(alias="completedSessionId")
    result: Optional[SessionResult] = None


def _find_session(plan: dict, session_id: str) -> Optional[tuple[int, dict]]:
    for w_idx, week in enumerate(plan.get("weeks", [])):
        for s in week.get("sessions", []):
            if s.get("id") == session_id:
                return w_idx, s
    return None


def score_trend(user_id: int) -> Optional[tuple[float, float]]:
    """(recent_avg, overall_avg) of completed scores; None without history."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT NULLIF(score, 0) AS s FROM Workouts
            WHERE userId = %s AND completedWorkout = 1 AND score > 0
            ORDER BY id DESC
            """,
            (user_id,),
        )
        scores = [float(r["s"]) for r in cur.fetchall() if r["s"] is not None]
    if len(scores) < RECENT_WINDOW * 2:
        return None
    recent = sum(scores[:RECENT_WINDOW]) / RECENT_WINDOW
    overall = sum(scores) / len(scores)
    return recent, overall


def decide_delta(req: UpdatePlanRequest, session: dict) -> tuple[int, str]:
    """(difficulty delta, why) from the strongest available evidence."""
    band = session["hrTarget"]["bpm"]
    r = req.result

    if r and r.hr_average is not None:
        if r.hr_average < band["min"] - HR_SLACK_BPM:
            return 1, (
                f"Average heart rate {round(r.hr_average)} bpm stayed below the "
                f"target zone ({band['min']}–{band['max']} bpm) — the work has "
                "gotten comfortable, so difficulty steps up."
            )
        if r.hr_average > band["max"] + HR_SLACK_BPM:
            return -1, (
                f"Average heart rate {round(r.hr_average)} bpm ran above the "
                f"target zone ({band['min']}–{band['max']} bpm) — easing the "
                "next sessions so you can hold the zone."
            )
        return 0, (
            f"Average heart rate {round(r.hr_average)} bpm sat inside the "
            f"target zone ({band['min']}–{band['max']} bpm) — the plan holds."
        )

    if r and r.perceived_effort in {"easy", "right", "hard"}:
        if r.perceived_effort == "easy":
            return 1, "You rated the session easy — difficulty steps up one notch."
        if r.perceived_effort == "hard":
            return -1, "You rated the session hard — easing the next ones a notch."
        return 0, "You rated the effort about right — the plan holds."

    if req.sphery_user_id is not None:
        trend = score_trend(req.sphery_user_id)
        if trend:
            recent, overall = trend
            if recent >= overall * TREND_UP:
                return 1, (
                    f"Your recent scores (avg {round(recent):,}) are running "
                    f"{round((recent / overall - 1) * 100)}% above your long-run "
                    f"average ({round(overall):,}) — you've outgrown this "
                    "difficulty, so it steps up."
                )
            if recent <= overall * TREND_DOWN:
                return -1, (
                    f"Your recent scores (avg {round(recent):,}) are well below "
                    f"your long-run average ({round(overall):,}) — easing the "
                    "next sessions to rebuild momentum."
                )
            return 0, (
                f"Your recent scores (avg {round(recent):,}) track your long-run "
                f"average ({round(overall):,}) — the plan holds."
            )

    return 0, "Session logged. Not enough evidence to adjust yet — the plan holds."


def apply_update(req: UpdatePlanRequest) -> dict:
    found = _find_session(req.plan, req.completed_session_id)
    if not found:
        return {
            "plan": req.plan,
            "resolved": req.resolved,
            "planChanges": [],
            "summary": "Session logged.",
        }
    week_idx, session = found
    delta, why = decide_delta(req, session)

    plan_changes: list[str] = []
    changed = 0
    if delta != 0:
        stimulus = session["stimulusType"]
        # Record target values by session id, then assign. Assignment (not a
        # second increment) keeps this correct whether plan and resolved share
        # session objects (in-process) or arrived as separate JSON (HTTP).
        new_difficulty: dict[str, int] = {}
        for later_idx, week in enumerate(req.plan.get("weeks", [])):
            if later_idx <= week_idx:
                continue
            is_deload = "Deload" in (week.get("focus") or "")
            if delta > 0 and is_deload:
                continue  # deloads stay easy, that's their job
            for s in week.get("sessions", []):
                if s.get("stimulusType") != stimulus:
                    continue
                new = max(1, min(10, s["difficulty"] + delta))
                if new != s["difficulty"]:
                    new_difficulty[s["id"]] = new
                    changed += 1
        for week in req.plan.get("weeks", []):
            for s in week.get("sessions", []):
                if s["id"] in new_difficulty:
                    s["difficulty"] = new_difficulty[s["id"]]
        for week in req.resolved:
            for rs in week.get("sessions", []):
                s = rs.get("session", {})
                if s.get("id") in new_difficulty:
                    s["difficulty"] = new_difficulty[s["id"]]

        if changed:
            direction = "raised" if delta > 0 else "lowered"
            label = stimulus.replace("_", " ")
            plan_changes.append(
                f"Difficulty {direction} on {changed} upcoming {label} "
                f"session{'s' if changed != 1 else ''}."
            )

    return {
        "plan": req.plan,
        "resolved": req.resolved,
        "planChanges": plan_changes,
        "summary": why,
    }
