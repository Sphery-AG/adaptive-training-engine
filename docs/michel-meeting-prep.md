# Michel meeting: agenda

**Prep for the database session, week of Aug 10.**
Bring: `docs/michel-what-to-add.md` (the reasoning) and
`engine/db/sphery_additions.sql` (the SQL he runs).

Michel owns the Sphery database and is a contractor, so his time is the scarce
thing. Arrive with the homework done, get four decisions, leave with a date.

## Open with what this is, in two minutes

- An adaptive planning layer between the Sphery app and the NEXUS kiosk. It
  estimates a member's fitness from their real training history, generates an
  8-week block of circle trainings on their gym's actual floor, and re-tunes the
  plan as they train.
- **It runs on his database.** No second store, nothing self-hosted. The plan
  the app generates is written back next to the training data it came from, so
  the kiosk, the Sphery app, and the plan app all read one member's one record.
- Working today against the July 2026 export: real fitness estimates for the 183
  members with 15+ workouts, real plans on the real Darmstadt floor, real
  adaptation. The schema additions were applied to a copy of his live schema to
  confirm they run.

## What I already worked out, so we do not spend the meeting on it

Say these as findings rather than questions. They shrink the agenda.

- **Identity is solved.** `auth/sign_in` returns a token carrying the Sphery
  user id, verified with my own account (id 738). The kiosk QR login resolves to
  the same id. Every new table keys off `Users.id`.
- **Nothing existing gets altered.** Twelve new tables, nine nullable columns on
  four existing tables. No current client breaks.
- **I checked what already exists before asking for anything.** `Progresses` and
  `Achievements` are Sphery's EXP system, `TrainingFeeds` is already a unified
  activity feed, and `RaceConfigs.hrTarget` is precedent for putting an HR target
  on circle-training exercises.
- **Known-dead columns, already worked around.** `hrRestingPulse` and `hrMax`
  are always NULL, so the engine estimates resting HR from the lowest sustained
  `HrValues` and max HR from observed workout maxima with Tanaka as the
  cold-start prior. `age` is unused, so age comes from `dob`. `bodyScore` and
  `brainScore` are 0-1 ratios rather than 0-100 scores. Worth one line
  confirming these are expected rather than a broken export.

## The four decisions

### 1. Database access for the plan engine
Everything lives in his database, so the engine needs a connection.

Ask for a user with **write access scoped to the twelve new tables** and **read
access to the six it reads** (`Users`, `HealthData`, `Workouts`, `HrStats`,
`HrValues`, `RaceConfigs`). Nothing else, and no writes to any existing table.
Dev first (`devapp`), production later.

If direct access is not on the table, the fallback is API endpoints for the
twelve new tables, which is more work for him rather than less.

### 2. Migration format and who applies it
The schema uses Sequelize (`SequelizeMeta`), so he will likely want migration
files rather than raw SQL. My file is plain DDL that runs as-is, and I can
convert it to Sequelize migrations if that fits his flow better.

Also worth settling: does he apply it, or can I open a PR against their repo?

### 3. Account creation
New members should be able to create a Sphery account from the plan app. The
kiosk API only ever authenticates: `auth/sign_in` and `auth/qr_exercube` both
assume the account exists, and nothing in the kiosk's network layer registers
one. `Users` clearly supports it (`email`, `username`, `password`, `verified`,
`verificationCode`), so registration lives somewhere the plan app cannot reach.

**Ask for a registration endpoint, or the details of the existing one**,
including the email verification flow. This is the only ask that is an endpoint
rather than a column.

### 4. When
The additions are small and additive. Ask what a realistic date looks like and
whether dev can move ahead of production.

## Also raise, but do not expect resolved

- **GDPR.** The data now lives entirely in Sphery's database rather than
  anywhere I control, which makes this simpler than it was. Still needs a
  position on the plan app writing member data, and it needs a named owner.
- **Per-station HR.** Circle exercise logs carry only `hrAverage`, so
  time-in-zone per station does not exist. Is that coming with V2.6? Covered by
  the additions if he takes them.
- **HR belts.** Roughly 90% of workouts have no HR data because the belt is
  opt-in. This is the single biggest limit on what the engine can say, and it is
  an operations decision rather than an engineering one.

## What I want to walk out with

1. A yes on the twelve tables and nine columns, and a date.
2. A connection string, or agreement on the API alternative.
3. The registration endpoint, or a pointer to the existing one.
4. A named owner for the GDPR question.

If the meeting runs short, these four are the ones that unblock the rest.
