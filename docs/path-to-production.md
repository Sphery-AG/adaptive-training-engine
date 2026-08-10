# Path to production

Where the app stands after the internship build, what separates it from a
product members can use on their own, and what can realistically be shown as
progress at the Aug 26 NEXUS kiosk demo.

## Where it stands today (Aug 14 demo)

A complete working demo of the product, end to end, on real data:

- Fitness estimated from a member's real training history (July 2026 export,
  ranked against the 183 members with 15+ completed workouts), with rationale
  and evidence counts.
- Goal + questionnaire + gym floor turned into an 8-week plan of circle
  trainings, resolved onto the real Darmstadt stations.
- Completed sessions fold back into the plan with a plain-language
  explanation (HR vs target zone, perceived effort, or real score trend).
- Output is kiosk-compatible: the exact CreateTrainingRequest JSON the NEXUS
  kiosk accepts, verified against the live dev API. Caveat below.
- One command runs the whole system on a fresh machine; 27 tests pass, 3
  DB-backed tests skip cleanly when MySQL is down.

What it is not yet: a standalone product. The gaps below are known, scoped,
and each has a designed answer. None of them are research problems.

## The gaps, in order of how blocking they are

### 0. The engine does not own all of its own rules yet
Two pieces of plan logic still live on the web side, so the same rules exist
twice and can drift:

- **Circuit resolution.** `circuit_for()` in `engine/app/plangen.py` is correct
  but only called by tests. Every member-facing screen resolves stations,
  zones, and minutes with the TypeScript copy in `web/lib/stub/engine.ts`,
  even when the plan itself came from Python.
- **Kiosk export.** `GET /generate-plan/{user_id}` still runs the original
  step-1 path in `engine/app/generate.py`: it copies a reference Darmstadt
  circle and places the member in it, ignoring the generated plan. The real
  session→CreateTrainingRequest mapping is `toCreateTrainingRequest` in the
  web stub.

Nothing visible in the demo is wrong today, because the two implementations
agree. But acceptance criterion 4 is only shallowly met, and the split
violates the architecture rule that all generation logic lives in `engine/`.

Answer: move both into the engine, return circuits in the `/generate-plan`
response, and make the web render what it is given.
Effort: a day or two. Worth doing before persistence, since everything after
this builds on which side owns the rules.

### 1. Nothing is persisted
Plans, completed sessions, XP, and streaks live in the browser. A refresh
loses them. The production schema (docs/database-schema.md, 14 tables) is
designed but not built. This is the first real post-demo task because the
next two gaps depend on it.

Answer: build the app's own database from the designed schema.
Effort: about a week.

### 2. Login is simulated
"Continue with NEXUS" selects a demo persona. Real authentication is one
call to the kiosk API (POST auth/sign_in, email and password, returns a
token whose user id maps straight onto the Sphery member). Verified working
against the live dev system on Aug 6. Not built into the app because there
is nowhere to persist the account yet (gap 1).

Answer: wire auth/sign_in behind the existing login screen, store the
token's user id as the member identity.
Effort: days, once persistence exists.

### 3. The engine and member data run locally only
By design (local-first decision, Jul 17): the engine reads a static export
on the developer machine. The public Vercel link is the UI on a stub with
fake data. Real members need a hosted engine, and hosting real member
health data needs the GDPR and data-agreement question answered first.

Answer: host the engine plus the app's own DB; for Sphery member data,
prefer the public kiosk API as the read bridge so production may never need
direct DB access at all (docs/database-schema.md, Aug 6 findings).
Effort: technical part is days; the data-agreement part is a business
decision (Stephan, Michel, Helen).

### 4. Adaptation reads July, not today
Plans adapt against the frozen export. In production the trend and HR
evidence should come from the member's newest sessions. The kiosk API
already exposes everything needed through public reads, so this does not
require DB access or new endpoints.

Answer: swap the export queries behind the estimate for kiosk API reads.
Effort: days.

### 5. Send to kiosk is designed, not wired
The opt-in "send this session to the kiosk" button does not exist yet. The
exact endpoint, payload, and auth are documented and verified
(docs/kiosk-api.md); writes go only to the SPHERY-TESTENV1 kiosk until
Sphery signs off. One schema gap remains: the kiosk carries work targets
but no HR target per exercise, so zone prescriptions cannot ride along
until that field is added (the single ask to Michel).

Answer: add the opt-in button posting to the test kiosk; file the hrTarget
field request.
Effort: a day or two for the button.

### 6. Training content awaits sign-off
The eight per-goal circuit templates are evidence-informed drafts
(docs/circuit-templates-evidence.md), not yet validated by Sphery's
training lead.

Answer: review session with Stephan.
Effort: one meeting.

## Sequenced

0. Engine owns circuit resolution and the kiosk export
1. Persistence (own DB from the designed schema)
2. Real sign-in via the kiosk API
3. Hosting plus the GDPR decision
4. Live data reads for adaptation
5. Opt-in kiosk send and the hrTarget schema ask
6. Content sign-off

Roughly three to four weeks of focused work to a closed pilot at the
Sphere Darmstadt. Worth noting: the-sphere.fit already promises paying
members a new training plan every 4 weeks. This app is the system that
fulfills that promise at scale.

## What can be ready for Aug 26

The Aug 26 demo is Stephan presenting the NEXUS kiosk to RSG Group, with
this app as the member-facing companion. Visible progress that is low risk
and does not depend on the gaps above:

- **Phone install beat.** PWA manifest and icons so the app installs to a
  home screen from a QR code. Small, pure front-end, big on stage.
- **Real sign-in demo.** A sign-in against the live dev API can be shown
  working today from the terminal; wiring it into the login screen as an
  optional path is the single most convincing "this is real" moment.
- **Opt-in send to the test kiosk.** If Sphery is comfortable, the button
  posting a generated session to SPHERY-TESTENV1 closes the loop live:
  plan on the phone, training appears on the kiosk.
- **Demo script.** A one-page walkthrough for Stephan: which persona,
  which taps, what to say at each screen, what to answer when RSG asks
  "is this live".

Everything else on this page is honest roadmap, and saying so is part of
the pitch: the demo is complete, the path is scoped, nothing left is a
research problem.
