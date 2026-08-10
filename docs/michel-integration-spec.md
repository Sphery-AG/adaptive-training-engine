# What Sphery needs to add so the kiosk, the Sphery app, and the plan app are one system

**Aug 10, 2026.** Every column named below was checked against the July 2026
export running locally, so the gaps are real rather than assumed.

The goal: a member gets a plan in the plan app, walks into the gym, the kiosk
runs the prescribed session, the results flow back, and the plan re-tunes. Three
front ends, one member, one thread of data. Today that thread breaks in five
specific places, and each break is a field.

## The flow, and where it breaks

```
  plan app  ──1── generates a plan (8 weeks of circle trainings)
      │
      2  pushes the next session to the kiosk   → POST /circle-trainings
      │
  kiosk     ──3── member runs it                → exercise logs, participant totals
      │
      4  results read back                      → GET /circle-trainings
      │
  plan app  ──5── re-tunes the plan, shows the reason
```

Steps 1, 2, and 4 work today. Step 3 loses the prescription's intensity, and
step 5 cannot tell which prescribed session a result belongs to.

## What we already have, and do not need changed

Stated so the ask stays small.

- **Identity is solved.** `auth/sign_in` returns a token carrying the Sphery
  user id. The kiosk QR login resolves to the same id. One key ties all three
  systems to one member, and it needs nothing added.
- **The write path exists.** `POST /api/v1/circle-trainings` accepts exactly the
  object our engine already emits.
- **The read path exists.** Circle trainings and their results are readable
  through public v1 GETs, which is why we are not asking for database
  credentials.
- **No changes to `Users`, `HealthData`, `Workouts`, `HrStats`, or `HrValues`.**
  We read them and nothing more.

## The five additions

Ranked by what blocks the loop.

### 1. A link from a circle training back to the plan session that prescribed it

**Table:** `CircleTrainings`
**Today:** `id, kioskId, setupByUserId, hyrox, name, mode, status, startedAt, completedAt, style`
**Missing:** any reference to the thing that asked for this training.

When the plan app pushes session `sess-w3-2` to the kiosk and the member runs
it, the results come back with no way to say which prescription they fulfilled.
The adaptive loop cannot close: we get a result and cannot attribute it.

**Ask:** one nullable string column, e.g. `externalRef VARCHAR(80) NULL`, echoed
back on reads and settable on `POST /circle-trainings`.

Generic on purpose. It costs Sphery nothing, it is meaningless to the kiosk, and
it is the single field that turns two systems into one loop. **This is the most
important item on the page.**

### 2. An HR target on each exercise

**Table:** `CircleTrainingExercises`
**Today:** `id, circleTrainingId, orderIndex, style, name, target`
**Missing:** any intensity prescription.

`target` carries the work ("1000m", "50x") but never the effort. Our circuits
prescribe a target zone per leg, because a plan without intensity is just a list
of stations. Right now that prescription is lost the moment a session reaches
the kiosk.

**Ask:** `hrTargetZone TINYINT NULL` (1-5), or `hrTargetMin`/`hrTargetMax` in
bpm if absolute ranges are preferred. Either works; the zone is simpler and
survives a member whose max HR is re-estimated.

Confirmed missing in both the live v1 API and the v2 proposal frames.

### 3. Intensity detail on the exercise log

**Table:** `CircleTrainingExerciseLogs`
**Today:** `measuredDuration, score, repetitions, status, calories, hrAverage`
**Missing:** `hrMax`, and any time-in-zone breakdown.

`hrAverage` alone cannot tell us whether a member held the prescribed zone or
spiked and recovered. `Workouts` already carries `timeInTier1-5` for ExerCube
sessions, so the concept exists in Sphery's model; it just does not reach circle
trainings.

**Ask:** `hrMax SMALLINT NULL`, plus `timeInTier1..timeInTier5` (seconds), on
the exercise log. This is what makes per-station feedback and the live zone
display real rather than estimated.

