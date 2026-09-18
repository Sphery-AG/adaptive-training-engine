# Technical status — Sep 16, 2026

Inventory of the repo at `8c1a98c` (last commit Aug 14). Nothing has landed
since, so the Aug 13–14 docs (`limitations.md`, `path-to-production.md`,
`persistence-runbook.md`) are mostly still accurate. Where they are out of date,
this file says so.

Checked by running things, not only by reading docs:
- `pytest engine/tests`: 35 passed, 3 skipped (MySQL was down).
- `tsc --noEmit` in `web/`: clean.
- `eslint` in `web/`: 4 errors, 4 warnings.

Estimates are in developer-days (d) for one developer who knows the codebase.
**[EXT]** marks items that depend on an outside system or on another person.

---

## 1. Incomplete work

### 1a. Exercise card system

| # | Item | Where | Est. |
|---|---|---|---|
| C1 | **Unlocks are fake.** Nothing unlocks from exercises a member actually did. `unlockedCodes()` takes the first N cards of each level from a made-up session count: `longestWeeks * 3 + completedCount * 4`, with budgets of /4, /11 and /40. So which cards unlock depends on their order in the catalogue, not on training. The file's own comment says the real rule is `DISTINCT exercise_id` over session logs, and that isn't built. | `web/app/_components/CardsTab.tsx:41-60` | 2–3 d (after P1) |
| C2 | **Plans and cards aren't connected.** Plans are built from stimulus types and gym stations. No plan, circuit or session refers to a card's `EX###` code. The engine and stub engine contain no card codes at all, so a member can't earn a card by training, even in principle. | `engine/app/plangen.py`, `web/lib/stub/engine.ts`, `web/lib/stub/cards.ts` | 3–5 d |
| C3 | **The card catalogue lives in the web app.** `cards.ts` is 2,919 lines of generated data in `web/lib/stub/`. The architecture rule puts domain data behind the engine. Nothing in the engine serves cards. | `web/lib/stub/cards.ts` | 1–2 d |
| C4 | **The generator script isn't in the repo.** The header says the data is made by `scratchpad/gen_cards.py` from `Exercise_Catalogue_Darmstadt_v5_105_Exercises.xlsx`. Neither file is tracked. That means the catalogue can't be regenerated, even though the header says "do not hand-edit; regenerate". **[EXT]**: the spreadsheet comes from Sphery. | header of `cards.ts` | 0.5 d + getting the file |
| C5 | **The catalogue loader can't run.** It imports `openpyxl` and `psycopg`, and neither is in `requirements.txt`. It needs a Postgres instance, and none is set up. It has never been run as part of any workflow. | `engine/db/load_catalogue.py` | 0.5 d (after P1) |
| C6 | **Card points are display-only.** The schema has `card_level`, `exercise_families`, `member_family_levels` and a points ledger (`point_event`), but no code writes to them. The points shown on the Cards tab are added up in the browser and never reach the rank or monthly total. | `CardsTab.tsx:78`, `engine/db/schema.sql` | 2 d (after P1) |
| C7 | **Card content hasn't been reviewed.** Intensity, complexity, impact and body/brain tags were copied from the sheet with no review by a trainer. **[EXT]**: Sphery training lead (Stephan). | `cards.ts` | 1 meeting |
| C8 | **No tests for card code.** `web/` has no test runner (see G1). | — | in G1 |

### 1b. Adaptive training plan generation

