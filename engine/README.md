# Engine

Reads a member's history from the static Sphery export and generates a training
plan, expressed as a kiosk `CreateTrainingRequest` (the exact JSON the Unity
kiosk runs). ML estimates fitness; rules generate the plan. No plan is invented
end-to-end by a model.

## Status

Step 1 of the build: emit a valid `CreateTrainingRequest` for a real member.
The rule is intentionally simple for now (place the member in the real Darmstadt
circle). Next: real goal->stimulus rules, fitness estimate, adaptation.

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
- `app/generate.py` — plan generation rules (where steps 2-4 slot in).
- `app/cli.py` — print a member's circle as JSON.
- `app/main.py` — FastAPI endpoints (`/generate-plan`, `/estimate`, `/update-plan`).
