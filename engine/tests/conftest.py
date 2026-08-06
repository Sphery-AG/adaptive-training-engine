"""Shared fixtures. The Darmstadt floor mirrors web/lib/stub/data.ts exactly —
if the floor changes there, change it here too (it is demo data, not truth)."""

from __future__ import annotations

import pytest

from app.plangen import AnswersIn, GeneratePlanRequest, GymIn, StationIn


def _st(id: str, name: str, stimuli: list[str], sphery: bool = False) -> StationIn:
    return StationIn(id=id, name=name, stimulusTypes=stimuli, isSpheryEquipment=sphery)


@pytest.fixture
def darmstadt() -> GymIn:
    return GymIn(
        id="sphere-darmstadt",
        name="The Sphere Darmstadt",
        stations=[
            _st("exercube", "ExerCube", ["cardio_endurance", "cardio_intensity", "cognitive_motor", "recovery"], True),
            _st("xr-fighter", "XR Fighter", ["cardio_intensity", "cognitive_motor", "power_speed"], True),
            _st("icaros", "ICAROS Guardian", ["mobility_stability", "cognitive_motor"], True),
            _st("runner", "Runner", ["power_speed", "cardio_intensity", "cardio_endurance"]),
            _st("ski-erg", "Ski Erg", ["cardio_endurance", "cardio_intensity"]),
            _st("row-erg", "Row Erg", ["cardio_endurance", "cardio_intensity"]),
            _st("bike", "Performance Bike", ["cardio_endurance", "cardio_intensity", "recovery"]),
            _st("leg-press", "Medical Leg Press", ["strength", "mobility_stability"]),
            _st("free-weights", "Free Weights & Racks", ["strength", "power_speed"]),
            _st("cable-pulls", "Cable Pulls", ["strength", "mobility_stability"]),
            _st("tidal-tank", "Tidal Tanks", ["strength", "mobility_stability"]),
            _st("sled-push", "Sled Push", ["strength", "power_speed"]),
            _st("sled-pull", "Sled Pull", ["strength"]),
            _st("wall-balls", "Wall Balls", ["strength", "cardio_intensity"]),
            _st("sandbag-lunges", "Sandbag Lunges", ["strength"]),
            _st("farmers-carry", "Farmers Carry", ["strength"]),
            _st("burpees", "Burpee Broad Jump", ["power_speed", "cardio_intensity"]),
        ],
    )


@pytest.fixture
def hotel_gym() -> GymIn:
    """A bare gym that cannot deliver cognitive_motor: forces substitution."""
    return GymIn(
        id="hotel",
        name="Grand Hotel Fitness",
        stations=[
            _st("treadmill", "Treadmill", ["cardio_endurance", "cardio_intensity"]),
            _st("bike", "Bike", ["cardio_endurance", "recovery"]),
            _st("dumbbells", "Dumbbells", ["strength"]),
            _st("mat", "Mat", ["mobility_stability"]),
        ],
    )


def request_for(
    gym: GymIn,
    goal: str = "improve_fitness_endurance",
    focus: list[str] | None = None,
    activity: str = "active",
    per_week: int = 3,
    minutes: int = 45,
    sphery_user_id: int | None = None,
) -> GeneratePlanRequest:
    return GeneratePlanRequest(
        spheryUserId=sphery_user_id,
        memberName="Testa",
        answers=AnswersIn(
            age=34,
            goal=goal,
            focus=focus or [],
            activityLevel=activity,
            sessionsPerWeek=per_week,
            sessionLengthMinutes=minutes,
        ),
        gym=gym,
    )