| # | Item | Where | Est. |
|---|---|---|---|
| A1 | **Circuit rules exist twice, and the running copy is untested.** `circuit_for()` in Python is only called by tests. Every screen resolves stations, zones and minutes with `circuitFor()` in TypeScript, even when the plan came from the engine. No parity test pins the two copies together. The file header says so itself. | `engine/app/plangen.py:442`, `web/lib/stub/engine.ts:350`, used from `MemberApp.tsx` and `LiveSession.tsx` | 1–2 d |
| A2 | **The kiosk export ignores the generated plan.** `GET /generate-plan/{user_id}` copies the latest "Darmstadt"/single reference circle from MySQL and puts the member in it. `generate.py` is still labelled "Step 1 only". Acceptance criterion 4 is only met in shape, not content. | `engine/app/generate.py`, `engine/app/db.py:93` | 1–2 d |
| A3 | **The real export mapping has no callers.** `toCreateTrainingRequest()` in the web stub is exported but never called anywhere. So the only session→kiosk mapping that exists is in the wrong layer and unused. | `web/lib/stub/engine.ts:823` | in A2 |
| A4 | **No HR target reaches the kiosk.** Kiosk v1 and v2 exercises have work targets only. A per-station zone prescription can't be sent, so the demo puts it in the training name. **[EXT]**: Michel (schema field). | `engine/app/contract.py:37`, `docs/kiosk-api.md` | 0.5 d once the field exists |
| A5 | **Adaptation uses a frozen snapshot.** `score_trend()` reads `Workouts` from the July 2026 export. Nothing reads sessions logged after that. | `engine/app/adapt.py:77` | 2–4 d (needs P1 or a kiosk API read) |
| A6 | **Adaptation is stateless.** `/update-plan` takes the whole plan in the request body and sends back a modified copy. There's no stored plan version, and no `plan_changes` row is written. The rationale string is returned once and then lost. | `engine/app/adapt.py:160` | in P1 |
| A7 | **Heart-rate adaptation is never triggered.** The HR branch is the top rung of the ladder, but the web client deliberately doesn't send `hrAverage` because live-session HR is simulated (`Math.random` drift). In practice only perceived effort and score trend can fire. | `web/lib/engine/client.ts:100-115`, `LiveSession.tsx:137-144` | 3–5 d **[EXT]** needs a real HR source (strap/kiosk) |
| A8 | **No per-zone time for circle sessions.** `CircleTrainingExerciseLogsV2` has no `timeInTier1-5`, so `seconds_in_zone` is always null and circle sessions earn flat completion points only. **[EXT]**: Michel. | `docs/limitations.md` | 1 d once available |
| A9 | **Circle Trainings V2 isn't integrated.** CLAUDE.md names V2.6 as the integration target. All code reads v1 (`/api/v1`), and nothing in `engine/` or `web/lib/kiosk` uses V2. `kiosk-api.md` still says "we integrate against v1; treat v2 as moving". **[EXT]**: V2 schema stability (Michel/Jules). | `web/app/api/kiosk/trainings/route.ts`, `engine/app/contract.py` | 3–5 d |
| A10 | **Engagement is all stub.** Streaks, league rank, cohort, points to promotion, quests and the wallet come from hard-coded formulas in the stub. Examples: `rank: workoutsAnalyzed > 100 ? 4 : 11`, and `monthlyPointsFor = min(1400, pointsThisWeek + currentWeeks*40)`. The rebuilt Circle tab shows these numbers. | `web/lib/stub/engine.ts:500-556`, `MemberApp.tsx:865-910` | 5–8 d (after P1) |
| A11 | **Adaptation is coarse.** It moves difficulty by ±1 on future sessions of the same stimulus, from one session's evidence. There's no multi-session smoothing, no volume or duration changes, and no re-estimate of fitness. That was a v1 design choice, but it's a gap for production. | `engine/app/adapt.py` | 5+ d |
| A12 | **Circuit templates are unvalidated drafts.** The eight per-goal templates prescribe intensity to members who may have declared injuries. `member_restrictions` exists only in the schema, and no code enforces it. **[EXT]**: Stephan sign-off. | `docs/circuit-templates-evidence.md`, `plangen.py` | 1 meeting + 2 d to enforce restrictions |
| A13 | **Dead endpoint route.** `/api/kiosk/trainings` has no caller since `KioskActivity.tsx` was removed in `a66f6c8`. It also reads a hardcoded `participants[0]`, not the member's data. | `web/app/api/kiosk/trainings/route.ts` | 0.25 d |
| A14 | **The progress chart has a mock fallback.** `limitations.md` still lists the chart as mock, but that's out of date: `/progress-series` exists (`series.py`, Aug 14) and the chart calls it. The fallback to `progress-series.ts` ("MOCK… NOT REAL DATA") is still what runs on Vercel and for cold-start members. `series.py` has no tests. | `web/app/_components/TrainingProgressChart.tsx:517`, `engine/app/series.py` | 1 d (tests) |
| A15 | **Lint errors in session and app code.** There are two "Cannot access refs during render" errors, one "reassign variable after render" error, and one unescaped entity. There are also unused `Sparkline`, `trendOf` and `formatMetric`. These are React correctness issues, not just style. | `LiveSession.tsx:312,352`, `MemberApp.tsx:455`, `LoginStep.tsx:297` | 0.5–1 d |

