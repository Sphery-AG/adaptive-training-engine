# Adaptive Training Plan Generator — Sphery AG

Generates personalized workout plans from real ExerCube session data. The
engine estimates a member's fitness from their training history (heart rate,
scores, recovery), a rules engine turns estimate + goal into an 8-week plan of
circle trainings, and every completed session feeds back into the plan with a
plain-language explanation of what changed and why.

Built by Anthony McCrovitz, summer internship 2026. Last build day Aug 14, 2026.

Hosted demo: https://sphere-adaptive-training.vercel.app — the UI running on a
TypeScript stub with fake data, no backend. The real system runs locally.

## Status

Against the six acceptance criteria in the internship brief:

| # | Criterion | State |
|---|---|---|
| 1 | New user + questionnaire → valid plan | **Done** — cold-start flow, screens `34–37` |
| 2 | Same goal, different histories → different plans | **Done** — Lena vs Marco, screens `31–33` |
| 3 | New session data → plan updates with explanation | **Done** — adaptation screen, `21–26` |
| 4 | Output compatible with RaceConfig/WorkoutPreset | **Shallowly met** — the JSON shape is right and verified against the dev API, but the endpoint places the member in a reference Darmstadt circle instead of exporting their own plan. `path-to-production.md`, gap 0 |
| 5 | One-command run on fresh machine + README | **Done** — `docker compose up --build` |
| 6 | Written model/feature/limitations summary | **Done** — `docs/model-summary.md` |

35 tests pass, 3 DB-backed tests skip cleanly when MySQL is down.

One architectural debt is worth knowing before touching anything: two pieces of
plan logic (circuit resolution and the kiosk export) still exist twice, once in
`engine/app/` and once in `web/lib/stub/engine.ts`. They agree today, so nothing
in the demo is wrong, but it violates the rule that all generation logic lives
in `engine/`. It is gap 0 in `path-to-production.md` and the first thing to fix.

What is **not** done, and was never in v1 scope: real authentication
(user-select stands in for login), a provisioned database (the schema is
written and verified, but nothing persists — a refresh loses state), a hosted
engine, and equipment beyond the ExerCube. `docs/path-to-production.md`
sequences all of it.

## The app

Five surfaces, all captured in `docs/screens/` (60 PNGs at 2×, ready for Miro):

- **Intake** — goal, focus areas, availability and equipment, a health gate
  that branches into body part and recovery stage, then a review.
- **Today** — the next session, and the trend behind it.
- **Plan** — the full 8-week block. Members can hold more than one plan at a
  time (e.g. general fitness plus an event) and switch between them.
- **Cards** — the collection. All 105 exercises from the real Darmstadt
  catalogue as collectible cards across 50 movement families, earned by
  training them. A family's rungs map to rarity and points: Foundation =
  Common (20), Progress = Rare (30), Mastery = Legendary (50).
- **Circle** — the circle-training view.

Design system and the reasoning behind it: `DESIGN.md`. Product argument:
`PRODUCT.md`.

## Architecture

- `web/` — Next.js member app. UI only; talks to the engine over HTTP. Ships
  with a TypeScript stub of the engine so the hosted demo runs without a
  backend.
- `engine/` — Python + FastAPI. All analytics, estimation, plan generation,
  and adaptation. Reads the Sphery MySQL export directly, read-only.
  - `GET /estimate/{user_id}` — fitness estimate from real history, with
    rationale and evidence counts.
  - `POST /generate-plan` — estimate + questionnaire + gym stations → 8-week
    plan, resolved onto the gym's floor.
  - `POST /update-plan` — a completed session → adjusted plan + what changed
    and why (HR vs. target zone, perceived effort, or real score trend).
  - `GET /generate-plan/{user_id}` — kiosk-compatible CreateTrainingRequest
    JSON (the exact shape the NEXUS kiosk POSTs, verified against the live
    dev API — see `docs/kiosk-api.md`). Still the step-1 path: it places the
    member in a reference Darmstadt circle rather than exporting their
    generated plan (`docs/path-to-production.md`, gap 0).
- `engine/db/` — the plan app's **own** database: PostgreSQL 16,
  `schema.sql`, 58 tables. Written, verified, and not yet provisioned. Never
  joined to the Sphery DB; the bridge is an id, not a foreign key.
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

### The plan-app schema

```bash
createdb planapp
psql -d planapp -v ON_ERROR_STOP=1 -f engine/db/schema.sql
psql -d planapp -f engine/db/seed_gyms.sql
psql -d planapp -v ON_ERROR_STOP=1 -f engine/db/verify_schema.sql   # on a fresh db
```

`verify_schema.sql` must pass after any schema change. It builds a small world
and then tries to break it: 126 checks, 52 constraint rejections and 74
assertions.

### Deployment

The Vercel project `sphere-adaptive-training` is linked to this repo
(`main`, root directory `web/`), so pushes to `main` build the web app. Only
the web app deploys — the engine is not hosted anywhere. Note that Vercel's
Hobby plan caps deployments at 100/day **account-wide**, not per project.

## Documentation

Full index with what is current and what is a historical record:
[`docs/README.md`](docs/README.md). The five to read first:

- `docs/code-orientation.md` — **start here if you are picking up the code.**
  How a plan actually gets made, what to read in what order, and the traps.
- `docs/limitations.md` — everything that is not what it looks like, in one
  place.
- `docs/model-summary.md` — the model, its features, and its limitations.
  Acceptance criterion 6, and the honest account of where the numbers are
  thin.
- `docs/path-to-production.md` — what separates this demo from a product,
  sequenced, plus the Aug 26 demo slice.
- `docs/plan-app-database-design.md` — the 58-table schema, why it is shaped
  that way, and how to run it.
- `docs/kiosk-api.md` — the NEXUS kiosk circle-trainings API (v1 live + v2),
  transcribed from Sphery's docs and verified against the dev system.
