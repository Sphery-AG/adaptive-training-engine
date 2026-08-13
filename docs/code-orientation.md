# Code orientation

For the next developer. What the code is, how a plan actually gets made, and
the three things that will bite you. Read this before changing anything.

Written Aug 13, 2026, against commit `894d98f`.

## Read in this order

1. `CLAUDE.md` at the repo root. The architecture rules and the data quirks.
   It is written for AI agents but it is the fastest orientation for a human
   too, and it is the file most likely to stay current.
2. `web/lib/types/plan.ts` and `web/lib/types/engagement.ts`. Every type
   crosses HTTP to Python as JSON, so these two files *are* the API contract.
3. `engine/app/plangen.py`. The rules engine, and the largest single piece of
   real logic in the project.
4. This file, then `docs/limitations.md`.

## The one thing to understand first

**There are two implementations of the plan rules, in two languages.**

- `engine/app/plangen.py` — Python. 581 lines. Covered by 36 tests.
- `web/lib/stub/engine.ts` — TypeScript. 827 lines. Covered by **no tests**.
  `web/` has no test runner at all.

`plangen.py` was ported *from* the TypeScript on Aug 6 and the rules were
carried over 1:1. They are kept in agreement by hand. Nothing enforces it: no
shared fixtures, no parity test, no type generation. If you change one and not
the other, every test still passes and the app still runs.

It gets sharper. The Python copy of `circuit_for()` is correct but is only ever
called by tests. **Every member-facing screen resolves stations, zones and
minutes with the TypeScript copy** — including when the plan itself came back
from Python. So the tested implementation is not the one that runs, and the one
that runs is untested.

This is gap 0 in `docs/path-to-production.md` and the first thing that should
be fixed. Until it is: **change one, change the other, and diff the output by
hand.**

## Two runtimes, and the silent fallback

The web app runs against the engine or against the stub, decided by one
environment variable:

```
NEXT_PUBLIC_ENGINE_URL set    → web/lib/engine/client.ts talks to Python
NEXT_PUBLIC_ENGINE_URL unset  → everything runs in web/lib/stub/engine.ts
```

The hosted Vercel demo has it unset, so **the public URL is the UI on the stub
with invented data**. No engine, no database.

The trap: when the variable *is* set but the engine is down or erroring,
`client.ts` catches and returns `null`, and the app falls back to the stub
without saying anything. That is deliberate — a demo must not break because a
local service is not running — but it means you can spend an hour convinced you
are testing your Python change while the browser quietly runs TypeScript.

**How to know which one you are on:** watch the engine's uvicorn log for a
request. No request logged means you are on the stub, whatever the env var
says.

## How a plan actually gets made

Running with the engine:

1. **Intake.** `web/lib/intake/model.ts` defines the questions,
   `web/lib/intake/state.ts` holds the answers,
   `web/app/_components/intake/screens.tsx` renders them.
2. **Request.** `web/lib/engine/client.ts` → `fetchEnginePlan()` POSTs
   `{spheryUserId, answers, gym}` to `/generate-plan`. The gym's stations
   travel in the request: the engine never knows what a gym has until it is
   told, which is what keeps it equipment-agnostic.
3. **Estimate.** `engine/app/plangen.py` calls `estimate.py`, which calls
   `features.py`, which reads the MySQL export through `db.py`. Output is a
   fitness percentile among members with 15+ workouts, plus rationale strings.
4. **Rules.** `plangen.py` turns estimate + goal + focus + availability into an
   8-week block, then resolves each session onto the gym's real stations.
5. **Render.** `web/app/_components/MemberApp.tsx` draws it — but resolves the
   circuit for each session using the **TypeScript** copy. See above.
6. **Adapt.** Finishing a session posts to `/update-plan` →
   `engine/app/adapt.py`, which returns the adjusted plan plus a
   plain-language reason. Every plan change carries a rationale string; that is
   an architectural rule, not a nicety.

Running without the engine, steps 2 to 4 and 6 all happen inside
`web/lib/stub/engine.ts` instead.

## The evidence ladder

`adapt.py` decides *why* a plan changed, in a fixed priority order: real heart
rate first, the member's own effort rating second, historical score trend
third. Whatever wins is what the member is told.

This is why `client.ts` deliberately does **not** send `hrAverage`. The live
session's heart rate is simulated, and sending it would let invented numbers
outrank the member's real answer and then get quoted back as the reason. Send
HR the day it comes from an actual belt. The comment on `fetchEngineUpdate()`
says so at the call site; do not "fix" it by adding the field.

## Where the bodies are buried

- **`web/lib/stub/data.ts`** — the demo members. Fake, but shaped exactly like
  the real export, and Lena and Marco map onto real member ids.
- **`web/lib/stub/cards.ts`** — 2,919 lines, generated from the Darmstadt
  catalogue spreadsheet. Do not hand-edit; regenerate.
- **`web/lib/stub/progress-series.ts`** — mock. The chart it feeds is labelled
  as sample data on screen.
- **`engine/db/schema.sql`** — the plan app's own PostgreSQL schema, 58 tables.
  It is written and verified but **nothing connects to it**. The app persists
  nothing; a refresh loses everything.
- **`docs/diagrams/src/`** — the ERD sheets are hand-written specs, not
  generated from `schema.sql`. A schema change means editing the spec too, or
  the diagrams silently go stale.

## Verifying a change

```bash
cd engine && .venv/bin/python -m pytest tests/     # 35 pass, 3 skip without MySQL
cd web && npx tsc --noEmit                          # no test runner exists
psql -d planapp -v ON_ERROR_STOP=1 -f engine/db/verify_schema.sql   # after any schema edit
```

There is no CI. Nothing runs these for you.

If you touch plan generation, the honest check is to run the same member
through both implementations and compare the output by hand, because no test
will tell you they diverged.
