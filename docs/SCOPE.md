# Adaptive Training Plan Generator — Project Scope

**Anthony McCrovitz — Summer Internship Project · Sphery AG**
**Date:** July 15, 2026 (rev. 2 — reflects the July 13 circle-training pivot)
**Runway:** Delivery Friday, August 14 · Wrap-up & handover August 17–19 (departure Aug 20)
**Status:** Draft for alignment — this document is the pitch. Agreement on the MVP below is its purpose.

---

## The one-line pitch

A web app that gives every gym member a **personalized training plan that adapts as they train**, wrapped in a **habit loop that keeps them coming back** — a retention engine that franchise owners hand to their members.

The plan is the substance. The habit loop is the product. Gym owners live and die by whether members keep showing up; this makes showing up addictive.

**It is not ExerCube-only — and that's the point.** Plans are written in *stimulus* ("25 min of cardio intensity, HR zone 4"), never in equipment, so the same engine personalizes for **any gym with any equipment**: a full Sphere circle (ExerCube + XR Fighter + ICAROS), a HYROX box, or a bare hotel gym with a treadmill and some dumbbells. The Sphere circle is the flagship equipment profile, not a hard dependency. This is what makes it a product Sphery can sell into *any* franchise alongside the kiosk — not a demo that only works in its own studios. (Sphery's own schema already works this way: real Darmstadt circle trainings mix HYROX stations, an ExerCube, and an XR Fighter in a single logged session.)

---

## What I am building

A web application, built as an **MVP that works on desktop and mobile**, in two halves:

- **The engine** looks at a member's ExerCube history, estimates their current fitness, and — combined with their goal and questionnaire — **builds a circle-training plan tuned to them**. Every time new session data arrives, it re-estimates and adjusts: improving members get progressed, struggling members get eased off. Every change carries a plain-English reason.
- **The habit loop** wraps that plan in the mechanics that make a healthy habit stick: streaks, a Duolingo-style league/rank the member climbs, intuitive progress metrics, and rewards the gym defines (free session, smoothie, coaching, bring-a-friend pass).

The plan output uses Sphery's real circle-training config format (`CreateTrainingRequest`), so the engine can plug into the app or kiosks later without a rewrite.

### How it works, start to finish

1. A member completes a short questionnaire: basics (age, weight, height — prefilled from HealthData where available), training goal, and self-rated activity level. No heart-rate questions — the engine estimates resting and max HR from their workout data.
2. The engine reads their ExerCube history — heart-rate curves, scores, per-exercise performance, recovery during pauses, reaction times — and estimates their current fitness. No history yet? It starts from the profile alone.
3. The generator combines that estimate with the goal and produces a structured circle-training plan: sessions per week, stimulus per session, intensity (HR target), duration, and progression over the coming weeks.
4. As new sessions come in, the plan re-adapts, and the member's progress metrics and streak move with it.

### The habit loop (the retention engine)

The four-beat loop the whole product is built around:

1. **Trigger** — the plan always surfaces a clear next session ("your next training is ready").
2. **Action** — they train.
3. **Reward**, three layers stacked:
   - *Progress you can feel* — intuitive metrics move (see philosophy below); the streak grows.
   - *Recognition* — a **league/rank system, Duolingo-style**: "you're in Bronze this week — you're 2 sessions from Silver." Ranges and near-misses, not abstract goals.
   - *Real-world reward* — points that the gym lets members cash out (free session, smoothie, coaching, bring-a-friend). **Defined gym-by-gym.**
4. **Investment** — the plan tunes itself to them over time, so the longer they stay, the more they'd lose by quitting. That's what makes it sticky, not just fun once.

Layered on top: **small, completable quests** (Duolingo-style) — "train twice this week", "beat your last score", "try a new stimulus" — so a member always has a near-term win to chase, not just a distant goal. Small goals completed early are what convert a curious first-timer into a returning member.

The software builds and *triggers* the loop; the franchise owner supplies the real-world reward. That seam is the business case: Sphery hands gym owners a retention machine, and each gym decides its own perks.

### Metrics philosophy: intuitive, not abstract

Progress metrics follow **Strava / Whoop / Garmin**, not the Apple Watch rings — the rings are abstract and don't tell you what they mean. Every metric we show answers "am I getting fitter, and by how much?" in a way a beginner reads at a glance.

**Body Age / Brain Age** are part of this — a single, intuitive, motivating number ("you're training like a 34-year-old"). We treat them honestly: they are a **motivational, marketing-friendly metric derived from real data, not a clinical measurement.** They're framed to inspire, never presented as a medical claim. The rigor bar is "directionally true and moves correctly with training," not "peer-reviewed."

