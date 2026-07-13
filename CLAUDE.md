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

## Data
Schema from spherych_devapp dump (45 tables). Key tables: Users, HealthData,
Sessions, Workouts (scores, HR stats, timeInTier1-5, per-exercise counts),
HrValues (HR time-series per workout), HrStats (round + pause HR → HRR),
TimelineMarkers (per-event physical/cognitive precision), RaceConfigs
(difficulty, hrTarget, duration). DB dumps NEVER get committed (.gitignore).