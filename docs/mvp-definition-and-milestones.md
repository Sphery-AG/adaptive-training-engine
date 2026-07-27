# MVP Definition, Design Direction & Roadmap

**Project:** Adaptive Training Plan Generator — Sphery AG
**Author:** Anthony McCrovitz (summer internship)
**Updated:** July 27, 2026 (Monday — halfway point)
**Purpose:** The single alignment doc for the Stephan meeting: what a *real, completed*
MVP is, the design direction, weekly milestones with a tangible demo each week, and how
the backend/integration is handled.

> Companion docs: `docs/SCOPE.md` (agreed pitch + acceptance criteria),
> `docs/week_2_ui_ux_and_schema_plan.md` (UI/API/schema detail),
> `docs/michel_schema_handoff.md` (additive schema, kept as a *future* integration proposal).

---

## Timeline frame

- **Internship:** July 5 → **August 20, 2026**. Today (Jul 27) is roughly the halfway point.
- **Internship delivery:** Friday, **August 14** (final demo). Aug 17–19 wrap-up/handover.
- **⚠️ Prospective-customer demo:** **August 26** — Gold's Gym / MAG Fitness (who acquired
  Gold's Gym) visit Darmstadt to evaluate the Nexus kiosk + Sphery + this planning app for
  **HYROX** integration.

**The key consequence:** Aug 26 is *after* departure (Aug 20). Sphery runs that demo
**without Anthony**. So "done" means the journey is **stable, self-contained, and handed
off** — good enough for Stephan to demo a prospective customer solo. Robustness and the
handoff doc are part of the deliverable, not extras.

---

## 1. What the MVP is — one sentence

> A web app where a gym member picks themselves, sees their **real** fitness estimated from
> their ExerCube history, answers a short questionnaire, and gets a **personalized
> circle-training plan that adapts** as new sessions arrive — every change explained in plain
> English, and the plan expressible as Sphery's real `CreateTrainingRequest`.

The plan is the substance; the habit loop (streaks, league, rewards) is what makes it a
retention product. **Stimulus-based, not equipment-locked** — the ExerCube is the flagship
profile, not a hard dependency. That equipment-agnostic design is exactly what makes it
sellable into a HYROX gym like Gold's.

## 2. The MVP in one demo flow (what "done" looks like)

1. **Pick a member** (user-select stands in for login).
2. **See their current fitness** as intuitive metrics from *real* history — the wow moment.
3. **Answer a short questionnaire** — goal + a couple of constraints.
4. **Get a personalized plan** — sessions, intensity, progression — each part with a reason.
5. **Add a new session → the plan re-adapts**, metrics move, streak ticks, league updates, a reward unlocks — with an explanation of what changed.
6. **Under the hood the plan is a valid `CreateTrainingRequest`** — shown as integration proof.

Runs end-to-end on real data, desktop and mobile → MVP is a success.

## 3. Definition of done — 7 acceptance criteria (all demoable)

From `SCOPE.md`, unchanged:

1. **Cold start** — new member + questionnaire → complete, sensible plan.
2. **Personalization** — same goal, different histories → visibly different plans.
3. **Adaptation** — new session data → plan updates with a plain-English reason.
4. **Integration-ready** — plans output in `CreateTrainingRequest` format.
5. **Habit loop** — completing a session moves metrics, advances streak, updates league, can unlock a reward.
6. **One-command run** on a fresh machine, desktop + mobile, with a README.
7. **Written summary** — model used, features, current limitations.

---

## 4. Design direction — "Sphere Loop" (committed)

Anthony built a neon "performance-lab" UI in Lovable that **Stephan prefers over the
current Sphery app**. It is the committed look for the planning app.