---

## The MVP, in one flow (this is what "done" looks like on Aug 14)

A member opens the app on their phone or laptop and:

1. **Picks themselves** (a user-select stands in for login — real auth is out of scope).
2. **Sees their current fitness** as intuitive metrics computed from their *real* history — the "wow" moment.
3. **Answers a short questionnaire** — goal + a couple of constraints.
4. **Gets a personalized circle-training plan** — sessions, intensity, progression — each part carrying a plain-English reason.
5. **A new session is added → the plan re-adapts, metrics move, the streak ticks, a league position updates, a reward unlocks** — with an explanation of what changed and why.
6. **Under the hood, the plan is a valid `CreateTrainingRequest`** — shown as proof it's integration-ready, even though nothing is wired to a live kiosk yet.

If that flow runs end-to-end on real data, on desktop and mobile, the MVP is a success.

---

## Technical setup

- **Web app:** Next.js, TypeScript, Tailwind — the member-facing part (intake, plan display, progress, streaks/league). Responsive: desktop and mobile.
- **Engine:** Python + FastAPI — all analytics, ML fitness estimation, and plan generation, behind a small API (`/estimate`, `/generate-plan`, `/update-plan`).
- The web app only talks to the engine through the API, so the engine stays identical regardless of where the front end eventually lives (standalone, Sphery app, or kiosk).
- Local MySQL (Docker) holds the July 2026 Sphery production export; the engine reads it directly.
- Runs locally with one command via Docker Compose.

**On the ML model:** it is a **predictive model, not an LLM.** It learns patterns from ~21,000 real workouts and predicts a member's current fitness state (fitness score, resting/max HR, Body/Brain Age). It does **not** write plans — training *rules* turn the estimate + goal into the plan. State is modeled; plans are generated. This split keeps every plan explainable and safe.

**Data reality (verified against the export):**

- HealthData is ~99% filled for dob/weight/height (age computed from dob; the `age` column itself is unused). Gender is ~28% filled — optional questionnaire field and optional model input, never required.
- hrRestingPulse and hrMax exist but are never written by the product. The engine estimates both: resting HR from lowest sustained HrValues per member; hrMax from observed maxima with the Tanaka formula (208 − 0.7 × age) as cold-start prior. Estimates sharpen with every workout.
- 1,019 members; 291 with 10+ workouts (real longitudinal histories); ~21,000 workouts; 1M+ heart-rate readings. Models train on real data; synthetic augmentation only for edge cases.
- Circle trainings are logged too (`CircleTrainings` + participants + exercises + per-station logs: duration, score, reps, calories, hrAverage — but *no* HR-zone breakdown, unlike ExerCube workouts). Real Darmstadt data, Apr–Jul 2026, but **sparse: only ~19 members, 242 sessions.** Too little to train on → ExerCube stays the ML anchor; circle logs serve as the equipment-agnostic *output* template (`name` + `target` per station), not a model input in v1.

---

## In scope (version 1)

1. **Intake questionnaire** — profile, goal, self-reported activity, in the web app. Sole input for cold start; supplementary signal for existing members (goals aren't captured anywhere in Sphery's data today — this fills that gap).
2. **Plan generation** — rule-based engine, established training principles, parameterized by the member's data; output as circle trainings.
3. **ML fitness estimation** — a predictive model estimating fitness from session history (HR recovery, time in zones, performance vs. difficulty, reaction time), feeding the generator.
4. **Adaptive updates** — plans adjust when new session data is added, with a plain-English rationale.
5. **The habit loop** —
 streaks, a league/rank system, intuitive progress metrics (including Body/Brain Age), and a rewards structure (points → gym-defined perks, *shown and tracked*).
6. **Plan display + progress view** — a clear, responsive (desktop + mobile) view of the plan, how it changed, and the member's metrics/streak/league.
7. **Integration-ready output** — plans expressible as `CreateTrainingRequest`.
8. **ExerCube data only** — July 2026 production export, loaded and verified.

---

## Out of scope (version 1)

Deliberately excluded so v1 ships. Each is a natural next phase, not a rejection.