---

## 2. What's needed for an end-to-end test deployment

Today only `web/` deploys, to Vercel, and it runs on the TypeScript stub with
invented members. The engine and both databases exist only on a developer's
laptop.

| # | Item | Detail | Est. |
|---|---|---|---|
| D1 | **Nowhere to run the engine** | There's no hosting target, deploy config or IaC. `engine/Dockerfile` runs one uvicorn process as root with no worker settings. `persistence-runbook.md` calls this undecided. **[EXT]**: hosting decision. | 1–2 d after decision |
| D2 | **No plan-app database (P1)** | `schema.sql` (58 tables) is written and has a verifier, but nothing uses it. There's no Postgres service in compose, no driver in `requirements.txt`, no `plan_db.py`, and no code writes plan state. State lives in React `useState`, and a refresh loses it. **[EXT]**: host choice (Supabase vs Infomaniak/Exoscale vs Hostpoint). Hostpoint (MariaDB) would mean a rewrite. | ~5 d; +5–10 d if MariaDB |
| D3 | **No migration tooling** | Setup means applying the whole `schema.sql` in one go by hand. There's no migrations directory or version table, and no way to change a live database. `verify_schema.sql` only runs on a fresh DB. `seed_gyms.sql` duplicates the gym floors hard-coded in `web/lib/stub/data.ts`. | 1–2 d |
| D4 | **Engine data source assumes a local export** | `db.py`, `series.py` and `adapt.py` read MySQL via `SPHERY_DB_URL`, which defaults to `root:devpassword@localhost`. The export is loaded from `_local/db/*.sql` through the MySQL init dir. A hosted engine has neither the dump nor a way to reach Sphery's production DB. The documented plan is to switch to kiosk API reads. **[EXT]**: data agreement / GDPR (Stephan, Michel, Helen), plus API access. | 3–5 d technical |
| D5 | **Web build hard-codes the engine URL** | `NEXT_PUBLIC_ENGINE_URL` is fixed at build time and defaults to `http://localhost:8000` in `web/Dockerfile`. Compose passes no build arg. On Vercel it's unset, so the app silently uses the stub. There's no per-environment config. | 0.5 d |
| D6 | **Failures fall back to the stub silently** | Every call in `web/lib/engine/client.ts` returns `null` on error, and the UI then uses the stub. A broken deployment still looks like it works, so a test run can't tell real output from stub output. | 1 d |
| D7 | **CORS is a single origin with a localhost default** | `WEB_ORIGIN` is one string, and compose sets it to `http://localhost:3000`. Vercel preview URLs change per deploy and won't match. | 0.25 d |
| D8 | **Secrets and credentials are in files** | `devpassword` is in `docker-compose.yml`, `db.py:19` and `series.py:65`, and the root DB user is used. There's no `.env.example` and no secrets management. `.gitignore` covers only `.env` and `.env.local`, not `.env*` (security review finding 4, still open). | 0.5–1 d |
| D9 | **Ports and compose are dev-only** | Every service is bound to `127.0.0.1`. The web image runs `npm start` without the standalone output, and `next.config.ts` is empty. Compose has no restart policies, only the MySQL healthcheck, no resource limits, and no reverse proxy or TLS. | 1–2 d |
| D10 | **Duplicated `_connect()`** | `series.py` has its own copy of the connection code and default URL instead of using `db.py`. There's no connection pooling, and every request opens a new MySQL connection. | 0.5 d |
| D11 | **Population cache never refreshes** | `population_scores()` is `lru_cache(maxsize=1)` for the life of the process. Fine against a frozen export, but stale against live data. | 0.25 d |
| D12 | **Deploy scripts are tied to one laptop** | `scripts/auto-deploy.sh` hard-codes `/Users/anthonymccrovitz/...`, Homebrew paths and a macOS LaunchAgent. Conductor scripts assume a shared MySQL container on the same machine. Vercel Hobby's cap of 100 deploys/day applies account-wide and is shared with other projects. **[EXT]**: Vercel account/plan owner. | 0.5–1 d |
| D13 | **No CI** | There's no `.github/`, no pipeline, no build check, no test gate, and no image build or push. | 1–2 d |
| D14 | **Real login not wired in** | Login is a persona picker. The `auth/sign_in` kiosk API was verified on Aug 6 but isn't called. The schema expects Supabase Auth (`accounts.auth_user_id`). For end-to-end tests with real Sphery IDs, identity has to come from somewhere. **[EXT]**: kiosk API credentials/terms; Supabase if chosen. | 2–4 d (after D2) |
| D15 | **Kiosk writes not wired in** | The "send to kiosk" `POST /circle-trainings` isn't built. It may only target `SPHERY-TESTENV1`. **[EXT]**: Sphery sign-off for test-kiosk writes. | 1–2 d |
| D16 | **Dependency advisories still open** | `next` is still 16.2.10. The Aug 4 review flagged 9 advisories against that version plus transitive postcss, sharp and brace-expansion issues. `pip-audit` has never been run. `pytest` ships in the runtime `requirements.txt`. | 0.5 d |