- **Live reference:** https://kinetic-loop-coach.lovable.app (Today / Plan / Progress / Circle / intake)
- **Design tokens** (from the Lovable codebase, "Sphere Loop — Orbital Hybrid v2"):
  - Fonts: **Bebas Neue** (condensed display caps) + **Space Grotesk** (body/eyebrow)
  - oklch "orbit" palette with *semantic meaning*: **cyan** = physical/cardio,
    **violet** = cognitive/adaptation, **fuchsia** = habit loop, **mint** = positive change,
    **amber** = caution/low confidence
  - Near-black-blue base, translucent cards, white-10% hairline borders

**How it lands in the product:** the Lovable app is a Vite/TanStack prototype on mock data —
a *design reference*, not the shipping frontend. We **port the aesthetic into the existing
Next.js `web/` app** (tokens → Tailwind, self-hosted fonts, screens rebuilt as Next.js
components). We keep the real engine, data path, and API contract. The **questionnaire
content and flow stay exactly as Stephan's UX concept** (`web/public/stephan-ux/` — 8 goals,
focus, health branching); only the styling changes. Best of both: the look Stephan loved on
the real, data-driven app.

---

## 5. Honest baseline (Jul 27)

| Area | Status | Note |
|---|---|---|
| **Web UI** | ✅ Built end-to-end | Full intake → plan → payoff, but on a **TypeScript stub** (simulated data). |
| **Design direction** | ✅ Chosen | Sphere Loop, to be ported into `web/`. |
| **Python engine** | 🟡 "Step 1" only | `GET /generate-plan/{id}` emits a valid `CreateTrainingRequest` from the static DB. `/estimate`, `/update-plan` → 501. |
| **Real fitness estimation** | ❌ Not started | No feature pipeline / model / Body-Brain Age from real data yet. |
| **UI ↔ engine wiring** | ❌ Not connected | UI talks to the stub, not the FastAPI engine. |
| **Schema for Michel** | ✅ Handed off | Five-table additive proposal (kept as a *future* option, not a build dependency). |

**Plain reading:** the product *experience* is real and clickable; the *intelligence* behind
it is still simulated. The next weeks make it beautiful (Sphere Loop) and make it real (engine).

---

## 6. Roadmap — weekly milestones, each ends in a tangible demo

Re-sequenced **UI-first** for the customer-demo audience: a polished journey is what sells to
Stephan and to Gold's/MAG; the backend runs a credible thin slice in parallel and deepens after.

