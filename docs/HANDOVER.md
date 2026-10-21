# Handover

For a developer at Sphery picking this repo up cold. It covers what the system
is, how to run and deploy it, where the configuration lives, and what is left.
Where an older document disagrees with this one, this one is newer.

Written Oct 21, 2026, against commit `fafc372`.

## What it is

A member web app that turns a member's ExerCube history into an 8-week training
plan and adapts that plan as sessions come in. A model estimates the member's
fitness from their history, rules turn the estimate and the member's goal into a
plan, and every change to the plan comes with a plain-language reason.

Live demo: https://sphere-adaptive-training.vercel.app. Sign in as Lena or Marco.
`docs/demo-walkthrough.md` is the script Stephan uses with clients.

## Architecture

```
web/  (Next.js, Vercel: sphere-adaptive-training)
  │  HTTP, JSON
  ▼
engine/  (Python FastAPI, Vercel: sphere-adaptive-engine, region fra1)
  │  read-only                         │  not connected yet
  ▼                                    ▼
Sphery MySQL export (local Docker)     Plan-app Postgres (engine/db/schema.sql)
  or a JSON snapshot when hosted
```

- **`web/`** is UI only. It sends requests to the engine and renders what comes
  back. It also contains a full TypeScript stub of the engine
  (`web/lib/stub/engine.ts`), which takes over whenever the engine is unset or
  fails.
- **`engine/`** holds all analytics, estimation, plan generation and
  adaptation. Its endpoints are listed at the top of `engine/app/main.py`. The
  main ones are `/estimate/{id}`, `POST /generate-plan`, `POST /update-plan`
  and `/progress-series/{id}`.
- **Member data.** Locally, the engine reads the July 2026 Sphery production
  export from MySQL in Docker, and only ever reads it. The hosted engine has no
  database at all. It reads a JSON snapshot of two members, 535 (Lena) and 19
  (Marco), that is passed in through an environment variable
  (`engine/app/snapshot.py`). Any other member id is treated as a cold start.
- **Plan-app database.** The schema is a 58-table PostgreSQL design in
  `engine/db/schema.sql`, and `verify_schema.sql` checks it. **Nothing connects
  to it yet**, so plans and sessions live in browser state and a refresh loses
  them. Never join it to Sphery's data. The two are linked by an id, not a
  foreign key.

The rules that matter most are in `CLAUDE.md`. Despite its name, it is the most
accurate short description of the project and its data quirks for humans too.
Read it next, then `docs/code-orientation.md`.

### The two traps

1. **The silent fallback.** If the engine is down, `web/lib/engine/client.ts`
   returns `null` and the app quietly runs on the TypeScript stub instead. On
   screen, the badge under the member's name ("Live engine · N sessions") is
   how you tell. Locally, check whether uvicorn logged a request.
2. **Plan rules exist twice.** Circuit resolution lives in Python
   (`plangen.py`) and again in TypeScript (`web/lib/stub/engine.ts`). The
   screens use the TypeScript copy even when the plan came from Python, and no
   test checks that the two copies agree. See `code-orientation.md`.

## Running it locally

You need Docker Desktop, Node 20 or later, Python 3.11, and the Sphery export
at `_local/db/spherych_devapp.sql`. The export holds real member health data and
is never committed. Michel can provide it.

**Everything in one command:**

```bash
docker compose up --build        # app on :3000, engine on :8000
```

On first boot the export is imported into MySQL, which takes a few minutes.

**For development:**

```bash
docker compose up -d db
cd engine && python3.11 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m uvicorn app.main:app --reload --port 8000
cd web && npm install && NEXT_PUBLIC_ENGINE_URL=http://localhost:8000 npm run dev
```

Run uvicorn as `python -m uvicorn`, not `.venv/bin/uvicorn`. The console
scripts in a venv hard-code its absolute path, so they break if the folder is
moved or renamed.

**To run the engine the way it runs when hosted** (no MySQL needed):

```bash
cd engine && ENGINE_SNAPSHOT=../_local/engine-snapshot.json .venv/bin/python -m uvicorn app.main:app
```

`python -m app.snapshot 535 19 > ../_local/engine-snapshot.json` rebuilds the
snapshot from the local export.

**To run the web app alone on the stub:** `cd web && npm install && npm run dev`.

