# Database design: the plan app's own DB + the Sphery bridge

Draft, Aug 5. Written as the working proposal for the Michel meeting this week
and as the blueprint for the engine's persistence layer (E3). Everything below
is designed against the static July 2026 export first; nothing assumes live
access until we agree on a mechanism.

## The shape in one sentence

Two worlds with a narrow bridge: our own database owns everything the plan app
creates (members, plans, logs, points), and the Sphery production database is a
read-only source of training telemetry that we reach through one well-defined
seam.

## Principles

1. **Two worlds, narrow bridge.** We never write to Sphery's DB. Everything we
   create lives in our own schema. The only coupling is a nullable
   `sphery_user_id` on our members table and a fixed list of tables we read.
2. **Multi-tenant from day one.** The Sphere Darmstadt is the pilot, but the
   franchise concept and other gym chains are the business case. Every table
   hangs off `org -> gym -> member`, so a chain with 40 locations is a data
   problem, not a schema migration.
3. **Stimulus-based and equipment-agnostic.** Stations declare which training
   stimuli they can deliver. Plans prescribe stimulus, intensity, and duration.
   The same plan resolves onto any gym's floor, ExerCube or not.
4. **Static-first.** Build and test against the local export. The bridge
   becomes live later (replica, export sync, or API, see open questions).
5. **Rationale everywhere.** Plans and plan changes store their human-readable
   reason. That is a product feature, so it is a column, not a log line.

## World 1: our own database (we own all writes)

| Table | Purpose and key columns |
|---|---|
| `orgs` | Gym chain or franchise operator. `id, name` |
| `gyms` | One physical location. `id, org_id, name, location` |
| `stations` | A gym's floor. `id, gym_id, name, is_sphery_equipment, stimulus_types (json)` |
| `members` | The plan app's own identity, not Sphery's. `id, org_id, home_gym_id, name, email, dob, gender (nullable), sphery_user_id (nullable, the bridge key)` |
| `questionnaire_responses` | Versioned intake answers. `id, member_id, answers (json), questionnaire_version, created_at` |
| `plans` | One generated block. `id, member_id, gym_id, goal, status (active/superseded/completed), rationale, fitness_estimate (json snapshot), weeks (json), created_at` |
| `plan_changes` | The adaptive loop's audit trail. `id, plan_id, triggered_by, changes (json), rationale, created_at` |
| `session_logs` | One completed circle training. `id, member_id, plan_id, session_ref, started_at, completed_at, circuit (json: per-leg station, minutes, zone seconds), avg_hr, max_hr, points_earned, source (app/kiosk)` |
| `feedback` | Member feedback, optionally tied to a session. `id, member_id, session_log_id (nullable), rating, text, created_at` |
| `points_ledger` | Append-only. Balance is `SUM(delta)`, never a stored counter. `id, member_id, delta, reason, ref, created_at` |
| `quests` | Definitions, per gym or global. `id, gym_id (nullable), title, rule (json), reward_points` |
| `member_quests` | Progress per member. `member_id, quest_id, progress, completed_at` |
| `rewards` | The gym's perk catalog (per-gym data, not code). `id, gym_id, kind, label, points_cost` |
| `reward_claims` | Claim and fulfilment tracking. `id, member_id, reward_id, status (claimed/redeemed), claimed_at` |

Plan weeks and circuits are JSON documents in v1. They are read whole, written
whole, and versioned by the plan row; normalizing them into `plan_sessions`
rows buys nothing until something needs to query across sessions.

## World 2: the Sphery bridge (read-only)

Tables we read, and only these:

- `Users` (identity join target)
- `HealthData` (dob, weight, height; gender when present)
- `Workouts` (scores, hrAverage/hrMax, timeInTier1-5, exercise counts)
- `HrStats` (round and pause HR, the HR-recovery source)
- `HrValues` (HR time series, resting-HR estimation)
- `RaceConfigs` (difficulty, hrTarget, duration; export compatibility)

Hard rules at the seam:

- Never write. The bridge is a read path, enforced by DB grants, not by
  discipline.
- Never read `hrRestingPulse` or `hrMax` (always NULL in production). The
  engine estimates resting HR from lowest sustained `HrValues` and max HR from
  observed workout maxima with Tanaka as the cold-start prior.
- Never read the `age` column. Always compute age from `dob`.
- `CircleTrainingExerciseLogs` stays out of scope until v2 (sparse data,
  ~19 users).

## Open questions for the Michel meeting

1. **GDPR and health data.** Where is this DB allowed to live, do we need a
   data processing agreement, and what is Sphery's position on us storing
   HR-derived data about members? (Also one for Helen and Julian.)
2. **Live access mechanism.** When we go beyond the static export: read
   replica, scheduled export sync, or an API in front of the production DB?
3. **Identity mapping.** How does a plan-app member get matched to a Sphery
   user reliably: email, kiosk account id, something else?
4. **HR-zone gap in the kiosk format.** `CreateTrainingRequest` exercises
   carry no hrTarget or zone today (Michel's TODO from Jul 17). Our circuits
   prescribe a zone per leg, so we need a field or an agreed convention.
5. **CircleTrainingExerciseLogs roadmap.** When does it become the production
   log for circle trainings, and is the schema stable enough to design
   `session_logs` imports against?
