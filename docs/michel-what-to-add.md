# What to add to the Sphery database to support the training plan app

**For Michel · Aug 10, 2026**
The SQL is in `engine/db/sphery_additions.sql`. Every column type and table name
below was checked against the July 2026 export, and the whole file was applied
to a copy of the real schema to confirm it runs and the foreign keys resolve.

## The shape

Everything lives in **one database: yours**. The plan app hosts nothing and owns
no separate store. It reads the training data that is already there, and writes
the plan it generates back into the same place, so the kiosk, the Sphery app,
and the plan app are all looking at one member's one record.

**Eleven new tables, nine new columns on four existing tables.** Nothing changes
an existing column, nothing changes existing behaviour, every new column is
nullable, and no current client breaks.

## What already exists, that we are not duplicating

Checked first, so the ask stays small.

| Already there | We use it as-is |
|---|---|
| `Users`, `HealthData` | Identity and profile. `auth/sign_in` already returns the user id. |
| `Workouts`, `HrValues`, `HrStats` | The fitness estimate reads these. No changes. |
| `Progresses` (`totalExp`), `Achievements` (`expAmount`) | Sphery's own EXP. The plan app's points are a **separate currency with different rules** and stay in their own tables. See Part 3. |
| `TrainingFeeds` | Already a unified cross-activity feed with `calories`, `avgHeartRate`, `score`, `durationSec`. This is the natural home for plan session history too. |
| `RaceConfigs.hrTarget` | Precedent for item 2 below: HR targets already exist for ExerCube races. |

That last row matters. We are not asking for a new concept anywhere. Every
addition either extends something already in the schema or fills a gap that is
currently held together with free text.

## Part 1: four new tables

### `Gyms` and `GymStations`

**There is no canonical gym today.** A location exists only as free text in
three unconnected places: `Users.roleLocation`, `LicenseKeys.location`, and
`CircleTrainings.kioskId`. They are already inconsistent in the export:
`SPHERY-TESTENV1` and `SPHERY_TESTENV1` are the same kiosk with different
punctuation. So there is no reliable way to ask "which gym is this member
training at", let alone "what equipment does it have".

A plan is built onto one gym's actual floor, so the plan app needs this. It is
useful well beyond the plan app.

`GymStations.stimulusTypes` is the vocabulary the plan engine reasons in
(`cardio_endurance`, `strength`, `cognitive_motor`, and so on). That is what
lets one plan model serve a Sphere location, a bare hotel gym, and a HYROX box
without any of them being special-cased in code. **Adding a gym becomes an
INSERT rather than a release**, which is the whole Gold's Gym story.

### `TrainingPlans`

One generated block for one member. `weeks` and `resolved` are JSON documents:
read whole, written whole, versioned by the row. Normalising them into a
sessions table buys nothing until something needs to query across sessions, and
costs a join on every read today.

`fitnessEstimate` is the snapshot the plan was built from, kept so an old plan
can always be explained by the numbers that produced it.

A member may hold more than one active plan at a time. Nothing in the design
prevents that.

### `TrainingPlanChanges`

Every adaptive change, with the sentence the member was shown. This is a product
feature rather than a log: "why did my plan change" has to be answerable months
later, by the member and by a coach.

### `TrainingPlanQuestionnaires`

The intake answers a plan was generated from, versioned so a change to the
questionnaire never invalidates plans built from an older version.

## Part 2: nine columns on existing tables

### 1. `CircleTrainings.trainingPlanId` + `planSessionRef`

**The most important item here.** Right now a circle training comes back with
results and nothing says which prescription it fulfilled. The adaptive loop
cannot close: we can push a generated session to the kiosk, but when the results
arrive we cannot attribute them.

Because the plan lives in the same database, this is a real foreign key.

### 2. `CircleTrainingExercises.hrTargetZone` (and optionally `sets`)

`target` carries the work ("1000m", "50x") but never the effort, so a prescribed
zone is lost the moment a session reaches the kiosk. A plan without intensity is
just a list of stations.

`RaceConfigs.hrTarget` already does exactly this for ExerCube races. This
extends the same idea to circle trainings.

`sets` is optional and only matters if prescriptions need "3 sets of 10". The
model has no set concept today, so this is a decision rather than a gap.

### 3. `CircleTrainingExerciseLogs.hrMax` + `timeInTier1-5`

`hrAverage` alone cannot tell whether a member held the prescribed zone or
spiked and recovered. `Workouts` already carries `timeInTier1-5`, so the concept
exists in the schema; it simply does not reach circle trainings.

