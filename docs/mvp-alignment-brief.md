# Polished MVP — Alignment Brief

**For the Stephan sync · July 27, 2026**
**Purpose:** one page so Stephan and I share the *exact same* definition of "a polished,
completed MVP" — no gap in expectations, no confusion about what v1 is and isn't.
Reference: `docs/SCOPE.md`, `docs/mvp-definition-and-milestones.md`.

---

## The product, in one line

The **personalization + retention layer** between the Sphery app and the Nexus kiosk: it
looks at a member's history, estimates their fitness, and builds a **personalized
circle-training plan that adapts** as they train — wrapped in a habit loop (streaks, league,
rewards) that gives them a reason to come back. Stimulus-based, so it works for any gym /
any equipment; the ExerCube is the flagship profile, not a dependency.

## What "polished MVP" means — two bars, both required

**1. The functional bar — it works** (the 7 acceptance criteria, below).

**2. The polish bar — it's demo-grade for a customer:**
- One cohesive visual system (Sphere Loop), not a prototype look
- **Mobile-first** — it's a web app people open on their phone
- Professional throughout — real icons, real copy, no placeholders/emoji
- Every plan change carries a **plain-English reason**
- Stable enough that **Stephan can demo it solo** to Gold's/MAG on Aug 26 (I'm gone Aug 20)

A "polished MVP" = both bars. Working-but-ugly isn't it; pretty-but-broken isn't it.

## Success = this one flow, on a phone

1. Pick a member → 2. See their **real** fitness (the wow) → 3. Short questionnaire →
4. Get a **personalized plan** with reasons → 5. Add a session → **plan re-adapts**, metrics
move, streak ticks, league updates, a reward unlocks → 6. Under the hood it's a valid
`CreateTrainingRequest` (kiosk-ready). If that runs end-to-end on real data, we're done.

## Definition of done — the 7 criteria (this is what we're signing off)

1. **Cold start** — new member + questionnaire → sensible plan
2. **Personalization** — same goal, different histories → different plans
3. **Adaptation** — new session → plan updates *with a reason*
4. **Integration-ready** — output is `CreateTrainingRequest`
5. **Habit loop** — completing a session moves metrics / streak / league / reward
6. **One-command run** on a fresh machine, desktop + mobile, with a README
7. **Written summary** — model, features, limitations (honest about maturity)

## In scope vs out of scope for v1 — the confusion-killer

| ✅ IN (v1 must have) | ❌ OUT (v2 / later — *not* a broken promise) |
|---|---|
| Intake questionnaire | Live reward **redemption** (shown & tracked, not fulfilled) |
| Rule-based plan generation | **AI coach** (LLM chat) — headline v2 stretch |
| ML fitness estimation from history | **Live kiosk / Sphery-app integration** (output is the prepared seam) |
| Adaptive updates with plain-English reasons | Equipment beyond ExerCube |
| Habit loop: streak, league, metrics, rewards (shown/tracked) | Real auth / accounts (user-select stands in) |
| Plan + progress view, desktop + mobile | Trainer / gym-operator dashboard |
| `CreateTrainingRequest` output | Real-time in-session adaptation (that's Dual Flow) |
| ExerCube export data only | Production deployment / hosting |

## What's real vs simulated right now (honest)

- **Real & shipped:** the whole journey and the Sphere Loop design, on the actual app,
  mobile-verified (branch `week3-sphere-loop`, PR #3).
- **Still simulated:** the *intelligence* — real fitness estimation + engine-driven
  generation. UI runs on a TypeScript stub. **That's the Week 4 build**, not a gap in the plan.

## Decisions to lock at 3pm (so the spec is crystallized)

1. **Confirm the 7 criteria ARE the definition of done.**
2. **UI-first sequencing is right** — design now, real engine Week 4.
3. **"First fitness model" = transparent heuristic (`rules_v0.1`) is acceptable** for v1; ML refinement later.
4. **Habit loop stays demo-state** (no live redemption) for v1.
5. **Aug 26 bar:** must be demoable **without me** → stability + handoff pack are part of "done."
6. **Michel seams** (kiosk plan-read + identity deep-link) are contracts to agree later, not blockers now — I'm off his critical path.

## The two deadlines this MVP serves

- **Aug 14** — internship final demo (all 7 criteria demoable).
- **Aug 26** — Gold's / MAG customer demo in Darmstadt, run by Sphery **without me**.
  This raises the bar from "works when I demo it" to "works when someone else does."
