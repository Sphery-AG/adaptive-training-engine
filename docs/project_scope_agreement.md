# Adaptive Workout Plan Generator — Project Scope

**Anthony McCrovitz — Summer Internship Project**
**Date:** July 13, 2026
**Runway:** Delivery Friday, August 14 · Wrap-up & handover August 17–19 (departure Aug 20)
**Status:** Draft for alignment with team for a finalized concept

---

## What I am building

A web application that generates personalized workout plans from ExerCube data.

How it works, start to finish:

1. A user completes a short questionnaire: basics (age, weight, height), training goal, and self-rated activity level. (No heart-rate questions — the system estimates resting and max HR from their workout data instead.)
2. The system looks at their ExerCube session history — heart rate curves, scores, per-exercise performance, recovery during pauses — and estimates their current fitness level. If they have no history yet, it starts from their profile alone.
3. A generation engine combines the fitness estimate with the goal and produces a structured training plan: sessions per week, difficulty, heart rate targets, duration, progression over the coming weeks.
4. When new session data comes in, the system re-estimates fitness and adjusts the plan. Improving users get progressed; struggling users get eased off.

The plan output uses Sphery's existing configuration format (RaceConfigs / WorkoutPresets), so the system can be integrated into the app or kiosks later without redesign.

## Technical setup

- **Web app:** Next.js, TypeScript, Tailwind CSS — the user-facing part (intake form, plan display, progress view).
- **Engine:** Python + FastAPI — all analytics, ML, and plan generation, behind a small API.
- The web app only talks to the engine through the API. This means the engine stays the same regardless of where the front end eventually lives (standalone, Sphery app, or kiosk).
- Runs locally with one command via Docker Compose.



## In scope (version 1)

1. Intake questionnaire: profile, goal, and self-reported fitness/activity questions in the web app. Used as the sole input for cold start, and as a supplementary signal alongside session data for existing users (goals are not captured anywhere in Sphery's data today — this fills that gap).
2. Plan generation: rule-based engine using established training principles, parameterized by the user's data.
3. ML fitness estimation: a model that estimates fitness level from session history (heart rate recovery, time in intensity zones, performance vs. difficulty) and feeds the generator.
4. Adaptive updates: plans adjust when new session data is added.
5. Plan display: a clear view of the user's plan and how it has changed.
6. ExerCube data only. Training data: **July 2026 production export, loaded and verified** — 1,019 users, 291 with 10+ workouts (real longitudinal histories), ~21,000 workouts, 1M+ heart rate readings. Models train on real data; synthetic augmentation only for edge cases.

**Data reality (verified against the export):**

- HealthData is ~99% filled for dob/weight/height (age computed from dob; the `age` column itself is unused). Gender is newly added to the schema, ~28% filled — optional questionnaire field and optional model input, never required.
- hrRestingPulse and hrMax exist in the schema but have never been written by the product. The engine estimates both: resting HR proxied from lowest sustained HrValues readings per user; hrMax from observed workout maxima with the Tanaka formula (208 − 0.7 × age) as cold-start prior. Estimates sharpen with every workout.
- New since last summer: CircleTrainingExerciseLogs (per-station circuit training with score, reps, duration, hrAverage; 2,215 rows) — a second activity type confirming the equipment-agnostic design; parked on the v2 list.



## Out of scope (version 1)

These are deliberately excluded so version 1 ships. Each is a natural next phase, not a rejection.

- Integration into the Sphery app or kiosks (the config-format output is the prepared seam for this).
- Equipment beyond the ExerCube (XR Fight, HYROX, etc.). The data model is designed so other equipment can be added later, but only ExerCube is implemented.
- User accounts, authentication, roles, or multi-gym management. **v1 uses the database export loaded into a local MySQL container as its data source, with a simple user-select step in place of real login.** The engine queries the same schema production uses, so integration later means swapping the connection and adding real Sphery auth — the engine is untouched.
- Real-time / in-session adaptation (Dual Flow already does this; my system plans *between* sessions).
- Mobile layouts, localization, production deployment/hosting.



## Acceptance criteria — "done" means all of these are demoable

1. A brand-new user (no session history) enters profile + goal and receives a complete, sensible plan. *(Cold start works.)*
2. Two users with the same goal but different session histories receive visibly different plans. *(The data actually drives personalization.)*
3. After new session data is added for a user, the plan updates and the change is explainable ("HR recovery improved, so intensity increased"). *(The adaptive loop works.)*
4. Generated plans are output in RaceConfig/WorkoutPreset-compatible format. *(Integration-ready.)*
5. The full system runs end-to-end on a fresh machine with one command, with a README. *(Handover-ready.)*
6. A short written summary documents the models used, the features they rely on, and their current limitations. *(Honest about maturity.)*



## Weekly deliverables

- **Week 1 (Jul 13–17):** Repo + Docker setup ✓ · production export loaded and verified ✓ · TypeScript plan data model (stimulus-based, equipment-agnostic by design) · web app flow working against a stubbed engine (fake plan) · draft mode→stimulus mapping table for ExerCube game modes.
- **Week 2 (Jul 20–24):** Real rule-based generation live — plans differ by profile and goal. Cold start done. User-select step pulls real history from the loaded export.
- **Week 3 (Jul 27–31):** Feature pipeline over session data + first fitness estimation model. Plans now differ by history.
- **Week 4 (Aug 3–7):** Adaptive updates working. Criteria 1–4 demoable.
- **Week 5 (Aug 10–14):** Documentation, cleanup, evaluation writeup. **Final demo Friday, August 14.** Criteria 5–6 done.
- **Aug 17–19:** Wrap-up buffer — handover sessions, remaining documentation, project close-out. No new build work planned.

Each week ends with something that runs. If the project stopped early, the last completed week is still a working deliverable.

## How changes are handled

New ideas during the project are welcome — and expected. To keep the timeline honest:

- Anything not listed under "In scope" is a **change request**, not an assumed part of version 1.
- For each request we decide together: add it **and remove something of equal size**, or put it on the **version 2 list** below.
- The acceptance criteria above only change by agreement, in writing (a message is fine).



## Version 2 candidates (parking lot)

- App/kiosk integration
- Multi-equipment plans (XR Fight, HYROX, circle training) via the equipment-agnostic data model — circle training already has real data (CircleTrainingExerciseLogs)
- User-similarity models ("users like you responded best to...")
- Post-workout RPE check-in (single-question perceived effort) as a subjective feature alongside sensor data — the TrainerRoad-style survey signal
- Periodic goal re-check prompts to keep plans aligned with evolving user motivation
- Separate physical vs. cognitive load planning from TimelineMarkers data
- Trainer/gym-operator dashboard



## Open questions

1. ~~Delivery surface~~ — **decided: standalone web app for v1; where it lives long-term is a later decision. The API boundary exists precisely to make that move easy.**
2. ~~Dataset~~ — **resolved: July 2026 production export received, loaded, and verified.**
3. Documentation on how bodyScore / brainScore / dualflowScore are computed.
4. Mode→stimulus mapping: is there sports-science documentation on what training stimulus each game mode delivers (race vs. SpeedCage modes vs. story)? v1 will use a hand-made mapping table; expert input would refine it.

---

*If we deliver exactly what's listed under "In scope" and all six acceptance criteria pass by Friday, August 14, this project is a success. Agreement on that sentence is the purpose of this document.*