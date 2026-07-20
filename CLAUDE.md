# Adaptive Training Plan Generator — Sphery AG

## What this is
Web app that generates personalized workout plans from ExerCube session data.
ML estimates user fitness from history; a rules engine turns estimate + goal
into a plan; plans re-adapt as new session data arrives.

## Architecture (do not violate)
- `web/` — Next.js (App Router) + TypeScript + Tailwind. UI only.
  Talks to engine via HTTP. NO analytics/generation logic here.
- `engine/` — Python + FastAPI. ALL analytics, ML, plan generation.
  Endpoints: /estimate, /generate-plan, /update-plan
- Local MySQL (Docker) holds the Sphery DB export. Engine reads it directly.
- Everything runs via docker-compose.

## Design principles
- Plan data model is stimulus-based and equipment-agnostic: sessions specify
  stimulus type, intensity (hrTarget), duration — never "ExerCube" hardcoded.
  ExerCube is the only implemented equipment profile in v1.
- Generated plans must be expressible in Sphery's RaceConfig/WorkoutPreset format.
- Every plan change carries a human-readable rationale string.
- ML estimates state; rules generate plans. No end-to-end plan generation by models.

## Out of scope v1 (do not build)
Real auth (user-select stands in for login), kiosk/app integration,
equipment beyond ExerCube, real-time in-session adaptation, deployment/hosting.

## Acceptance criteria (definition of done, Aug 14)
1. Cold start: new user + questionnaire → valid plan
2. Same goal, different histories → different plans
3. New session data → plan updates with explanation
4. Output compatible with RaceConfig/WorkoutPreset format
5. One-command run on fresh machine + README
6. Written model/feature/limitations summary

## Working in a Conductor workspace
Each workspace is a git worktree, so gitignored files are absent until setup
runs. `scripts/conductor-setup.sh` symlinks `_local/`, installs deps, and
builds `.venv`. `scripts/conductor-run.sh` derives per-workspace ports so
parallel workspaces don't collide. The MySQL container is shared across all
workspaces — start it once from the root clone, never per workspace.

## Data (verified July 2026 production export, loaded in local MySQL via docker-compose)
- 1,019 users; 291 with 10+ workouts; ~21,000 workouts; 1M+ HrValues rows
- Schema: Users, HealthData, Sessions, Workouts (scores, hrAverage/hrMax,
  timeInTier1-5, per-exercise counts), HrValues (HR time-series per workout),
  HrStats (round + pause HR → HR recovery), TimelineMarkers (per-event
  physical/cognitive precision), RaceConfigs (difficulty, hrTarget, duration),
  CircleTrainingExerciseLogs (new activity type — v2, do not build against)
- HealthData: dob/weight/height ~99% filled. The `age` column is unused — always
  compute age from dob. gender ~28% filled — optional input only.
- hrRestingPulse and hrMax are ALWAYS NULL — never read them. The engine
  estimates resting HR from lowest sustained HrValues per user, and hrMax from
  observed workout maxima with Tanaka (208 − 0.7 × age) as cold-start prior.
- DB connection (local dev): mysql://root:devpassword@localhost:3306/spherych_devapp
- DB dumps NEVER get committed (.gitignore covers *.sql, *.db)