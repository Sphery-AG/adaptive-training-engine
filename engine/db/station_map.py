"""Bootstrap and render the exercise -> station mapping.

`engine/data/exercise_stations.csv` is the mapping, and it is DATA, not logic:
one row per catalogue exercise saying which station on the Darmstadt floor
delivers it. Stephan corrects the CSV; nobody edits code to change a station.

Why a file and not rules in code: equipment is the wrong join key. "Farmer
Carry Light" is tagged Kettlebell / Dumbbell, so equipment matching sends it to
Free Weights and the Farmers Carry station gets nothing. Family is closer but
still not enough - the Squat family holds four bodyweight exercises and one Wall
Ball. Only a per-exercise mapping is honest, and only a human can sign it off.

    build   first pass at the CSV from the catalogue (refuses to overwrite)
    render  CSV -> the markdown review sheet Stephan gets

The build rules below are a starting point, not an answer. Every row they are
not certain about carries needs_review=yes, and the render step groups those
first so the reviewer reads the guesses before the obvious ones.

    python engine/db/station_map.py build <xlsx> engine/data/exercise_stations.csv
    python engine/db/station_map.py render engine/data/exercise_stations.csv docs/exercise-station-mapping.md
"""

from __future__ import annotations

import csv
import os
import sys
from collections import defaultdict

import openpyxl

# The Darmstadt floor as the app knows it today (web/lib/stub/data.ts), plus the
# three areas proposed for the equipment that has no station. Names are what the
# floor calls them; ids are what the mapping refers to.
STATIONS = {
    "exercube": "ExerCube",
    "xr-fighter": "XR Fighter",
    "icaros": "ICAROS Guardian",
    "runner": "Runner",
    "ski-erg": "Ski Erg",
    "row-erg": "Row Erg",
    "bike": "Performance Bike",
    "leg-press": "Medical Leg Press",
    "free-weights": "Free Weights & Racks",
    "cable-pulls": "Cable Pulls",
    "tidal-tank": "Tidal Tanks",
    "sled-push": "Sled Push",
    "sled-pull": "Sled Pull",
    "wall-balls": "Wall Balls",
    "sandbag-lunges": "Sandbag Lunges",
    "farmers-carry": "Farmers Carry",
    "burpees": "Burpee Broad Jump",
    # Proposed, pending Stephan.
    "functional-floor": "Functional Floor",
    "plyo-agility": "Plyo & Agility",
    "mobility-balance": "Mobility & Balance",
}

# Exercise-level overrides win over everything: these are the rows where the
# family or the equipment would send the exercise to the wrong place.
BY_EXERCISE = {
    "EX022": ("wall-balls", "Wall Ball is the Squat family's Mastery rung, but it is thrown at the wall-ball target", False),
    "EX025": ("burpees", "Burpee Broad Jump is the station's namesake", False),
}

# (station, why, needs_review) by family. Checked before equipment.
BY_FAMILY = {
    "Farmer Carry": ("farmers-carry", "the station exists for this family; its Kettlebell / Dumbbell tag was routing it to Free Weights", False),
    "Burpee": ("burpees", "bodyweight, but the floor has a burpee station", False),
    "Sled Push": ("sled-push", "", False),
    "Sled Pull": ("sled-pull", "", False),
    "Medicine Ball Throw": ("wall-balls", "no medicine-ball station; the wall-ball target is the closest throwing surface", True),
    "Medicine Ball Slam": ("wall-balls", "no medicine-ball station; slams need floor space near the target", True),
    "Jump": ("plyo-agility", "Plyo Box", True),
    "Step-Up": ("plyo-agility", "Plyo Box", True),
    "Jump Rope": ("plyo-agility", "", True),
    "Plyometric Footwork": ("plyo-agility", "bodyweight footwork drills need open floor, not a machine", True),
    "Lateral Locomotion": ("plyo-agility", "bodyweight shuffles need a lane of open floor", True),
    "Balance": ("mobility-balance", "Balance Board / Balance Pad", True),
    "Hip Stability": ("mobility-balance", "Miniband", True),
    "Mobility Flow": ("mobility-balance", "", True),
    "Hamstring Curl": ("mobility-balance", "Swiss Ball", True),
    "Unstable Plank": ("mobility-balance", "Swiss Ball", True),
}

