"""Load the Darmstadt exercise catalogue spreadsheet into the schema.

The spreadsheet is the source of truth for exercise content; this turns it into
rows. Run it again after any edit to the sheet.

It upserts on `code` rather than replacing the catalogue wholesale. That is not
a preference — `plan_session_exercises.exercise_id` and
`session_exercise_logs.exercise_id` both reference `exercises`, so once a single
plan exists, DELETE is refused by the database and would be wrong if it were
not: an exercise someone actually performed cannot be un-created by editing a
spreadsheet. A row that disappears from the sheet is therefore RETIRED
(`retired_at` set), never deleted, and stops being selectable while staying
readable in history.

The only translation is display-string to enum label ("Cognitive Flexibility"
-> cognitive_flexibility, "Fat Burn/Weight Loss" -> fat_burn_weight_loss). Any
value the sheet contains that is not in the mapping is a hard error rather than
a silent skip: a typo in the catalogue must not become a missing tag.

    python engine/db/load_catalogue.py <xlsx> <postgres-url>
"""

from __future__ import annotations

import sys

import openpyxl
import psycopg

BODY = {
    "Coordination": "coordination", "Strength": "strength", "Endurance": "endurance",
    "Speed": "speed", "Mobility": "mobility",
}
BRAIN = {
    "Memory": "memory", "Focus": "focus", "Reaction": "reaction",
    "Cognitive Flexibility": "cognitive_flexibility",
    "Perception/Orientation": "perception_orientation",
}
LEVEL = {"Foundation": "foundation", "Progress": "progress", "Mastery": "mastery"}
PATTERN = {
    "Squat": "squat", "Hinge": "hinge", "Lunge": "lunge", "Push": "push", "Pull": "pull",
    "Carry": "carry", "Rotation": "rotation", "Core Stability": "core_stability",
    "Locomotion": "locomotion", "Jump": "jump",
}
MODALITY = {
    "Strength": "strength", "Power": "power", "Cardio": "cardio", "Mobility": "mobility",
    "Stability": "stability", "Agility": "agility", "Plyometric": "plyometric",
    "Motor Control": "motor_control", "Physio-Cognitive": "physio_cognitive",
}
REGION = {
    "Full Body": "full_body", "Upper Body": "upper_body", "Legs": "legs", "Glutes": "glutes",
    "Core": "core", "Back": "back", "Chest": "chest", "Shoulders": "shoulders", "Arms": "arms",
}
# The catalogue's Training Goal column. Seven values, and deliberately NOT the
# eight goals a member picks from in the intake — `goal_exercise_goals` in the
# schema is the bridge between the two vocabularies.
GOAL = {
    "Fat Burn/Weight Loss": "fat_burn_weight_loss",
    "Build Strength/Muscle": "build_strength_muscle",
    "Improve Endurance/Fitness": "improve_endurance_fitness",
    "Move Pain Free": "move_pain_free",
    "Boost Health/Longevity": "boost_health_longevity",
    "Improve Sports Performance": "improve_sports_performance",
    "Train Body & Mind": "train_body_and_mind",
}
IMPACT = {"Low": "low", "Medium": "medium", "High": "high"}

SPHERY_EQUIPMENT = {"ExerCube", "XR Fighter", "ICAROS Guardian"}


def slug(s: str) -> str:
    out = "".join(c.lower() if c.isalnum() else "-" for c in s)
    while "--" in out:
        out = out.replace("--", "-")
    return out.strip("-")


def look(mapping: dict[str, str], value: str, column: str, code: str) -> str:
    try:
        return mapping[value]
    except KeyError:
        raise SystemExit(f"{code}: {column} has unmapped value {value!r}. Fix the sheet or the mapping.")


def split(cell) -> list[str]:
    return [t.strip() for t in str(cell or "").split(";") if t.strip()]


