"""A member's training history over time, bucketed for the progress chart.

`features.py` reduces a member's whole history to one row. This does the
opposite: the same export, grouped into periods, so a chart can show how the
numbers moved rather than where they landed.

Three ranges, matching the drill-down Stephan asked for (Aug 14): a week as
seven days, a month as thirty days, a year as twelve months.

Every metric the export can support is returned on every call, so the UI can
offer all of them and let the member pick. Coverage across the 14,667 completed
workouts in the July 2026 export, which is why some lines will look solid and
others will not:

    bodyScore        99.7%      brainScore       99.7%
    measuredDuration 99.9%      score            99.6%
    burnedCalories   92.4%      hrAverage         9.9%
    distanceMeters    9.7%      hr recovery       5.3%

Three decisions worth knowing:

**Empty periods are returned, not skipped.** A week with no training is a real
fact about a member and the chart should show the gap. Dropping the bucket would
draw a straight line through it and quietly claim they trained.

**Nothing measured comes back as 0.** A month where nobody wore a strap has
`avg_hr: null`, never 0, because 0 bpm is not a heart rate. The UI is expected
to break the line rather than plot the floor.

**Anchored on the member's last session, not on today.** The export is frozen
(latest workout 2026-07-13), so anchoring on the clock returns three empty
ranges for everyone. The anchor travels back in the response so the UI can say
which period it is showing. Against a live database this is the member's most
recent training either way.

## The export is the seed, not the source of truth

Reading MySQL here is a starting condition, not the design. The Sphery export is
history that already happened; this app has its own database
(`engine/db/schema.sql`) and every session logged from here accumulates there.
Once that store is live, a member's series should come from it, with the export
filling in the years before they joined — and for a member who never used an
ExerCube, the export contributes nothing at all and the chart is still right.

So the shape of `SeriesPoint` is deliberately the app's own vocabulary rather
than a mirror of Sphery's columns. Swapping where the rows come from should not
change the response, the endpoint, or the chart. Metrics the export cannot fill
today (perceived effort, plan adherence, sessions on equipment that is not an
ExerCube) belong in this same shape when our store can answer them.
"""

from __future__ import annotations

import os
from dataclasses import asdict, dataclass
from datetime import date, timedelta
from typing import Literal, Optional
from urllib.parse import urlparse

import pymysql

Range = Literal["week", "month", "year"]

DEFAULT_DB_URL = "mysql://root:devpassword@localhost:3306/spherych_devapp"

# How many buckets each range shows, and how wide one bucket is.
SHAPE: dict[str, tuple[int, str]] = {
    "week": (7, "day"),
    "month": (30, "day"),
    "year": (12, "month"),
}


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
class SeriesPoint:
    """One bucket. Every metric is optional: None means "not measured here",
    which is different from zero and has to stay different all the way to the
    chart."""

    label: str          # axis label, e.g. "12 Jul" or "Jul"
    key: str            # the bucket itself, "2026-07-12" or "2026-07"
    sessions: int       # completed workouts in this bucket
    minutes: Optional[float]     # measuredDuration, summed
    body: Optional[float]        # bodyScore 0-100 (stored 0-1)
    brain: Optional[float]       # brainScore 0-100 (stored 0-1)
    calories: Optional[int]      # burnedCalories, summed
    avg_hr: Optional[float]      # only from strap-wearing sessions
    max_hr: Optional[float]      # highest HR reached in the period
    hr_recovery: Optional[float] # bpm drop during pauses, from HrStats
    score: Optional[float]       # raw game score, averaged
    distance_m: Optional[float]  # distanceMeters, summed
    hr_sessions: int             # how many of `sessions` wore a strap


def _month_floor(d: date) -> date:
    return d.replace(day=1)


