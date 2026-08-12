"""Plan generation: fitness estimate + questionnaire + gym -> an 8-week plan.

Ported from the web stub (web/lib/stub/engine.ts) on Aug 6 so that ALL
generation logic lives in the engine, per the architecture. The web app now
POSTs {sphery_user_id?, answers, gym} and renders what comes back; the stub
remains only as the offline fallback for the Vercel demo.

Rules carried over 1:1 (validated against the stub in the browser):
- Estimate: real history via estimate.py when a sphery_user_id is given and
  ready; otherwise the questionnaire cold start (activity level -> score,
  Tanaka max HR).
- Weeks: fixed 8-week block as two 4-week waves; build 3, deload on the 4th;
  final week is the retest. Difficulty starts at fitnessScore/12 (1..8) and
  steps up within a wave.
- Sessions: the goal's stimulus rotation, biased by chosen focus; zone per
  stimulus; deload caps intensity; every session carries a rationale.
- Circuits: per-goal templates resolved onto the gym's stations (preferred
  stations first, then Sphery equipment, no repeats while others are free,
  balance-first stations capped at zone 2), warmup/cooldown bookends.

The gym comes in the request (equipment-agnostic: same engine for Darmstadt,
a hotel gym, or a HYROX box). Field names in responses are camelCase to match
the web's types exactly.
"""

from __future__ import annotations

from datetime import datetime, timezone
from math import floor
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from .estimate import estimate_for_member

StimulusType = Literal[
    "cardio_endurance",
    "cardio_intensity",
    "cognitive_motor",
    "recovery",
    "strength",
    "mobility_stability",
    "power_speed",
]

# ---------------------------------------------------------------------------
# Request models (what the web POSTs)
# ---------------------------------------------------------------------------


class StationIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    name: str
    stimulus_types: list[StimulusType] = Field(alias="stimulusTypes")
    is_sphery: bool = Field(default=False, alias="isSpheryEquipment")


class GymIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    name: str
    stations: list[StationIn]


class AnswersIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    age: int
    goal: str
    focus: list[str] = Field(default_factory=list)
    activity_level: str = Field(default="moderate", alias="activityLevel")
    sessions_per_week: int = Field(default=3, alias="sessionsPerWeek")
    session_length_minutes: int = Field(default=30, alias="sessionLengthMinutes")
    # How hard the member already trains, 1 (very light) to 5 (maximal).
    # Refines the cold-start estimate only. See INTENSITY_STEP.
    current_intensity: Optional[int] = Field(default=None, alias="currentIntensity", ge=1, le=5)


class GeneratePlanRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    sphery_user_id: Optional[int] = Field(default=None, alias="spheryUserId")
    member_name: str = Field(default="you", alias="memberName")
    answers: AnswersIn
    gym: GymIn


# ---------------------------------------------------------------------------
# Rules data (ported verbatim from the stub)
# ---------------------------------------------------------------------------

GOAL_STIMULI: dict[str, list[StimulusType]] = {
    "lose_weight_burn_fat": ["cardio_intensity", "cardio_endurance", "strength", "cardio_intensity"],
    "build_strength_muscle": ["strength", "strength", "power_speed", "cardio_intensity"],
    "improve_fitness_endurance": ["cardio_endurance", "cardio_intensity", "cardio_endurance", "cognitive_motor"],
    "move_pain_free": ["mobility_stability", "recovery", "mobility_stability", "cardio_endurance"],
    "boost_health_longevity": ["cardio_endurance", "strength", "mobility_stability", "recovery"],
    "improve_sports_performance": ["power_speed", "cognitive_motor", "cardio_intensity", "strength"],
    "prepare_for_event": ["cardio_intensity", "cardio_endurance", "strength", "cardio_intensity"],
    "train_body_mind": ["cognitive_motor", "cardio_intensity", "cognitive_motor", "recovery"],
}