---

## 3. Gaps between current state and a production product

### Test coverage

| # | Item | Est. |
|---|---|---|
| G1 | `web/` has no test runner, config or tests. That includes the 842-line stub engine, the 347-line intake state machine, and all card logic. | 2 d setup + ongoing |
| G2 | The engine has 38 tests: `test_plangen` (252 lines), `test_adapt` (132), `test_estimate` (86). There are none for `series.py`, `generate.py`, `features.py` in isolation, or `main.py`. No HTTP-level API tests exist. The 3 DB-backed tests skip unless the local MySQL export is running, and there's no fixture DB. | 3–4 d |
| G3 | No Python↔TypeScript parity test (A1), and no shared fixtures or generated types between `plangen.py` and `web/lib/types/plan.ts`. | 1–2 d, or 0 if A1 removes the twin |
| G4 | No end-to-end or browser tests, and no contract test against the kiosk API (it was verified by hand on Aug 6). | 3–5 d **[EXT]** stable test kiosk |
| G5 | `verify_schema.sql` (126 checks) runs by hand only, and needs `psql`, which isn't installed on this machine. | in D13 |

### Error handling

| # | Item | Est. |
|---|---|---|
| G6 | Engine endpoints have almost no error handling. DB connection failures, missing members or malformed plan dicts become unhandled 500s. `/estimate` and `/generate-plan` (POST) have no try/except. `apply_update` indexes `session["hrTarget"]["bpm"]` and `s["difficulty"]` directly on an untyped `plan: dict`. | 2 d |
| G7 | `/update-plan` accepts any `dict` as the plan, with no schema validation, and returns the client's data back to it. A client can make up plan state. | 1–2 d (resolved properly by P1) |
| G8 | The web client swallows every error (`catch { return null }`). There's no user-facing error state, retry, or reporting (see D6). | 1–2 d |
| G9 | The kiosk route returns an empty list on any failure and drops the status, so the UI can't tell "no data" from "API down". | 0.5 d |

### Auth and access control

