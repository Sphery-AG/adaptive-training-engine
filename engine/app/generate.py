"""Plan generation (rules).

Step 1 only: given a member, produce ONE valid `CreateTrainingRequest`. The
rule here is deliberately dumb: take a real Darmstadt circle and put this member
in it. That is enough to prove the whole pipe (DB in, kiosk JSON out).

The interesting rules come next and slot in right here:
  step 2  goal -> stimulus -> pick and scale exercises + targets
  step 3  read the fitness estimate to set intensity
  step 4  fold ExerciseLogs + HR zones back in to adapt the next plan
"""

from __future__ import annotations

from .contract import CreateTrainingRequest, SetupExercise, SetupParticipant
from .db import get_member_context, get_reference_circle


def generate_for_member(user_id: int) -> CreateTrainingRequest:
    """Build a kiosk-ready circle for one member."""
    member = get_member_context(user_id)
    kiosk_id, reference = get_reference_circle(name="Darmstadt", mode="single")

    exercises = [
        SetupExercise(
            order_index=ex.order_index,
            style=ex.style,
            name=ex.name,
            target=ex.target,
        )
        for ex in reference
    ]

    participant = SetupParticipant(
        user_id=member.user_id,
        category=member.category,
        division=member.division,
    )

    return CreateTrainingRequest(
        kiosk_id=kiosk_id,
        setup_by_user_id=None,  # set by the plan app / handoff later
        hyrox=False,
        name="Darmstadt Single",
        mode="single",
        style="duration",
        exercises=exercises,
        participants=[participant],
    )