ZONE_FOR_STIMULUS: dict[StimulusType, int] = {
    "cardio_endurance": 3,
    "cardio_intensity": 4,
    "cognitive_motor": 3,
    "recovery": 1,
    "strength": 3,
    "mobility_stability": 1,
    "power_speed": 4,
}

ZONE_FRACTION = {1: 0.5, 2: 0.6, 3: 0.7, 4: 0.82, 5: 0.9}

STIMULUS_LABELS: dict[StimulusType, str] = {
    "cardio_endurance": "Cardio · Endurance",
    "cardio_intensity": "Cardio · Intensity",
    "cognitive_motor": "Dual-Task · Brain + Body",
    "recovery": "Active Recovery",
    "strength": "Strength",
    "mobility_stability": "Mobility & Stability",
    "power_speed": "Power & Speed",
}

GOAL_TITLES: dict[str, str] = {
    "lose_weight_burn_fat": "Lose Weight & Burn Fat",
    "build_strength_muscle": "Build Strength & Muscle",
    "improve_fitness_endurance": "Improve Fitness & Endurance",
    "move_pain_free": "Move Pain-Free",
    "boost_health_longevity": "Boost Health & Longevity",
    "improve_sports_performance": "Improve Sports Performance",
    "prepare_for_event": "Prepare for an Event",
    "train_body_mind": "Train Body & Mind",
}

CIRCUIT_TEMPLATES: dict[str, list[StimulusType]] = {
    "lose_weight_burn_fat": ["cardio_intensity", "strength", "cardio_endurance", "cardio_intensity", "strength"],
    "build_strength_muscle": ["strength", "power_speed", "strength", "cardio_intensity", "strength"],
    "improve_fitness_endurance": ["cardio_endurance", "cardio_intensity", "cardio_endurance", "cognitive_motor", "cardio_endurance"],
    "move_pain_free": ["mobility_stability", "cardio_endurance", "mobility_stability", "recovery", "mobility_stability"],
    "boost_health_longevity": ["cardio_endurance", "strength", "mobility_stability", "cognitive_motor", "recovery"],
    "improve_sports_performance": ["power_speed", "cognitive_motor", "strength", "cardio_intensity", "power_speed"],
    # HYROX-style "compromised running": station work under aerobic fatigue.
    "prepare_for_event": ["cardio_intensity", "strength", "cardio_intensity", "power_speed", "strength"],
    "train_body_mind": ["cognitive_motor", "cardio_intensity", "cognitive_motor", "mobility_stability", "cardio_endurance"],
}

CIRCUIT_PREFERRED_STATIONS: dict[str, list[str]] = {
    "prepare_for_event": ["runner", "ski-erg", "row-erg", "sled-push", "sled-pull", "wall-balls", "sandbag-lunges", "farmers-carry", "burpees"],
    "move_pain_free": ["icaros", "leg-press", "cable-pulls", "tidal-tank", "bike"],
}

CIRCUIT_NAMES: dict[str, str] = {
    "lose_weight_burn_fat": "Burn Circuit",
    "build_strength_muscle": "Strength Circuit",
    "improve_fitness_endurance": "Engine Circuit",
    "move_pain_free": "Foundation Circuit",
    "boost_health_longevity": "Longevity Circuit",
    "improve_sports_performance": "Performance Circuit",
    "prepare_for_event": "Race Prep Circuit",
    "train_body_mind": "Dual Flow Circuit",
}

