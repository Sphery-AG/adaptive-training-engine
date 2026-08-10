# Michel meeting: what to show, what to ask

**Prep for the database and API session, week of Aug 10.**
Companion to `docs/database-schema.md` (the full proposal) and
`docs/kiosk-api.md` (the API transcription).

Michel owns the Sphery database and is a contractor, so his time is the scarce
thing. The aim is to arrive with the homework done, confirm four things, and
leave with one schema request filed. Most of what used to be on this list got
answered by reading the API on Aug 6.

## Open with what I built and how it touches his data

Two minutes, so he knows what he is being asked about.

- An adaptive planning layer between the Sphery app and the NEXUS kiosk. It
  estimates a member's fitness from their real training history, generates an
  8-week block of circle trainings on their gym's actual floor, and re-tunes
  the plan as they train.
- **It has never written to Sphery's database and is not asking to.** Every
  query is a read, parameterized, against a static July 2026 export running in
  local Docker. The tables read are `Users`, `HealthData`, `Workouts`,
  `HrStats`, `HrValues`, `RaceConfigs`. Nothing else.
- The app has its own database for everything it creates: plans, session logs,
  points, questionnaire answers. Sphery data stays read-only, always.

## What I already worked out, so we do not spend the meeting on it

Say these as findings, not questions. They shrink the agenda.

- **The v1 API already exposes what the adaptive loop needs.** Circle trainings
  and their results (per-exercise times, scores, calories, hrAverage) are
  readable through public GETs. So the ask is not "give us database access".
- **Identity is the Sphery user id.** `auth/sign_in` returns a token carrying
  it, verified with my own account (id 738). The kiosk QR login resolves to the
  same identity, so app sign-in and kiosk sign-in land on one key.
- **Schema V2.6 carries our features over.** The per-member HR series and pause
  logs with `hr60sRecovery` are the same signals the engine already derives
  from `HrValues` and `HrStats`. No redesign needed when v2 lands.
- **Known-dead columns, worked around already.** `hrRestingPulse` and `hrMax`
  are always NULL, so the engine estimates resting HR from the lowest sustained
  `HrValues` and max HR from observed workout maxima with Tanaka as the
  cold-start prior. The `age` column is unused, so age comes from `dob`.
  `bodyScore` is roughly 1 everywhere in the export, so it is not trusted as a
  movement-quality signal. Worth confirming these are known and expected rather
  than a broken export.

## The one real schema ask

**`CreateTrainingRequest` exercises carry no HR target or zone.** Confirmed
against both the live v1 API and the v2 proposal frames: neither has the field.

Our circuits prescribe a target zone per leg, because that is what makes a plan
a plan rather than a list of stations. Without somewhere to put it, a generated
circle training loses its intensity prescription the moment it reaches the
kiosk.

Ask for either a field on the exercise (`hrTargetZone`, or min/max bpm), or an
agreed convention we can encode. Either works. This is the only thing that
requires a change on his side, so lead with it and do not bury it.

## Four things to confirm

1. **Bless the API as the sanctioned bridge.** Is reading member training data
   through the public v1 API the supported path for a companion app? What is
   the production base URL, and is the public-read policy intentional and
   expected to persist?
2. **Identity.** Is the Sphery user id the long-term key to map our members
   onto? And how do gym-chain tenants fit, given the Gold's conversation?
3. **`CircleTrainingExerciseLogs`.** When does it become the production log for
   circle trainings, and is the schema stable enough to design our
   `session_logs` import against? The v2 frames suggest V2.6 and in progress.
4. **Per-station HR.** Circle exercise logs carry only `hrAverage` today, so
   time-in-zone per station does not exist. Is that coming with V2.6? Our live
   session screen and the adaptive loop both get better the moment it does.

## The GDPR question, and who owns it

Raise it, but do not expect Michel to settle it alone. Where is a database
holding HR-derived data about members allowed to live, and does this need a
data processing agreement? Our proposal reduces the exposure a lot: members
authorize with their own credentials, data is read per-request through the API,
and our database stores only what the app itself creates. Worth asking who owns
this decision, since it currently gates hosting.

## What I want to walk out with

- The hrTarget request filed, with a rough sense of when.
- A yes or no on the API as the sanctioned bridge, plus the production URL.
- Confirmation that `sphery_user_id` is the right long-term key.
- A named owner for the GDPR and hosting decision.

Everything else is nice to have. If the meeting runs short, these four are the
ones that unblock the remaining work.
