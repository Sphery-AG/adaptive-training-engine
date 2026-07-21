"""The kiosk contract: `CreateTrainingRequest`.

This mirrors, field for field, the object the kiosk builds and POSTs to
`circle-trainings` (TheSphere-Kiosk: `CreateTrainingRequest.cs`, and the
`Kiosk.InternalLogic.cs` mapping that fills it). Our engine's whole job is to
produce this object for a member, instead of a human picking a template at the
kiosk. If this class and the kiosk's class ever disagree, the kiosk wins.

JSON field names are camelCase to match the C# `[JsonProperty]` names, so the
output drops straight into the existing pipeline. We keep Python-side names
snake_case and map them with aliases.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

# Enums are plain string literals, matching the kiosk's StringEnumConverter and
# the enum columns in the static DB (CircleTrainings.mode/status/style, etc.).
Mode = Literal["single", "double", "relay"]
Status = Literal["setup", "started", "completed"]
Style = Literal["duration", "score", "repetitions"]
Category = Literal["men", "women", "mixed"]
Division = Literal["open", "pro"]


class _CamelModel(BaseModel):
    # Accept snake_case in Python, emit camelCase JSON via aliases.
    model_config = ConfigDict(populate_by_name=True)


class SetupExercise(_CamelModel):
    """One station in the circle. `target` is a free string today ("1000m",
    "50x"): it carries the WORK, not the intensity. HR target lives nowhere in
    this contract yet (Michel owns adding it in schema v2)."""

    order_index: int = Field(alias="orderIndex")  # 1-based, like the kiosk
    style: Style
    name: str
    target: str


class SetupParticipant(_CamelModel):
    """A member in the circle. `user_id` is the Spieler ID: the thread that
    ties a plan, its run, and its results back to one person. Guests have no
    Spieler ID and are never sent, so every participant here is a real member."""

    user_id: int = Field(alias="userId")
    category: Category = "mixed"
    division: Optional[Division] = Field(default=None)
    team_name: Optional[str] = Field(default=None, alias="teamName")


class CreateTrainingRequest(_CamelModel):
    """The exact body the kiosk POSTs to `circle-trainings`."""

    kiosk_id: str = Field(alias="kioskId")
    setup_by_user_id: Optional[int] = Field(default=None, alias="setupByUserId")
    hyrox: bool = False
    name: str
    mode: Mode = "single"
    status: Status = "setup"  # a create is always "setup"
    style: Style = "duration"
    started_at: Optional[str] = Field(default=None, alias="startedAt")
    completed_at: Optional[str] = Field(default=None, alias="completedAt")
    exercises: list[SetupExercise] = Field(default_factory=list)
    participants: list[SetupParticipant] = Field(default_factory=list)

    def to_kiosk_json(self) -> str:
        """Serialize exactly as the kiosk expects (camelCase keys)."""
        return self.model_dump_json(by_alias=True, indent=2)
