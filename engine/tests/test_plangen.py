"""Unit tests for plan generation: pure rules, no database.

Each test pins an invariant the product depends on. If one of these breaks,
a member-visible promise broke: block structure, deload easing, focus bias,
honest substitution, circuit shape, zone caps.
"""

from __future__ import annotations

from app.plangen import (
    build_weeks,
    circuit_for,
    generate_plan,
    planning_estimate,
    _base_difficulty,
)
from tests.conftest import request_for


def _plan(gym, **kw):
    req = request_for(gym, **kw)
    est = planning_estimate(req)
    weeks, resolved = build_weeks(req, est)
    return req, est, weeks, resolved


# ---------------------------------------------------------------------------
# Block structure
# ---------------------------------------------------------------------------


def test_block_is_eight_weeks_two_waves(darmstadt):
    _, _, weeks, _ = _plan(darmstadt)
    assert len(weeks) == 8
    assert [w["focus"] for w in weeks] == [
        "Base", "Build", "Build", "Deload", "Build", "Build", "Peak", "Deload + retest",
    ]


def test_sessions_per_week_and_length_honored(darmstadt):
    _, _, weeks, _ = _plan(darmstadt, per_week=4, minutes=30)
    for w in weeks:
        assert len(w["sessions"]) == 4
        for s in w["sessions"]:
            assert s["durationMinutes"] == 30


def test_difficulty_builds_then_deloads(darmstadt):
    _, est, weeks, _ = _plan(darmstadt, activity="active")  # score 66 -> start 6
    start = _base_difficulty(est["fitnessScore"])
    assert weeks[0]["sessions"][0]["difficulty"] == start
    assert weeks[1]["sessions"][0]["difficulty"] == start + 1
    assert weeks[2]["sessions"][0]["difficulty"] == start + 2
    # Deload week drops below the build it follows.
    assert weeks[3]["sessions"][0]["difficulty"] < weeks[2]["sessions"][0]["difficulty"]
    # Wave 2 restarts above wave 1's floor.
    assert weeks[4]["sessions"][0]["difficulty"] > weeks[0]["sessions"][0]["difficulty"]


def test_deload_caps_intensity_zone(darmstadt):
    _, _, weeks, _ = _plan(darmstadt, goal="lose_weight_burn_fat")
    deload = weeks[3]
    for s in deload["sessions"]:
        if s["stimulusType"] == "cardio_intensity":
            assert s["hrTarget"]["zone"] == 2


# ---------------------------------------------------------------------------
# Estimate (cold start) and rationale
# ---------------------------------------------------------------------------


def test_cold_start_estimate_from_activity():
    from tests.conftest import request_for as rf
    from app.plangen import GymIn, StationIn

    gym = GymIn(id="g", name="G", stations=[
        StationIn(id="a", name="A", stimulusTypes=["cardio_endurance", "cardio_intensity", "strength", "mobility_stability", "cognitive_motor", "recovery", "power_speed"]),
    ])
    est = planning_estimate(rf(gym, activity="sedentary"))
    assert est["source"] == "questionnaire_only"
    assert est["fitnessScore"] == 30
    assert est["estimatedHrMax"] == round(208 - 0.7 * 34)  # Tanaka at age 34
    assert est["workoutsAnalyzed"] == 0


def test_current_intensity_refines_cold_start(darmstadt):
    """Same activity level, different typical intensity → different plan.

    Each step of the 1-5 scale is worth 6 points of cold-start fitness score,
    and 3 (moderate) is the same as saying nothing. The score, not the rounded
    difficulty, is what this pins: _base_difficulty rounds half to even, so the
    step it lands on is 1 or 2 depending where the activity level sits.
    """
    _, mid, _, _ = _plan(darmstadt, activity="moderate", intensity=3)
    _, none_given, _, _ = _plan(darmstadt, activity="moderate")
    _, maximal, _, _ = _plan(darmstadt, activity="moderate", intensity=5)
    _, very_light, _, _ = _plan(darmstadt, activity="moderate", intensity=1)

    assert mid["fitnessScore"] == none_given["fitnessScore"] == 54
    assert maximal["fitnessScore"] == 66
    assert very_light["fitnessScore"] == 42
    # It has to actually reach the plan, in the right direction.
    assert (
        _base_difficulty(very_light["fitnessScore"])
        < _base_difficulty(mid["fitnessScore"])
        < _base_difficulty(maximal["fitnessScore"])
    )


def test_focus_bias_leads_rotation(darmstadt):
    # vo_max implies cardio_intensity: it must lead the week even though the
    # goal's default rotation starts with cardio_endurance.
    _, _, weeks, _ = _plan(darmstadt, goal="improve_fitness_endurance", focus=["vo_max"])
    assert weeks[0]["sessions"][0]["stimulusType"] == "cardio_intensity"


def test_plan_rationale_carries_evidence(darmstadt):
    out = generate_plan(request_for(darmstadt, activity="moderate"))
    assert "based on the setup questionnaire" in out["plan"]["rationale"]
    assert "The Sphere Darmstadt" in out["plan"]["rationale"]
    # Every session explains itself.
    for w in out["plan"]["weeks"]:
        for s in w["sessions"]:
            assert s["rationale"]


# ---------------------------------------------------------------------------
# Gym resolution honesty
# ---------------------------------------------------------------------------


def test_substitution_is_flagged_honestly(hotel_gym):
    # Dual Flow needs cognitive_motor; the hotel gym has none.
    _, _, _, resolved = _plan(hotel_gym, goal="train_body_mind")
    subs = [s for w in resolved for s in w["sessions"] if s["substituted"]]
    assert subs, "expected substituted sessions at a gym without cognitive stations"
    for s in subs:
        assert "substituted" in s["session"]["rationale"]


