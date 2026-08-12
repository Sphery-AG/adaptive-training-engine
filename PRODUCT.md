# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: the gym member.** An adult member of a fitness studio that runs
Sphery equipment (the Darmstadt pilot site, The Sphere, is the reference
location). They are not an athlete or an analyst. They want to know what to
train today, whether they are getting better, and whether it is worth coming
back this week.

They use the app in four distinct situations, all confirmed:

1. **On the gym floor, mid-session.** Glanceable between rounds. Sweaty hands,
   one-handed, possibly bright overhead lighting.
2. **In the locker room, before or after training.** Seated, two hands, calm.
   This is where they actually read the plan and the reasons behind it.
3. **At home, planning.** Checking the next session, the streak, the league
   standing. No time pressure.
4. **On a kiosk screen in the gym.** Part of the flow is seen on a
   wall-mounted or standing screen, not a phone. (v1 does not build kiosk
   integration; see Capabilities and Constraints.)

**Secondary: the franchise operator or prospective buyer.** Gym chains
evaluating whether to put Sphery equipment and this retention layer in their
locations. They see the product through a demo someone else drives.

**When the two conflict, the member wins.** The demo succeeds by showing a
genuinely good member experience, not by being tuned for an audience watching
a walkthrough. The buyer is an audience, not a design target.

## Product Purpose

A personalization and retention layer between the Sphery member app and the
NEXUS kiosk. It reads a member's real training history, estimates their current
fitness, builds a circle-training plan tuned to them, and re-adapts that plan
every time new session data arrives. Every change carries a plain-language
reason.

Wrapped around the plan is a habit loop (streaks, a league the member climbs,
progress metrics, gym-defined rewards) whose job is to give the member a reason
to come back.

Success is a member who keeps showing up. Gym owners live or die by retention;
this is the software that moves that number.

## Positioning

**Plans are written in stimulus, never in equipment.** A session says "25
minutes of cardio intensity, heart-rate zone 4," not "ExerCube." That is the
mechanism a neighboring product cannot truthfully copy without rebuilding its
data model: the same engine personalizes for a full Sphere circle (ExerCube +
XR Fighter + ICAROS), a HYROX box, or a hotel gym with a treadmill and
dumbbells. The ExerCube is the flagship equipment profile, not a dependency.

Two further claims that hold up under scrutiny:

- **The estimate is real.** Fitness is estimated from actual heart-rate curves,
  scores, recovery during pauses, and reaction times in the member's own
  history, not from a self-reported questionnaire alone.
- **ML estimates state; rules generate plans.** No end-to-end plan generation
  by a model. Every plan is traceable to a rule and an estimate, which is what
  makes the rationale strings honest rather than decorative.

## Operating Context

The member's real-world loop: book or walk in, start a circle training at the
NEXUS kiosk, train through the stations, leave. The app sits alongside that
loop rather than inside it. It tells them what is next before they arrive, and
absorbs what happened after they finish.

Sphery's existing ecosystem this must coexist with: the Sphery member app, the
NEXUS kiosk (`CreateTrainingRequest` / circle-trainings API), and the studio's
own booking flow. The Sphere Darmstadt already sells "Trainingsplan alle 4
Wochen" as a paid membership promise, so a plan that visibly updates is
fulfilling an existing commitment, not introducing a new one.

Real Darmstadt circle trainings mix HYROX stations, an ExerCube, and an XR
Fighter in a single logged session. Mixed-equipment circuits are the normal
case, not an edge case.

## Capabilities and Constraints

**Confirmed functionality (v1):**
- Intake questionnaire (age, weight, height prefilled from HealthData where
  available; goal; self-rated activity level). No heart-rate questions.
- ML fitness estimation from real ExerCube history, with rationale and evidence
  counts.
- Rule-based generation of an 8-week circle-training plan, resolved onto a
  specific gym's station list.
