# Max feedback pass (Jul 29) + Stephan questionnaire change

Tracking Max's per-screen Miro notes and Stephan's questionnaire request, for the
Thursday RSG demo link. Status: [ ] todo, [x] done, [~] queued for next week.

## Questions to relay (not code changes)
- [ ] **App name**: is "Sphere" the final name of the app? (Login) — needs Stephan.
- [ ] **Account chooser**: does it show only when multiple accounts exist on the
  device, or always? (Chooser) — product decision, relay.
- [x] **Plan horizon**: should we show all 4 weeks up front when the plan adapts
  from prior training? (Plan tab) — answered by Stephan Jul 31: never show the
  full plan by default. Built Aug 4 — plans are 8 weeks, the Plan tab opens on
  the current week, other weeks are one tap away. Supersedes the mitigation
  noted at the bottom of this file.

## Copy fixes (quick)
- [x] C1 Chooser: → "Pick up right where you left off."
- [x] C2 Goal: → "Choose your main goal. Your plan will be shaped around it."
- [x] C3 Focus: → "Pick up to 2 focus points within <goal>. …"
- [x] C4 Setup: → "The basics we build your plan around."
- [x] C5 Setup: "Available training days" → "Intended training days".
- [x] C6 Health: → "Help us keep your plan safe."
- [x] C7 Injury: → "The more we know, the safer your plan."

## Already fixed this morning (tell Max)
- [x] Hyphens/em dashes removed across all user-facing copy (Max: avoid hyphens).
- [x] "copy pending medical/legal review" placeholder removed (Health screen).
- [x] Acute stage "Very recent — still painful/swollen" hyphen removed.

## Features
- [x] F1 **Questionnaire restructure (Stephan + Max)**: total minutes/week slider
  + typical intensity on the Setup screen; per-sport breakdown is optional and
  nested under it (appears once minutes > 0); standalone sport page removed.
- [x] F3 **"Other" sport**: the optional breakdown has an "Other" chip that opens
  a free-text field with its own minutes + intensity.
- [x] F2 **Info (i) symbols on goals + focus points**: every goal card and focus
  row has an "i" that opens a bottom sheet explaining the term in one plain
  sentence. Wrote explanations for all ~65 focus points.
- [x] F4 **Flip cards on Progress stats** (Body Age, Brain Age, This Week,
  Fitness): an "i" flips the card to reveal what it means and how it's derived.

## Plan horizon (Max's question, addressed)
- [x] Plan tab: added an "adapts as you train" note and a "Projected" tag on
  weeks 2-4, so the plan reads as adaptive rather than fixed. Whether to hide
  future weeks entirely is left for Stephan/Max to decide.
