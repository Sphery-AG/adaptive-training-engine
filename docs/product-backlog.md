# Product Backlog & Roadmap

**Project:** Adaptive Training Plan Generator, Sphery AG
**Author:** Anthony McCrovitz (summer internship)
**Updated:** July 28, 2026
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

### J3, the plan payoff
- [ ] Plan Ready screen polished (the "here is your plan" moment).
- [ ] Every plan part carries a plain-English reason (shown, even if stubbed).

### J4, the 4-tab app  (mostly built, needs finishing)
- [x] Today, Plan, Progress, Circle with bottom nav, in the Sphere Loop skin.
- [ ] Consistency and polish pass across all four tabs.

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

### J7, journey polish pass and freeze
- [ ] Walk the full path on a phone, fix every rough edge, lock it.
- [ ] Then, and only then, deploy to a link (Vercel) for the RSG / Gold's demo.

---

## P1, real intelligence behind the journey (rest of the MVP)

Once the journey is finished, make it true on real data.

### E1, the adaptive engine
- [ ] Real fitness estimate from a member's ExerCube history (resting/max HR, zone shares,
  a readable Body/Brain age).
- [ ] Rule-based plan generation from that estimate plus the goal.
- [ ] Adaptation: a new session updates the plan, with a reason.
- [ ] Wire the UI to the FastAPI engine (replace the TypeScript stub).
- [ ] Output every plan as a valid `CreateTrainingRequest` (kiosk-ready proof).

### E2, the eight Darmstadt circle trainings
- [ ] Define 8 predefined circle trainings, one per questionnaire goal, using the real
  Sphere Darmstadt equipment (the kiosk ships 6 today, we extend to 8).
- [ ] Map goal to circle to stimulus, then adapt each from the member's data.
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
- **Live session page.** HR at the top, zone time, a station map showing where you are,
  per-station reps and duration, a timeline through the circuit.
- **Tandem plans.** Two goals at once (build muscle while training for HYROX).
- **Individual sport plans.** Run-only, swim-only, cycle-only, no gym needed.
- **Social.** Buddy / kudos system, send a workout, challenge a friend, friend matching.
- **Platform polish.** Light and dark mode, redesigned icons/tabs, extra training columns,
  where session progress gets entered (app vs kiosk vs Sphery app).

---

## Decisions I need to make or confirm

1. **Feedback loop:** the exact questions and cadence. Mine to define, then confirm.
2. **Login end state:** my app as the front door with Sphere deep-link. Confirm with Stephan.
3. **New-user gym:** do new users pick their gym during onboarding (chain story), or default
   to Darmstadt for now.
4. **Read path from Michel:** replica credential or a small read API. One written spec.
5. **Goal to station mapping sign-off** before it drives real plans.

---

## Sprint frame (rest of the internship)

- **This week (Jul 28 to Aug 1):** finish the P0 journey (questionnaire, feedback loop,
  quest/rewards page, polish), then deploy the Thursday link.
- **Aug 3 to 7:** P1 engine. Real estimate and generation, plans differ by history,
  adaptation, the eight Darmstadt trainings, own database.
- **Aug 10 to 14:** wire it all together, docs, final demo Fri Aug 14.
- **Aug 17 to 20:** stabilize and rehearse the Aug 26 handoff so Stephan can demo solo.
