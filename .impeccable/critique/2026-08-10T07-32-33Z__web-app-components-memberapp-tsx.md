---
target: the 4-tab member app
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
timestamp: 2026-08-10T07-32-33Z
slug: web-app-components-memberapp-tsx
---
Method: dual-agent (A: a1839591a1ea6a5fa · B: abe9be0c81d0b56c1)

Target: the 4-tab member app (`web/app/_components/MemberApp.tsx`) and the flow around it.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | The two real async calls (`fetchEnginePlan`, `fetchEngineUpdate`) have no loading state; the fake 1300ms SSO handshake gets a full animated sequence. Polish is inverted onto the one thing that isn't real. |
| 2 | Match System / Real World | 3 | Mostly plain, warm copy, but "Cold start", "Current protocol", "Block Progress", "Plan Confidence: MEDIUM" leak engineering vocabulary to members. Two product names in one flow (NEXUS on sign-in, Sphery inside). |
| 3 | User Control and Freedom | 2 | "Start over" wipes everything unconfirmed. `completeStation()` has no undo. No way to swap, skip, or reschedule a prescribed session. |
| 4 | Consistency and Standards | 2 | Three container widths (`max-w-sm`/`md`/`xl`) make the column visibly jump. Three different primary buttons, one of them hardcoded off-token. `chevron-left` does four different jobs. |
| 5 | Error Prevention | 1 | `NumberField` for age/weight/height has no min/max — age can be 0 or 900, and it feeds the Tanaka max-HR prior behind every bpm range in the app. "Create My Plan" doesn't disable during await, so a double-tap fires two generations. |
| 6 | Recognition Rather Than Recall | 3 | Labeled nav, per-section Edit from Review, "Next up" chips. But the training days chosen at Setup are never shown again after the reveal, and the Today tab has no concept of what day it is. |
| 7 | Flexibility and Efficiency | 1 | One rigid path. No way to log a session done without the timer, no way to jump to a different session, no returning-member shortcut through a 5-screen intake. |
| 8 | Aesthetic and Minimalist Design | 3 | Genuinely restrained composition and a real type system. Loses points for the Progress tab flying four accents at once against its own three-accent failure threshold. |
| 9 | Error Recovery | 1 | There are no error states. `client.ts` swallows every failure and returns null, so a dead engine silently downgrades to stub output while the UI keeps claiming "Based on N analyzed workouts." |
| 10 | Help and Documentation | 3 | The strongest area, and clearly deliberate: ~70 focus terms explained in one plain sentence each, metric explainers, an honest "How You Earn" table. Held to 3 because every trigger is a 24px target and there is no help at the live-session moment. |
| **Total** | | **21/40** | **Acceptable** — significant improvements needed before members are happy |

## Design Specificity Verdict

**LLM assessment.** Split, and the split runs down the middle. Roughly 40% of this app is authored for this product and could not be lifted; 60% is category-interchangeable dark fitness UI.

