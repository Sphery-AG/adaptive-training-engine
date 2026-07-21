"""Read-only access to the static Sphery export (local MySQL).

Everything here reads history. Nothing writes. The plan-side tables we add
later (plan, plan_session, fitness_estimate, ...) will get their own module;
this one only touches the existing Sphery schema.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional
from urllib.parse import urlparse

import pymysql

# Default matches docker-compose + CLAUDE.md. Override with SPHERY_DB_URL.
DEFAULT_DB_URL = "mysql://root:devpassword@localhost:3306/spherych_devapp"


def _connect() -> pymysql.connections.Connection:
    url = urlparse(os.environ.get("SPHERY_DB_URL", DEFAULT_DB_URL))
    return pymysql.connect(
        host=url.hostname or "localhost",
        port=url.port or 3306,
        user=url.username or "root",
        password=url.password or "",
        database=(url.path or "/").lstrip("/"),
        cursorclass=pymysql.cursors.DictCursor,
    )


@dataclass
class MemberContext:
    """The little we need about a member to place them in a circle. Age is
    always computed from dob (the `age` column is unused). Category/division
    come from how they have competed before, defaulting sensibly."""

    user_id: int
    age: Optional[int]
    gender: Optional[str]
    category: str = "mixed"
    division: Optional[str] = None


def _age_from_dob(dob: Optional[date]) -> Optional[int]:
    if not dob:
        return None
    today = datetime.utcnow().date()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def get_member_context(user_id: int) -> MemberContext:
    """Health basics + how this member has been categorized in past circles."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT dob, gender FROM HealthData WHERE userId = %s LIMIT 1",
            (user_id,),
        )
        health = cur.fetchone() or {}

        # Reuse the member's most recent circle category/division if they have one.
        cur.execute(
            """
            SELECT category, division
            FROM CircleTrainingParticipants
            WHERE userId = %s
            ORDER BY createdAt DESC
            LIMIT 1
            """,
            (user_id,),
        )
        past = cur.fetchone() or {}

    return MemberContext(
        user_id=user_id,
        age=_age_from_dob(health.get("dob")),
        gender=health.get("gender"),
        category=past.get("category") or "mixed",
        division=past.get("division"),
    )


@dataclass
class ReferenceExercise:
    order_index: int
    style: str
    name: str
    target: str


def get_reference_circle(name: str = "Darmstadt", mode: str = "single") -> tuple[str, list[ReferenceExercise]]:
    """Load a real circle template from history to use as the v1 catalog.

    Returns (kioskId, exercises). Step 2 replaces this with a real
    goal->stimulus->equipment rule; for now we reuse an existing circle so the
    targets ("1000m", "50x") are real values the equipment understands.
    """
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, kioskId
            FROM CircleTrainings
            WHERE name = %s AND mode = %s AND hyrox = 0
            ORDER BY id DESC
            LIMIT 1
            """,
            (name, mode),
        )
        circle = cur.fetchone()
        if not circle:
            raise ValueError(f"No reference circle found for name={name!r} mode={mode!r}")

        cur.execute(
            """
            SELECT orderIndex, style, name, target
            FROM CircleTrainingExercises
            WHERE circleTrainingId = %s
            ORDER BY orderIndex
            """,
            (circle["id"],),
        )
        exercises = [
            ReferenceExercise(
                order_index=row["orderIndex"],
                style=row["style"],
                name=row["name"],
                target=row["target"],
            )
            for row in cur.fetchall()
        ]

    return circle["kioskId"], exercises