| # | Item | Est. |
|---|---|---|
| G10 | There's no authentication anywhere. Any caller who can reach the engine can read any `user_id`'s estimate, HR and history (`/estimate/{id}`, `/progress-series/{id}`). User IDs are sequential integers. | 3–5 d **[EXT]** identity provider decision |
| G11 | No authorisation model at all, so nothing ties a request to the member whose data it reads. The schema has `accounts`/`members`/`external_identities` but no code enforces anything. Row-level security isn't defined in `schema.sql`, which matters if the DB is Supabase. | 3–5 d |
| G12 | The signup screen has a real password field that goes nowhere (security review finding 5, still present). | 0.25 d |
| G13 | No rate limiting, request size limits or WAF. The review deferred them to P2. | 1 d |

### Logging and observability

| # | Item | Est. |
|---|---|---|
| G14 | No logging in the engine: no `logging` import in `engine/app/`. The only output is uvicorn's access log, with no request IDs and no structured logs. | 1 d |
| G15 | No error tracking, metrics or uptime monitoring. `/health` returns a static `ok` without checking the DB. | 1–2 d |
| G16 | No audit trail for plan changes. `plan_changes` exists in the schema but nothing writes to it, so rationale strings aren't kept (A6). | in P1 |

### Data handling

| # | Item | Est. |
|---|---|---|
| G17 | There's no GDPR position or data processing agreement for hosting member health data (HR, dob, weight). `limitations.md` says nothing hosted may touch real member data until this is answered. **[EXT]**: Sphery (Stephan, Michel, Helen). This blocks D1, D4 and D14 for real members. | business decision |
| G18 | Consent and erasure exist only in the schema (`consents`, `erasure_requests`). No code records consent at intake or handles an erasure request, and nothing spans both stores (the plan DB and Sphery's data). | 3–4 d |
| G19 | No data retention, backup or restore plan for the plan database, and no encryption-at-rest decision (depends on the host). | 1–2 d **[EXT]** host |
| G20 | The real export sits unencrypted on a developer laptop (`_local/db/`) and is shared with every Conductor workspace through a symlink. Access to it is informal ("ask Anthony or Michel"). | process, **[EXT]** |
| G21 | The health gate (injuries, recovery stage) is collected in intake but only used to shape questions. `member_restrictions` isn't enforced in generation (A12), so a declared injury doesn't reliably limit what's prescribed. | in A12 |
| G22 | Age is computed with `datetime.utcnow()` (deprecated), and there's no time-zone handling for members. The series anchor is the last session, not "now", which is correct against a frozen export but needs revisiting against live data. | 0.5 d |

---

## Dependencies on people and external systems

| Dependency | Owner | Blocks |
|---|---|---|
| Hosting and database vendor decision | Sphery (open since Aug 14) | D1, D2, D19 |
| GDPR / data processing agreement | Stephan, Michel, Helen | D4, D14, G17, any real-member test |
| HR target field on kiosk exercises | Michel | A4 |
| Per-zone durations in `CircleTrainingExerciseLogsV2` | Michel | A8, card/points accuracy |
| Circle Trainings V2 schema stability | Michel / Jules | A9 |
| Sign-off on templates and card content | Stephan | A12, C7 |
| Exercise catalogue spreadsheet (source file) | Sphery | C4, C5 |
| Test-kiosk writes (`SPHERY-TESTENV1`) and API credentials | Sphery | D14, D15, G4 |
| Real HR source (strap or kiosk data) | Sphery hardware / API | A7 |
| Vercel account plan (shared 100/day cap) | Account owner | D12 |

## Rough totals

These add up the estimates above and don't include waiting on the people in the
table:

- Section 1 (cards + plan generation): ~35–55 d
- Section 2 (a test deployment that uses the engine, a DB and real IDs): ~20–35 d
- Section 3 (production gaps beyond that): ~30–45 d

The sections overlap. P1 persistence (D2) is a prerequisite for C1, C5, C6,
A5, A6, A10, G7 and G16, and it's counted only once, in D2.