Genuinely product-specific: the live station timeline (`LiveSession.tsx:182–227`), where the active leg expands into a lit card and the rest collapse to numbered dots — that is the shape of walking a gym circuit, not the shape of "a workout". The zone block computing real bpm boundaries from the member's *estimated* max HR rather than a formula constant. The Plan tab's done/current/**projected** vocabulary with the line "The weeks ahead are projections and re-tune from how you actually perform." Rationale strings surfaced at three depths.

Category-interchangeable: the entire Circle tab (rank medal, 5-tier ladder, quests, rewards catalog) is stock loyalty-layer gamification — and `QUEST_TONE[index % 3]` assigning accent color by array position is the tell, because the color carries no meaning. The Progress tab's two-rings-over-a-metric-grid, with fabricated sparklines. `PlanReadyStep` is the payoff screen of every fitness onboarding since 2019.

**The damning finding:** the one thing this product does that nothing else does — *your plan just changed because of what your body actually did* — is the least designed element in the app. It is a 5-second auto-dismissing toast. The commodity gamification layer got the hand-drawn medal, the ladder, the flip animations, and a full-screen detail view. The differentiator got a transient.

**Deterministic scan.** `detect.mjs --json web/app` returned **exit 0, zero findings**, across all 14 component files. Re-run with `--no-config` to rule out suppression by `DESIGN.md`/`design.json`: still clean. A canary file with known-bad patterns fired correctly, proving the scanner parses TSX — so this is a real clean result, not a broken run.

Two caveats that matter. First, the URL-mode scan **failed**: `puppeteer is required for URL scanning`. The rendered-DOM rule set never ran, so only the static regex pass covered this code. Second, a clean static scan is a weak signal here — it means no mechanical anti-patterns (bounce easing, orphan font families, generic template markers), not that the design is sound. Everything of substance below came from human judgment and direct browser instrumentation, not from the detector.

**Visual overlays.** No user-visible overlay exists. Script injection was not performed; all measurements came from `getBoundingClientRect` and `getComputedStyle` evaluations against a real dev server at 390×844 and 1280×800. The full flow was walked end to end — login through 7 completed stations to the adapted plan — with **zero console errors or warnings** at any stage. The dev server and browse daemon were both stopped and verified.

## Overall Impression

The craft here is real and the bones are good: a coherent token system, a genuinely well-built intake state machine, and one screen — the live circuit — that is better than anything a template could produce. It does not read as generated.

What's wrong is a misallocation of design attention, and it is consistent enough to be diagnostic. Every high-stakes emotional moment in this product is under-designed, and every low-stakes one is over-designed. The fake SSO handshake gets a spinning brand mark and a pulsing progress bar; the two operations that actually call the Python engine get nothing. The points system gets a full-screen detail view; the adaptive plan update gets a toast that deletes itself in five seconds. The plan reveal — the moment a Gold's member decides whether this is a real product or a template generator — never mentions that the plan was built from their own training history, even though that number is sitting in the data.

The single biggest opportunity: move the design budget from the gamification layer to the adaptation moment. That is the product.

## What's Working

**The live station timeline is genuine product design.** It solves the actual physical problem: a person standing at a machine, sweaty, glancing at arm's length, needs to know where am I, how long left, what's next. Active leg expands with a 3xl tabular countdown and a fill bar; done legs get a mint check and drop to 60% opacity; upcoming legs collapse to numbered dots on a hairline spine. The zone chip and "up to +N pts this station" put both motivations in one eyeline. None of it is transferable to a generic app, which is the highest compliment available.

**The intake state machine buys real UX at no interface cost.** Navigation is a reducer with a visited-screen stack, so Back replays the actual path including branches, and Edit-from-Review returns you to Review after one change instead of re-walking the flow — with the correct exception for a goal change that invalidates focus. Most questionnaires get this wrong; the member never notices this one getting it right, which is the point.

**Explanation is a first-class control, not a tooltip.** ~70 focus terms each get a plain sentence, metrics explain both what they are and how they're derived, goals and emblems flip. The flip is a peer of the control rather than a floating layer, so nothing is hover-dependent. And the honesty copy ("motivational, directionally-true metrics from your real data, not medical claims" / "No points for opening the app") is the design system's stated voice actually delivered.

## Priority Issues

### [P1] The adaptation — the entire product claim — is delivered as a 5-second auto-dismissing toast
`complete()` awaits `fetchEngineUpdate` with zero feedback, `LiveSession` closes instantly on `onFinish`, and the result surfaces as a `<Toast>` that dismisses itself after 5000ms, is not tappable, has no close control, and sits at `bottom-24` under a reaching thumb. It is also styled off-system with `shadow-xl` — a drop shadow, which DESIGN.md forbids outright. Browser instrumentation additionally caught the same rationale string rendering **twice** on Today after logging: once in the PLAN ADAPTED card and again verbatim in the banner below it.

**Why it matters:** the member just finished 45 minutes and pressed a button that said "update my plan". Glance away and the app appears to have done nothing. For Aug 26 this is the highest-risk moment in the flow — the presenter has to narrate the payoff because the interface lets it evaporate.

**Fix:** make the adaptation a screen, not a notification, inside the LiveSession modal before it closes. Tap "Log session" → a ~1.2s "Recalculating your plan" beat on the ring gauge → a full-screen result: what changed, old value struck through beside the new with `animate-pop`, the rationale at body size, the evidence count. One CTA back to Today. Then delete the toast, or demote it to confirming something already seen.
**Suggested command:** `/impeccable shape`

### [P1] The plan reveal never says the plan came from the member's own training history
`PlanReadyStep` shows goal, frequency, weekday strip, sessions, points — and no provenance. `plan.fitnessEstimate.workoutsAnalyzed` is rendered only later, at 12px in `text-faint`, inside a card called "Plan Confidence", on a tab the member has no reason to open. Cold-start members are shown the literal phrase "**Cold start**, built from your questionnaire".

**Why it matters:** provenance is the only reason a member should trust this plan over any free app, and the only reason RSG should buy it. A plan with no visible evidence is indistinguishable from a template.

**Fix:** put a provenance line directly under "Your plan is ready", using the split the system already defines — returning member in cyan, "Built from your last 43 ExerCube sessions"; cold start in amber, "Built from what you told us. It sharpens after your first session." Retire "Plan Confidence" as a card title and let the evidence sentence carry it.
**Suggested command:** `/impeccable clarify`

### [P1] `StatusScreen` breaks the flow's own one-decision-per-screen contract
Seven decisions on one screen: age, weight, height, a 3-way segmented control, a 0–720 slider, a 1–5 scale, a full nested activity builder, and a 7-day picker — as step 3 of 5, occupying one progress segment. Every other screen in the flow asks one calm question.

Cognitive load overall fails 4 of 8 checklist items (high load, critical band), and all four failures live in this part of the intake: chunking, one-thing-at-a-time, minimal choices, and working memory. Decision points over the 4-item limit: 8 goal cards with no recommended default, 6–11 focus rows with a hidden cap of 2, three separate 7-day pickers, 9 sport chips, 10 body-part chips.

**Why it matters:** Goal and Focus train the member to expect one question per screen; Setup then hands them a form. That is where drop-off happens in a gym lobby, and it is also where the lowest-value inputs live.

**Fix:** split into three screens matching the existing rhythm — About you (with min/max constraints), How much you train now, Which days. Move the optional sports breakdown onto its own skippable screen. Re-weight the progress segment so the bar stops understating what's left.
**Suggested command:** `/impeccable distill`

### [P1] Accessibility gaps concentrated exactly where the product is most distinctive
Four findings, three confirmed by both assessments:

- **Flip backfaces are visually hidden but fully present to screen readers and the tab order.** `[backface-visibility:hidden]` is a purely visual property, applied without `aria-hidden`, `inert`, or `tabIndex={-1}` on goal cards, focus rows, metric cards, and emblem tiles. A screen-reader user on the Goal screen hears 8 titles interleaved with 8 blurbs, then tabs into 8 invisible "Close" buttons.
- **The live session is silent.** HR, zone, countdown, and in/out-of-target all update every second with no `aria-live` anywhere. The mint/amber border flip is the primary out-of-zone signal and it is visual-only.
- **`RingGauge` — the signature component — is `aria-hidden` with its value only in visually-composed children.** The Monthly Rank ring reads as loose fragments ("BRONZE", "340 / 1000") with no role, name, or value. Same for every `Bar`. The intake `ProgressBar` gets this right; nothing after it does.
- **Measured contrast and tap targets.** `--text-faint` computes to **4.23:1** against the page ground — below WCAG AA 4.5:1 — and it carries eyebrows, captions, zone bpm labels, and the metric explainer sentences the design system says are the point. `ProgressBar.tsx:39` uses `text-faint/60` at roughly 2.3:1. Measured targets under 44×44: bottom nav items at 41px tall, "Start over" at 79×31, all info and close buttons at 24×24, the Plan tab week disclosure at 110×15.
- `RankDetail` and `LiveSession` are full-screen overlays with no focus trap, no initial focus move, and no Escape handler.

**Fix:** drive `aria-hidden` + `inert` from the same `flipped` state. Add an `aria-live="polite"` region for station and zone changes. Give `RingGauge` and `Bar` `role="progressbar"` with `aria-valuenow`/`valuetext`. Raise `--text-faint` to roughly `oklch(0.68 0.03 258)` for anything under 14px and delete the `/60` modifier. Pad triggers to 44px hit areas, keeping the 24px glyph. Add focus traps and Escape to both overlays.
**Suggested command:** `/impeccable audit`

### [P2] Design-system drift, plus three measured visual defects
Drift, all citable against DESIGN.md: `STIMULUS_DOT` introduces seven off-system Tailwind colors (`sky-400`, `orange-400`, `rose-400`, `teal-400` among them); `text-rose-400` marks negative deltas, an eighth accent where amber is reserved for caution; `QUEST_TONE[index % 3]` assigns accent by array position, which the Fixed Orbit Rule prohibits by name; Progress runs four accents at once and miscolors two (`weekly_load` → mint, reserved for positive change; `hr_recovery` → fuchsia, reserved for the habit loop); the toast carries `shadow-xl`; LiveSession hardcodes `linear-gradient(90deg,#7dd3fc,#e879f9)` + `text-black` instead of the tokens; `font-bold tracking-tight` on Bebas `h1`s contradicts the One Weight Rule.

Measured defects the design review could not have caught:
- **Progress tab rings sit 11px apart.** Body Score and Brain Score are identical 122×122 rings side by side; measured tops are 149.0 and 160.0. The Body card carries an extra delta row and flex centering shifts the whole ring. Identical at both viewports.
- **Empty zone rows render a green dot regardless of zone.** `LiveSession.tsx:425` hardcodes `rgba(52,211,153,0.35)` for `sec === 0`, so the zone 5 (red) and zone 4 (orange) empty rows show mint. The filled bars use the sanctioned ramp correctly.
- **Bad line wraps at 390px:** `3× /` `week` splits the unit from the number; `difficulty` `7/10` orphans on two of three session rows; the Review screen's Goal & Focus row wraps both columns.
- Inconsistent numeric precision on Progress: `28.7 yrs` beside `27 yrs`, `↓ 0.3 yrs` beside `↑ 1`.

**Fix:** map `STIMULUS_DOT` onto the five orbit accents by meaning and accept that two stimuli share a color. Replace `text-rose-400` with amber, delete `QUEST_TONE` (quests are the habit loop, so all fuchsia), recolor `weekly_load` and `hr_recovery` to cyan. Token the LiveSession gradients. Strip `font-bold`/`tracking-tight` from Bebas. Standardize on `max-w-md` for the app, `max-w-xl` for intake only. Fix the zone-dot color to derive from the row's zone. Equalize the Progress card heights. Add `min-w-0`/`whitespace-nowrap` on the metadata separators.
**Suggested command:** `/impeccable polish`

## Persona Red Flags

**Casey (distracted mobile user, one thumb, gym floor).** The app's most important action is not thumb-reachable: the 64px Start-session circle sits in the top third of the viewport, on the one screen Casey opens four times a week, violating DESIGN.md's own Thumb Reach Rule that every other screen honors. The payoff evaporates during exactly Casey's interruption pattern — tap "Log session", pocket the phone, come back at 8 seconds, the toast is gone with no history. The notification bell is a `<span>` with a fuchsia unread dot: measured 40×40, `role=null`, `onclick=false`. Casey will tap it, because an unread dot is the strongest "tap me" signal on a phone, and nothing will ever happen. "Start over" is destructive, unconfirmed, 79×31, and one thumb-width from that bell. "Complete station" has no undo.

**Jordan (confused first-timer).** Decision one is eight options with no recommendation, and the flip explains what a goal *is*, never who it's *for*. At the 2-focus cap the remaining rows silently drop to 40% opacity and stop responding with no message — Jordan's read is that the app broke. They will be told they are a "Cold start". Pressing "Create My Plan" produces no visible response, so they press it again and fire two generations. Nothing anywhere tells Jordan whether they did well. And "Today" has no idea what day it is — Jordan picked Mon/Wed/Fri, opens on Tuesday, and is shown a session as if it's due.

**Sam (screen reader, keyboard, possibly 200% zoom).** Eight goals become sixteen announcements plus eight phantom tab stops. The live session updates every second with nothing announced. The signature ring is `aria-hidden` with its value scattered across unlabeled children. `--text-faint` at 4.23:1 carries most of the small copy. `RingGauge` and `MetricCard` are fixed-pixel and will clip at 200% zoom. `IntakeShell` does focus management genuinely well — moves focus to the heading, announces "Step N of M" — and then nothing after it does.

## Minor Observations

- `monthlyPointsFor` clamps at 1400 against a 1000 target; the Circle tab handles the overflow gracefully ("rank secured") while `RankDetail` renders a raw `1400 / 1000` under a ring clamped to 100%. Same number, two answers, one tap apart.
- `EARN_TABLE` advertises "Post-session feedback +10", but no feedback prompt exists anywhere. This is also the missed opportunity that would give the summary its interpretive beat and give the adaptation visible input.
- Sparklines are fabricated — three hardcoded shapes chosen by trend direction. The file is honest about it in a comment, but a chart shape that isn't data is the one thing a buyer might poke at in a demo.
- `MetricCard`'s missing-data fallback renders at content height inside a grid of fixed `h-[176px]` siblings, breaking the row.
- `ScoreRing` and `MetricCard` values lack `.tabular`, despite being exactly the "updates in place after an adaptive change" case the rule names.
- The rank ring's center holds a 92px medal, a tier wordmark, and a points eyebrow, in a space DESIGN.md specifies as "a number and its label".
- `sessionLengthMinutes` is in intake state and shipped to the engine, but no screen ever sets it — permanently 45.
- Two product names: NEXUS on sign-in, Sphery inside. Pick one before Aug 26.
- Large empty regions at 390px: ~300px of void on Today between the streak card and the nav, ~400px on the injuries step.
- Not defects, correctly excluded: the floating "N" circle in every mobile screenshot is the Next.js dev overlay portal; the bottom nav appearing mid-page is a full-page-capture artifact; 1×1px radio inputs are the deliberate visually-hidden pattern.

## Questions to Consider

1. What if the plan-adapted moment were the most designed screen in the app instead of the least? The Circle tab has a full-screen detail view, a hand-drawn medal, a ladder, and flip animations — for a points system. If you spent that budget on "here's what your body told us and here's what changed", would you still need the points system to get people back?
2. The Today tab has no idea what day it is. What would this app look like if it did — a rest-day state, a missed-day state, a "two days since your last session" state? Those are the moments a retention product actually has to handle, and right now there is exactly one state: here is your next session, forever.
3. Who is the fitness estimate for? "Plan Confidence: MEDIUM" reads as if the member is auditing the model. The same fact said warmly on the reveal — "we read your last 43 sessions" — is a reason to trust the plan. Same data, opposite emotional function.
4. The post-session summary reports; it doesn't judge. What is the one sentence a member most wants after 45 minutes of work, and why does an app holding their entire history, zone distribution, HR recovery, and a rules engine refuse to say it?