# Focus id -> the stimulus it implies (ported from web/lib/intake/model.ts).
FOCUS_STIMULUS: dict[str, StimulusType] = {
    "maximum_fat_loss": "cardio_intensity",
    "sustainable_weight_loss": "cardio_endurance",
    "improve_metabolism": "cardio_intensity",
    "increase_daily_activity": "cardio_endurance",
    "tone_shape_body": "strength",
    "improve_body_composition": "strength",
    "muscle_growth_hypertrophy": "strength",
    "functional_strength": "strength",
    "full_body_strength": "strength",
    "upper_body": "strength",
    "lower_body": "strength",
    "core_strength": "mobility_stability",
    "explosive_strength": "power_speed",
    "maximum_strength": "strength",
    "cardiovascular_fitness": "cardio_endurance",
    "vo_max": "cardio_intensity",
    "functional_fitness": "cardio_endurance",
    "stamina": "cardio_endurance",
    "interval_fitness": "cardio_intensity",
    "general_conditioning": "cardio_endurance",
    "muscular_endurance": "strength",
    "lower_back": "mobility_stability",
    "neck_shoulders": "mobility_stability",
    "knee_stability": "mobility_stability",
    "hip_mobility": "mobility_stability",
    "better_posture": "mobility_stability",
    "balance": "mobility_stability",
    "injury_prevention": "mobility_stability",
    "return_to_sport": "cardio_endurance",
    "joint_mobility": "mobility_stability",
    "healthy_aging": "cardio_endurance",
    "brain_health": "cognitive_motor",
    "heart_health": "cardio_endurance",
    "bone_health": "strength",
    "mobility": "mobility_stability",
    "stress_reduction": "recovery",
    "better_sleep": "recovery",
    "energy_vitality": "cardio_endurance",
    "metabolic_health": "cardio_intensity",
    "speed": "power_speed",
    "agility": "power_speed",
    "acceleration": "power_speed",
    "reaction_speed": "cognitive_motor",
    "coordination": "cognitive_motor",
    "power": "power_speed",
    "jump_performance": "power_speed",
    "change_of_direction": "power_speed",
    "sport_specific_conditioning": "cardio_intensity",
    "hyrox": "cardio_intensity",
    "marathon": "cardio_endurance",
    "half_marathon": "cardio_endurance",
    "triathlon": "cardio_endurance",
    "cycling": "cardio_endurance",
    "football_season": "power_speed",
    "tennis_season": "cognitive_motor",
    "ski_season": "power_speed",
    "hiking": "cardio_endurance",
    "ocr_spartan_race": "cardio_intensity",
    "reaction_time": "cognitive_motor",
    "focus": "cognitive_motor",
    "decision_making": "cognitive_motor",
    "dual_task_performance": "cognitive_motor",
    "cognitive_endurance": "cognitive_motor",
    "executive_function": "cognitive_motor",
    "working_memory": "cognitive_motor",
    "processing_speed": "cognitive_motor",
}

ACTIVITY_BASE = {"sedentary": 30, "light": 42, "moderate": 54, "active": 66, "very_active": 76}

# Activity level says how much the member trains; typical intensity says how
# hard. Points per step away from 3 (moderate), so the ends of the scale move
# the cold-start score a full 12 points: one whole band on _base_difficulty's
# 12-point scale. Anything smaller would round away and never reach the plan,
# and this is a 0.3-confidence prior either way.
INTENSITY_STEP = 6


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _tanaka(age: int) -> int:
    return round(208 - 0.7 * age)


# ---------------------------------------------------------------------------
# Estimate for planning: real history when available, cold start otherwise
# ---------------------------------------------------------------------------