- Adaptive updates when a session completes, each with a plain-English reason.
- Habit loop: streak, league/rank, progress metrics, quests, and rewards that
  are shown and tracked.
- Output expressible as a kiosk-compatible `CreateTrainingRequest`.

**Explicitly out of scope for v1** (not broken promises, deferred):
real authentication (member-select stands in), live kiosk and Sphery-app
integration, equipment profiles beyond ExerCube, real-time in-session
adaptation, reward redemption/fulfilment, a trainer or gym-operator dashboard,
and production deployment.

**Technical constraints:**
- `web/` is UI only. All analytics, estimation, and generation live in
  `engine/` (Python + FastAPI) behind HTTP. No analytics logic in the frontend.
- The hosted demo runs against a TypeScript stub of the engine, so the journey
  must stay coherent without a backend.
- Data is a static July 2026 production export in local MySQL, never committed.
- The app is English-only today, despite a German pilot site.

**Terminology that must stay consistent:** circle training (not "circuit" in
member-facing copy), station, stimulus, plan, session, streak, league, quest.
Body Score and Brain Score have official Sphery definitions and must not be
redefined.

**Undecided:** see Brand Commitments.

## Brand Commitments

- The product is Sphery AG's. The design system in `DESIGN.md` is named
  **Sphere Loop** and is the current visual authority.
- **Open question, deliberately undecided:** whether the app must white-label
  per gym chain. If Gold's, MAG, or another franchise adopts it, they may each
  want their own colors and logo. Nobody has decided. Do not assume either way,
  and do not fabricate a theming requirement or foreclose one.
- Voice: plain and direct. No em dashes, no AI-tell phrasing, no emoji in the
  interface. Real icons and real copy, never placeholders.
- The intake questionnaire content originates with Stephan and is deliberate.
  Do not rewrite it without asking.

## Evidence on Hand

Real, verified, and usable:
- July 2026 Sphery production export: 1,019 members, 291 with 10+ workouts,
  ~21,000 workouts, 1M+ heart-rate rows.
- Verified NEXUS kiosk circle-trainings API contract (`docs/kiosk-api.md`),
  checked against the live dev system.
- Training-science evidence behind the eight per-goal circuit templates
  (`docs/circuit-templates-evidence.md`).
- Official Sphery metric definitions for Body Score, Brain Score, HR recovery,
  and reaction time.
- The real Sphere Darmstadt station list and public membership offering.

Absences that must never be filled with invention:
- No customer testimonials, case studies, press coverage, or named reference
  customers. Gold's and MAG are prospects, not customers.
- No pricing, licensing, or availability claims.
- No published benchmarks or accuracy figures for the estimator.
- `hrRestingPulse` and `hrMax` are always NULL in the export and are estimated,
  never read. Circle-training log data is sparse (~19 members).

## Product Principles

1. **The member wins.** Every design tradeoff resolves toward the person
   holding the phone, not the person watching the demo.
2. **Precision earns trust; warmth is why they return.** Every number arrives
   with a plain sentence saying what it means. Never one without the other.
3. **Stimulus, never equipment.** If a decision hardcodes the ExerCube, it is
   wrong, even when the ExerCube is the only profile implemented.
4. **Every change is explained.** A plan that adapts without saying why is
   indistinguishable from a plan that is broken.
5. **Honest about maturity.** Thin evidence, cold starts, and low-confidence
   estimates are surfaced as such rather than dressed up as certainty.

## Accessibility & Inclusion

No formal standard has been mandated. Product-specific needs established by the
four confirmed use situations:

- Must stay readable on a phone under bright gym lighting, on a dark theme.
  Contrast is a functional requirement here, not a compliance checkbox.
- Must be operable one-handed with imprecise, sweaty taps mid-session.
- Key state (what is next, what changed) must be legible at a glance from
  arm's length, including on a larger in-gym screen.
- Motion must respect `prefers-reduced-motion`.
