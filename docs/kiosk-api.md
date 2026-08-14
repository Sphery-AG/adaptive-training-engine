# NEXUS kiosk circle-trainings API

Transcribed Aug 6 from the Miro board (Anthony's screenshots of Julian's API
frames). Two generations are documented there: the **v1 API that is live
today** and a **v2 proposal ("API Update: Proposal Jules") with Data Schema
V2.6**, still in progress. We integrate against v1; v2 tells us where things
are heading.

Comment counts on the board show Michel and Julian actively iterating on these
frames — treat v2 as moving.

## Connection details (found in TheSphere-Kiosk repo, verified Aug 6)

- **Base URL: `https://devapp.sphery.ch/api/v1/`** — from the kiosk's shipped
  `Assets/8_Data/Network API/Resources/ConnectionProfile.asset`. This is the
  dev system; it matches our DB export (`spherych_devapp`).
- **Auth endpoints** (from `Assets/2_Code/Network API/NetworkAPI.cs`):
  `POST auth/sign_in` with email + password returns a LoginResponse whose
  token goes into `Authorization: Bearer <token>`; the kiosk's QR login polls
  `POST auth/qr_exercube`. A member account's credentials are enough — the
  kiosk holds one token per logged-in user.
- **Verified live Aug 6**: `GET https://devapp.sphery.ch/api/v1/circle-trainings`
  returned HTTP 200 with real entries (82 pages), no auth needed — including
  trainings on kioskId `THESPHEREZUERICH` and, usefully, **`SPHERY-TESTENV1`**:
  an existing test kiosk id that is the safe target for our first write.

## v1 (live) — endpoints

Base path: `/api/v1`.

### Reads are PUBLIC (no auth) — our zero-risk connectivity proof

- `GET /api/v1/circle-trainings` — list. Optional query params: `kioskId`,
  `eventId`, `hyrox`, `name`, `mode`, `style`, `status`, `from=<ISO>`,
  `to=<ISO>`, `size` (default and hard cap 100), `page`. Ordered by createdAt
  DESC. Response: `{entries: [...], totalPages, currentPage}`.

  **kioskId is ALLCAPS with no spaces** (Julian, Aug 14): `THESPHEREDARMSTADT`,
  `THESPHEREZUERICH`, `SPHERY-TESTENV1`. A kiosk's login QR code resolves to its
  id string, which is how to find one you do not know. An earlier version of
  this file gave `Darmstadt Circle 01` as the example; that is a circle *name*,
  not a kiosk id, and querying it returns nothing — which is what made Darmstadt
  look like it had no data. It has 8 pages.
- `GET /api/v1/circle-trainings/:circleTrainingId` — full object with
  `exercises[]` and `participants[]` incl. each participant's `exerciseLogs[]`.
- `GET /api/v1/circle-trainings/leaderboards` — public ranking by `totalTime`
  ASC. Params: `kioskId`, `hyrox`, `name`, `mode`, `category`, `division`
  (ignored if category=mixed), `timeframeStart/End`, `size`, `page`.
  Note on board: `style` and totalScore/totalRepetitions ranking not
  implemented yet.

### Writes (Bearer token, "user as group admin" unless noted)

- `POST /api/v1/circle-trainings` — **this is our "Send to kiosk" call.**
  Body matches `engine/app/contract.py::CreateTrainingRequest` field for
  field: `kioskId`, `setupByUserId` (fk user id), `hyrox`, `name`,
  `mode enum(single,double,relay)`, `style enum(duration,score,repetitions)`,
  `status enum(setup,started,completed)`, `startedAt/completedAt` (ISO or
  null), `exercises[] {orderIndex (1-based), style, name, target}`,
  `participants[] {userId, category enum(men,women,mixed),
  division null|enum(pro,open), teamName null|string}`.
  Returns 201 with the created object; each participant gets `exerciseLogs[]`
  seeded with `status: "pending"` per exercise.
  Board quirk (orange sticky): if `name` is "Darmstadt", all exercises are
  stored with style "duration" regardless of what is sent.
- `POST /api/v1/circle-trainings/:id/start` — `{status:"started", startedAt}`.
  403 "Only the creator can start this training".
- `POST /api/v1/circle-trainings/:id/stop` — `{status:"completed",
  completedAt, participants[] {userId, finishedAt, totalTime, totalScore,
  totalRepetitions, calories, hrAverage}}` (totals optional/null).