| Week | Dates | Milestone | Tangible demo |
|---|---|---|---|
| 1 ✅ | Jul 13–17 | Repo + Docker + export loaded; data model; UI on stub | Flow clicks through on fake data |
| 2 ✅ | Jul 20–24 | Full intake UX; plan + payoff screens; schema handoff to Michel | Clickable intake → plan → "plan ready" |
| **3** | **Jul 27–31** | **Sphere Loop design ported into `web/`; intake rebuilt with Stephan's content in the new skin; thin real backend slice** | The **beautiful journey**, intake-first, on the real app + a real member's fitness snapshot from real data |
| 4 | Aug 3–7 | Real engine drives the UI (estimate + generation in Python); plans differ by history; adaptation + habit loop wired | Two real members, same goal → **different plans**; add a session → plan adapts *(criteria #1, #2, #3, #5)* |
| 5 | Aug 10–14 | Polish, mobile, docs, evaluation write-up, **handoff pack**. **Final demo Fri Aug 14** | Full flow, one command, desktop + mobile, README *(criteria #6, #7)* |
| Handoff | Aug 17–20 | Stabilize + rehearse the Aug 26 script; make it demoable **without Anthony** | Stephan can run the full journey solo |
| **Aug 26** | — | **Sphery demos the app to Gold's / MAG** (Anthony gone) | Prospective-customer walkthrough |

Principle: if the project stopped after any week, that week's deliverable still runs.

## 7. Week 3 backlog (Jul 27–31) — UI-first

### Design system port
- [ ] **D1** — Add `Bebas Neue` + `Space Grotesk` (self-hosted) to `web/`.
- [ ] **D2** — Port Sphere Loop tokens (oklch orbit palette, radii, `.eyebrow`) into the Tailwind/`globals.css` layer.
- [ ] **D3** — Base components: card, eyebrow label, pill/badge, segmented progress, ring metric, primary CTA.

### Intake rebuild (highest-value "wow")
- [ ] **U1** — Rebuild intake in the new skin using **Stephan's content**: GOALS (8) / SETUP / HEALTH, focus choices, health branching, section progress.
- [ ] **U2** — Keep required-field logic (focus required for safety/outcome goals) and skippable optionals.

### Journey reskin
- [ ] **U3** — Today, Plan, Progress (Body/Brain Age), Circle (league/quests/rewards) reskinned to match the Lovable reference.

### Thin real backend slice (so "backend is handled" is true)
- [ ] **B1** — Engine emits a real `CreateTrainingRequest` for a demo member (already have step-1; verify + surface in UI).
- [ ] **B2** — One real member's fitness snapshot from real history (resting/max HR, zone shares) to prove the data path.

### Housekeeping
- [ ] **H1** — PR `week2-intake-flow` → `main` before building on it.
- [ ] **H2** — This doc shared for the meeting.

---

## 8. How the data + kiosk integration works (the backend story)

Two seams. **Neither blocks the MVP; both are prepared, not wired live, for v1.**

**A) Database ↔ app.** The app never touches the DB — the engine does:
`MySQL → engine (FastAPI) → app (Next.js, HTTP)`.
- *Now:* engine reads the local Sphery export; our own new tables (questionnaire answers,
  plans, estimates) live in the **same local MySQL alongside it** — we own them, we never
  modify Sphery's tables.
- *Production:* swap the engine's connection to a read-only replica or a read API. **Config
  change, not a rewrite.** Our tables move to our own managed DB.

**B) App ↔ kiosk.** The kiosk starts a session via `POST circle-trainings` with a
`CreateTrainingRequest`, which our engine produces. Three possible wirings (one decision to
make with Sphery later): **pull** (kiosk fetches from our API), **push** (we call the kiosk
API), or a **shared store**. For v1 and Aug 26 we wire none live — we show the valid
`CreateTrainingRequest` as proof (criterion #4) and demo "load my plan" inside our app, with
an optional "→ sends to kiosk" preview so the integration story is tangible.

**`setupByUserId`:** for the demo, the **member is the creator** — simplest, and correct for
a real person training at Sphere Darmstadt. A dedicated system/service account is only a
production-auth question, deferred.

**Simulating without Michel — fully possible.** Every criterion runs locally: estimate,
generation, and cold start from the static export; **adaptation triggered by adding a
synthetic session** to our own DB; kiosk-readiness via the JSON preview. We control the whole
loop — no Michel, no live kiosk, no production auth needed for the MVP.

## 9. Michel dependency, minimized

We build against our **own tables and backend**; Michel's schema is untouched. He is needed
only for **two small production contracts, later, as written specs** (not ongoing work):
1. A read path to live member data (replica or read API).
2. Which of the three kiosk wirings to use.
Plus one deferred decision: the production `setupByUserId` owner. None block anything before Aug 20.

## 10. Risks / things to watch

- **Aug 26 is post-departure** → the journey must be demoable without Anthony; handoff pack + robustness are part of "done."
- **Scope:** reskin + real engine are both large. UI-first is the deliberate choice; the engine's real fitness model is the Week 4 focus.
- **Adaptation feed** is simulated in v1 (a manual synthetic session); name it as simulated in the demo.
- **Identity:** key every adaptive row by Sphery's `userId` so our separate DB stays joinable later.

## 11. Open questions for the team

- Persist generated plans now, or generate on demand and persist later?
- Which kiosk wiring (pull / push / shared store), and the production `setupByUserId` owner?
- Can circle exercise logs add HR-zone durations (currently only `hrAverage`)?
- Sign-off owner for the goal → stimulus → station mapping before it drives real plans.
