# Research: HYROX / hybrid training app landscape

**Date:** August 3, 2026. Commissioned off Stephan's Friday ask: research what popular
HYROX training apps are doing and what we should emulate, aimed squarely at the Aug 26
Gold's Gym / MAG demo. Method: web search + vendor pages + independent reviews; anything
unverifiable is flagged. Note on naming: "HYROX365" is HYROX's training ecosystem brand;
the athlete-facing app landscape is fragmented, so the strongest UI patterns come from
adjacent best-in-class apps (Ladder, Peloton, Myzone, Centr) plus HYROX-native newcomers
(Roxfit, FORMD, TrainRox).

---

## Per-app findings

### HYROX official ecosystem (HYROX365: Performance Hub / Whiteboard, Training Club, Garmin app)
- The official product for **gyms** is the **HYROX Performance Hub** (powered by ONEFIIT): coach/operator platform with 600+ workout library, 8 new workouts/week, four class formats (Foundational, Engine, Power, Complete; 2.0 adds Running), and **13-week structured development tracks**.
- Its athlete-visible surface is the **"Whiteboard" in-gym screen**: session overview, movement breakdowns, exercise standards, and **built-in timers**, runnable on standard TVs, multi-screen synchronized, controlled from a coach tablet. This is the closest official analog to our Circle screen, and notably it has **no heart-rate integration** — that is a gap we can beat.
- There is an official athlete-facing "HYROX Training Club" with free race-aware programming; reviewers describe it as basic (plans + community + race registration). Could not verify a rich Today-screen or live-session UX for it — the official ecosystem is B2B-first.
- An official **Garmin "Hyrox Training" watch app** reproduces the race sequence (8 runs + 8 stations) for realistic race-condition training — evidence that "progress through a fixed station sequence" is the canonical HYROX in-session mental model.

### Roxfit (biggest HYROX-native app, ~170k users)
- Positioning: data/tracking core, not prescriptive coaching. Free; "Ultra" premium tier announced.
- Today/home: personalized social feed + calendar you build workouts into; AI assistant ("HYPE") generates a session from text/voice/photo. Weakness per reviews: user-directed rather than "here is today's session."
- In-session: "clean, intuitive workout player guides you through every session in real time," with a **"Next Up" section showing what's coming next** — reviewers single this out. On watch: **live targets and a +/- delta at every split**.
- Progress/analytics: PR detection, training volume/intensity, **HR-zone analysis**, splits benchmarked against a 3M+ race database; **PaceMe** turns a goal finish time into per-run/per-station target splits.
- Gamification: **multi-modal streaks** (separate streaks for strength, running, conditioning), leaderboards, "HYPE" (kudos) on a social feed. Reviewers call the social/tracking layer "mature and genuinely fun."

### Centr x HYROX (only HYROX-certified consumer programs)
- Two **12-week** certified programs (HYROX Starter, HYROX Accelerator), built with the HYROX Training Academy; broader Centr programs run 3–13 weeks, **mostly 6 or 8**, designed to be repeated with heavier weights.
- Today/home: the **"Planner" is the homepage** — workout of the day + meals + a wellness tip, at-a-glance, with swap/substitution allowed in advance. One card per thing you do today; the full program lives elsewhere.
- In-session: audio + video coaching throughout; self-guided mode with text/photo/video per exercise. Minimal competitive elements; progression is completion-based.

### The Progrm (official HYROX training partner, €29.99/mo)
- Daily programming, 4–6 sessions/week, three adaptable levels, progressive phases with built-in taper weeks; delivered through gym platforms (Wodify, PushPress Train) and their own product.
- Tracking is deliberately light: "streaks and logs that build momentum." Every session carries intent/explanation ("without guesswork") — rationale text is part of the product. No leaderboards.

### Rox Lyfe
- A **12-week fixed plan** (PDF/program, not a real app) by "Mr HYROX" Paul Gillingham: builds over 12 weeks, **tests built into the plan**, one HYROX-style confidence-builder workout per week, per-level session options. Pattern worth stealing: scheduled benchmark/test sessions as milestones.

### HWPO HYROX (Mat Fraser's brand)
- **8-week blocks with a deload every 4th week**, 2–5 days/week, 60–90 min sessions.
- Every day ships with **coaching notes, movement guidance, and session intent "so you always know exactly what you're doing and why it matters for your race performance."** RPE-based scaling. Community accountability over leaderboards.

### TrainRox / FORMD (HYROX-native newcomers)
- TrainRox: pick a race, get a **week-by-week periodized plan that peaks on race day**; adapts to equipment; **smart workout timer with audio cues and automatic round tracking**; adapts when you miss a day "instead of leaving me behind" (explicitly no penalty mechanics).
- FORMD: **"one workout per day" with no menu choices** — the app prescribes a single session from your weak stations and race date; phases **Base → Build → Sharpen → Taper**; progress shown as a **projected finish time** plus "risk stations" quantified in minutes lost. This projected-race-time-as-progress-metric is the most distinctive progress UI in the category.