This is what makes per-station feedback and the live zone display real rather
than estimated.

### 4. `CircleTrainingParticipants.hrMax` + `perceivedEffort`

`hrMax` feeds the max-HR estimate that every zone boundary in the app derives
from. `Workouts` has it; circle trainings have only the average.

`perceivedEffort` is a 1-5 rating the member gives after a session: 1 means too
easy and the plan hardens, 2-4 holds, 5 means too hard and the plan eases. With
roughly 90% of sessions having no heart-rate belt, this is the strongest signal
the adaptive loop gets.

## Part 3: the plan app's session log and habit loop

### `TrainingPlanSessionLogs` — the one that is easy to miss

`CircleTrainings` records a session **that ran at a kiosk**. A member who trains
in the app, at a location with no kiosk, or on equipment the kiosk does not
drive, has nowhere for that session to live. It still needs to be recorded and
it still feeds the adaptive loop.

`circleTrainingId` links the two when a session did run at a kiosk, so that is
one session with two views rather than two competing records. The result columns
mirror `CircleTrainingParticipants` exactly, so an app-run and a kiosk-run
session are the same shape.

### Points, rewards, quests, emblems

**These are deliberately separate from `Progresses` and `Achievements`.** Those
are Sphery's EXP system with its own rules and its own currency. The plan app's
points reward *following a prescribed plan*: one point per training minute, two
for minutes inside the prescribed zone, settling into a monthly rank. Putting
both on one ledger would force one set of rules onto both.

Keeping them apart leaves the option of relating them later. Merging them now
cannot be undone.

- `TrainingPlanPoints` — append-only. A balance is `SUM(delta)`, never a stored
  counter, so a bug cannot silently corrupt a total and every award stays
  explainable.
- `TrainingPlanRewards` / `TrainingPlanRewardClaims` — the gym's perk catalog.
  The software tracks the reward; the gym hands over the smoothie. Per-gym data
  rather than code, so a franchise runs its own rewards without a release.
- `TrainingPlanMemberQuests` / `TrainingPlanMemberEmblems` — progress only. The
  definitions stay in code for v1, since three quest tiers and six emblems change
  with the product rather than per gym.

Every table is prefixed `TrainingPlan` so the whole feature can be namespaced,
migrated, or dropped as one unit.

### What needs no table at all

Worth stating, because it keeps the ask smaller than it looks. All of these are
queries over the tables above:

- **Monthly rank and points balance** — `SUM(delta)` over `TrainingPlanPoints`.
- **Streak and consistency** — `completedAt` dates in `TrainingPlanSessionLogs`.
- **Body and brain trends** over week, month, and year — computed from session
  history and the existing `Workouts` data. No metric snapshot table.

## The two things that need a decision, not code

1. **Should `perceivedEffort` live in Sphery at all?** If you would rather not
   hold subjective data, we keep it on our side and that column drops off. Worth
   deciding either way, because if the Sphery app ever shows session history it
   should show the same rating the member gave.

2. **Where does the plan app connect from?** These tables assume the plan
   engine has a connection to this database with write access scoped to the four
   new tables and read access to the existing ones. If direct access is not on
   the table, the same additions work through the API instead, and we would need
   endpoints for the four new tables.

## Summary

**Eleven new tables, nine new columns on four existing tables.**

| Table | Change |
|---|---|
| `Gyms` | new — no canonical gym exists today |
| `GymStations` | new — the floor, in stimulus vocabulary |
| `TrainingPlans` | new |
| `TrainingPlanChanges` | new — every adaptation with its reason |
| `TrainingPlanQuestionnaires` | new |
| `TrainingPlanSessionLogs` | new — sessions that never reach a kiosk |
| `TrainingPlanPoints` | new — append-only ledger |
| `TrainingPlanRewards` | new — per-gym perk catalog |
| `TrainingPlanRewardClaims` | new |
| `TrainingPlanMemberQuests` | new — progress only |
| `TrainingPlanMemberEmblems` | new — earned only |
| `CircleTrainings` | `+ trainingPlanId, planSessionRef` |
| `CircleTrainingExercises` | `+ hrTargetZone, sets` |
| `CircleTrainingExerciseLogs` | `+ hrMax, timeInTier1-5` |
| `CircleTrainingParticipants` | `+ hrMax, perceivedEffort` |

Written in the conventions already used in `spherych_devapp` (PascalCase plural
tables, camelCase columns, `createdAt`/`updatedAt` on every row) so it drops
into the existing Sequelize migration flow.
