# XP & Leveling System — first pass (Aug 3)

**Status:** draft for Anthony to react to, then build. Grounded in the HYROX app
research (`docs/research-hyrox-apps.md`): reward effort and consistency, never
vanity; no points for opening the app, no missed-day penalties, no forced
leaderboards.

---

## The one-sentence design

You earn points for effort (time in heart-rate zones) and consistency (showing
up on plan), points build a monthly status rank, and quests give short, medium,
and long-term reasons to come back.

## 1. The currency: Points

One currency, called points (the UI already says "pts"). Earned only from
things the member actually did:

| Source | Points | Why |
|---|---|---|
| Training time in zones 1–2 | 1 pt / min | Showing up counts |
| Training time in zone 3 | 2 pts / min | Solid work |
| Training time in zones 4–5 | 4 pts / min | Max effort, max reward |
| Completing a planned session | +25 | The plan is the product |
| Completing a benchmark / test session | +50 | Marks the re-estimate moment |
| Giving post-session feedback | +10 | Feeds the adaptive loop |
| Finishing a full plan block (8 weeks) | +200 + emblem | The big earn |

This is the Peloton Strive / Myzone MEPs pattern: a beginner and an athlete
working equally hard earn equally. No points for logins, shares, or streaks
themselves (streaks are their own display). Sessions without a HR belt earn the
flat completion points only — which quietly makes the belt worth wearing.

## 2. Status ranks (the monthly level)

Myzone's model, in Sphere Loop language. Hit the monthly point target
(target ≈ 1,000 pts, roughly 3 solid sessions/week) and your rank advances one
tier per consecutive month:

**Drift → Pulse → Orbit → Momentum → Apex → Legend**

- Miss a month: drop one tier, never to zero. Gentle, not punishing.
- The rank ring lives on the Circle tab (the league ring already built).
- Rank rewards consistency over months — ability never enters it.

## 3. Streaks (already in the UI, keep them honest)

- One streak: **weeks in a row hitting your plan's session target** (the Today
  tab already shows "12 wks"). Per-plan target, so 2-session and 4-session
  members are equals.
- Shown small on Today, celebrated on Circle. No penalty animation on a break,
  just the counter resetting — TrainRox markets the absence of guilt mechanics
  for a reason.

## 4. Quests (the J6 short / medium / long structure)

| Tier | Cadence | Examples | Reward |
|---|---|---|---|
| Quick win | Today / this week | "Show up this week (2/3)", "First zone-4 minute this week" | 25–50 pts |
| Medium | Weekly / monthly | "Hit your monthly point target", "Complete all 3 sessions two weeks running", "Do the benchmark session" | 100–200 pts |
| Long | Quarterly / per block | "Finish the 8-week block", "Improve HR recovery vs your baseline", "3 consecutive months at Orbit or above" | Emblem + 200–500 pts |

Rules: max 3 active quests visible at once (one per tier), auto-assigned from
plan + goal, refreshed by the engine with a reason string like everything else.

## 5. Emblems (earned tiles on the Circle detail page)

Earned, never bought or gifted: plan-block finishes, benchmark completions,
rank milestones (first month at Orbit, first at Apex), PR moments the data can
verify (best HR recovery, longest streak). Named in the orbit palette language.
First art pass: AI-drafted tiles, replaced later.

## 6. Where each piece lives

- **Today tab:** streak chip only (after the refocus, nothing else gamified here).
- **Circle tab:** rank ring, current points vs monthly target, top active quest.
- **J6 detail page (to build):** full quest list by tier, rank ladder with
  history, emblem gallery, how-points-work explainer in one sentence.
- **Live session screen (J8, later):** points accruing live as the effort score.

## 7. v1 build notes

- All of this runs on the stub with simulated zone minutes — same as the rest
  of the demo. The engine later computes points from `timeInTier1-5` per workout,
  which we already extract.
- Data gap flag: circle-training logs carry only hrAverage today, so circle
  sessions earn flat completion points until the Michel zone-duration question
  is resolved.
- Numbers above are first-guess tuning. The shape (effort + consistency, three
  quest tiers, monthly rank) is the decision to react to; the constants can move.

## Open questions for Anthony / Stephan

1. Rank names: orbit-theme (Drift → Legend) or something closer to Sphery brand?
2. Monthly target: fixed 1,000 pts for everyone, or scaled to the member's plan?
3. Do points ever convert to anything real at the gym (a smoothie, a guest pass)
   — retention gold at a chain like Gold's, but an operations question.
