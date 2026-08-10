# Where the app is, and what the last week can realistically deliver

**Anthony McCrovitz · Aug 10, 2026 · for the sprint planning session with Stephan**

## Working today, on real data

The full member journey runs end to end, locally, against the July 2026 export.

- **Fitness estimated from real training history.** Resting HR, max HR, zone
  shares, HR recovery, and a population rank against the 183 members with 15+
  completed workouts. Every number traces to a column or a documented estimate.
- **Plan generation.** Goal plus questionnaire plus the gym's real floor
  becomes an 8-week block of circle trainings, resolved onto the 17 Darmstadt
  stations, every session carrying a plain-language reason.
- **The adaptive loop.** A completed session updates the plan and says what
  changed and why. As of today the member rates how the session felt, watches
  the plan recalculate, and reads the result on its own screen.
- **Kiosk-compatible output.** The engine emits the exact
  `CreateTrainingRequest` JSON the NEXUS kiosk accepts, verified against the
  live dev API.
- **One command runs the whole system** on a fresh machine. 27 tests pass.

Six weeks of work, and the hard part (the estimate and the rules) is done.

## Designed, not built

- **Production database.** 14 tables, written Aug 5 against the real export,
  covering members, plans, plan changes, session logs, feedback, points,
  quests, and rewards. `docs/database-schema.md`.
- **Real sign-in.** One call to the kiosk API (`auth/sign_in`). Verified
  working against the live dev system on Aug 6. Not wired in because there is
  nowhere to persist an account yet.
- **The API as the live data bridge.** Verified Aug 6: circle trainings and
  their results are readable through public v1 GETs.

## The proposal that unblocks this week

Do not host a copy of Sphery's member health data. Instead:

- Members **sign in with their own Sphere credentials** through the kiosk API.
- The app **reads their training data through that same API**, with their own
  authorization, at the moment it is needed.
- **Our database stores only what the app creates**: plans, logs, points,
  questionnaire answers, feedback.

No bulk export sits on a server. Each member's data is reached with their own
token. This is the architecturally correct shape and it is also the one that
does not wait on a data processing agreement to get started.

## Mon to Fri

| Day | Lands |
|---|---|
| Mon–Tue | App database built from the designed schema. Plans, sessions, points, and streaks survive a refresh. |
| Wed | Real sign-in wired to `auth/sign_in`. A member signs in as themselves. |
| Thu | App and engine hosted. Engine reads member data through the API instead of the local export. |
| Fri | Walk the live URL, fix what the walk finds, hand over. |

Honest read: Monday to Wednesday is achievable. Thursday is the risk, because
hosting is the first thing this project has done that depends on someone
else's infrastructure decisions.

## Not mine to decide

These gate the week and need an owner named in the meeting.

1. **GDPR and the data agreement.** Even under the proposal above, a hosted app
   touching member data needs a position from Sphery. Stephan, Michel, Helen.
2. **Where it gets hosted, and on whose account.** Nothing is provisioned.
3. **The production API base URL**, and confirmation that the public-read policy
   is intentional and will persist. Michel.
4. **Sign-off on the eight circle trainings.** They are evidence-informed
   drafts, not validated by a training lead. One review session with Stephan.

## What "live" can honestly mean on Friday

**Realistic:** a URL where a real Sphere member signs in with their own account,
gets a plan built from their own training history, walks a session, and sees the
plan adapt. State persists. Running against the dev API, not production.

**Not realistic by Friday:** open to the Darmstadt membership, on production
infrastructure, with a signed data agreement. That is the three to four weeks in
`docs/path-to-production.md`, and most of what remains is decisions rather than
code.

## What I want to leave behind

I am here until Aug 16 and remote until the Aug 26 demo. The goal is that this
survives without me: a working system, a designed schema, a documented path, and
no half-finished work that costs somebody a week in September. If the week has to
choose, I would rather hand over something solid and honestly scoped than
something live and fragile.
