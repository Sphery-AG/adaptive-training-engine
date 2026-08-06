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
## Coding guidelines (Karpathy-inspired)

Adapted from github.com/multica-ai/andrej-karpathy-skills. Bias toward
caution over speed; for trivial tasks, use judgment.

### 1. Think before coding
Don't assume. Don't hide confusion. Surface tradeoffs.
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity first
Minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
Ask: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical changes
Touch only what you must. Clean up only your own mess.
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.
- Remove imports/variables/functions that YOUR changes made unused;
  leave pre-existing dead code unless asked.
The test: every changed line should trace directly to the user's request.

### 4. Goal-driven execution
Define success criteria. Loop until verified.
- "Add validation" → "Write tests for invalid inputs, then make them pass."
- "Fix the bug" → "Write a test that reproduces it, then make it pass."
- "Refactor X" → "Ensure tests pass before and after."
For multi-step tasks, state a brief plan with a verify step per item.
