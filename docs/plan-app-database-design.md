# The plan app database

**Anthony · for Michel · August 2026**

Reference DDL: `engine/db/schema.sql` — PostgreSQL 16, 58 tables, 39 enums,
71 check constraints, 25 row-level-security policies.

Nothing below is asserted. `engine/db/verify_schema.sql` builds a small world in
the schema and then tries to break it: **126 executed checks — 52 constraint
rejections and 74 assertions — all passing.** The real 105-exercise Darmstadt
catalogue loads into it cleanly and idempotently, and the verified July 2026
Darmstadt floor seeds as 17 stations.

```
createdb planapp
psql -d planapp -v ON_ERROR_STOP=1 -f engine/db/schema.sql
psql -d planapp -f engine/db/seed_gyms.sql
python engine/db/load_catalogue.py <catalogue>.xlsx <postgres-url>
psql -d planapp -v ON_ERROR_STOP=1 -f engine/db/verify_schema.sql   # on a fresh db
```

This is a database designed from scratch for what the app needs, not a migration
of anything. The earlier drafts (`plan_app_schema.sql`, `plan_app_schema_v2.sql`,
`sphery_additions.sql`) are retired so there is one proposal to argue with.

## Where this sits in the sequence

Positions have changed as we learned. Worth being straight about, because you
have seen two of them.

| When | Position | Why it changed |
|---|---|---|
| Aug 5 | Our own DB, plus a read-only bridge to Sphery's | Starting point |
| Aug 10 | No separate DB — 12 tables inside Sphery's schema | Chased "one member, one record" |
| Aug 11 | Our own store, identity linked by SSO | **Your call** |
| Aug 12 | Same, now shaped to receive Circle Trainings V2 | Your V2.6 schema |

## The architecture: three apps, one seam

The kiosk, the Sphery app and the plan app have to talk. There are two ways, and
only one survives contact with three teams.

**Shared tables.** Every schema change becomes a three-way negotiation, any app
can violate another's invariants, and all three are pinned to one engine and one
outage. This is what the Aug 10 proposal implied, and the honest reason to be
glad it was overruled.

**Shared identity and an event log.** Each app owns its store. They agree on *who
a person is* and exchange *facts that happened*. Nothing else is coupled.

Three tables implement it:

- **`external_identities`** — the join. One account carries a Sphery user id, a
  kiosk id, and later Apple or Google. It replaces a `sphery_user_id` column,
  which quietly said Sphery is the only world that will exist. A gym chain that
  has never heard of Sphery is now a first-class customer, which is the business
  case.
- **`integration_events`** — a transactional outbox. The event is written in the
  same transaction as the change. A worker publishes it and stamps
  `published_at`. If the kiosk is down the row waits; the systems converge
  instead of silently diverging.
- **`inbound_events`** — the mirror. A kiosk result delivered twice is stored
  once, so ingestion is idempotent at the door rather than in every handler.
  This matters more under V2 than v1, because `trainingData` and `finalize` are
  both re-runnable by design.

## Principles

1. **Two worlds, one id.** We never write to Sphery's database. The coupling is
   an identity and a stream of events, never a foreign key.
2. **Multi-tenant from the first row.** Every table hangs off `org -> gym ->
   member`. A 40-location franchise is data, not a migration.
3. **Stimulus is the language of sessions; Body/Brain is the language of
   exercises.** They are different altitudes, not competitors.
4. **Rationale is a column.** Every plan and every change stores the sentence
   the member was shown.
5. **History is immutable.** A session that happened, happened. Deleting a plan,
   renaming a station or retiring equipment must never rewrite it.
6. **Derive what you can; store what you cannot.** A points balance is
   `SUM(delta)`. A ladder is `SELECT DISTINCT level`. A streak *freeze* is not
   derivable, because the point of a freeze is that nothing happened.

## How a kiosk session lands

Your V2.6 schema maps onto ours without being flattened:

| Circle Trainings V2.6 | Here |
|---|---|
| `CircleTrainingsV2` | `group_trainings` |
| `CircleTrainingGroupsV2` | `training_teams` |
| `CircleTrainingGroupMembersV2` | `session_logs` (one row per participant) |
| `CircleTrainingExercisesV2` | `training_stations` |
| `CircleTrainingExerciseLogsV2` | `session_exercise_logs` |
| `CircleTrainingPauseLogsV2` | `session_pause_logs` |
| `CircleTrainingHrDataV2` | `session_hr_samples` |

Three things in V2 changed the design rather than just being copied:

**Every participant is a group member, even a group of one.** There is no solo
path at the kiosk, so there is a team level here. An app-logged solo session
simply has `team_id NULL`.

**`roundIndex` and `splitIndex`.** An earlier draft keyed exercise logs on
`(session, order)` and would have *rejected a three-round circuit outright*.
The key is now `(session, order, round, split)`, and mutual-mode swaps store as
a second split at the same station and round.

