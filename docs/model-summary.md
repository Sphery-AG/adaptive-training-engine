# Model, features, and limitations

The written summary required by the internship brief (acceptance criterion 6).
Honest by design: every number the system shows can be traced to a column in
the export or a documented estimate, and this document says where each one is
strong and where it is thin.

## The model in one paragraph

The engine does not use an end-to-end model that invents plans. It estimates a
member's *state* from their real training history and places it in the
population of members with regular history; a deterministic rules engine then
turns state + goal + gym into a plan, and folds each completed session back
in. ML estimates state; rules generate plans. Every output carries a
plain-language rationale.

## The fitness estimate

A member's headline fitness score is their percentile among all members with
15+ completed workouts (183 members in the July 2026 export), computed over
average ExerCube session score. Percentile was chosen over a learned score
because it is explainable ("fitter than 62% of regular members"), robust to
the score column's heavy tail, and stable under the static export.

Alongside the percentile, the estimate carries:

- **Resting HR** — the lowest sustained heart rate the member ever held
  (minimum `HrStats.hrMin`, floored at 30 bpm to discard sensor dropouts).
  The export's `hrRestingPulse` column is always NULL and never read.
- **Max HR** — the highest observed workout maximum; members without
  HR-tracked workouts get the Tanaka prior (208 − 0.7 × age). The source
  ("observed" vs "tanaka") is part of the estimate.
- **HR recovery** — average bpm drop during round pauses
  (`pauseStartHR − pauseEndHR`, both readings required).
- **Effort habit** — the member's share of time in HR zones 4–5, from the
  per-workout `timeInTier1..5` columns.
- **Evidence counts** — workouts analyzed and HR-tracked workouts ride along
  with every estimate so downstream logic (and humans) can weigh it.

Cold start (fewer than 3 scored workouts): the questionnaire's activity level
maps to a starting score (30–76) and Tanaka fills in max HR. The estimate is
marked `questionnaire_only` with confidence 0.3.

## Features (engine/app/features.py)

One flat row per member, every field traceable:

| Feature | Source | Note |
|---|---|---|
| age | HealthData.dob | the `age` column is unused (stale) |
| workouts_completed | Workouts, completedWorkout=1 | |
| avg_score, std_score | Workouts.score, zeros excluded | zeros are no-shows |
| avg_brain_score | Workouts.brainScore | degenerate in this dump (~1) |
| hr_workouts, avg_hr | Workouts.hrAverage > 0 | only ~10% of workouts carry HR |
| est_max_hr | max(Workouts.hrMax) or Tanaka | source recorded |
| est_rest_hr | min(HrStats.hrMin ≥ 30) | |
| hr_recovery_bpm | HrStats pause columns | |
| zone1..5 shares | timeInTier1..5, normalized | |
| avg_difficulty, avg_hr_target, avg_duration | RaceConfigs via Workouts | hrTarget is a fraction of max HR |

## Plan generation (engine/app/plangen.py)

Deterministic rules, ported from the validated front-end prototype:

- 8-week block as two 4-week waves: build ×3, deload, build ×3 from a higher
  floor, final week doubles as the retest.
- Starting difficulty = fitnessScore / 12, clamped 1–8 (of 10).
- Each week rotates the goal's stimulus sequence; chosen focus areas bias the
  rotation (same goal + different focus = visibly different plan).
- Zones per stimulus (endurance 3, intensity 4, recovery/mobility 1, ...);
  deloads cap intensity work at zone 2. Target bpm bands use heart-rate
  reserve (Karvonen) from the member's estimated resting and max HR.
- Sessions resolve onto the gym's stations by stimulus; a gym that can't
  deliver a stimulus gets an honest "substituted" flag in the rationale.
- Circle trainings follow per-goal templates (see
  docs/circuit-templates-evidence.md for the literature behind each);
  event-prep prefers the real HYROX stations, rehab prefers the medical
  corner, balance-first equipment is capped at zone 2.

## Adaptation (engine/app/adapt.py)

An evidence ladder, strongest first:

1. **Session HR vs the prescribed band**: clearly under → one difficulty step
   up; clearly over → one step down; inside → hold.
2. **Perceived effort** (when the app sends it).
3. **Real score trend**: average of the member's 5 most recent scores vs
   their long-run average (±10% / −25% thresholds).

Changes are always one step, apply only to future sessions of the same
stimulus, never raise deload weeks, and return a plain-language explanation.

## Limitations

- **The percentile is relative, not absolute.** It compares members of this
  gym's export, not a normed population. A gym of athletes would deflate
  everyone's number.
- **HR evidence is sparse.** ~10% of workouts carry HR; resting HR and
  recovery are missing for many members. The system degrades honestly
  (fields go null, rationale says so) but those members get weaker estimates.
- **bodyScore is unusable in this export** (~1 for nearly every row), so
  movement quality in the app comes from persona seeds, not data.
- **The export is static (July 2026).** Trend-based adaptation compares
  within the frozen history; in production it would compare against live
  sessions. No recency weighting beyond the last-5 window.
- **Circuit templates are evidence-informed drafts**, validated against
  training literature but not yet signed off by Sphery's training lead.
- **Zone prescriptions cannot reach the kiosk yet.** The kiosk API carries
  work targets ("1000m") but no HR target per exercise — the one open schema
  request (docs/kiosk-api.md).
- **Difficulty maps coarsely at export.** Our 1–10 scale must fold into
  RaceConfig's 0–3 enum, losing granularity at the boundary.
- **Cold start is a heuristic**, not a model: activity level → base score.
  It exists to make the first plan safe and reasonable, and to be replaced
  by data after three sessions.
- **v1 covers one equipment profile in depth** (the Sphere Darmstadt floor);
  other gyms resolve honestly but with generic stations.
