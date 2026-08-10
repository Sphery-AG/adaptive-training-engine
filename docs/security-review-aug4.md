# Security review, Aug 4 (report only)

Scope: full repo sweep of engine/ and web/, dependency audits, git hygiene.
Bottom line: nothing blocks deploying the stub demo publicly. The demo makes
zero network calls, has no server code, and ships no secrets in the bundle.

## What's solid

- SQL: every query in the engine is parameterized with pymysql %s placeholders
  and tuple args. Verified all call sites: engine/app/db.py (3 queries),
  engine/app/features.py (6 queries), engine/_explore_estimate.py (1 query).
  No f-string, .format(), or concatenated SQL anywhere. cli.py, generate.py,
  contract.py, main.py contain no SQL.
- Input validation: FastAPI path params are typed int (auto-validated),
  responses go through Pydantic models (contract.py), cli.py coerces argv to
  int. No raw user input reaches SQL or shell. No pickle, yaml.load, eval,
  exec, subprocess, or os.system in engine code.
- Git hygiene: no .env, .sql dumps, .db files, or keys tracked. The one
  tracked .sql (docs/adaptive_schema_draft.sql) is a schema draft with zero
  INSERTs, deliberately allowlisted. .gitignore covers .env, .env.local,
  *.sql, *.db, _local/.
- Web bundle: no NEXT_PUBLIC vars, no API routes, no fetch calls, no
  dangerouslySetInnerHTML, no middleware, no server actions, no next/image.

## Findings (severity-ordered)

1. HIGH: npm audit reports 4 high-severity advisory groups, all fixable.
   next 16.2.10 carries 9 advisories (SSRF in server actions, middleware
   bypass, cache confusion, image-API DoS); the stub uses none of those
   features, so practical exposure on the demo is low, but the patch is a
   minor bump. Also brace-expansion (DoS), postcss (XSS/path traversal),
   sharp (libvips CVEs), all via next.
   Fix: in web/, run `npm audit fix`, then bump `"next": "16.3.0"` (and
   eslint-config-next) in package.json and `npm install`. Do this before the
   Aug 26 demo, not necessarily before the Thursday link.
2. MEDIUM: docker-compose.yml publishes MySQL as "3306:3306", which binds on
   all interfaces, so root/devpassword is reachable from the LAN.
   Fix: change the port mapping to "127.0.0.1:3306:3306".
3. MEDIUM: engine has no CORS config at all (engine/app/main.py). Browser
   calls from web/ will fail once wired up, and the tempting quick fix is
   allow_origins=["*"]. Add the locked version instead when wiring:
       import os
       from fastapi.middleware.cors import CORSMiddleware
       app.add_middleware(
           CORSMiddleware,
           allow_origins=[os.environ.get("WEB_ORIGIN", "http://localhost:3000")],
           allow_methods=["GET", "POST"],
           allow_headers=["*"],
       )
4. LOW: dev DB credentials are hardcoded as fallbacks: DEFAULT_DB_URL in
   engine/app/db.py:19 and MYSQL_ROOT_PASSWORD in docker-compose.yml:5.
   Acceptable for the local-only export, and SPHERY_DB_URL override already
   exists. Before anything touches a real DB: drop the password from
   DEFAULT_DB_URL and use `MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}` in
   compose with a gitignored .env. Also widen .gitignore from `.env` and
   `.env.local` to `.env*` plus `!.env.example`.
5. LOW: the create-account screen (web/app/_components/LoginStep.tsx:173) has
   a real password input on the public demo. It never leaves the browser, but
   visitors may type a real password into a fake form.
   Fix: remove the field or placeholder it as "Password (demo only)".
6. INFO: pip-audit is not installed, so Python deps are unaudited. Versions
   are pinned and recent (fastapi 0.115.2, starlette 0.40.0, pymysql 1.1.1,
   cryptography 43.0.1, pydantic 2.9.2).
   Fix: `engine/.venv/bin/pip install pip-audit` then
   `engine/.venv/bin/pip-audit -r engine/requirements.txt`.

## Accepted scope (not findings)

- No real auth: user-select stands in for login, per v1 scope in CLAUDE.md.
- No rate limiting or WAF: deliberately deferred to P2.
- Engine runs local-only against the static export; it is not deployed.

## Commands run

- grep sweep of all execute/SELECT sites in engine/ (incl. _explore_estimate.py)
- git ls-files | grep -iE '\.env|\.sql$|\.db$|secret|credential|\.pem$|\.key$'
- npm audit (web/), .venv/bin/pip list (engine/), pip-audit absent
- greps for pickle/yaml.load/eval/exec/subprocess, NEXT_PUBLIC, fetch,
  dangerouslySetInnerHTML, middleware/server actions/next-image

## Addendum, Aug 10

Two things changed that this review's findings should not be read against
without noting.

- `docs/adaptive_schema_draft.sql` was deleted, superseded by
  `engine/db/sphery_additions.sql`.
- `.gitignore` previously excluded `*.sql` to keep DB dumps out, which silently
  excluded our own migrations too. It now allows `engine/db/*.sql`, so more
  tracked `.sql` files exist than when this review ran. All of them are DDL we
  author and none contain member data. The rule keeping dumps out is unchanged.
