# Limitations

Everything in this system that is not what it looks like. One page, so nobody
has to discover these one at a time.

`docs/model-summary.md` covers where the *model* is thin. This file covers
where the *build* is thin. Written Aug 13, 2026, against commit `894d98f`.

## What is simulated

| Thing | Reality |
|---|---|
| Login | There is no authentication. "Continue with NEXUS" picks a demo persona. The signup screen has a real password field that goes nowhere. Sphery's `auth/sign_in` was verified working on Aug 6 but is not wired in. |
| Persistence | Nothing is stored. Plans, completed sessions, points and streaks live in browser state and a refresh loses them. `engine/db/schema.sql` exists and verifies, but no process connects to it. |
| Heart rate during a session | Simulated. `LiveSession.tsx` generates plausible bpm from the member's estimated max HR. Nothing is measured. |
| The progress chart | Mock series (`web/lib/stub/progress-series.ts`). The engine has no time-series endpoint. The card labels itself as sample data on screen. |
| The hosted demo | `sphere-adaptive-training.vercel.app` runs entirely on the TypeScript stub. No engine, no database, invented members. |
| Kiosk export | `GET /generate-plan/{user_id}` returns valid `CreateTrainingRequest` JSON, but it places the member in a copied reference Darmstadt circle rather than exporting their generated plan. The shape is right; the content is not theirs. |
| Adaptation timeliness | Plans adapt against the frozen July 2026 export, not against what the member did this week. |

## What the export cannot tell us

Profiled July 2026. These are properties of Sphery's data, not bugs.

- **`hrRestingPulse` and `hrMax` are always NULL.** Never read them. The engine
  estimates resting HR from the lowest sustained `HrValues` per member, and max
  HR from observed workout maxima with Tanaka (208 − 0.7 × age) as the
  cold-start prior.
- **`HealthData.age` is unused.** Always compute age from `dob`. The column is
  there and it is not maintained.
- **`Workouts.hrAverage` is populated on only ~10% of workouts** (~2,009 rows),
  so every HR-derived feature is nullable and the engine records how many HR
  workouts backed each number.
- **`bodyScore` is unusable.** It is a 0–1 ratio, not a 0–100 score, and it has
  a strong ceiling effect (0.96–0.99 for the same member). The engine never
  uses it. `brainScore` sits in the same range but carries real signal — member
  535 moves 0.67 → 0.93 across 108 sessions.
- **`gender` is ~28% filled.** Optional input only; nothing may depend on it.
- **Only 291 of 1,019 members have 10+ workouts**, and the population rank is
  computed against the 183 with 15+. Estimates for everyone else are cold start.

## What is untested

- **`web/` has no test runner.** Not a gap in coverage — there is no
  infrastructure. The 827-line stub engine, which is what the demo actually
  executes, has zero automated verification.
- **The two implementations of the plan rules are not pinned to each other.**
  `engine/app/plangen.py` and `web/lib/stub/engine.ts` are kept in agreement by
  hand. No parity test exists. See `docs/code-orientation.md`.
- **There is no CI.** Nothing runs the 35 Python tests except a person
  remembering to.
- **The ERD sheets are hand-written**, not generated from `schema.sql`. They
  can drift from the schema silently.

## What has not been reviewed by the right person

- **The eight per-goal circuit templates are evidence-informed drafts**
  (`docs/circuit-templates-evidence.md`), written by an intern and not signed
  off by Sphery's training lead. The app prescribes intensity and station work
  to members who may have declared injuries. `member_restrictions` is the
  safety gate in the schema, but the content it gates is unvalidated. This is
  the only limitation on this page with a consequence worse than delay.
- **~65 focus-point explanations** shown in the intake info sheets were written
  the same way.
- **No GDPR position and no data-processing agreement.** Nothing hosted may
  touch real member health data until Sphery answers this.

## Deliberately out of scope for v1

Decided, not forgotten. Listed so nobody rebuilds the reasoning.

- Real auth: Supabase Auth owns credentials, `accounts.auth_user_id` is the
  join. There is deliberately no password hash, session, or reset table.
- Notifications: nothing sends anything. `integration_events` is the intended
  carrier and `consents` holds the opt-in.
- Competition classification (men/women/mixed): a kiosk and event concern.
- Equipment beyond the ExerCube: the data model is stimulus-based and
  equipment-agnostic, but ExerCube is the only implemented profile.
- Real-time in-session adaptation.

## Known open asks

Both belong to Michel and neither is blocking the demo.

1. **Per-zone durations inbound.** `CircleTrainingExerciseLogsV2` does not
   carry `timeInTier1-5`, so `seconds_in_zone` is always null and circle
   sessions can only earn flat completion points.
2. **An HR target per exercise outbound.** Neither kiosk v1 nor v2 exercises
   carry an HR zone or intensity target, only work targets like "1000m". A
   plan's per-station zone prescription cannot be expressed in a kiosk
   training. The demo encodes it in the training name as a workaround.
