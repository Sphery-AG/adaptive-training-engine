# Database handoff: what exists, and what Michel needs to do to take it live

**Aug 10, 2026.** Companion to `docs/database-schema.md` (the reasoning) and
`docs/michel-meeting-prep.md` (the agenda). This page is the practical one:
the schema is written, applied, and proven, and this says what has to happen on
Sphery's side to run it for real.

## What is done

**The schema exists as runnable SQL, not a diagram.**

- `engine/db/001_schema.sql` — 14 tables, MySQL 8, foreign keys and indexes.
- `engine/db/002_seed.sql` — the operator, three gyms, and their real floors,
  including the verified 17-station Sphere Darmstadt floor.
- `engine/db/verify.py` — asks the running engine for a real generated plan and
  writes the whole member journey through the schema, then reads it back.

Applied to a MySQL 8 instance today and verified:

```
floor read from DB: 17 stations
engine plan: 8 weeks, estimate 99/100
read back: plan #2 weeks=8 estimate=99 sessions=1 changes=1 points=206
OK: the schema holds a real plan end to end.
```

That is a real member (Sphery user 535), a real fitness estimate computed from
their actual training history, and a real 8-week plan, persisted and read back.
Nothing in that line is mocked.

**To stand it up anywhere:**

```bash
mysql -u<user> -p < engine/db/001_schema.sql
mysql -u<user> -p < engine/db/002_seed.sql
python engine/db/verify.py          # optional proof it works
```

Takes under a minute on a fresh MySQL 8.

## The shape, in one paragraph

Two databases, one narrow bridge. **`plan_app`** is ours: it holds members,
their questionnaire answers, generated plans, every adaptive change with its
reason, session logs, and the points ledger. **Sphery's database is read-only**
and we never write to it. The only join between the two worlds is
`plan_app.members.sphery_user_id`, which holds the Sphery `Users.id`. Drop that
one column and the two systems are completely independent.

## What Michel needs to decide or do

Ranked by what blocks us.

### 1. Where does `plan_app` live?
It is a normal MySQL 8 database with no extensions and no special
configuration. Options, in order of how fast we could move:

- **A schema on Sphery's existing MySQL instance.** Fastest. No new
  infrastructure, no new credentials to manage, one backup policy.
- **A separate managed MySQL** (any provider). Cleaner separation, needs an
  account and someone to own it.

We need one of these picked, plus a connection string and a user with
`SELECT, INSERT, UPDATE, DELETE` on `plan_app` only.

### 2. Read access to Sphery data, and by which mechanism
Today the engine reads a static July 2026 export in local Docker. For live, the
proposal from the Aug 6 API findings is:

**Do not give us database credentials.** Instead, confirm that reading member
training data through the kiosk v1 API is the sanctioned path. It already
exposes circle trainings and their results, which is what the adaptive loop
needs. What we need from Michel:

- Confirmation that the public-read policy is intentional and will persist.
- The production base URL.
- Confirmation that `auth/sign_in` is the supported way for a companion app to
  authenticate a member (verified working on the dev system Aug 6, token
  carries the Sphery user id).

If the API is not the sanctioned path, the fallback is a read-only replica user
with `SELECT` on six tables: `Users`, `HealthData`, `Workouts`, `HrStats`,
`HrValues`, `RaceConfigs`. Nothing else, and never write.

### 3. The one schema change we need on Sphery's side
`CreateTrainingRequest` exercises carry **no HR target or zone**. Confirmed
against both the live v1 API and the v2 proposal frames.

Our circuits prescribe a target zone per leg, because that is what makes a plan
a plan rather than a list of stations. Without a field, a generated circle
training loses its intensity prescription the moment it reaches the kiosk.

Either a field on the exercise (`hrTargetZone`, or `hrMin`/`hrMax`) or an agreed
convention we can encode. **This is the only change we are asking for.**

### 4. Per-station HR in circle logs
Circle exercise logs carry only `hrAverage` today, so time-in-zone per station
does not exist. Is that coming with V2.6? Our live session screen and the
adaptive loop both improve the moment it does. Not a blocker, but it shapes what
we design next.

### 5. GDPR and the data agreement
`plan_app` stores members, their answers, plans, and session results. Under the
API proposal above it holds no bulk copy of Sphery's health data, and each
member's training data is read with their own authorization at the moment it is
needed. That is a much smaller footprint than hosting an export.

Still needs a position from Sphery on where this database is allowed to live and
whether a data processing agreement is required. **This is the item most likely
to gate go-live, and it needs a named owner.**

## What we handle on our side

Not asks, listed so the boundary is clear.

- Applying and versioning the schema (`engine/db/*.sql`, numbered).
- All writes to `plan_app`.
- The estimate, plan generation, and adaptive rules.
- Never writing to Sphery's database, enforced by the grant rather than by
  discipline.

## Known quirks we already work around

Worth confirming these are expected rather than a broken export.

- `hrRestingPulse` and `hrMax` are **always NULL** in production. The engine
  estimates resting HR from the lowest sustained `HrValues` and max HR from
  observed workout maxima, with Tanaka (208 − 0.7 × age) as the cold-start
  prior.
- The `age` column is unused; age is computed from `dob`.
- `bodyScore` is roughly 1 for every row, so it is not trusted as a
  movement-quality signal.
- Roughly 90% of workouts have no HR data at all, because the belt is opt-in.
  This is the single biggest limit on what the engine can say, and it is an
  operations decision rather than an engineering one.

## The short version

The database is written, applied, and proven against real data. What is left is
not code:

1. Somewhere to host it, and a connection string.
2. A yes on the API as the sanctioned read path, plus the production URL.
3. The `hrTarget` field on kiosk exercises.
4. A named owner for the GDPR question.