**Checks:** there is no CI, so these only run when someone runs them.

```bash
cd engine && .venv/bin/python -m pytest tests/   # 35 pass, 3 skip without MySQL
cd web && npx tsc --noEmit && npx eslint .
psql -d planapp -v ON_ERROR_STOP=1 -f engine/db/verify_schema.sql   # after any schema change, on a fresh db
```

## Deploying

Both apps are Vercel projects linked to `Sphery-AG/adaptive-training-engine`.
Each one builds from its own folder on every push to `main`:

| Project | Root directory | Public URL |
|---|---|---|
| `sphere-adaptive-training` | `web/` | https://sphere-adaptive-training.vercel.app |
| `sphere-adaptive-engine` | `engine/` | https://sphere-adaptive-engine.vercel.app |

> **Status at time of writing:** the engine project is linked to the repo but
> has no root directory set, so every push since Sep 19 has failed to build.
> The live engine is a manual deploy from Sep 19, and its code is the same as
> `main`. Setting the root directory to `engine` fixes this. This note goes
> once it is done.

- **Only the project whose folder changed rebuilds.** Each folder's
  `vercel.json` has an `ignoreCommand` that diffs the folder against the commit
  of the project's last successful deploy (`$VERCEL_GIT_PREVIOUS_SHA`), so a
  docs-only push cancels both builds and a `web/`-only push skips the engine,
  however many commits the push holds. If that commit is unknown, it falls back
  to the previous commit; if git cannot diff at all, the build runs. The
  `vercel.json` setting overrides the "Ignored Build Step" in the Vercel
  dashboard.
- **Use the public URLs.** Every other deployment URL is behind Vercel
  Deployment Protection and asks for a Vercel login.
- **Environment variables are set for Production only.** A preview deployment
  of the engine has no snapshot, so it tries MySQL and fails. A web preview has
  no engine URL, so it runs on the stub.
- **Both projects sit on Anthony's personal Hobby account**
  (`anthonymccrovitzs-projects`). They need moving to a Sphery-owned Vercel team
  before handover. The Hobby plan caps deployments at 100 a day **across the
  whole account**, and other projects share that cap.
- **`scripts/auto-deploy.sh` is obsolete.** It was a retry loop for that cap,
  from before the GitHub link existed. It hard-codes one laptop's paths, and
  nothing needs it now.
- **To deploy by hand** from a folder linked with `vercel link`, run
  `npx vercel@latest --prod`. Pushing to `main` is the normal route.

## Environment variables

Names only. The values are in the Vercel project settings, or the local defaults
are in `docker-compose.yml`.

| Variable | Read by | Where it is set | What it does |
|---|---|---|---|
| `NEXT_PUBLIC_ENGINE_URL` | web, at **build** time | Vercel `sphere-adaptive-training` (Production); compose build arg | The engine's base URL. If it is unset, the app runs entirely on the TypeScript stub. Because it is baked in when the app is built, changing it means rebuilding. |
| `WEB_ORIGIN` | engine | Vercel `sphere-adaptive-engine` (Production); compose | The one origin CORS allows. Defaults to `http://localhost:3000`. |
| `ENGINE_SNAPSHOT_JSON` | engine | Vercel `sphere-adaptive-engine` (Production, sensitive) | The demo snapshot itself, as JSON. When it is set, the engine never touches MySQL. |
| `ENGINE_SNAPSHOT` | engine | local only | Path to a snapshot file. Does the same job as the variable above. |
| `SPHERY_DB_URL` | engine | compose; local shell | MySQL connection for the export. Defaults to the local Docker database. |

The snapshot holds personal data about two real members. It lives in `_local/`
and in Vercel's environment, never in git. Treat it like the export.

## The exercise-to-station mapping

There are 101 exercises in the Darmstadt catalogue (v6, TRX removed). Each one
needs a station on the floor, because a member earns a card by being put on a
station that delivers that exercise.

- **The data:** `engine/data/exercise_stations.csv`, one row per exercise. The
  `station_id` and `station_name` columns carry the answer. `needs_review=yes`
  marks the 45 rows that rest on a guess rather than on the catalogue, and
  `note` says why each row is where it is.
