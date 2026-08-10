"""Prove the Sphery additions hold a real plan, end to end.

Not a unit test. This reads a gym's floor out of the new tables, asks the
running engine for an actual generated plan for a real member, writes the whole
journey through the additions, and reads it back the way the app will.

If this passes, the schema is not just designed, it works.

    docker compose up -d db
    engine/.venv/bin/uvicorn app.main:app --port 8000   # from engine/
    engine/.venv/bin/python engine/db/verify.py

Point it at a scratch copy of the schema, never production:
    PLAN_DB_NAME=sphery_full engine/.venv/bin/python engine/db/verify.py
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
    database=os.environ.get("PLAN_DB_NAME", "sphery_full"),
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

    # The floor comes out of the database now, not out of the code.
    cur.execute("SELECT id FROM Gyms WHERE slug = 'sphere-darmstadt'")
    gym_id = cur.fetchone()[0]
    cur.execute(
        "SELECT slug, name, isSpheryEquipment, stimulusTypes FROM GymStations WHERE gymId = %s",
        (gym_id,),
    )
    stations = [
        {"id": s, "name": n, "isSpheryEquipment": bool(sph), "stimulusTypes": json.loads(st)}
        for s, n, sph, st in cur.fetchall()
    ]
    print(f"floor read from DB: {len(stations)} stations")

    res = engine_plan(stations)
    plan, resolved = res["plan"], res["resolved"]
    est = plan["fitnessEstimate"]
    print(f"engine plan: {len(plan['weeks'])} weeks, estimate {est['fitnessScore']}/100")

    # Member state, then the plan, then what happened.
    cur.execute(
        """INSERT INTO TrainingPlanMembers (userId, homeGymId, joinedAt, createdAt, updatedAt)
           VALUES (%s, %s, NOW(), NOW(), NOW())
           ON DUPLICATE KEY UPDATE homeGymId = VALUES(homeGymId), updatedAt = NOW()""",
        (SPHERY_USER_ID, gym_id),
    )
    cur.execute(
        """INSERT INTO TrainingPlanQuestionnaires (userId, answers, version, createdAt, updatedAt)
           VALUES (%s, %s, '2026-08', NOW(), NOW())""",
        (SPHERY_USER_ID, json.dumps({"goal": "improve_fitness_endurance", "sessionsPerWeek": 3})),
    )
    cur.execute(
        "UPDATE TrainingPlans SET status='superseded' WHERE userId=%s AND status='active'",
        (SPHERY_USER_ID,),
    )
    cur.execute(
        """INSERT INTO TrainingPlans
             (userId, gymId, goal, rationale, fitnessEstimate, weeks, resolved, createdAt, updatedAt)
           VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())""",
        (
            SPHERY_USER_ID, gym_id, plan["goal"], plan["rationale"],
            json.dumps(est), json.dumps(plan["weeks"]), json.dumps(resolved),
        ),
    )
    plan_id = cur.lastrowid

    first = plan["weeks"][0]["sessions"][0]["id"]
    cur.execute(
        """INSERT INTO TrainingPlanSessionLogs
             (userId, trainingPlanId, planSessionRef, completedAt, perceivedEffort,
              hrAverage, calories, totalTime, pointsEarned, source, createdAt, updatedAt)
           VALUES (%s, %s, %s, NOW(), 1, 148, 412, 2700, 103, 'app', NOW(), NOW())""",
        (SPHERY_USER_ID, plan_id, first),
    )
    cur.execute(
        """INSERT INTO TrainingPlanChanges
             (trainingPlanId, triggeredBy, changes, rationale, createdAt, updatedAt)
           VALUES (%s, %s, %s, %s, NOW(), NOW())""",
        (
            plan_id, first,
            json.dumps(["Difficulty raised on 6 upcoming cardio endurance sessions."]),
            "You rated this one too easy, so difficulty steps up one notch.",
        ),
    )
    cur.execute(
        """INSERT INTO TrainingPlanPoints (userId, delta, reason, ref, createdAt, updatedAt)
           VALUES (%s, 103, 'session completed', %s, NOW(), NOW())""",
        (SPHERY_USER_ID, first),
    )

    # Read it back the way the app will on sign-in.
    cur.execute(
        """SELECT p.id, JSON_LENGTH(p.weeks),
                  JSON_EXTRACT(p.fitnessEstimate, '$.fitnessScore'),
                  (SELECT COUNT(*) FROM TrainingPlanSessionLogs WHERE trainingPlanId = p.id),
                  (SELECT COUNT(*) FROM TrainingPlanChanges     WHERE trainingPlanId = p.id),
                  (SELECT COALESCE(SUM(delta),0) FROM TrainingPlanPoints WHERE userId = p.userId),
                  (SELECT g.name FROM Gyms g
                     JOIN TrainingPlanMembers m ON m.homeGymId = g.id
                    WHERE m.userId = p.userId)
           FROM TrainingPlans p
           WHERE p.userId = %s AND p.status = 'active'""",
        (SPHERY_USER_ID,),
    )
    pid, weeks, score, logs, changes, points, home_gym = cur.fetchone()

    assert weeks == 8, f"expected an 8-week block, got {weeks}"
    assert logs >= 1 and changes >= 1, "session log and plan change should both be linked"
    print(
        f"read back: plan #{pid} weeks={weeks} estimate={score} sessions={logs} "
        f"changes={changes} points={points} homeGym={home_gym!r}"
    )
    print("OK: the additions hold a real plan end to end.")


if __name__ == "__main__":
    main()