# By primary equipment, when family says nothing.
BY_EQUIPMENT = {
    "ExerCube": ("exercube", "", False),
    "XR Fighter": ("xr-fighter", "", False),
    "ICAROS Guardian": ("icaros", "", False),
    "Treadmill": ("runner", "the floor calls its treadmill the Runner", True),
    "SkiErg": ("ski-erg", "", False),
    "RowErg": ("row-erg", "", False),
    "Bike": ("bike", "", False),
    "Spinning Bike": ("bike", "one bike station covers three bike types in the catalogue", True),
    "Assault Bike": ("bike", "one bike station covers three bike types in the catalogue", True),
    "Technogym Medical Leg Press": ("leg-press", "", False),
    "Barbell": ("free-weights", "", False),
    "Dumbbell": ("free-weights", "", False),
    "Kettlebell": ("free-weights", "", False),
    "Kettlebell / Dumbbell": ("free-weights", "", False),
    "Beyond Power Electric Cable": ("cable-pulls", "", False),
    "Resistance Band": ("mobility-balance", "no band station; bands live with the mats", True),
    "Sandbag": ("sandbag-lunges", "", False),
    "Wall Ball": ("wall-balls", "", False),
    "Swiss Ball": ("mobility-balance", "", True),
    "Plyo Box": ("plyo-agility", "", True),
    "Balance Board": ("mobility-balance", "", True),
    "Balance Pad": ("mobility-balance", "", True),
    "Miniband": ("mobility-balance", "", True),
    "Jump Rope": ("plyo-agility", "", True),
    "Medicine Ball": ("wall-balls", "", True),
    "Bodyweight": ("functional-floor", "bodyweight work needs open floor, not a machine", True),
}

FIELDS = [
    "exercise_id", "exercise", "family", "card_level", "primary_equipment",
    "station_id", "station_name", "assigned_by", "needs_review", "note",
]


def _cell(row: dict, key: str) -> str:
    v = row.get(key)
    return str(v).strip() if v is not None else ""


def read_catalogue(path: str) -> list[dict]:
    ws = openpyxl.load_workbook(path, data_only=True)["Exercise Catalogue"]
    rows = list(ws.iter_rows(values_only=True))
    hdr = [h.strip() if isinstance(h, str) else h for h in rows[0]]
    return [dict(zip(hdr, r)) for r in rows[1:] if any(c not in (None, "") for c in r)]


def assign(row: dict) -> tuple[str, str, bool, str]:
    """(station_id, assigned_by, needs_review, note) for one catalogue row."""
    code, family, equipment = _cell(row, "ID"), _cell(row, "Family"), _cell(row, "Primary Equipment")

    if code in BY_EXERCISE:
        station, note, review = BY_EXERCISE[code]
        return station, "exercise", review, note
    if family in BY_FAMILY:
        station, note, review = BY_FAMILY[family]
        return station, "family", review, note
    if equipment in BY_EQUIPMENT:
        station, note, review = BY_EQUIPMENT[equipment]
        return station, "equipment", review, note
    return "", "unassigned", True, "no rule matched - needs a station"