def planning_estimate(req: GeneratePlanRequest) -> dict:
    """The web FitnessEstimate shape, from real data or questionnaire."""
    a = req.answers
    if req.sphery_user_id is not None:
        real = estimate_for_member(req.sphery_user_id)
        if real.ready:
            return {
                "source": "session_history",
                "fitnessScore": real.percentile,
                "estimatedHrRest": round(real.est_rest_hr) if real.est_rest_hr else round(74 - real.percentile * 0.18),
                "estimatedHrMax": round(real.est_max_hr) if real.est_max_hr else _tanaka(a.age),
                "confidence": min(0.95, 0.4 + real.workouts_analyzed / 160),
                "workoutsAnalyzed": real.workouts_analyzed,
                "estimatedAt": _now_iso(),
                # Extra evidence the web can surface; harmless if ignored.
                "level": real.level,
                "rationale": real.rationale,
            }
    # Cold start: no history, so the questionnaire is all there is. Real
    # session history above outranks this entirely, intensity included.
    score = ACTIVITY_BASE.get(a.activity_level, 54)
    if a.current_intensity is not None:
        score += (a.current_intensity - 3) * INTENSITY_STEP
    return {
        "source": "questionnaire_only",
        "fitnessScore": score,
        "estimatedHrRest": round(74 - score * 0.18),
        "estimatedHrMax": _tanaka(a.age),
        "confidence": 0.3,
        "workoutsAnalyzed": 0,
        "estimatedAt": _now_iso(),
    }


# ---------------------------------------------------------------------------
# Week construction (ported from buildWeeks)
# ---------------------------------------------------------------------------


def _bpm_for_zone(zone: int, est: dict) -> dict:
    frac = ZONE_FRACTION[zone]
    reserve = est["estimatedHrMax"] - est["estimatedHrRest"]
    mid = est["estimatedHrRest"] + frac * reserve
    return {"min": round(mid - 5), "max": round(mid + 5)}


def _resolve_station(gym: GymIn, stimulus: StimulusType) -> tuple[StationIn, bool]:
    direct = next((s for s in gym.stations if stimulus in s.stimulus_types), None)
    if direct:
        return direct, False
    fallback = next(
        (s for s in gym.stations if "cardio_intensity" in s.stimulus_types), gym.stations[0]
    )
    return fallback, True


def _base_difficulty(fitness_score: int) -> int:
    # Round half up, matching Math.round in web/lib/stub/engine.ts. Python's
    # round() goes half to even, and every activity level except very_active
    # divides by 12 to an exact half, so the two put the same member on
    # different starting difficulties (54 -> 4 here, 5 there) while printing
    # the same rationale.
    return min(8, max(1, floor(fitness_score / 12 + 0.5)))


def _focus_stimuli(focus_ids: list[str]) -> list[StimulusType]:
    out: list[StimulusType] = []
    for fid in focus_ids:
        s = FOCUS_STIMULUS.get(fid)
        if s and s not in out:
            out.append(s)
    return out