def _add_months(d: date, n: int) -> date:
    m = d.month - 1 + n
    return date(d.year + m // 12, m % 12 + 1, 1)


def _buckets(anchor: date, rng: Range) -> list[tuple[str, str]]:
    """The (key, label) pairs to fill, oldest first. Built in Python rather than
    SQL so periods with no rows still appear."""
    count, width = SHAPE[rng]
    out: list[tuple[str, str]] = []
    if width == "day":
        start = anchor - timedelta(days=count - 1)
        for i in range(count):
            d = start + timedelta(days=i)
            out.append((d.isoformat(), d.strftime("%-d %b")))
    else:
        start = _add_months(_month_floor(anchor), -(count - 1))
        for i in range(count):
            d = _add_months(start, i)
            out.append((d.strftime("%Y-%m"), d.strftime("%b")))
    return out


def _f(v) -> Optional[float]:
    return float(v) if v is not None else None


def series_for_member(user_id: int, rng: Range = "year") -> dict:
    """Bucketed history for one member. Empty buckets included."""
    if rng not in SHAPE:
        raise ValueError(f"unknown range {rng!r}")

    _, width = SHAPE[rng]
    # Doubled on purpose: pymysql treats % as its own parameter marker, so a
    # bare %Y inside DATE_FORMAT is read as a placeholder and blows up.
    fmt = "%%Y-%%m-%%d" if width == "day" else "%%Y-%%m"

    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT MAX(createdAt) AS last FROM Workouts "
            "WHERE userId = %s AND completedWorkout = 1",
            (user_id,),
        )
        row = cur.fetchone() or {}
        anchor = row["last"].date() if row.get("last") else None
        if anchor is None:
            # No completed history at all: real answer, empty series.
            return {"user_id": user_id, "range": rng, "anchor": None, "points": []}

        buckets = _buckets(anchor, rng)
        first_key = buckets[0][0]

        # NULLIF everywhere a 0 means "not recorded" rather than a measurement:
        # bodyScore/brainScore/score/hrAverage are all 0 on rows the kiosk never
        # filled in, and averaging those in would drag every line down.
        cur.execute(
            f"""
            SELECT
                DATE_FORMAT(createdAt, '{fmt}')   AS k,
                COUNT(*)                          AS sessions,
                SUM(measuredDuration) / 60        AS minutes,
                AVG(NULLIF(bodyScore, 0)) * 100   AS body,
                AVG(NULLIF(brainScore, 0)) * 100  AS brain,
                SUM(NULLIF(burnedCalories, 0))    AS calories,
                AVG(NULLIF(hrAverage, 0))         AS avg_hr,
                MAX(NULLIF(hrMax, 0))             AS max_hr,
                SUM(hrAverage > 0)                AS hr_sessions,
                AVG(NULLIF(score, 0))             AS score,
                SUM(NULLIF(distanceMeters, 0))    AS distance_m
            FROM Workouts
            WHERE userId = %s
              AND completedWorkout = 1
              AND DATE_FORMAT(createdAt, '{fmt}') >= %s
            GROUP BY k
            """,
            (user_id, first_key),
        )
        rows = {r["k"]: r for r in cur.fetchall()}

        # Recovery lives in HrStats, one row per round rather than per workout,
        # so it is bucketed separately and joined on the period. Both pause
        # readings must be present and the drop must be real.
        cur.execute(
            f"""
            SELECT
                DATE_FORMAT(createdAt, '{fmt}')      AS k,
                AVG(pauseStartHR - pauseEndHR)       AS recovery
            FROM HrStats
            WHERE userId = %s
              AND pauseStartHR > 0 AND pauseEndHR > 0
              AND pauseStartHR >= pauseEndHR
              AND DATE_FORMAT(createdAt, '{fmt}') >= %s
            GROUP BY k
            """,
            (user_id, first_key),
        )
        recovery = {r["k"]: r["recovery"] for r in cur.fetchall()}

    points: list[SeriesPoint] = []
    for key, label in buckets:
        r = rows.get(key)
        rec = _f(recovery.get(key))
        if not r:
            points.append(
                SeriesPoint(label, key, 0, None, None, None, None, None, None, rec, None, None, 0)
            )
            continue
        minutes = _f(r["minutes"])
        points.append(
            SeriesPoint(
                label=label,
                key=key,
                sessions=int(r["sessions"]),
                minutes=round(minutes, 1) if minutes else None,
                body=round(_f(r["body"]), 1) if r["body"] is not None else None,
                brain=round(_f(r["brain"]), 1) if r["brain"] is not None else None,
                calories=int(r["calories"]) if r["calories"] is not None else None,
                avg_hr=round(_f(r["avg_hr"]), 1) if r["avg_hr"] is not None else None,
                max_hr=round(_f(r["max_hr"]), 1) if r["max_hr"] is not None else None,
                hr_recovery=round(rec, 1) if rec is not None else None,
                score=round(_f(r["score"])) if r["score"] is not None else None,
                distance_m=round(_f(r["distance_m"])) if r["distance_m"] is not None else None,
                hr_sessions=int(r["hr_sessions"] or 0),
            )
        )

    return {
        "user_id": user_id,
        "range": rng,
        "anchor": anchor.isoformat(),
        "points": [asdict(p) for p in points],
    }
