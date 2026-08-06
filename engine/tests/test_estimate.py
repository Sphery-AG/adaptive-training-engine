"""Estimate tests: pure logic always runs; DB-backed tests run when the local
MySQL export is reachable and skip cleanly when it isn't (CI without Docker)."""

from __future__ import annotations

import pytest

from app.estimate import effort_habit, estimate_for_member, level_for, recovery_quality
from app.features import MemberFeatures


def _features(**kw) -> MemberFeatures:
    base = dict(
        user_id=1, age=30, gender=None, weight_kg=None, height_cm=None,
        workouts_completed=0, avg_score=None, std_score=None, avg_brain_score=None,
        hr_workouts=0, avg_hr=None, est_max_hr=None, est_rest_hr=None,
        hr_recovery_bpm=None, zone1_share=None, zone2_share=None, zone3_share=None,
        zone4_share=None, zone5_share=None, avg_difficulty=None, avg_hr_target=None,
        avg_duration_s=None,
    )
    base.update(kw)
    return MemberFeatures(**base)


def test_level_boundaries():
    assert level_for(0) == "Building"
    assert level_for(24) == "Building"
    assert level_for(25) == "Developing"
    assert level_for(50) == "Strong"
    assert level_for(75) == "Advanced"
    assert level_for(90) == "Elite"
    assert level_for(100) == "Elite"


def test_recovery_quality_bands():
    assert recovery_quality(None) is None
    assert recovery_quality(7.9) == "slow"
    assert recovery_quality(8) == "steady"
    assert recovery_quality(15) == "quick"


def test_effort_habit_needs_zone_data():
    assert effort_habit(_features()) is None
    hot = _features(zone4_share=0.1, zone5_share=0.5)
    assert "trains hot" in effort_habit(hot)
    pusher = _features(zone4_share=0.3, zone5_share=0.15)
    assert "pushes hard" in effort_habit(pusher)
    moderate = _features(zone4_share=0.1, zone5_share=0.1)
    assert "moderate" in effort_habit(moderate)


# ---------------------------------------------------------------------------
# Integration: real export (skips when MySQL isn't running)
# ---------------------------------------------------------------------------


def _db_available() -> bool:
    try:
        from app.db import _connect

        with _connect():
            return True
    except Exception:
        return False


needs_db = pytest.mark.skipif(not _db_available(), reason="local MySQL export not reachable")


@needs_db
def test_estimate_for_known_member_is_grounded():
    est = estimate_for_member(535)
    assert est.ready
    assert est.workouts_analyzed > 50
    assert est.level in {"Building", "Developing", "Strong", "Advanced", "Elite"}
    assert 0 <= est.percentile <= 100
    assert est.est_max_hr and 150 <= est.est_max_hr <= 220
    assert est.rationale, "every estimate must explain itself"


@needs_db
def test_unknown_member_is_cold_start():
    est = estimate_for_member(99999999)
    assert not est.ready
    assert est.workouts_analyzed == 0
    assert est.rationale
