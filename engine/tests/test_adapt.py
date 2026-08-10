"""Adaptation tests: the evidence ladder and the blast radius of a change."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.adapt import SessionResult, UpdatePlanRequest, apply_update, decide_delta
from app.plangen import build_weeks, planning_estimate
from tests.conftest import request_for
from tests.test_estimate import needs_db


def _plan_for(darmstadt, **kw):
    req = request_for(darmstadt, **kw)
    est = planning_estimate(req)
    weeks, resolved = build_weeks(req, est)
    return {
        "plan": {"weeks": weeks},
        "resolved": resolved,
    }


def _update(darmstadt, session_id="w1-s1", result=None, user_id=None, **kw):
    bundle = _plan_for(darmstadt, **kw)
    return apply_update(
        UpdatePlanRequest(
            spheryUserId=user_id,
            plan=bundle["plan"],
            resolved=bundle["resolved"],
            completedSessionId=session_id,
            result=SessionResult(**result) if result else None,
        )
    )


def test_low_hr_raises_future_difficulty(darmstadt):
    before = _plan_for(darmstadt)
    stimulus = before["plan"]["weeks"][0]["sessions"][0]["stimulusType"]
    base = {
        w["weekNumber"]: [s["difficulty"] for s in w["sessions"] if s["stimulusType"] == stimulus]
        for w in before["plan"]["weeks"]
    }

    out = _update(darmstadt, result={"hrAverage": 90})  # far below any zone band
    assert out["planChanges"], "clear under-target HR must change the plan"
    assert "steps up" in out["summary"]

    after = {
        w["weekNumber"]: [s["difficulty"] for s in w["sessions"] if s["stimulusType"] == stimulus]
        for w in out["plan"]["weeks"]
    }
    # Week 1 (the completed week) is untouched; later non-deload weeks step up.
    assert after[1] == base[1]
    assert all(a == min(10, b + 1) for a, b in zip(after[2], base[2]))
    # Deload weeks are never raised.
    assert after[4] == base[4]


def test_high_hr_eases_plan(darmstadt):
    out = _update(darmstadt, result={"hrAverage": 210})
    assert "easing" in out["summary"] or "lowered" in " ".join(out["planChanges"])


def test_in_zone_holds_plan(darmstadt):
    bundle = _plan_for(darmstadt)
    band = bundle["plan"]["weeks"][0]["sessions"][0]["hrTarget"]["bpm"]
    mid = (band["min"] + band["max"]) // 2
    out = _update(darmstadt, result={"hrAverage": mid})
    assert out["planChanges"] == []
    assert "plan holds" in out["summary"]


def test_perceived_effort_extremes_move_the_plan(darmstadt):
    """1 is too easy so difficulty rises; 5 is too hard so it eases."""
    harder = _update(darmstadt, result={"perceivedEffort": 1})
    assert harder["planChanges"]
    assert "raised" in harder["planChanges"][0]

    easier = _update(darmstadt, result={"perceivedEffort": 5})
    assert easier["planChanges"]
    assert "lowered" in easier["planChanges"][0]


@pytest.mark.parametrize("rating", [2, 3, 4])
def test_perceived_effort_middle_holds(darmstadt, rating):
    """The middle of the scale is the range the plan is built for."""
    out = _update(darmstadt, result={"perceivedEffort": rating})
    assert out["planChanges"] == []
    assert "holds" in out["summary"]


def test_perceived_effort_rejects_out_of_range(darmstadt):
    with pytest.raises(ValidationError):
        _update(darmstadt, result={"perceivedEffort": 6})


def test_no_evidence_no_change(darmstadt):
    out = _update(darmstadt)
    assert out["planChanges"] == []
    assert "Not enough evidence" in out["summary"]


def test_unknown_session_is_a_noop(darmstadt):
    out = _update(darmstadt, session_id="nope-99")
    assert out["planChanges"] == []


def test_difficulty_stays_in_bounds(darmstadt):
    # Even a very fit member (difficulty 8+) never exceeds 10 after updates.
    out = _update(darmstadt, result={"hrAverage": 80}, activity="very_active")
    for w in out["plan"]["weeks"]:
        for s in w["sessions"]:
            assert 1 <= s["difficulty"] <= 10


def test_resolved_view_mirrors_plan_changes(darmstadt):
    out = _update(darmstadt, result={"hrAverage": 90})
    by_id = {
        s["id"]: s["difficulty"] for w in out["plan"]["weeks"] for s in w["sessions"]
    }
    for w in out["resolved"]:
        for rs in w["sessions"]:
            s = rs["session"]
            assert s["difficulty"] == by_id[s["id"]], "resolved and plan disagree"


@needs_db
def test_score_trend_evidence_from_real_member(darmstadt):
    out = _update(darmstadt, user_id=535)
    # Whatever the trend says, it must ground the summary in real numbers.
    assert "scores" in out["summary"] or "Session logged" in out["summary"]