**`hr60sRecovery` on pause logs is our flagship metric.** Beats dropped in the
first minute after effort — the one longevity KPI with real evidence behind it
(RR 4.0 for six-year mortality, NEJM). We had the metric and nowhere for it to
come from until `session_pause_logs`.

We keep `mode`, `type`, `style` and `hyrox` — not for competition reporting but
because they change how the data must be *read*. A relay participant did a
fraction of the circuit; crediting them the whole thing corrupts their load,
their points and their next plan. We deliberately do **not** store
`category` (men/women/mixed): it says nothing about training.

`gyms.kiosk_id` is how an inbound training resolves to a floor — V2 sends
`kioskId` as a string and nothing else in the payload says where it happened.

## What building the product taught us

These are the places where the schema differs from what we would have written in
July, each because something broke.

**1. A member's goal and an exercise's goal tag are two vocabularies.** The
intake offers eight goals; the catalogue tags exercises with seven, and has no
concept of an event. Using one enum for both made `prepare_for_event` literally
unstorable and misspelled three others. `goal_exercise_goals` is the bridge, and
it is data. "Prepare for an Event" resolves to two catalogue tags and owns
neither — which is the argument for the table.

**2. The prescription is rows, not a document.** No `weeks` blob.
`plan_weeks -> plan_sessions -> plan_session_exercises`. A missed session is the
absence of a log against a `plan_sessions` row, and that query is the whole
adaptive loop.

**3. Body Trend and Brain Trend, not scores.** A "Body Score of 82" is a number
nobody can act on or define. A line that climbs answers the only question a
member has, which is whether this is working. The value per session is the
weighted body/brain content of what was actually performed — derived from the
catalogue's own tags, never invented — and the weeks/months/years ranges
aggregate the same rows.

**4. Stations are instances, not a count.** The circuit resolver reserves a
bookend station, refuses to repeat a station while others are free, and when it
must repeat picks the one used longest ago. All three need station identity.
`gym_equipment` is a view over `stations`, so retiring a station updates the
count with no second place to edit.

**5. Warmups are marked.** `exercise_role` on both the prescription and the log.
Without it, "did they hold the prescribed zone" quietly averages in the warmup —
9 percentage points in our test fixture, and always in the flattering direction.

**6. There is a safety gate on both sides.** `exercises.impact` is only half a
gate; `member_restrictions` is the other half. It stores what the member
actually said ("Knee", or free text they typed) *and* structured
`avoid_region` / `avoid_movement` / `max_impact` the selection query can filter
on. A label we failed to map must never silently become "no restriction".

**7. The member's body is a dated series.** Weight and height drive VO2max
estimation, calories and load, and a member losing 8 kg over eight weeks is the
point of the product. They were previously only inside a questionnaire blob.

**8. Points rules are data.** The earn rates were designed Aug 3 and reworked
Aug 7 after zone-tiered rates were found to punish members on zone-2 plans. A
rule already rewritten once, that a gym may want to double for a week, is
configuration. Changing a rate closes the old row rather than editing it, so an
August award is still explainable in December — and `points_ledger` names the
rule that produced it.

**9. Two ranking mechanics, deliberately.** `member_rank_months` is the monthly
Bronze→Diamond status you hold; `league_cohorts` is the weekly cohort you are
ranked *against*. They share the tier enum and nothing else.

**10. Quest and emblem rules are typed.** `(metric, measured_over, comparison,
threshold)` instead of jsonb. A rule is a promise to a member, and a typo in a
blob is a quest nobody can complete and nobody notices.

**11. Events exist.** "Prepare for an Event" promises a ramp to a race, and
there was nowhere to put the date. A plan now knows its HYROX is 49 days out, so
a taper is placeable — and the kiosk's free-text `eventId` resolves onto the
same row.

**12. Consent, erasure and tenancy are modelled.** This is heart-rate data about
EU residents. Consent is a record with a timestamp and a policy version, not a
boolean. Erasure is a workflow with an audit trail. And row-level security is
enforced on member tables *and their children* — a parent-only policy still
leaks `session_exercise_logs` to a direct query.

## What the constraints actually reject

All executed, all rejected by the database:

| Attempt | Result |
|---|---|
| A three-round circuit under the old key | now **accepted** — it was the bug |
| `prepare_for_event` as a plan goal | now **accepted** — it was unstorable |
| Tagging an exercise with a member-only goal | rejected |
| The same (leg, round, split) twice | rejected |
| A windowed metric filed against one session | rejected |
| More seconds in the zone than seconds performed | rejected |
| `perceived_effort = 7` on a 1–5 scale | rejected |
| A reward claimed without spending points | rejected |
| Two claims charged to one debit | rejected |
| A replayed points award | rejected |
| A re-delivered HR sample at the same instant | rejected |
| The same kiosk training delivered twice | rejected |
| A quest with a threshold of zero | rejected |
| Two accounts claiming one Supabase auth user | rejected |
| A member both promoted and relegated | rejected |
| **Deleting a plan** | **sessions survive, `plan_id` set to NULL** |

