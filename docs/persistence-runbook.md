# Persistence runbook

What to do once the hosting question is settled, and what to do before it is.
Written Aug 14, while the database host was still undecided.

## The point of this file

The hosting decision looks like it blocks everything. It does not. Every
candidate except Hostpoint speaks PostgreSQL, and `engine/db/schema.sql` is
PostgreSQL 16. So the work below is the same whoever wins, and the host only
decides a connection string and which managed service sends the invoice.

That means the persistence layer can be built against a local Postgres today
and pointed at the real host later. Do not wait for the decision to start.

## Where this stands right now

Nothing is persisted. Plans, completed sessions, points and streaks live in
browser storage and a refresh loses them.

Three things do not exist yet, and none of them are hard:

- **No plan-side database module.** `engine/app/db.py` reads the Sphery MySQL
  export and says so at the top: it only touches the existing Sphery schema,
  and the plan tables were always going to get their own module. That module
  was never written.
- **No Postgres driver.** `engine/requirements.txt` has `pymysql` and nothing
  else database-shaped.
- **No Postgres container.** `docker-compose.yml` runs MySQL 8 for the export,
  the engine and the web app. There is no second database.

The schema itself is not the blocker. `engine/db/schema.sql` is 58 runnable
tables and `engine/db/verify_schema.sql` proves it.

## Decision-independent work, about a week

Do this in order. None of it depends on where the database ends up living.

1. **Add Postgres to docker-compose.** A second service beside the existing
   `db`. Do not touch the MySQL one; the export is read-only and shared across
   Conductor workspaces.
2. **Add a driver to `engine/requirements.txt`.** `psycopg[binary]` is the
   boring choice and matches the "small and boring" note already in that file.
3. **Apply the schema, then verify it.** `schema.sql` followed by
   `verify_schema.sql`, which CLAUDE.md requires to pass after any schema
   change. If it passes locally it will pass on the host.
4. **Write `engine/app/plan_db.py`.** The module `db.py` promised. Reads and
   writes plans, sessions, estimates, points. Keep the MySQL reader separate —
   the two databases must never be joined, and the bridge between them is an
   id, not a foreign key.
5. **Move state off the browser.** The web app stops holding plan state and
   asks the engine for it. This is the change that makes a refresh survivable
   and is the real definition of "the app is live".

Only after 5 does real login become worth building, because a session needs
somewhere to live.

## What differs per host, about an hour

Everything above is done. This is all that changes.

### Supabase

1. Create a project, choose an EU region.
2. Copy the connection string from Project Settings → Database.
3. Set it as an environment variable for the engine.
4. Run `schema.sql`, then `verify_schema.sql`.

Worth knowing: Supabase Auth also solves login, and `accounts.auth_user_id` in
our schema is already the join to it. That is one supplier answering two of our
open questions.

### Infomaniak or Exoscale

1. Create a managed PostgreSQL instance in a Swiss region.
2. Copy the connection string.
3. Allow the engine's IP, since managed Swiss databases default to closed.
4. Set the environment variable, run `schema.sql`, then `verify_schema.sql`.

Login is not included, so `auth/sign_in` against the kiosk API stays our job.

### Hostpoint

Not the same shape as the other two. Hostpoint offers MariaDB, not PostgreSQL,
so steps 1 to 5 above do not apply as written: the 58 tables would need
rebuilding, `jsonb` and the enum types have no direct equivalent, and every
query in the new module changes. Budget one to two weeks rather than one hour,
and note that it still leaves the Python engine without a host, since Hostpoint
runs Python only on their Managed Flex Server, self-managed, without Docker.

## The engine still needs somewhere to run

Separate from the database, and true whichever host wins. The engine is a
Python service that has to stay running; it is localhost-only today, which is
why the deployed web app runs on stub data.

Any small Swiss or European VM handles it, and it is a few francs a month. It
does not need to be decided at the same time as the database, but it does need
deciding before anything the engine computes reaches a real member.

## Related

- `docs/path-to-production.md` — the full gap list. Note that its gap 2 says
  login is blocked on persistence; that is true for a login that survives a
  refresh, but a session-scoped login could be demonstrated sooner.
- `docs/plan-app-database-design.md` — why the schema is shaped the way it is.
- `docs/kiosk-api.md` — the NEXUS API, including `auth/sign_in` for real login.
