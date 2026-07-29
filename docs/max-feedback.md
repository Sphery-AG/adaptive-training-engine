# Max feedback pass (Jul 29) + Stephan questionnaire change

Tracking Max's per-screen Miro notes and Stephan's questionnaire request, for the
Thursday RSG demo link. Status: [ ] todo, [x] done, [~] queued for next week.

## Questions to relay (not code changes)
- [ ] **App name**: is "Sphere" the final name of the app? (Login) — needs Stephan.
- [ ] **Account chooser**: does it show only when multiple accounts exist on the
  device, or always? (Chooser) — product decision, relay.
- [ ] **Plan horizon**: should we show all 4 weeks up front when the plan adapts
  from prior training? (Plan tab) — design decision, relay. Cheap mitigation
  below (P1).

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
- [~] F2 **Info (i) symbols on goals + focus points** with short explanations for
  people who don't know the terms. (Max) Goals can reuse existing blurbs; focus
  points need short copy. Partial now, finish next.

## P1 cheap mitigations (if time)
- [ ] Plan tab: one line noting weeks 2-4 adapt as you train (answers the horizon
  concern cheaply without a redesign).