## What this deliberately does not store

- **Points balance and rank** — `SUM(delta)`; rank is a window function over the
  cohort's date range.
- **Streak and consistency** — `completed_at` dates. Only the *freeze* is stored.
- **Missed sessions** — prescribed rows left-joined against logs.
- **A family's ladder** — `SELECT DISTINCT level`, served by a view.
- **Credentials** — Supabase Auth owns them. No password hash, no session table,
  no reset token. Real auth is out of scope for v1, and a half-built credential
  store is worse than none.
- **Notifications** — nothing sends anything yet. When it does,
  `integration_events` is the carrier and `consents` holds the opt-in.

## Engine

**PostgreSQL 16, hosted on Supabase.**

The data is deeply relational — member to plan to session to leg to split, an
append-only ledger, a multi-tenant hierarchy — so the real question is "which
SQL", not "SQL or Mongo". A document store would turn every row of the table
above into application code that three teams have to remember.

Why Postgres over MySQL 8, which is what Sphery runs:

- **Row-level security** — multi-tenant isolation as a database guarantee rather
  than a promise every query makes. 25 policies ship in the schema.
- **Partial and expression indexes** — `UNIQUE (lower(email))` without an
  extension; partial uniques let a global and a per-gym quest share one table,
  and let one open-ended point rule per event be enforced rather than hoped for.
- **Real enums and check constraints** that MySQL 8 only partially honours.
- **`jsonb` with GIN** for the few genuinely document-shaped values.

Supabase specifically because it is Postgres with auth, RLS and a REST layer
already attached, and the app has no authentication and no deployment story.
Two open problems answered by one choice.

**The honest counter-argument**, which is worth pushing on: Sphery runs MySQL,
and if these databases ever converge, one engine is one less thing in the way.
If that convergence is the plan, say so and this becomes MySQL 8 — the logical
model does not change and the translation is mechanical, except for two rows:

| Postgres | MySQL 8 |
|---|---|
| `bigserial` | `bigint unsigned AUTO_INCREMENT` |
| `timestamptz` | `datetime` (store UTC) |
| `jsonb` | `json` |
| `CREATE TYPE ... AS ENUM` | inline `enum(...)` |
| `UNIQUE INDEX (lower(email))` | generated column + unique index |
| **partial unique indexes** | **two tables, or a sentinel value** |
| **row-level security** | **enforced in the application** |

## Open questions

1. **Zone durations on circle trainings.** `CircleTrainingExerciseLogsV2`
   carries `calories`, `hrAverage` and `hrMax`, but no per-zone time. Our whole
   earn model pays double for minutes in the member's prescribed zone, and the
   adaptive loop's best signal is "did they hold the zone". Without it, circle
   sessions can only earn flat completion points. `timeInTier1-5` already exists
   on `Workouts`; the same five columns on the V2 exercise log would close it.
   **This is the ask that matters most.**
2. **Attribution.** Can a circle training carry the plan session that asked for
   it (`trainingPlanId` / `planSessionRef`)? Without it we can only match a
   kiosk result to a prescription heuristically, by member and time.
3. **Does the outbox go both ways?** We can publish plan and session events. Can
   the kiosk call us back when a training completes, or do we poll
   `GET /api/v1/circle-trainings`? Polling works and is what we assume; a
   webhook is better for both sides.
4. **Account creation.** `auth/sign_in` and `auth/qr_exercube` both assume the
   account exists. If a new member can create a Sphery account from our app,
   identity stays single. If not, we own accounts with no Sphery counterpart —
   which `external_identities` handles, but someone eventually reconciles.
5. **Where does this live, legally?** Health data on EU residents. Which
   jurisdiction, and is a data processing agreement needed between the plan app
   and Sphery? Longest lead time, and most likely to be nobody's job.
6. **Small ones from the board:** the URL casing is inconsistent
   (`circle-trainings` vs `trainingData`); `find CircleTraining ids` is `/api/v1`
   while everything else is `/api/v2`; and the board shows both `/teams` and
   `/groups` for adding a team.

## If this is accepted

1. Stand the schema up on Supabase; seed the floors; load the catalogue.
2. Build the ingestion worker for V2 — `inbound_events` at the door, then
   `group_trainings` downward. Everything it needs already has a column.
3. Publish `session.completed` on the outbox. Nothing has to consume it on day
   one; the log is worth having before the consumer exists.
4. Row-level security is already written, but confirm the API sets `app.org_id`
   per transaction before the second tenant, not after.