def build(xlsx: str, out: str, force: bool) -> None:
    if os.path.exists(out) and not force:
        raise SystemExit(
            f"{out} exists. It is the mapping, and it may carry corrections this "
            "script knows nothing about. Pass --force only to throw those away."
        )
    catalogue = read_catalogue(xlsx)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        for row in catalogue:
            station, by, review, note = assign(row)
            w.writerow({
                "exercise_id": _cell(row, "ID"),
                "exercise": _cell(row, "Exercise"),
                "family": _cell(row, "Family"),
                "card_level": _cell(row, "Card Level"),
                "primary_equipment": _cell(row, "Primary Equipment"),
                "station_id": station,
                "station_name": STATIONS.get(station, ""),
                "assigned_by": by,
                "needs_review": "yes" if review else "no",
                "note": note,
            })
    print(f"wrote {out}: {len(catalogue)} exercises")


def render(csv_path: str, out: str) -> None:
    with open(csv_path) as f:
        rows = list(csv.DictReader(f))

    by_station: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_station[r["station_id"] or "(none)"].append(r)
    flagged = [r for r in rows if r["needs_review"] == "yes"]

    lines = [
        "# Exercise to station mapping - for review",
        "",
        f"Every one of the {len(rows)} exercises in the Darmstadt catalogue (v6), and which "
        "station on the floor we think delivers it. This decides which card a member "
        "earns when a plan puts them on a station, so a wrong row means the wrong card.",
        "",
        f"**{len(flagged)} rows are marked _guess_ and need your eye.** The rest follow "
        "straight from the equipment (an ExerCube exercise runs on the ExerCube).",
        "",
        "Correct the station column directly, or tell Anthony and he will. Source: "
        "`engine/data/exercise_stations.csv`.",
        "",
        "## Open questions",
        "",
        "1. **Tidal Tanks has no exercises.** The station is on the floor but nothing in "
        "the catalogue names it. Which exercises does it deliver, or should it sit out of "
        "plans for now?",
        "2. **Three new areas are proposed** - Functional Floor, Plyo & Agility, Mobility & "
        "Balance - for the bodyweight work and the equipment with no station today (Plyo "
        "Box, Swiss Ball, Medicine Ball, jump ropes, bands, balance boards). Are these real "
        "places on the floor, and are those the right groupings?",
        "3. **EX092 '100 Punches'** is tagged Upper Body, which is not one of the eight "
        "regions. Arms, Shoulders or Full Body?",
        "",
        "## The guesses, station by station",
        "",
    ]

    def table(rs: list[dict]) -> list[str]:
        out = ["| ID | Exercise | Family | Level | Equipment | Station | Why |",
               "|---|---|---|---|---|---|---|"]
        for r in sorted(rs, key=lambda x: x["exercise_id"]):
            flag = " _(guess)_" if r["needs_review"] == "yes" else ""
            out.append(
                f"| {r['exercise_id']} | {r['exercise']} | {r['family']} | {r['card_level']} | "
                f"{r['primary_equipment']} | {r['station_name'] or '**none**'}{flag} | {r['note']} |"
            )
        return out + [""]

    for sid in sorted(by_station, key=lambda s: (-len([r for r in by_station[s] if r["needs_review"] == "yes"]), s)):
        rs = [r for r in by_station[sid] if r["needs_review"] == "yes"]
        if not rs:
            continue
        lines.append(f"### {STATIONS.get(sid, sid)} ({len(rs)} to check)")
        lines.append("")
        lines += table(rs)

    lines += ["## Everything else (no review needed)", ""]
    settled = [r for r in rows if r["needs_review"] == "no"]
    lines += table(settled)

    lines += [
        "## Station coverage",
        "",
        "| Station | Exercises |",
        "|---|---|",
    ]
    for sid, name in STATIONS.items():
        lines.append(f"| {name} | {len(by_station.get(sid, []))} |")
    lines.append("")

    with open(out, "w") as f:
        f.write("\n".join(lines))
    print(f"wrote {out}: {len(rows)} rows, {len(flagged)} flagged")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--force"]
    if len(args) != 3:
        raise SystemExit(__doc__)
    cmd, src, dst = args
    if cmd == "build":
        build(src, dst, force="--force" in sys.argv)
    elif cmd == "render":
        render(src, dst)
    else:
        raise SystemExit(__doc__)
