# Product Backlog & Roadmap

**Project:** Adaptive Training Plan Generator, Sphery AG
**Author:** Anthony McCrovitz (summer internship)
**Updated:** August 3, 2026 (Stephan's Friday feedback folded in)
**Purpose:** Capture everything from the Stephan and Max meetings, and rank it by priority for
the MVP. The near-term MVP is the full user journey and UX experience, finished and
demo-grade. The engine and backend come after the journey is complete. This doc is the
single source of truth for what gets built, and in what order.

Companion docs: `docs/mvp-definition-and-milestones.md`, `docs/mvp-alignment-brief.md`,
`docs/SCOPE.md`.

---

## How to read this

Work is ranked in three priority tiers:

- **P0, the complete UI/UX journey.** Every screen a user touches, finished, polished, and
  mobile-ready, running on the stub. This is the priority right now. It is the Thursday demo
  and the spine of the whole product. Nothing in P1 starts until the journey feels done.
- **P1, real intelligence behind the journey.** The engine that makes the journey true:
  real fitness estimation, plan generation, adaptation, the Darmstadt circle trainings, the
  kiosk output, and my own database. This is the rest of the internship MVP.
- **P2, depth features.** The bigger things we discussed. Real value, handed off as the
  roadmap, not built before Aug 20.

Rule: the journey is finished before the engine is wired. A polished journey on a stub sells
the vision. A half-finished journey on a real engine does not.

---

## P0, the complete UI/UX journey (priority now)

The whole path a member walks, end to end, polished. This is what has to be ready.

### J1, entry and login  ✅ done
- [x] Sphere-branded sign-in that replaces the old member roster.
- [x] "Continue with Sphere" handoff plus account chooser (returning members).
- [x] "New to Sphere? Get started" path into the cold start.
- [x] Verified on mobile, flows into the questionnaire.

### J2, finalize the questionnaire  ✅ done
- [x] **Kill the redundancy.** Removed the standalone "current training min/week + intensity"
  from the setup screen. It's now derived from the activities the member lists, so we never
  ask "how much / how hard" twice.
- [x] **Optional sport detail.** The activities screen is the single place duration and
  intensity are captured, per activity, with broadened quick-picks (Gym, Running, Walking...).
- [x] **"More info, sharper plan" nudge.** Added to the setup screen.
- [x] **Fix edit-from-review.** Editing one thing now returns straight to review. Two natural
  follow-ups still route correctly: a goal that requires a focus, and a newly flagged injury.
- [x] **Review screen** restructured, with a separate editable "Current training" group.

### J3, the plan payoff and plan views
- [ ] Plan Ready screen polished (the "here is your plan" moment).
- [ ] Every plan part carries a plain-English reason (shown, even if stubbed).
- [x] **Plans are always a minimum of 8 weeks** (Stephan, Jul 31). Done Aug 4: stub builds
  an 8-week block as two 4-week waves (build 3, deload on the 4th), week 8 is deload +
  retest that seeds the next block.
- [x] **Never show the full plan by default** (Stephan, Jul 31). Done Aug 4: the Plan tab
  shows one week of detail at a time; the week strip is the drill-down.
- [x] **Progressive disclosure.** Done Aug 4: current week opens by default, other weeks
  are one tap away on the strip or chevrons, future weeks keep the "Projected" tag, past
  weeks read "Done".
- [x] **Three altitudes: day / week / overall.** Done Aug 4: Today tab (day), selected-week
  detail card (week), Block Progress card with percent bar + 8-week strip (overall).
- [x] **Completion and percent progress everywhere** (Stephan, Jul 31). Done Aug 4:
  completed sessions get a check and dim, completed weeks turn to checks on the strip,
  percent-complete and "N of M sessions done" sit on top of the Plan tab.

### J4, the 4-tab app  (mostly built, needs finishing)
- [x] Today, Plan, Progress, Circle with bottom nav, in the Sphere Loop skin.
- [x] **Today page refocus** (Stephan, Jul 31). Done Aug 3: hero session card + one slim
  streak/up-next row + adaptation note, everything else moved to its own tab.
- [x] **Progress page clarity** (Stephan, Jul 31). Done Aug 4, Anthony's call: page leads
  with Body Score and Brain Score rings (Sphery's own vocabulary), each with its plain
  one-line definition on the card; single Fitness number retired from the page; HR
  Recovery added to the metric grid. Still open for live data: bodyScore is ~1 everywhere
  in our export, so the real engine needs a fallback before this ships beyond the stub.
- [ ] Consistency and polish pass across all four tabs.
- [x] **Intake fixes** (Anthony, Aug 4): number fields no longer snap to 0 when cleared;
  injury body part is a pick-list of common sites with an Other option.
- [x] **Week navigation** now a dropdown on the week card (Anthony's pick over the
  tap-strip); strip is display-only progress.

### J5, the feedback / evaluation loop
The loop that makes the plan feel adaptive to the user. Core to the journey, was on my list.
- [ ] Post-session (or post-plan) feedback: too hard, too easy, swap exercises, how it felt.
- [ ] Decide the questions and the cadence (per session, per week, per plan). Mine to define,
  with a little research on what is actually useful, then confirm.
- [ ] Show that the feedback changes the next plan (the payoff of answering).

### J6, quest / XP / rewards detail page
- [ ] A page you tap into from the Circle tab: active quests, XP, progress, earned tiles.
- [ ] Short, medium, and long-term goals (a quick win, a weekly or monthly goal, a
  quarterly goal).
- [ ] First pass at ranking emblems / charms (AI-drafted is fine to start).
- [ ] Research direction: earn from effort and consistency, not vanity. Effort points
  accruing from time in HR zones (Peloton Strive / Myzone MEPs pattern, "rewards effort,
  not ability"), weekly streaks, status levels from consecutive months, badges for
  completed blocks and benchmark sessions. Avoid XP for opening the app, missed-day
  penalties, and always-on leaderboards.

### J7, journey polish pass and freeze
- [ ] Walk the full path on a phone, fix every rough edge, lock it.
- [x] Deploy to a link (Vercel) for the RSG / Gold's demo. Done ahead of full freeze for the
  Thursday deadline; RSG call went well, they visit Darmstadt Aug 26. Freeze still pending
  the polish pass above.

### J7b, circuit-based sessions  (Anthony, Aug 4; prerequisite for J8)
Sessions stop being "one machine for 45 minutes" and become circle trainings: an
ordered sequence of stations composed from a per-goal template, filled with the
member's gym's real equipment. CreateTrainingRequest is already an ordered
exercise list, so this makes the export real instead of faked. Decision Aug 4:
build Wed on the stub (8 goal templates drafted from the Darmstadt floor,
corrected against Stephan's circle notes when Anthony hands them over).
- [x] Session model gains an ordered station sequence (station, minutes, target zone).
  Seeded Aug 4: circuitFor() resolves any session to warmup + work rotation + cooldown
  across the gym's floor; the live training flow runs on it.
- [ ] 8 per-goal circuit templates from the Sphere Darmstadt station list (replace the
  generic rotation; correct against Stephan's circle notes when Anthony hands them over).
- [ ] Plan + Today UI show sessions as circuits, not a single station (live flow already
  does; the session rows still say one station).
- [ ] Export maps circuit stations 1:1 onto CreateTrainingRequest exercises.

### J8, live session screen  (pulled up from P2; Stephan, Jul 31; build Thu on J7b)
Design settled Aug 4 (Anthony): three-state flow with the station timeline as the spine.
Mockup: scratchpad live-option-b-zones.png; zone-bar reference saved at
docs/design-reference/sphery-app-workout-hr-zones.png (from app.sphery.ch).
- [x] **Preview screen**: tapping play on Today shows the circuit rundown (ordered
  stations, minutes, target zone each) before a Start Session button. Built Aug 4.
- [x] **Live screen, Option B vertical timeline**: whole circuit visible as a rail; done
  stations checked with their zone result, current station expanded (countdown, station
  progress bar, in-zone + points), upcoming below. HR pill + elapsed time on top. Built
  Aug 4, verified end to end.
- [x] **Time-in-zones block in Sphery's app language**: horizontal glowing gradient bars
  per zone, real bpm-range labels computed from the member's estimated hrMax (not Z1-Z5),
  time + percent per row, Avg HR / Max HR alongside. Session-wide on the live screen.
- [x] **Post-session summary**: zone bars, per-station results, points earned; "Log
  session" hands off to the Plan Adapted moment. Per-station zone breakdown still to add.
- [x] Advance mechanic: "Complete station" button (demo-honest, walkable in 30 seconds).
- [ ] Demo-grade in v1: simulated live HR, no kiosk or wearable wiring. Known data gap:
  circle exercise logs carry only hrAverage today; per-station zone durations are the open
  Michel question.

---

## P1, real intelligence behind the journey (rest of the MVP)

Once the journey is finished, make it true on real data.

### E1, the adaptive engine
- [ ] Real fitness estimate from a member's ExerCube history (resting/max HR, zone shares,
  a readable Body/Brain age).
- [ ] Rule-based plan generation from that estimate plus the goal.
- [ ] Generated plans span a minimum of 8 weeks (Stephan, Jul 31).
- [ ] Adaptation: a new session updates the plan, with a reason.
- [ ] Wire the UI to the FastAPI engine (replace the TypeScript stub).
- [ ] Output every plan as a valid `CreateTrainingRequest` (kiosk-ready proof).

### E2, the eight Darmstadt circle trainings
- [ ] **Equipment audit first.** Inventory exactly what Sphere Darmstadt has on the floor,
  then design the circles around that real equipment, not a generic gym.
- [ ] Define 8 predefined circle trainings, one per questionnaire goal, using that equipment
  (the kiosk ships 6 today, we extend to 8).
- [ ] Map goal to circle to stimulus to station, then adapt each from the member's data.
- [ ] **Define these with the team, not solo.** Working sessions with Max, Stephan, Julie,
  and Helen across next week to agree the plans and circles. They know the floor and the
  coaching intent; I turn it into the mapping the engine drives.
- [ ] Sign-off on the goal to station mapping before it drives real plans.

### E3, own the backend and database
- [ ] Stand up my own database for user-generated data (answers, plans, estimates, feedback,
  quests), hosted on a managed service I control.
- [ ] Sphery source data stays read-only. One written request to Michel for a read path.
- [ ] Engine is the only thing that talks to both stores. App never touches a DB.

### E4, docs and handoff
- [ ] Written model / feature / limitations summary.
- [ ] One-command run plus README, desktop and mobile.
- [ ] Handoff pack so Stephan can demo solo on Aug 26.

---

## P2, depth features (roadmap, post Aug 20)

Captured, prioritized roughly, handed off. Not built before I leave.

- **Real login / SSO.** My app is the front door, Sphere app / kiosk deep-links in. Confirm
  with Stephan.
- **Gym chain support (the Gold's story).** Pick a gym, favorite, home gym, location finder,
  per-gym equipment profiles.
- **Wearables and HR.** Garmin, Apple Watch, Whoop, Fitbit. Opt-in kiosk HR link that does
  not force the big-screen display. Live HR zone monitoring.
- **Live session page on real data.** The screen itself moved up to P0 (J8, demo-grade,
  simulated); wiring it to real live HR and kiosk state stays here.
- **Tandem plans.** Two goals at once (build muscle while training for HYROX).
- **Individual sport plans.** Run-only, swim-only, cycle-only, no gym needed.
- **Social.** Buddy / kudos system, send a workout, challenge a friend, friend matching.
- **Platform polish.** Light and dark mode, redesigned icons/tabs, extra training columns,
  where session progress gets entered (app vs kiosk vs Sphery app).

---

## Research (done Aug 3, feeds design decisions)

- **HYROX training apps** → `docs/research-hyrox-apps.md`. Headlines: Today = one
  prescribed session card with intent and a one-line why; live screen = current station +
  timer + "Next Up" strip + live HR zone, one accruing effort score (Peloton/Myzone
  pattern); blocks of 8 to 12 weeks with a deload every 4th and benchmark sessions as
  milestones; progress = week strip + "Week 5 of 8, Build" phase bar + percent, never the
  full plan. Demo angle: the official HYROX gym product has no HR layer and no adaptive
  planning; our combination does not exist in their stack.
- **Longevity center KPIs** → `docs/research-longevity-kpis.md`. Verdict: mostly not
  reachable from our data, two exceptions we already compute: HR recovery (strong
  mortality science) and Brain Speed (uniquely ours, the Aug 26 demo moment). Show
  percentiles vs age peers, not a "fitness age". Skip VO2max as a headline. Body/Brain
  score confusion is a naming problem: they are movement accuracy and timing accuracy.
  Blocker to raise: ~90% of workouts have no HR data, belts need to become default.

---

## Decisions I need to make or confirm

1. **Feedback loop:** the exact questions and cadence. Mine to define, then confirm.
2. **Login end state:** my app as the front door with Sphere deep-link. Confirm with Stephan.
3. **New-user gym:** do new users pick their gym during onboarding (chain story), or default
   to Darmstadt for now.
4. **Read path from Michel:** replica credential or a small read API. One written spec.
5. **Goal to station mapping sign-off** before it drives real plans. Draft from Stephan's
   notes and the Darmstadt equipment audit; sign-off with the team when Stephan is back.
6. **HR belts as default?** ~90% of workouts have no HR data; every HR-based KPI and the
   live session screen render empty without the belt. Operations decision for Stephan,
   raise it when he is back.
7. **Score naming.** Rename Body/Brain Score to Movement/Timing Accuracy, or keep the
   names with an always-visible definition. Confirm with Stephan.

---

## Sprint frame (rest of the internship)

- **This week (Jul 28 to Aug 1) ✅:** intake finalized (Stephan + Max feedback), login +
  create-account + home-gym picker, demo link deployed. RSG call went well; they visit
  Darmstadt Aug 26.
- **Aug 3 to 7:** two tracks. Finish the journey (Today refocus, 8-week plan views +
  completion state, feedback loop, XP / emblems page, live session screen, polish) and start
  the real backend (own database, wire UI to the engine, first real estimate). Stephan is out
  this week: draft the Darmstadt circles from his notes, sign-off when he is back.
- **Aug 10 to 14:** wire it all together, docs, final demo Fri Aug 14.
- **Aug 17 to 20:** stabilize and rehearse the Aug 26 handoff so Stephan can demo solo.