### Runna (running app with an 8-week HYROX plan)
- Plan tab shows the week as a drag-and-drop list; weekly mileage at a glance; Performance section = trends, PRs, completed plans, achievements. Praised for keeping the plan view simple and movable, not for exposing the whole block.

### FitViz (gym-screen product for HYROX classes — closest competitor to our Circle tab)
- Station circuit display: **station number + movement + target, countdown timer, rotation prompts, preview of upcoming stations**; timer modes for intervals/EMOM/AMRAP/Tabata; looping HD demo clips "members can glance at mid-set"; RX/scaled options on screen.
- Its stated differentiator: **real-time HR zones on the class screen** so coaches can cue "push Zone 4 for 60 seconds / recover to Zone 2." This validates exactly what we're building — and confirms per-station HR-zone display is sellable to gym operators.

### Ladder (best-in-class daily-session UX, general strength)
- Today screen: **one named workout for today** (e.g. "KB City — conditioning + full-body strength"), with the week's remaining sessions visible but secondary. Workouts pre-programmed by a coach/team you pick.
- In-session player: looping exercise video, **countdown timer + progress bar**, voiceover announcing the next move, coach cues before each set, pausable, log weights/reps inline.
- Structure: **~6-week series followed by a deload week**; you stay committed to one track.
- Gamification: **badges for weekly streaks**, team "Cheers," team group chat, post-workout selfie sharing. Reviewers consistently describe this as motivating, not gimmicky, because it rewards showing up, not vanity metrics.

### Hevy (best-in-class logging)
- Log a first set in under 90 seconds; automatic per-exercise rest timers; set tags (warmup/drop/failure/superset); progress graphs and PR history. Pattern: in-session friction near zero; everything else is post-hoc analytics.

### Peloton (best-in-class live-metric UI)
- **Strive Score**: a single number that accrues from **time spent in HR zones** during the class — effort-based, ability-independent. HR-zone bar is live on screen; in floor/strength segments HR + Strive Score become the primary metric.
- **Class segments**: a workout progress strip showing warmup / blocks / cooldown, plus "Movements" preview of what's in each section.
- v9.0+ lets users **choose which metrics are foregrounded** and suppress the leaderboard — the market lesson is that one or two big numbers beat a dashboard.

### Myzone (the gym-floor HR gamification standard)
- **MEPs (Myzone Effort Points)**: points per minute scaled by HR zone (yellow/red = 4 MEPs/min) — "rewards effort, not ability." Zones shown as colored tiles per person on gym screens.
- **Status levels** (Copper → … → Hall of Fame) from hitting **1,300 MEPs/month consecutively** — consistency-based ranking aligned to WHO activity guidelines. Widely deployed in exactly the gym-operator segment MAG/Gold's lives in; this is the gamification language a gym buyer already trusts.

### Couldn't verify
- **"Omnia"**: no HYROX/hybrid training app by this name surfaced in any comparison or store search. Either very small, renamed, or misremembered — flagged rather than guessed.
- HYROX Training Club's internal screens (today view, player) — no detailed reviews found.
- Roxfit's exact home-screen layout and whether its HR-zone analysis appears live in-session vs. post-workout only.

---

## Patterns to emulate (mapped to our four questions)

### 1. Today tab — cut to one card
- **One prescribed session, no menu.** The strongest apps (FORMD, Ladder, Centr) show exactly one named workout for today. Give the session a name and a type tag ("Engine — Circle 45min"), not a list of everything in the app. HYROX's own class formats (Foundational / Engine / Power / Complete) are a ready-made vocabulary the Gold's/MAG audience already knows — consider naming our session types in that register.
- **Show: name, intent, duration, station count, target HR zone, one-line "why."** HWPO's daily "session intent so you always know what you're doing and why it matters" is the pattern our rationale strings were built for — surface the rationale on the Today card, not buried in the plan.
- **Cut: full plan, analytics, history.** Those live in Plan/Progress. Centr's Planner proves a homepage can be "what you do today, at a glance, swappable" and nothing else.
- Motivators that appear across apps: a small **streak indicator**, a **"Next: Thu — Power"** one-liner (Ladder shows the week but secondary), and a station/movement **preview with looping demo clips** (Ladder, FitViz). None of the leaders use countdown-to-session clocks; don't add one.

### 2. In-session / real-time screen
- **Canonical layout (Ladder + FitViz + Peloton composite):** current station big (number + movement + target), **countdown timer + overall progress bar**, and a **"Next Up" strip** — the single most-praised element in Roxfit reviews. Rotation prompt when the station changes; automatic round tracking with audio cues (TrainRox) so nobody counts.
- **HR is our differentiator — lean in.** The official HYROX Whiteboard has *no* HR integration; FitViz sells real-time zone display as its differentiator; Peloton reduces effort to one accruing number (Strive Score = time-in-zone). Recommendation: live zone color per station + a single session-level effort score that accrues from time-in-zone, with the per-station zone breakdown revealed in the post-session summary, not crowding the live screen.
- **One or two big numbers max.** Peloton's customization trend exists because users suppress clutter. Live screen = station, time, zone. Everything else is post-session.
- **Segment strip:** Peloton's warmup/block/cooldown progress strip maps 1:1 to a circle (warmup → stations 1–8 → cooldown). Show position in the circuit as dots/segments, filled as completed — this doubles as the "progress through stations" visual.
- Big tap targets: the one hard UI critique found (Roxfit on tablets) was buttons too small to hit "when your hands are shaking."

