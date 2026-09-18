"""Snapshot mode: serve demo members from a frozen JSON file instead of MySQL.

A hosted demo must not carry the Sphery export. This module lets the engine run
the same estimate, plan and adaptation code against a few precomputed values per
member: ENGINE_SNAPSHOT_JSON carries the snapshot itself (how it reaches a host
where the file cannot be committed), and ENGINE_SNAPSHOT names a file instead.
With neither set nothing here is used and the engine reads MySQL as always.

The snapshot holds only what the four data-access points return, minus anything
no caller reads: no dob, gender, weight or height, no member ids in the
population curve, and a score trend as two averages rather than a score list.
It is still personal data about real members. It lives under _local/ and is
never committed.

Build it against the local export. The output is compact because it is pasted
into an environment variable, where every byte counts against the host's limit:

    python -m app.snapshot 535 19 > ../_local/engine-snapshot.json
"""

from __future__ import annotations

import json
import os
import sys
from dataclasses import asdict
from functools import lru_cache
from typing import Optional

ENV = "ENGINE_SNAPSHOT"
ENV_JSON = "ENGINE_SNAPSHOT_JSON"

# Feature fields nothing downstream of get_member_features() reads. Dropped
# from the snapshot so it carries as little about a member as possible.
UNUSED_FEATURES = (
    "age", "gender", "weight_kg", "height_cm",
    "avg_hr", "avg_difficulty", "avg_hr_target", "avg_duration_s",
)

RANGES = ("session", "day", "week", "month")


@lru_cache(maxsize=1)
def load() -> Optional[dict]:
    """The snapshot, or None when the engine should read MySQL."""
    raw = os.environ.get(ENV_JSON)
    if raw:
        return json.loads(raw)
    path = os.environ.get(ENV)
    if not path:
        return None
    with open(path) as f:
        return json.load(f)


def member(user_id: int) -> Optional[dict]:
    snap = load()
    return snap["members"].get(str(user_id)) if snap else None


def build(user_ids: list[int]) -> dict:
    """Read everything the demo needs for these members from MySQL."""
    if os.environ.get(ENV) or os.environ.get(ENV_JSON):
        raise SystemExit(f"unset {ENV}/{ENV_JSON} first: a snapshot is built from MySQL, not from a snapshot")

    from .adapt import score_trend
    from .estimate import population_scores
    from .features import get_member_features
    from .series import series_for_member

    members = {}
    for uid in user_ids:
        features = asdict(get_member_features(uid))
        for key in UNUSED_FEATURES:
            features[key] = None
        members[str(uid)] = {
            "features": features,
            "score_trend": score_trend(uid),
            "series": {r: series_for_member(uid, r) for r in RANGES},
        }
    return {"population_scores": list(population_scores()), "members": members}


if __name__ == "__main__":
    out = json.dumps(build([int(a) for a in sys.argv[1:]]), separators=(",", ":"))
    sys.stdout.write(out)
    print(f"{len(out.encode())} bytes", file=sys.stderr)