- **To change a station,** edit the CSV row (`station_id` and `station_name`
  together, using the names in `STATIONS` in `engine/db/station_map.py`) and
  set `needs_review` to `no` once someone at Sphery has confirmed it. Then
  regenerate the review sheet:

  ```bash
  engine/.venv/bin/python engine/db/station_map.py render engine/data/exercise_stations.csv docs/exercise-station-mapping.md
  ```

  Don't edit `docs/exercise-station-mapping.md` by hand, because the next
  render overwrites it. `station_map.py build` creates the CSV from the
  catalogue spreadsheet and refuses to overwrite an existing CSV, because the
  CSV holds corrections the script doesn't know about.
- **Waiting on Stephan:** which exercises Tidal Tanks delivers (none so far).
  Whether the three proposed areas (Functional Floor, Plyo & Agility, Mobility
  & Balance) really exist on the floor. Which of the eight body regions EX092
  "100 Punches" belongs to. The sheet he was sent puts these three questions at
  the top.
- **Confirmed by Stephan:** eight body regions (Full Body, Legs, Glutes, Core,
  Back, Chest, Shoulders, Arms). Upper Body is no longer one of them.

At the time of writing nothing in the engine reads the CSV yet. It is input for
the card system, which is the next piece of work.

## Known issues

The full inventory is `docs/technical-status-2026-09-16.md`, with estimates.
The ones you will hit first:

- **Nothing is saved.** No database is connected, and a refresh loses the plan,
  sessions and points.
- **There is no real login.** "Continue with NEXUS" picks a demo persona.
- **Plan rules are duplicated** in Python and TypeScript (see the traps above).
- **The card system isn't wired up.** The catalogue is 2,919 lines of
  generated TypeScript (`web/lib/stub/cards.ts`, still v5 with 105 exercises).
  Unlocks come from a made-up formula. No plan refers to an exercise, so a card
  can't be earned by training.
- **The kiosk export isn't the member's plan.** `GET /generate-plan/{id}`
  returns valid kiosk JSON, but it copies a reference Darmstadt circle instead
  of exporting the member's plan.
- **Heart rate during a session is simulated.** It is never sent to the engine,
  so adaptation only acts on perceived effort and score trend.
- **Adaptation reads a frozen July 2026 export**, not what the member did this
  week.
- **There is no authentication on the engine.** Anyone with the URL can query
  it. The hosted copy only knows two members for that reason.
- **`web/` has no tests**, and there is no CI. eslint reports 4 errors, which
  are real React issues (refs read during render).
- **There's no GDPR position or data-processing agreement.** Nothing hosted may
  touch real member data until Sphery decides this.
- **Some older docs are out of date about hosting.** `README.md`,
  `docs/limitations.md` and `docs/code-orientation.md` still say the engine is
  not hosted and the demo runs on the stub. That stopped being true on Sep 18.

## What's left to build

Roughly in order. Estimates are from `technical-status-2026-09-16.md`, which
has the full list.

1. **Card system v1.** Serve the v6 catalogue from the engine. Let the engine
   own circuits so the web app only renders them. Pick an exercise per station
   from the CSV, with progression along each family. Group cards by the eight
   regions. None of this needs Stephan's answers. *In progress.*
2. **Persistence.** Provision the plan-app Postgres (Supabase was the working
   assumption) and write plans, sessions, plan changes and points to it. Many
   other items depend on this. ~5 d.
3. **Real sign-in** through Supabase Auth, linked to the member's Sphery id.
   2–4 d after persistence.
4. **Real unlocks and points**, counted from the exercises a member actually
   completed. 2–3 d after persistence.
5. **Kiosk export of the member's own plan**, on Circle Trainings V2. 3–5 d.
   Needs Michel: an HR target per exercise outbound, and per-zone durations
   inbound.
6. **Live data instead of the July export**, through the kiosk API. 3–5 d, plus
   a data agreement.
7. **CI and web tests:** a test runner for `web/`, a parity test or removal of
   the TypeScript rules copy, and HTTP tests for the engine.

## People

- **Stephan:** training lead. Signs off training content: circuit templates,
  card content, the station mapping.
- **Michel:** kiosk and data schema (Circle Trainings V2, the export). Owns the
  two open data asks above.
- **Julian:** wrote the kiosk API (the V2 proposal is labelled "Jules"; likely the same person).
- **Helen:** named with Stephan and Michel on the GDPR / data-processing question.
- **Anthony McCrovitz:** built this as an intern, summer 2026.
