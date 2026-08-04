# Miro board content, paste-ready (Aug 3)

How to use: in Miro, copy one block of lines at a time, paste onto the board, and
pick "Convert to sticky notes" in the paste menu so each line becomes one sticky.
Lines marked TEXT are meant as plain text boxes or frame titles, not stickies.
Suggested board layout: three frames side by side, left to right.

---

## FRAME 1 — "MVP: what ships by Aug 14"

TEXT (frame subtitle):
A member picks themselves, sees real fitness estimated from their ExerCube
history, answers a short questionnaire, and gets a personalized circle-training
plan that adapts as new sessions arrive. Every change explained in plain
English, every plan expressible as a real CreateTrainingRequest.

### Column: The demo flow (stickies, one color)

Pick a member (user-select stands in for login)
See current fitness from real history
Answer the short questionnaire
Get a personalized plan, every part with a reason
Add a session, watch the plan re-adapt
Under the hood: valid CreateTrainingRequest JSON

### Column: Acceptance criteria (stickies, second color)

1. Cold start: new member + questionnaire = complete sensible plan
2. Same goal, different histories = visibly different plans
3. New session data = plan updates with a plain-English reason
4. Plans output in CreateTrainingRequest format
5. Habit loop: session moves metrics, streak, league, rewards
6. One-command run, desktop + mobile, README
7. Written summary: model, features, limitations

### Column: Deliberately NOT in the MVP (stickies, gray)

Real login / SSO (user-select stands in)
Live kiosk wiring (we show the valid JSON instead)
Wearables and live HR
Equipment beyond ExerCube profile
Real-time in-session adaptation
Production hosting and auth hardening

---

## FRAME 2 — "Backlog: P0 journey, P1 engine, P2 roadmap"

TEXT (frame subtitle):
Rule: the journey is finished before the engine is wired. A polished journey on
a stub sells the vision. A half-finished journey on a real engine does not.

### Column: P0 journey, DONE (stickies, green)

Sphere login + account chooser + create account
Questionnaire finalized (Stephan + Max feedback in)
Day-aware sport capture, injuries inline
4-tab app: Today, Plan, Progress, Circle
Sphere Loop design system, mobile-verified
Demo link deployed for the RSG call

### Column: P0 journey, TO DO (stickies, yellow)

Plan Ready screen polish, the payoff moment
Plain-English reason on every plan part
Today page: solely today's training, more motivational
Plans always a minimum of 8 weeks
Today is the front door, full plan is a drill-down
Three altitudes: day, week, overall plan
Completed workouts marked + percent progress shown
Live session screen: station progress + HR zone time
Progress page: explain Body and Brain score better
Feedback loop: post-session questions + cadence
Show that feedback changes the next plan
XP / quests / rewards detail page
Short, medium, long-term quest tiers
Full journey polish pass on a phone, then freeze

### Column: P1 engine (stickies, blue)

Real fitness estimate from ExerCube history
Rule-based plan generation from estimate + goal
Adaptation: new session updates plan, with reason
Wire UI to the FastAPI engine, replace the stub
Every plan as a valid CreateTrainingRequest
Equipment audit of the Darmstadt floor
8 circle trainings, one per goal, from real equipment
Goal to circle to station mapping, team sign-off
Own database for answers, plans, estimates, feedback
Model / features / limitations write-up
Handoff pack so Stephan demos Aug 26 solo

### Column: P2 roadmap, post Aug 20 (stickies, purple)

Real login / SSO, app as the front door
Gym chain support, the Gold's story
Wearables: Garmin, Apple Watch, Whoop
Live session screen on real HR + kiosk state (screen itself now P0)
Tandem plans, two goals at once
Individual sport plans, no gym needed
Social: buddies, kudos, challenges
Security hardening: rate limiting, auth, audit
Light mode + platform polish

---

## FRAME 3 — "Week of Aug 3 (Stephan away, async week)"

TEXT (frame subtitle):
Stephan is on holiday this week, so this board is where the work stays visible.
Anything needing a decision is in the last column, none of it blocks the build.

### Column: This week's build (stickies, yellow)

Mon: MVP contract + this board + XP and leveling design
Mon: security pass (SQL injection, input validation, CORS)
Tue: Today page refocus + plan views, 8-week structure
Wed: feedback loop, questions + cadence + payoff
Thu: wire UI to engine, first real fitness estimate
Fri: live session screen first pass, polish, week recap

### Column: In motion with people (stickies, orange)

Helen / Julian: going live, Sphery API, live DB questions
Michel owns the DB, read-path request routes through him
Research done: HYROX apps + longevity KPIs, reports in docs/
Stephan's circle-training notes distilled, drafting circles next
Turn those notes into draft circles per goal
Circle sign-off waits until Stephan is back

### Column: Decisions needed, no rush (stickies, pink)

Feedback questions + cadence: I define, you confirm
Login end state: this app as front door with Sphere deep-link?
New users: pick a gym at onboarding or default Darmstadt?
DB read path: replica credential or small read API?
Who signs off the goal to station mapping?
Make HR belts default? 90% of workouts have no HR data
Rename Body/Brain Score to Movement/Timing Accuracy?
