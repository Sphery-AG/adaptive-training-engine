"""Prove the schema holds a real plan, end to end.

Not a unit test. This asks the running engine for an actual generated plan,
writes the whole member journey into plan_app, and reads it back the way the
app will: member -> questionnaire -> plan -> session log -> plan change ->
points. If this passes, the schema is not just designed, it works.

    docker compose up -d db
    engine/.venv/bin/uvicorn app.main:app --port 8000   # from engine/
    engine/.venv/bin/python engine/db/verify.py

Safe to re-run: the member is upserted on sphery_user_id, and plans are
append-only by design (a new plan supersedes rather than overwrites).
"""

from __future__ import annotations

import json
import os
import urllib.request

import pymysql

ENGINE = os.environ.get("ENGINE_URL", "http://localhost:8000")
DB = dict(
    host=os.environ.get("PLAN_DB_HOST", "127.0.0.1"),
    port=int(os.environ.get("PLAN_DB_PORT", 3306)),
    user=os.environ.get("PLAN_DB_USER", "root"),
    password=os.environ.get("PLAN_DB_PASSWORD", "devpassword"),
    database=os.environ.get("PLAN_DB_NAME", "plan_app"),
)

# Sphery user 535: the member behind the "Lena" demo persona.
SPHERY_USER_ID = 535


def engine_plan(stations: list[dict]) -> dict:
    body = json.dumps(
        {
            "spheryUserId": SPHERY_USER_ID,
            "memberName": "Lena",
            "answers": {
                "age": 42,
                "goal": "improve_fitness_endurance",
                "focus": [],
                "activityLevel": "medium",
                "sessionsPerWeek": 3,
                "sessionLengthMinutes": 45,
            },
            "gym": {"id": "sphere-darmstadt", "name": "The Sphere Darmstadt", "stations": stations},
        }
    ).encode()
    req = urllib.request.Request(
        f"{ENGINE}/generate-plan", data=body, headers={"Content-Type": "application/json"}
    )
    return json.load(urllib.request.urlopen(req))


def main() -> None:
    conn = pymysql.connect(autocommit=True, **DB)
    cur = conn.cursor()

    # The gym's floor comes out of the database now, not out of the code.
    cur.execute("SELECT id FROM gyms WHERE slug = 'sphere-darmstadt'")
    gym_id = cur.fetchone()[0]
    cur.execute("SELECT slug, name, is_sphery_equipment, stimulus_types FROM stations WHERE gym_id = %s", (gym_id,))
    stations = [
        {
            "id": slug,
            "name": name,
            "isSpheryEquipment": bool(is_sphery),
            "stimulusTypes": json.loads(stim),
        }
        for slug, name, is_sphery, stim in cur.fetchall()
    ]
    print(f"floor read from DB: {len(stations)} stations")

    res = engine_plan(stations)
    plan, resolved = res["plan"], res["resolved"]
    print(f"engine plan: {len(plan['weeks'])} weeks, estimate {plan['fitnessEstimate']['fitnessScore']}/100")

    cur.execute("SELECT org_id FROM gyms WHERE id = %s", (gym_id,))
    org_id = cur.fetchone()[0]

    cur.execute(
        """INSERT INTO members (org_id, home_gym_id, sphery_user_id, display_name, dob)
           VALUES (%s, %s, %s, %s, %s)
           ON DUPLICATE KEY UPDATE display_name = VALUES(display_name)""",
        (org_id, gym_id, SPHERY_USER_ID, "Lena", "1983-11-21"),
    )
    cur.execute("SELECT id FROM members WHERE sphery_user_id = %s", (SPHERY_USER_ID,))
    member_id = cur.fetchone()[0]

    cur.execute(
        "INSERT INTO questionnaire_responses (member_id, answers, questionnaire_version) VALUES (%s, %s, %s)",
        (member_id, json.dumps({"goal": "improve_fitness_endurance", "sessionsPerWeek": 3}), "2026-08"),
    )
    cur.execute("UPDATE plans SET status = 'superseded' WHERE member_id = %s AND status = 'active'", (member_id,))
    cur.execute(
        """INSERT INTO plans (member_id, gym_id, goal, rationale, fitness_estimate, weeks, resolved)
           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
        (
            member_id,
            gym_id,
            plan["goal"],
            plan["rationale"],
            json.dumps(plan["fitnessEstimate"]),
            json.dumps(plan["weeks"]),
            json.dumps(resolved),
        ),
    )
    plan_id = cur.lastrowid

    first_session = plan["weeks"][0]["sessions"][0]["id"]
    cur.execute(
        """INSERT INTO session_logs
             (member_id, plan_id, session_ref, completed_at, perceived_effort, points_earned, source)
           VALUES (%s, %s, %s, NOW(), 'easy', 103, 'app')""",
        (member_id, plan_id, first_session),
    )
    cur.execute(
        "INSERT INTO plan_changes (plan_id, triggered_by, changes, rationale) VALUES (%s, %s, %s, %s)",
        (
            plan_id,
            first_session,
            json.dumps(["Difficulty raised on 6 upcoming cardio endurance sessions."]),
            "You rated the session easy, so difficulty steps up one notch.",
        ),
    )
    cur.execute(
        "INSERT INTO points_ledger (member_id, delta, reason, ref) VALUES (%s, 103, 'session completed', %s)",
        (member_id, first_session),
    )

    # Read it back the way the app will on sign-in.
    cur.execute(
        """SELECT p.id,
                  JSON_LENGTH(p.weeks),
                  JSON_EXTRACT(p.fitness_estimate, '$.fitnessScore'),
                  (SELECT COUNT(*) FROM session_logs WHERE plan_id = p.id),
                  (SELECT COUNT(*) FROM plan_changes WHERE plan_id = p.id),
                  (SELECT COALESCE(SUM(delta), 0) FROM points_ledger WHERE member_id = p.member_id)
           FROM plans p
           WHERE p.member_id = %s AND p.status = 'active'""",
        (member_id,),
    )
    plan_row, weeks, estimate, sessions, changes, points = cur.fetchone()

    assert weeks == 8, f"expected an 8-week block, got {weeks}"
    assert sessions >= 1 and changes >= 1, "session log and plan change should both be linked"
    print(
        f"read back: plan #{plan_row} weeks={weeks} estimate={estimate} "
        f"sessions={sessions} changes={changes} points={points}"
    )
    print("OK: the schema holds a real plan end to end.")


if __name__ == "__main__":
    main()
