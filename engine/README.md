# Engine

Reads a member's history from the static Sphery export and generates a training
plan, expressed as a kiosk `CreateTrainingRequest` (the exact JSON the Unity
kiosk runs). ML estimates fitness; rules generate the plan. No plan is invented
end-to-end by a model.
/
## Status

Fitness estimation, plan generation, and adaptation all run here (Aug 7):

- `GET /estimate/{user_id}` — fitness estimate from the member's real history,
  population-ranked against everyone with 15+ workouts, with rationale.
- `POST /generate-plan` — estimate + questionnaire + the gym's stations → an
  8-week plan resolved onto that floor.
- `POST /update-plan` — a completed session → adjusted plan + what changed
  and why.

Known gap: `GET /generate-plan/{user_id}` (kiosk JSON) is still the original
step-1 path in `app/generate.py` — it copies a reference Darmstadt circle and
places the member in it, ignoring the generated plan. The real
session→`CreateTrainingRequest` mapping currently lives in the web stub
(`web/lib/stub/engine.ts`) and belongs here. Same for `circuit_for()` in
`app/plangen.py`: it is correct but only exercised by tests, while the UI
resolves circuits with its own TypeScript copy.

## Run it

Needs the local DB up (`docker compose up -d db` from the repo root).

```bash
cd engine
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt

# Print a member's circle as kiosk JSON:
./.venv/bin/python -m app.cli 82

# Or serve it:
./.venv/bin/uvicorn app.main:app --reload
# GET http://localhost:8000/generate-plan/82
```

Override the DB connection with `SPHERY_DB_URL` (default matches
docker-compose: `mysql://root:devpassword@localhost:3306/spherych_devapp`).

## Layout

- `app/contract.py` — the kiosk `CreateTrainingRequest` contract (source of truth).
- `app/db.py` — read-only access to the static Sphery export.
- `app/features.py` — per-member features read out of the export.
- `app/estimate.py` — fitness estimate + population ranking.
- `app/plangen.py` — plan generation rules and circuit resolution.
- `app/adapt.py` — a completed session folded back into the plan.
- `app/generate.py` — the step-1 kiosk path (see the gap under Status).
- `app/cli.py` — print a member's circle as JSON.
- `app/main.py` — FastAPI endpoints (`/generate-plan`, `/estimate`, `/update-plan`).