def test_darmstadt_never_substitutes(darmstadt):
    for goal in ["lose_weight_burn_fat", "move_pain_free", "prepare_for_event", "train_body_mind"]:
        _, _, _, resolved = _plan(darmstadt, goal=goal)
        assert not any(s["substituted"] for w in resolved for s in w["sessions"])


# ---------------------------------------------------------------------------
# Circuit resolution
# ---------------------------------------------------------------------------


def _first_session(gym, **kw):
    req, _, weeks, _ = _plan(gym, **kw)
    return req, weeks[0]["sessions"][0]


def test_circuit_minutes_sum_to_session(darmstadt):
    req, session = _first_session(darmstadt, minutes=45)
    legs = circuit_for(req.answers.goal, req.gym, session)
    assert sum(l["minutes"] for l in legs) == 45
    # 45-minute session gets 5-minute bookends.
    assert legs[0]["minutes"] == 5 and legs[-1]["minutes"] == 5


def test_short_session_gets_short_bookends(darmstadt):
    req, session = _first_session(darmstadt, minutes=20)
    legs = circuit_for(req.answers.goal, req.gym, session)
    assert legs[0]["minutes"] == 3 and legs[-1]["minutes"] == 3
    assert sum(l["minutes"] for l in legs) == 20


def test_no_station_back_to_back_in_work_block(darmstadt):
    for goal in ["lose_weight_burn_fat", "build_strength_muscle", "prepare_for_event"]:
        req, session = _first_session(darmstadt, goal=goal)
        legs = circuit_for(goal, req.gym, session)
        work = legs[1:-1]
        for a, b in zip(work, work[1:]):
            assert a["stationId"] != b["stationId"], f"{goal}: {a['stationName']} twice in a row"


def test_bookend_station_stays_out_of_the_work_block(darmstadt):
    """You warm up and cool down on one station; the work block uses others.

    Berlin used to open, repeat, and close on the same erg because the bookend
    was chosen after the work legs and nothing reserved it.
    """
    for goal in ["improve_fitness_endurance", "lose_weight_burn_fat", "build_strength_muscle"]:
        req, session = _first_session(darmstadt, goal=goal)
        legs = circuit_for(goal, req.gym, session)
        assert legs[0]["stationId"] == legs[-1]["stationId"], "bookends should match each other"
        work_ids = [l["stationId"] for l in legs[1:-1]]
        assert legs[0]["stationId"] not in work_ids, f"{goal}: bookend reused in the work block"
        # A floor this size can give every work leg its own station.
        assert len(set(work_ids)) == len(work_ids), f"{goal}: repeat in the work block"


def test_mid_size_floor_spreads_repeats_instead_of_hammering_one_station(berlin):
    """When stations must repeat, reuse the one used longest ago.

    Ranking alone sent every repeat to the single top-ranked station, so this
    floor ran the same Run on three of five work legs.
    """
    req, session = _first_session(berlin, goal="improve_fitness_endurance")
    work = [l["stationId"] for l in circuit_for("improve_fitness_endurance", req.gym, session)[1:-1]]
    most_used = max(work.count(sid) for sid in set(work))
    assert most_used <= 2, f"one station took {most_used} of {len(work)} legs: {work}"


def test_tiny_floor_keeps_the_bookend_available_to_the_work_block(hotel_gym):
    """A gym that cannot spare a station must not have one held back.

    Reserving the bookend unconditionally cost this floor its bike and pushed
    the treadmill onto 4 of 5 work legs.
    """
    req, session = _first_session(hotel_gym, goal="improve_fitness_endurance")
    legs = circuit_for("improve_fitness_endurance", req.gym, session)
    work = [l["stationId"] for l in legs[1:-1]]
    most_used = max(work.count(sid) for sid in set(work))
    assert most_used <= 3, f"one station took {most_used} of {len(work)} legs: {work}"


def test_leg_zones_never_exceed_session_zone(darmstadt):
    req, session = _first_session(darmstadt, goal="move_pain_free")
    legs = circuit_for("move_pain_free", req.gym, session)
    for leg in legs[1:-1]:
        assert leg["targetZone"] <= max(session["hrTarget"]["zone"], 1)


def test_balance_first_station_capped_at_zone_two(darmstadt):
    # Foundation circuit prefers ICAROS; ICAROS can't drive HR, so its legs
    # must be zone <= 2 no matter what.
    req, session = _first_session(darmstadt, goal="move_pain_free")
    legs = circuit_for("move_pain_free", req.gym, session)
    icaros = [l for l in legs if l["stationId"] == "icaros"]
    assert icaros, "Foundation circuit should use ICAROS on the Darmstadt floor"
    for leg in icaros:
        assert leg["targetZone"] <= 2


def test_race_prep_prefers_race_stations(darmstadt):
    req, session = _first_session(darmstadt, goal="prepare_for_event", minutes=45)
    legs = circuit_for("prepare_for_event", req.gym, session)
    work_ids = {l["stationId"] for l in legs[1:-1]}
    race = {"runner", "ski-erg", "row-erg", "sled-push", "sled-pull", "wall-balls", "sandbag-lunges", "farmers-carry", "burpees"}
    assert work_ids <= race, f"non-race stations in Race Prep work block: {work_ids - race}"


def test_cooldown_returns_to_zone_one(darmstadt):
    req, session = _first_session(darmstadt)
    legs = circuit_for(req.answers.goal, req.gym, session)
    assert legs[-1]["targetZone"] == 1