### 4. `hrMax` on the participant totals

**Table:** `CircleTrainingParticipants`
**Today:** `finishedAt, totalTime, totalScore, totalRepetitions, calories, hrAverage`
**Missing:** `hrMax`.

Session-level max HR feeds our max-HR estimate, which every zone boundary in the
app derives from. `Workouts` has both `hrAverage` and `hrMax`; circle trainings
have only the average.

**Ask:** `hrMax SMALLINT NULL`, matching `Workouts`.

### 5. Somewhere for the member's own rating

**Table:** `CircleTrainingParticipants` (or wherever Sphery prefers)
**Today:** nothing.

After a session the member rates it 1-5. That rating drives the next plan: a 1
makes it harder, 2-4 holds, a 5 eases it. It is the strongest signal we get from
members without a heart-rate belt, which is roughly 90% of sessions today.

**Ask:** `perceivedEffort TINYINT NULL` (1-5).

If Sphery would rather not hold subjective data, we keep it in our database and
this one drops off the list. Worth a decision either way, because if the Sphery
app ever shows session history it should show the same rating the member gave.

### Also worth deciding: sets

The kiosk model has one `target` string per exercise and no concept of sets. If
prescriptions need "3 sets of 10", that is either a `sets TINYINT NULL` column
or a convention encoded in `target` ("3x10"). We can work with either, but it
should be a decision rather than an accident.

## The one architectural question

**Where does the plan live?**

Today it exists only in the plan app's database. That is fine while the plan app
is the only thing that shows it. It stops being fine the moment the Sphery app
or the kiosk wants to show "your next training", because neither can see it.

Three options:

1. **The plan app serves it.** We expose a read API; the Sphery app and kiosk
   call it. Nothing changes in Sphery's schema. Fastest, and keeps plan logic in
   one place.
2. **Sphery stores it.** A `TrainingPlans` table on Sphery's side that we write
   through the API. Deepest integration, largest change, and it puts plan
   structure into a schema that would then have to version alongside ours.
3. **Neither, for now.** The plan app stays the only surface that shows plans,
   and the kiosk only ever receives individual sessions. This is what the five
   additions above already support.

Option 3 is what we should ship first, because it needs no decision from anyone
and the five fields make it work. Option 1 is the natural next step. Option 2
should not be chosen by default just because it sounds like "real integration".

## What we need for the trend views

The plan app shows a **body trend** and a **brain trend** over week, month, and
year. These are our definitions, composed from whatever signals are real. No
extra columns are required: `CircleTrainingParticipants` already gives
`totalTime`, `totalScore`, `calories`, and `hrAverage` per session per member,
and `Workouts` gives per-session history for ExerCube.

Two notes from reading the export:

- `brainScore` carries a genuine signal. For one member with 108 sessions it
  moves from 0.67 to 0.93 across their history, which is a real learning curve.
- `bodyScore` is a 0-1 ratio with a strong ceiling effect (0.96 to 0.99 for the
  same member), so it will not carry a body trend on its own. We will compose
  that trend from performance and heart-rate signals instead.

Adding items 3 and 4 above makes both trends considerably better, because
time-in-zone and max HR are the strongest physical signals available.

## Summary

| # | Table | Field | Why |
|---|---|---|---|
| 1 | `CircleTrainings` | `externalRef` | Closes the loop between prescription and result |
| 2 | `CircleTrainingExercises` | `hrTargetZone` | A plan keeps its intensity at the kiosk |
| 3 | `CircleTrainingExerciseLogs` | `hrMax`, `timeInTier1-5` | Real per-station intensity |
| 4 | `CircleTrainingParticipants` | `hrMax` | Feeds the max-HR estimate |
| 5 | `CircleTrainingParticipants` | `perceivedEffort` | The member's own rating, if Sphery wants it |

Five nullable columns. None break an existing client, none change a current
behaviour, and every one is additive. Item 1 is the one that matters most: it is
the difference between three systems that share a login and three systems that
share a member.
