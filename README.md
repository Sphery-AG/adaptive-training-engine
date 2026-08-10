# Adaptive Training Plan Generator — Sphery AG

Generates personalized workout plans from real ExerCube session data. The
engine estimates a member's fitness from their training history (heart rate,
scores, recovery), a rules engine turns estimate + goal into an 8-week plan of
circle trainings, and every completed session feeds back into the plan with a
plain-language explanation of what changed and why.

Built by Anthony McCrovitz, summer internship 2026.

## Architecture

- `web/` — Next.js member app. UI only; talks to the engine over HTTP. Ships
  with a TypeScript stub of the engine so the hosted demo
  (https://sphere-adaptive-training.vercel.app) runs without a backend.
- `engine/` — Python + FastAPI. All analytics, estimation, plan generation,
  and adaptation. Reads the Sphery MySQL export directly.
  - `GET /estimate/{user_id}` — fitness estimate from real history, with
    rationale and evidence counts.
  - `POST /generate-plan` — estimate + questionnaire + gym stations → 8-week
    plan, resolved onto the gym's floor.
  - `POST /update-plan` — a completed session → adjusted plan + what changed
    and why (HR vs. target zone, perceived effort, or real score trend).
  - `GET /generate-plan/{user_id}` — kiosk-compatible CreateTrainingRequest
    JSON (the exact shape the NEXUS kiosk POSTs, verified against the live
    dev API — see docs/kiosk-api.md). Still the step-1 path: it places the
    member in a reference Darmstadt circle rather than exporting their
    generated plan (docs/path-to-production.md, gap 0).
- MySQL 8 (Docker) — the July 2026 Sphery production export, local only.

## Run it (one command)

Prerequisites: Docker Desktop, and the Sphery DB export placed at
`_local/db/spherych_devapp.sql` (the export contains real member health data
and is never committed; ask Anthony or Michel for it).

```bash
docker compose up --build
```

First boot imports the export automatically (a few minutes), builds the
engine and web images, and serves:

- App: http://localhost:3000 — sign in as Lena or Marco (mapped to real
  export members) or create an account for the cold-start flow.
- Engine: http://localhost:8000/docs — interactive API docs.

All ports are bound to loopback only. To run the demo without any backend,
skip Docker entirely: `cd web && npm install && npm run dev` uses the stub.

## Development

```bash
docker compose up -d db                # just the database
cd engine && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload             # engine on :8000
cd web && npm install
NEXT_PUBLIC_ENGINE_URL=http://localhost:8000 npm run dev   # app on :3000
```

Without `NEXT_PUBLIC_ENGINE_URL` the web app falls back to its stub — the
same behavior as the hosted demo.

### Tests

```bash
cd engine && .venv/bin/python -m pytest tests/
```

Pure-logic tests always run; DB-backed tests skip cleanly when MySQL is down.

## Documentation

- `docs/kiosk-api.md` — the NEXUS kiosk circle-trainings API (v1 live + v2
  proposal), transcribed from Sphery's docs and verified against the dev
  system.
- `docs/database-schema.md` — proposed production schema and the read-only
  bridge to Sphery's data.
- `docs/circuit-templates-evidence.md` — the training-science evidence behind
  the eight per-goal circuit templates.
- `docs/path-to-production.md` — what separates the demo from a standalone
  product, sequenced, plus the Aug 26 demo slice.