def build_weeks(req: GeneratePlanRequest, est: dict) -> tuple[list[dict], list[dict]]:
    a = req.answers
    gym = req.gym
    per_week = a.sessions_per_week
    length = a.session_length_minutes

    base = GOAL_STIMULI[a.goal]
    focus_stimuli = _focus_stimuli(a.focus)
    rotation = (
        focus_stimuli + [s for s in base if s not in focus_stimuli] if focus_stimuli else base
    )
    start_diff = _base_difficulty(est["fitnessScore"])
    WEEKS = 8

    weeks: list[dict] = []
    resolved: list[dict] = []

    for w in range(1, WEEKS + 1):
        is_deload = w % 4 == 0
        is_retest = w == WEEKS
        wave = -(-w // 4)  # ceil
        step_in_wave = (w - 1) % 4
        week_diff = (
            max(1, start_diff + wave - 2)
            if is_deload
            else min(10, start_diff + step_in_wave + (wave - 1) * 2)
        )
        focus_label = (
            "Deload + retest"
            if is_retest
            else "Deload"
            if is_deload
            else "Base"
            if w == 1
            else "Peak"
            if w == 7
            else "Build"
        )

        sessions: list[dict] = []
        r_sessions: list[dict] = []

        for i in range(per_week):
            stimulus = rotation[i % len(rotation)]
            zone = 2 if (is_deload and stimulus == "cardio_intensity") else ZONE_FOR_STIMULUS[stimulus]
            station, substituted = _resolve_station(gym, stimulus)
            adaptivity = (
                "cognitionOnly" if stimulus == "cognitive_motor" else "hrTracking" if zone >= 3 else "performance"
            )

            if substituted:
                rationale = (
                    f"{gym.name} has no dedicated {STIMULUS_LABELS[stimulus]} station, "
                    f"so we substituted {station.name} to keep the stimulus close."
                )
            elif is_retest and i == per_week - 1:
                rationale = (
                    f"Retest session on the {station.name}. We re-measure your fitness "
                    "here and build your next plan from it."
                )
            else:
                tail = (
                    "Eased off this week so the training sinks in."
                    if is_deload
                    else f"Difficulty {week_diff} matches your fitness estimate."
                )
                rationale = f"{STIMULUS_LABELS[stimulus]} on the {station.name}, zone {zone}. {tail}"

            session = {
                "id": f"w{w}-s{i + 1}",
                "order": i + 1,
                "stimulusType": stimulus,
                "adaptivityType": adaptivity,
                "hrTarget": {"zone": zone, "bpm": _bpm_for_zone(zone, est)},
                "durationMinutes": length,
                "difficulty": week_diff,
                "rationale": rationale,
            }
            sessions.append(session)
            r_sessions.append(
                {
                    "session": session,
                    "stationName": station.name,
                    "stationIsSphery": station.is_sphery,
                    "substituted": substituted,
                }
            )

        weeks.append({"weekNumber": w, "focus": focus_label, "sessions": sessions})
        resolved.append({"weekNumber": w, "focus": focus_label, "sessions": r_sessions})

    return weeks, resolved


# ---------------------------------------------------------------------------
# Circuit resolution (ported from circuitFor) — used by the kiosk export
# ---------------------------------------------------------------------------


def circuit_for(goal: str, gym: GymIn, session: dict) -> list[dict]:
    zone = session["hrTarget"]["zone"]
    template = CIRCUIT_TEMPLATES[goal]
    try:
        lead = template.index(session["stimulusType"])
    except ValueError:
        lead = -1
    order = template[lead:] + template[:lead] if lead > 0 else template

    total = session["durationMinutes"]
    ease = max(1, zone - 1)
    bookend = 5 if total >= 30 else 3
    work = total - bookend * 2
    work_count = min(len(order), max(2, work // 7))
    per = work // work_count
    remainder = work - per * work_count

    preferred = CIRCUIT_PREFERRED_STATIONS.get(goal, [])

    def rank(st: StationIn) -> int:
        if st.id in preferred:
            return preferred.index(st.id)
        return len(preferred) + (0 if st.is_sphery else 1)

    # The bookend station is chosen first and reserved, so the work block can
    # never hand out the station you already warm up and cool down on (a small
    # floor used to open, repeat, and close on the same erg). It takes the
    # *least* preferred cardio station on purpose: a warmup does not need the
    # flagship, and reserving the ExerCube for five minutes of easy spinning
    # would be a waste of the best equipment in the room.
    warm_candidates = sorted(
        (st for st in gym.stations if "cardio_endurance" in st.stimulus_types), key=rank
    )
    warm = warm_candidates[-1] if warm_candidates else None

    # Only reserve the bookend when the floor can spare it. A gym with barely
    # more stations than the work block needs is better off reusing it than
    # losing a station the work legs still need: holding back the bike on a
    # 4-station hotel floor pushed the treadmill onto 4 of 5 legs.
    reserved = (
        warm.id
        if warm is not None and len(gym.stations) > work_count and len(warm_candidates) > 1
        else None
    )

    used: set[str] = set()
    # When a leg has to reuse a station, reuse the one used longest ago. Picking
    # by rank instead piles every repeat onto the single top-ranked station: a
    # 9-station floor ran the same treadmill on three of five work legs.
    last_used: dict[str, int] = {}
    tick = 0
    prev: Optional[StationIn] = None

    def pick(stim: StimulusType) -> StationIn:
        nonlocal prev, tick
        matching = sorted(
            (st for st in gym.stations if stim in st.stimulus_types), key=rank
        )
        base = matching if matching else gym.stations
        # Keep the bookend station out of the work block, unless it is the only
        # thing that can deliver this stimulus.
        spared = [c for c in base if c.id != reserved]
        pool = spared if spared else base
        prev_id = prev.id if prev else None
        station = next(
            (c for c in pool if c.id not in used and c.id != prev_id),
            None,
        )
        if station is None:
            others = sorted(
                (c for c in pool if c.id != prev_id), key=lambda c: last_used.get(c.id, -1)
            )
            station = others[0] if others else pool[0]
        used.add(station.id)
        last_used[station.id] = tick
        tick += 1
        prev = station
        return station

    work_legs: list[dict] = []
    for i in range(work_count):
        stim = order[i % len(order)]
        station = pick(stim)
        balance_first = station.stimulus_types[0] == "mobility_stability"
        raw = zone if stim == session["stimulusType"] else min(ZONE_FOR_STIMULUS[stim], zone)
        leg_zone = min(raw, 2 if balance_first else 5)
        extra = 1 if remainder > 0 else 0
        if remainder > 0:
            remainder -= 1
        work_legs.append(
            {
                "stationId": station.id,
                "stationName": station.name,
                "isSphery": station.is_sphery,
                "minutes": per + extra,
                "targetZone": leg_zone,
            }
        )

    # A gym with no endurance station at all still needs bookends; fall back to
    # the first work station rather than dropping them.
    warm_name = warm.name if warm else work_legs[0]["stationName"]
    warm_id = warm.id if warm else work_legs[0]["stationId"]
    warm_sphery = warm.is_sphery if warm else work_legs[0]["isSphery"]

    return [
        {"stationId": warm_id, "stationName": warm_name, "isSphery": warm_sphery, "minutes": bookend, "targetZone": ease},
        *work_legs,
        {"stationId": warm_id, "stationName": warm_name, "isSphery": warm_sphery, "minutes": bookend, "targetZone": 1},
    ]


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------


def generate_plan(req: GeneratePlanRequest) -> dict:
    est = planning_estimate(req)
    weeks, resolved = build_weeks(req, est)
    a = req.answers

    goal_title = GOAL_TITLES.get(a.goal, a.goal)
    # Focus ids render title-cased in the rationale; the web keeps the exact
    # marketing labels for display elsewhere.
    focus_labels = [f.replace("_", " ").title() for f in a.focus]
    focus_phrase = f", focused on {' & '.join(focus_labels)}" if focus_labels else ""
    analyzed = est["workoutsAnalyzed"]
    evidence = (
        f"{analyzed} training {'session' if analyzed == 1 else 'sessions'}"
        if est["source"] == "session_history" and analyzed > 0
        else "the setup questionnaire"
    )
    # Member-facing, so it avoids the model's vocabulary: no "block", no "cold
    # start", no "workouts analyzed". Must stay word-for-word identical to
    # web/lib/stub/engine.ts, which builds the same string for the same plan.
    rationale = (
        f"An {len(weeks)}-week plan, {a.sessions_per_week}×/week for {req.member_name} "
        f"at {req.gym.name}, built for {goal_title}{focus_phrase}. Starting difficulty "
        f"{_base_difficulty(est['fitnessScore'])}, based on {evidence} "
        f"(fitness estimate {est['fitnessScore']}/100)."
    )

    plan = {
        "id": f"plan-{req.sphery_user_id or 'guest'}-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        "userId": str(req.sphery_user_id or "guest"),
        "goal": a.goal,
        "createdAt": _now_iso(),
        "fitnessEstimate": est,
        "rationale": rationale,
        "weeks": weeks,
    }
    return {"plan": plan, "resolved": resolved, "circuitName": CIRCUIT_NAMES.get(a.goal)}