### 3. Plan structure + progress without showing the full plan
- **Block lengths in the wild: 8 or 12 weeks dominate.** Centr HYROX = 12; Rox Lyfe = 12; HWPO = repeating 8-week blocks with deload every 4th week; Runna HYROX = 8; official HYROX365 tracks = 13; category guidance = 12–16 weeks for first-timers. Safe default for us: **a named 8- or 12-week block with a deload/test week rhythm**, sold as a cycle that repeats and re-adapts.
- **Progress = this week + phase position, not the full plan.** The convergent pattern: a **week strip** (7 day-dots, completed sessions checked — Runna/Ladder) + a **phase bar** ("Week 5 of 12 — Build" with Base → Build → Sharpen → Taper labels, FORMD) + percent-of-block complete. Nobody good shows 12 weeks of sessions up front; TrainRox explicitly adapts forward when you miss a day rather than showing you a broken plan.
- **A forward-looking metric beats a backward one.** FORMD's "projected finish time" + "risk stations (minutes lost)" is the best progress UI in the category. Our engine's fitness estimate is the same move: show an **estimated fitness/readiness trend line** and "focus stations" as the Progress tab's hero, with completed-workout markers underneath.
- **Scheduled test/benchmark sessions as milestones** (Rox Lyfe): mark them on the week strip; they give the re-estimate a visible, legitimate moment ("Benchmark Thursday updated your plan").

### 4. Gamification — what feels earned
- **Earned:** consistency streaks (weekly, and Roxfit-style per-modality), effort-based points from HR zones (Peloton Strive Score, Myzone MEPs — "rewards effort, not ability," so a beginner and an athlete both win), status levels from consecutive months of showing up (Myzone's 1,300 MEPs/month → Copper→Hall of Fame), PR/benchmark detection, and badges tied to completed blocks and test sessions.
- **Gimmicky / avoid:** XP for opening the app, penalty mechanics for missed days (TrainRox markets the absence of these), always-on competitive leaderboards (Peloton added the option to hide them; Centr/HWPO deliberately skip them). Keep any leaderboard opt-in or event-scoped.
- **For the gym-operator demo specifically:** Myzone is the proof that HR-zone gamification sells to gyms; an effort-score-per-circle-session plus monthly consistency status is the pitch MAG/Gold's will recognize. Also worth noting in the demo narrative: the official HYROX gym product (Performance Hub Whiteboard) has timers but no HR layer and no adaptive planning — our combination (adaptive plan + live HR-zone circle screen + effort scoring) does not currently exist in their official stack.

Sources: [HYROX Performance Hub (App Store)](https://apps.apple.com/us/app/hyrox-performance-hub/id6738051049), [Performance Hub 2.0 launch (endurance.biz)](https://endurance.biz/2026/industry-news/expanded-hyrox-partner-ecosystem-with-performance-hub-2-0-launch/), [FitViz: 7 HYROX apps compared](https://www.fitvizpro.com/blog/hyrox-training-app), [FitViz workout display](https://www.fitvizpro.com/workout-display), [Roxfit](https://roxfit.app/) and [Roxfit review (Medium)](https://medium.com/the-hybrid-athlete/roxfit-app-best-overall-training-app-or-just-for-hyrox-242f2cc9d9bc), [FORMD comparison](https://tryformd.com/blog/how-to-choose-hyrox-training-app), [GOWOD: 5 best HYROX apps](https://www.gowod.app/blog/best-apps-for-hyrox-training-a-comparison-of-the-top-5), [Centr HYROX programs](https://centr.com/p/hyrox/training-program), [Garage Gym Reviews: Centr](https://www.garagegymreviews.com/centr-review), [The Progrm HYROX](https://www.theprogrm.com/hyrox), [Rox Lyfe 12-week plan](https://roxlyfe.com/12-week-training-plan/), [HWPO HYROX](https://www.hwpotraining.com/programs/hwpo-hyrox), [TrainRox](https://www.trainrox.com/), [Runna app guide](https://support.runna.com/en/articles/10473504-your-quick-guide-to-navigating-the-runna-app), [Garage Gym Reviews: Ladder](https://www.garagegymreviews.com/ladder-app-review), [Bustle: Ladder review](https://www.bustle.com/wellness/ladder-app-review), [Hevy 2025 features guide](https://help.hevyapp.com/hc/en-us/articles/33106320824727-Everything-You-Need-to-Know-About-the-Hevy-App-2025-Features-Guide), [Peloton Strive Score](https://www.onepeloton.com/blog/strive-score), [Myzone MEPs](https://www.myzone.org/blog/what-are-myzone-effort-points-meps), [Myzone status levels](https://www.myzone.org/blog/myzone-status-levels), [Garmin HYROX Training app](https://apps.garmin.com/en-US/apps/9d31d60e-dc80-4e58-ba2e-69f025f78f67).