def main(xlsx: str, url: str) -> None:
    ws = openpyxl.load_workbook(xlsx, data_only=True)["Exercise Catalogue"]
    rows = list(ws.iter_rows(values_only=True))
    hdr = list(rows[0])
    col = {h: i for i, h in enumerate(hdr)}
    data = [r for r in rows[1:] if r[0]]

    def v(r, name: str) -> str:
        return "" if r[col[name]] is None else str(r[col[name]]).strip()

    families = sorted({v(r, "Family") for r in data})

    equipment: set[str] = set()
    for r in data:
        equipment.add(v(r, "Primary Equipment"))
        equipment.update(split(r[col["Secondary Equipment"]]))

    with psycopg.connect(url, autocommit=False) as conn, conn.cursor() as cur:
        # Shared-library rows only. A gym's own equipment and exercises
        # (owning_gym_id IS NOT NULL) are not the spreadsheet's business, which
        # is why every conflict target below carries that predicate.
        eq_id: dict[str, int] = {}
        for name in sorted(equipment):
            cur.execute(
                """INSERT INTO equipment (slug, name, is_sphery) VALUES (%s, %s, %s)
                   ON CONFLICT (slug) WHERE owning_gym_id IS NULL
                   DO UPDATE SET name = EXCLUDED.name, is_sphery = EXCLUDED.is_sphery
                   RETURNING id""",
                (slug(name), name, name in SPHERY_EQUIPMENT),
            )
            eq_id[name] = cur.fetchone()[0]

        fam_id: dict[str, int] = {}
        for name in families:
            cur.execute(
                """INSERT INTO exercise_families (slug, name) VALUES (%s, %s)
                   ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
                   RETURNING id""",
                (slug(name), name),
            )
            fam_id[name] = cur.fetchone()[0]
        # No ladder column to maintain: exercise_family_ladders derives it from
        # the cards that exist, so it can never disagree with them.

        seen: list[int] = []
        for r in data:
            code = v(r, "ID")
            lo, hi = (v(r, "Intensity").replace("–", "-").split("-") + [None])[:2]
            hi = hi or lo
            cur.execute(
                """INSERT INTO exercises
                   (code, name, family_id, level, primary_equipment_id,
                    intensity_min, intensity_max, complexity, impact, movement,
                    training_modality, region_primary, region_secondary, region_tertiary,
                    retired_at)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NULL)
                   ON CONFLICT (code) WHERE owning_gym_id IS NULL DO UPDATE SET
                     name = EXCLUDED.name, family_id = EXCLUDED.family_id,
                     level = EXCLUDED.level, primary_equipment_id = EXCLUDED.primary_equipment_id,
                     intensity_min = EXCLUDED.intensity_min, intensity_max = EXCLUDED.intensity_max,
                     complexity = EXCLUDED.complexity, impact = EXCLUDED.impact,
                     movement = EXCLUDED.movement, training_modality = EXCLUDED.training_modality,
                     region_primary = EXCLUDED.region_primary,
                     region_secondary = EXCLUDED.region_secondary,
                     region_tertiary = EXCLUDED.region_tertiary,
                     retired_at = NULL
                   RETURNING id""",
                (
                    code, v(r, "Exercise"), fam_id[v(r, "Family")],
                    look(LEVEL, v(r, "Card Level"), "Card Level", code),
                    eq_id[v(r, "Primary Equipment")],
                    int(lo), int(hi), int(v(r, "Complexity 1-5")),
                    look(IMPACT, v(r, "Impact"), "Impact", code),
                    look(PATTERN, v(r, "Movement Pattern"), "Movement Pattern", code),
                    look(MODALITY, v(r, "Modality"), "Modality", code),
                    look(REGION, v(r, "Primary Body Region"), "Primary Body Region", code),
                    look(REGION, v(r, "Secondary Body Region"), "Secondary Body Region", code) if v(r, "Secondary Body Region") else None,
                    look(REGION, v(r, "Tertiary Body Region"), "Tertiary Body Region", code) if v(r, "Tertiary Body Region") else None,
                ),
            )
            ex = cur.fetchone()[0]
            seen.append(ex)

            # Tags are authored as a set, so they are replaced as a set. These
            # four tables cascade from the exercise and are referenced by
            # nothing, so deleting them costs no history.
            for table in ("exercise_body_qualities", "exercise_brain_qualities",
                          "exercise_goals", "exercise_secondary_equipment"):
                cur.execute(f"DELETE FROM {table} WHERE exercise_id = %s", (ex,))

            for t in split(r[col["Body"]]):
                cur.execute("INSERT INTO exercise_body_qualities VALUES (%s,%s)", (ex, look(BODY, t, "Body", code)))
            for t in split(r[col["Brain"]]):
                cur.execute("INSERT INTO exercise_brain_qualities VALUES (%s,%s)", (ex, look(BRAIN, t, "Brain", code)))
            for t in split(r[col["Training Goal"]]):
                cur.execute("INSERT INTO exercise_goals VALUES (%s,%s)", (ex, look(GOAL, t, "Training Goal", code)))
            for t in split(r[col["Secondary Equipment"]]):
                cur.execute("INSERT INTO exercise_secondary_equipment VALUES (%s,%s)", (ex, eq_id[t]))

        # Dropped from the sheet: retire, never delete. A plan may still
        # prescribe it and a session log may still name it.
        cur.execute(
            """UPDATE exercises SET retired_at = now()
                WHERE owning_gym_id IS NULL AND retired_at IS NULL AND NOT (id = ANY(%s))
             RETURNING code""",
            (seen,),
        )
        retired = [row[0] for row in cur.fetchall()]

        conn.commit()

    print(f"loaded {len(data)} exercises, {len(families)} families, {len(equipment)} equipment kinds")
    if retired:
        print(f"retired {len(retired)} no longer in the sheet: {', '.join(retired)}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])
