# Screens

Every screen the app has, captured from the running build at 860×1864 (iPhone
430×932 at 2× device pixel ratio), so they stay sharp when dropped on Miro.

Shots are viewport-sized rather than full-page: the renderer caps output at
2000px and silently downscales anything taller, which is what made the first
set soft. Screens that run longer than one viewport are split — `-a` is the
top, `-b` is scrolled to the bottom. The two Cards pages are ~12,500px, so
they are sliced into eight evenly-spaced frames instead.

## A · Returning member (Lena, 108 sessions of real history)

| File | Screen |
|---|---|
| `01-entry` | NEXUS entry — sign in or get started |
| `02-account-chooser` | Pick an account (stands in for real auth) |
| `03-gym-picker` | Choose a gym; Darmstadt carries the verified 17-station floor |
| `04-q1-goal` | Goal, prefilled from the member's last setup |
| `05-goal-info-sheet` | "What is Improve Fitness & Endurance?" explainer |
| `06-q2-focus` | Focus areas |
| `07-q3-setup-a/b` | Availability and equipment |
| `08-q4-health` | Health gate, answered "No, I'm good" |
| `09-q4-injury-branch-a/b` | Health gate answered "Yes" — body part and recovery stage |
| `10-q5-review` | Review before generating |
| `11-plan-ready` | Generated plan |
| `12-gym-welcome-a/b` | Arrival at the gym, between intake and Today |
| `13-today-a/b` | Today — Body/Brain trend, next session |
| `14-plan-a/b` | The full plan |
| `15-cards-01..08` | The collection, top to bottom |
| `16-circle-a/b` | Circle |
| `17-card-common` | A Common card opened |
| `18-card-rare` | A Rare card |
| `19-card-legendary` | A Legendary (Mastery) card |
| `20-card-locked` | A card not yet earned |

## B · Training a session

| File | Screen |
|---|---|
| `21-session-brief` | Session brief before starting |
| `22-session-running` | Live session, first station |
| `23-session-midway` | One station down |
| `24-session-complete` | All stations done |
| `25-effort-prompt` | "How did that feel?" — the 1–5 rating |
| `26-adaptation` | What moved, and why the plan held |

## C · Two plans at once

| File | Screen |
|---|---|
| `27-second-plan-ready` | A second plan, Prepare for an Event |
| `28-welcome-two-plans` | Arrival screen listing both plans |
| `29-plan-switcher-a/b` | Plan tab with both plans selectable |
| `30-plan-switched-event` | Switched to the event plan |

## D · Same goal, different history (Marco)

Marco asks for the same thing Lena does and gets a different plan and a
different collection, because his history differs. That is acceptance
criterion 2.

| File | Screen |
|---|---|
| `31-marco-today-a/b` | Today, with two missed sessions marked on the trend |
| `32-marco-plan-a/b` | His plan |
| `33-marco-cards-01..08` | His collection — fewer cards than Lena's |

## E · Cold start (no history at all)

| File | Screen |
|---|---|
| `34-signup` | Create an account |
| `35-signup-filled` | Filled in |
| `36-coldstart-goal-blank` | Questionnaire with nothing prefilled |
| `37-coldstart-plan-ready` | A plan built from answers alone |

`37` carries the amber caveat "Built from what you told us. It sharpens after
your first session." Compare it with `27`, where the same panel reads "Built
from your last 108 training sessions" in cyan — the app is explicit about how
much evidence a plan rests on.