- **Live reward redemption** — points → real smoothie/session requires a gym on the other end. v1 *shows and tracks* rewards; it doesn't actually redeem them. The concept is made visible, not live.
- **AI coach (LLM in the app)** — a genuinely exciting stretch goal (a conversational coach trained on Sphery's method), but a separate, later effort. Not v1.
- **Kiosk / Sphery-app integration** — the `CreateTrainingRequest` output is the prepared seam; wiring it live is v2.
- **Equipment beyond the ExerCube** — the data model is equipment-agnostic so others can be added later, but only ExerCube is implemented.
- **Real auth, accounts, roles, multi-gym management** — user-select stands in for login. v1 reads the export from a local MySQL container; integration later means swapping the connection and adding Sphery auth, engine untouched.
- **Trainer / gym-operator dashboard** — the reward/league config seam exists conceptually; the operator UI is v2.
- **Real-time / in-session adaptation** — Dual Flow already does this; this system plans *between* sessions.
- **Production deployment / hosting, localization.**

---

## Acceptance criteria — "done" means all of these are demoable

1. A brand-new member (no history) enters profile + goal and receives a complete, sensible plan. *(Cold start works.)*
2. Two members with the same goal but different histories receive visibly different plans. *(The data drives personalization.)*
3. After new session data is added, the plan updates and the change is explainable ("HR recovery improved, so intensity increased"). *(The adaptive loop works.)*
4. Generated plans are output in `CreateTrainingRequest`-compatible format. *(Integration-ready.)*
5. The habit loop is demoable: completing a session visibly moves metrics, advances the streak, updates league position, and can unlock a reward. *(The retention engine works.)*
6. The full system runs end-to-end on a fresh machine with one command, on desktop and mobile, with a README.
7. A short written summary documents the model used, the features it relies on, and its current limitations. *(Honest about maturity.)*

> **Change note:** criterion 4 updates the previous "RaceConfig/WorkoutPreset format" to `CreateTrainingRequest` (the actual circle-training config format, confirmed from the kiosk source on July 14). Criterion 5 (habit loop) is new. Both need team sign-off per the change-control rule below.

---

## Weekly deliverables

- **Week 1 (Jul 13–17):** Repo + Docker setup ✓ · export loaded and verified ✓ · TypeScript plan + habit-loop data model · web app flow working against a stubbed engine (fake plan) · draft goal→stimulus and mode→stimulus mapping tables.
- **Week 2 (Jul 20–24):** Real rule-based generation live — plans differ by profile and goal. Cold start done. User-select pulls real history from the export. Intake questionnaire built.
- **Week 3 (Jul 27–31):** Feature pipeline over session data + first fitness-estimation model. Plans differ by history. Progress metrics (incl. Body/Brain Age) computed from real data.
- **Week 4 (Aug 3–7):** Adaptive updates working. Habit loop wired (streaks, league, rewards). Criteria 1–5 demoable.
- **Week 5 (Aug 10–14):** Documentation, cleanup, evaluation writeup, mobile polish. **Final demo Friday, August 14.** Criteria 6–7 done.
- **Aug 17–19:** Wrap-up buffer — handover, remaining docs, close-out. No new build work.

Each week ends with something that runs. If the project stopped early, the last completed week is still a working deliverable.

---

## How changes are handled

New ideas during the project are welcome and expected. To keep the timeline honest:

- Anything not listed under "In scope" is a **change request**, not an assumed part of v1.
- For each request we decide together: add it **and remove something of equal size**, or put it on the **v2 list** below.
- The acceptance criteria only change by agreement, in writing (a message is fine).

---

## Version 2 candidates (parking lot)

- **AI coach** — conversational, LLM-based, trained on Sphery's method. The headline stretch goal.
- Live reward redemption + gym-operator dashboard to configure leagues and perks.
- Kiosk / Sphery-app integration via `CreateTrainingRequest`.
- Multi-equipment plans (XR Fight, HYROX, more) via the equipment-agnostic model.
- User-similarity models ("members like you responded best to…").
- Post-workout RPE check-in as a subjective feature alongside sensor data.
- Periodic goal re-check prompts.
- Separate physical vs. cognitive load planning from TimelineMarkers data.

---

## Open questions

1. ~~Delivery surface~~ — **decided: standalone web app for v1; the API boundary makes the later move to app/kiosk a swap, not a rebuild.**
2. ~~Dataset~~ — **resolved: July 2026 production export loaded and verified.**
3. ~~Circle-training config format~~ — **resolved July 14: `CreateTrainingRequest` (from kiosk source).**
4. Documentation on how bodyScore / brainScore / dualflowScore are computed — *partially answered* from `docs/ExerCube Data.pdf`; see `docs/mode-stimulus-mapping.md`.
5. `hrTarget` convention per circle exercise — the kiosk's `target` field is a free string today; adaptive intensity needs an agreed convention or a small API extension. *Ask for the team.*
6. Expert review of the goal→stimulus→station mapping and mode→stimulus table.

---

*If we deliver what's under "In scope" and all acceptance criteria pass by Friday, August 14, this project is a success. Agreement on that is the purpose of this document.*