- `POST /api/circle-trainings/exercise-logs/:exerciseLogId/start` — token of
  the **affected user**: `{status:"active", startedAt}`.
- `POST /api/circle-trainings/exercise-logs/:exerciseLogId/stop` — affected
  user: `{status:"completed", stoppedAt, measuredDuration, score,
  repetitions, calories, hrAverage}`.
- `PATCH /api/circle-trainings/exercise-logs/:exerciseLogId` — affected user;
  same fields, all optional.
- `DELETE /api/v1/circle-trainings/:id` — group admin; 403 "Only the creator
  can delete this training".

Error shape everywhere: `{"error": {"message": "..."}}` with 400 validation,
401 Unauthorized, 403 creator-only, 404 not found, plus states like
"Training is already started", "Exercise already started".

## v2 (proposal, Data Schema V2.6) — where it's heading

Base path `/api/v2`, admin Bearer token unless noted. Groups replace v1's
flat participants: `groups[] {name, startExerciseIndex, members[] {userId,
orderIndex, category, division}}`. New training fields: `eventId`,
`type enum(standard, mutual, rotate)`, `rounds`. `setupByUserId` derived from
the access token.

- `POST /api/v2/circle-trainings` — create (409 duplicate group name).
- `POST /api/v2/circle-trainings/:id/start` — `startedAt` optional, defaults
  to server "now".
- `POST /api/v2/circle-trainings/:id/groups` — add groups later (403 once
  completed).
- `GET /api/v2/circle-trainings/:id/timeline?since=<ISO>` — live polling
  (admin or any member); only while active/completed.
- `POST /api/v2/circle-trainings/exercise-logs` — create/start a log; admin
  or the targeted user; `splitIndex` derived server-side; optional keys allow
  creating an already-completed entry.
- `POST .../exercise-logs/:id/stop`, `PATCH .../exercise-logs/:id` — the
  PATCH recomputes group totals if the group was already finalized.
- `POST .../exercise-logs/:id/switch` — mutual-mode handover:
  `{newMemberId, timestamp}`; timestamp is atomically both stoppedAt of the
  old split and startedAt of the new one.
- `POST /api/v2/circle-trainings/:id/trainingData` — bulk update exercise
  logs + bulk create **pause logs** with `hrAverageRecovery`, `hr60sRecovery`,
  `hrMax/Min/Average`.
- `POST /api/v2/circle-trainings/:id/hr-data` — bulk insert an **HR
  time-series per member**: `{memberId, data: [{timestamp, value}]}`.
- `POST /api/v2/circle-trainings/:id/groups/:groupId/finalize` — computes
  group totals + member aggregates from exerciseLogs.
- `POST /api/v2/circle-trainings/:id/stop` — sets status "incomplete" for
  unfinished groups.

V2.6 tables: CircleTrainingsV2, CircleTrainingGroupsV2 (source of truth for
ranking), CircleTrainingExercisesV2, CircleTrainingGroupMembersV2,
CircleTrainingExerciseLogsV2 (+ unique (memberId, exerciseId, roundIndex,
splitIndex)), CircleTrainingPauseLogsV2, CircleTrainingHrDataV2. Timeline
modes diagrammed: single, double mutual, relay rotate.

## What this means for our app

1. **"Send to kiosk" is `POST /api/v1/circle-trainings`** with the
   CreateTrainingRequest our engine already emits — the contract is confirmed
   correct against the board. Opt-in button on the plan, never automatic.
2. **Connectivity can be proven with zero credentials**: v1 GETs are public.
   First integration step is a read (list trainings on the Darmstadt kiosk),
   which changes nothing and needs only the base URL.
3. **The hrTarget gap is confirmed**: neither v1 nor v2 exercises carry an HR
   zone or intensity target — only work targets ("1000m", "50x"). Our
   per-station zones can't be expressed in the kiosk yet. Workaround for the
   demo: encode intensity guidance in the training `name`/exercise names;
   long-term this is the Michel/Julian schema ask.
4. **v2 is rich in exactly what our adaptation loop wants** (HR time-series
   per member, pause-based recovery) — worth saying in the Aug 14 write-up:
   when v2 lands, the engine's update-plan inputs get much stronger.
5. Auth is Bearer; per-member actions require the member's own token — one
   more reason real member auth stays post-v1 for us.
