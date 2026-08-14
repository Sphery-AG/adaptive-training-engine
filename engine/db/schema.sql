-- =============================================================================
-- Adaptive Training Plan app — the database
-- PostgreSQL 16 (target host: Supabase)
--
-- Designed from scratch. This file is the source of truth; it inherits nothing
-- from the earlier drafts (plan_app_schema.sql, plan_app_schema_v2.sql and
-- sphery_additions.sql are all superseded by it).
--
-- Every vocabulary below was checked against code that already ships —
-- web/lib/types/plan.ts, web/lib/types/engagement.ts, web/lib/intake/model.ts,
-- engine/app/plangen.py — against the Darmstadt exercise catalogue (105
-- exercises, v5) and its Taxonomy sheet, and against Michel's Circle Trainings
-- Data Schema V2.6 (Miro, 11 Aug 2026). Where two sources disagreed, both are
-- kept and the bridge between them is a table, because they are answering
-- different questions.
--
-- The decisions this encodes, and which are load-bearing:
--
--   A member's GOAL and an exercise's GOAL TAG are two vocabularies, not one.
--   The member picks from eight product goals ("Prepare for an Event"); the
--   catalogue tags exercises with seven training goals, and has no concept of
--   an event. One enum serving both is how "prepare_for_event" became
--   unstorable. `goal_exercise_goals` is the translation, and it is data.
--
--   Body + Brain is the vocabulary of EXERCISES. Stimulus type is the
--   vocabulary of SESSIONS. An exercise is tagged with the qualities it
--   develops; a session is prescribed with the intent it serves. These are
--   different altitudes and both are stored.
--
--   The prescription is rows, not a document. There is no `weeks` blob. A
--   missed session is the absence of a log against a `plan_sessions` row, and
--   that query is the whole adaptive loop.
--
--   A circuit is (station x round x split), never a flat list. Michel's V2
--   schema carries roundIndex and splitIndex on every exercise log, and mutual
--   mode opens a new split when two athletes swap mid-station. A model with one
--   row per exercise cannot store a second round, let alone a swap.
--
--   Nobody trains alone. In V2 every participant is a group member, even a
--   group of one. `group_trainings -> training_teams -> session_logs` mirrors
--   that, so a kiosk result lands without being flattened on the way in.
--
--   Intensity, Complexity and Impact are three independent axes, not one
--   difficulty number. Intensity is how hard it FEELS (subjective effort, and
--   deliberately NOT the prescribed heart-rate zone). Complexity is how hard it
--   is to DO at all (skill + cognitive demand). Impact is joint loading, and it
--   is a safety gate rather than a descriptor — which means there must be
--   something on the MEMBER side to gate against. `member_restrictions` is it.
--
--   Progression is two-dimensional: a member climbs card levels within a family
--   (Sumo Squat -> Squat -> Wall Ball) AND adjusts load within a card.
--
--   Metrics carry their own polarity, thresholds and SCOPE as data, and their
--   keys are the keys the UI actually renders. Scope matters because a session
--   metric and a windowed metric are not the same shape, and the database
--   refuses to mix them.
--
--   The three apps share identity and an event log, never tables.
--
-- Conventions: snake_case, UTC (timestamptz), surrogate bigint keys, created_at
-- everywhere. Enum labels are snake_case; display strings and the app's
-- camelCase contract values are mapped at the edge, so no punctuation and no
-- casing accident ever reaches an enum literal.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 0. HELPERS
-- =============================================================================

-- Postgres has no ON UPDATE. Every `updated_at` in this file is maintained by
-- this trigger rather than by whichever caller remembers, because the column is
-- worthless the first time one of them forgets.
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The tenant of the current request, for row-level security. Set once per
-- connection or transaction by the API layer:
--   SET LOCAL app.org_id = '1';
-- Returns NULL when unset, and every policy fails closed on NULL. The engine's
-- own maintenance role is granted BYPASSRLS; see section 13.
CREATE FUNCTION app_current_org_id() RETURNS bigint AS $$
  SELECT nullif(current_setting('app.org_id', true), '')::bigint;
$$ LANGUAGE sql STABLE;

-- =============================================================================
-- 1. VOCABULARY
-- =============================================================================

-- --- From the catalogue's Taxonomy sheet, verbatim ---------------------------

-- Body: what physical quality an exercise trains. All 105 exercises carry >=1.
CREATE TYPE body_quality AS ENUM (
  'coordination', 'strength', 'endurance', 'speed', 'mobility'
);

-- Brain: what cognitive quality it trains. Blank unless genuinely cognitive —
-- 42 of 105 carry one, and they are NOT confined to Sphery equipment.
CREATE TYPE brain_quality AS ENUM (
  'memory', 'focus', 'reaction', 'cognitive_flexibility', 'perception_orientation'
);

CREATE TYPE card_level AS ENUM ('foundation', 'progress', 'mastery');

-- Balances a circuit: the engine must not stack three pushes in a row.
CREATE TYPE movement_pattern AS ENUM (
  'squat', 'hinge', 'lunge', 'push', 'pull', 'carry',
  'rotation', 'core_stability', 'locomotion', 'jump'
);

-- What kind of training this IS, as distinct from which qualities it develops.
CREATE TYPE modality AS ENUM (
  'strength', 'power', 'cardio', 'mobility', 'stability',
  'agility', 'plyometric', 'motor_control', 'physio_cognitive'
);

CREATE TYPE body_region AS ENUM (
  'full_body', 'upper_body', 'legs', 'glutes', 'core',
  'back', 'chest', 'shoulders', 'arms'
);

-- How an exercise is TAGGED in the catalogue. Seven values, and none of them is
-- "prepare for an event", because an exercise cannot be tagged with a race.
CREATE TYPE exercise_goal AS ENUM (
  'fat_burn_weight_loss', 'build_strength_muscle', 'improve_endurance_fitness',
  'move_pain_free', 'boost_health_longevity', 'improve_sports_performance',
  'train_body_and_mind'
);

-- Joint loading. Low 81 / Medium 21 / High 3 across the catalogue.
-- Declared in ascending order on purpose: `impact > 'low'` is a valid, indexed
-- comparison, and the safety gate in section 6 depends on it.
CREATE TYPE impact_level AS ENUM ('low', 'medium', 'high');

-- --- From the product, verbatim (web/lib/types/) -----------------------------

-- What the MEMBER chose. Eight values, in the questionnaire's order. These are
-- the slugs the intake already sends; changing either side breaks the other.
CREATE TYPE training_goal AS ENUM (
  'lose_weight_burn_fat', 'build_strength_muscle', 'improve_fitness_endurance',
  'move_pain_free', 'boost_health_longevity', 'improve_sports_performance',
  'prepare_for_event', 'train_body_mind'
);

-- What a SESSION is for. The engine's prescription vocabulary, and what the
-- station resolver matches against.
CREATE TYPE stimulus_type AS ENUM (
  'cardio_endurance', 'cardio_intensity', 'cognitive_motor', 'recovery',
  'strength', 'mobility_stability', 'power_speed'
);

-- How the equipment adapts during the session. Mirrors RaceConfigs.
-- adaptivityType in Sphery's schema, which spells these in camelCase
-- ('hrTracking', 'cognitionOnly'); mapped at the export boundary.
CREATE TYPE adaptivity_type AS ENUM ('performance', 'hr_tracking', 'cognition_only');

-- Where an exercise sits in a circuit. plangen.py builds warmup/cooldown
-- bookends around a work block; without this column "did they hold the zone"
-- silently averages the warmup in, which is the exact error per-leg rows exist
-- to remove.
CREATE TYPE exercise_role AS ENUM ('warmup', 'work', 'cooldown');

CREATE TYPE fitness_level  AS ENUM ('low', 'medium', 'high');
CREATE TYPE weekday        AS ENUM ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');
CREATE TYPE recovery_stage AS ENUM ('acute', 'early', 'strength', 'return', 'recovered');

-- The medal ladder, deliberately shared by two DIFFERENT mechanics: the monthly
-- status rank a member holds over time, and the weekly cohort they are placed
-- in against other people. Decided Aug 4 over the orbit-themed names because
-- everyone already understands medals. Declared low -> high, so `>` compares.
CREATE TYPE league_tier    AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond');
CREATE TYPE rank_change    AS ENUM ('advanced', 'held', 'dropped');
CREATE TYPE quest_tier     AS ENUM ('quick', 'medium', 'long');

-- What a quest or an emblem is measured on. Typed rather than jsonb: a rule is
-- a promise to a member, and a typo in a blob is a quest nobody can ever
-- complete and nobody notices. Every value here is something this schema can
-- actually compute.
CREATE TYPE progress_metric AS ENUM (
  'sessions_completed', 'training_minutes', 'target_zone_minutes', 'points_earned',
  'benchmarks_completed', 'plan_blocks_completed', 'streak_weeks',
  'hr_recovery_delta', 'level_ups', 'months_at_tier'
);
CREATE TYPE progress_window AS ENUM ('session', 'week', 'month', 'plan_block', 'all_time');
CREATE TYPE comparator      AS ENUM ('at_least', 'at_most');

-- How a point rule pays out, and what it pays out for.
CREATE TYPE point_basis AS ENUM ('per_minute', 'per_event');
CREATE TYPE point_event AS ENUM (
  'training_minute', 'target_zone_minute', 'planned_session_completed',
  'benchmark_completed', 'feedback_given', 'plan_block_completed',
  'quest_completed', 'reward_claimed', 'manual_adjustment'
);

-- --- From Michel's Circle Trainings V2.6 -------------------------------------
-- Kept verbatim in meaning so an ingested kiosk session is not flattened. The
-- names are ours; the value sets are his.

CREATE TYPE circuit_mode  AS ENUM ('single', 'double', 'relay');
CREATE TYPE circuit_type  AS ENUM ('standard', 'mutual', 'rotate');
CREATE TYPE circuit_style AS ENUM ('duration', 'score');
CREATE TYPE training_status AS ENUM ('setup', 'started', 'completed');
CREATE TYPE team_status     AS ENUM ('active', 'completed', 'incomplete');
CREATE TYPE log_status      AS ENUM ('active', 'completed');
-- Which standard a member is training TO. Not kiosk classification: HYROX Pro
-- runs heavier sleds than Open, so this changes prescribed load, which makes it
-- a property of the plan's target rather than of any one session.
CREATE TYPE event_division AS ENUM ('pro', 'open');

CREATE TYPE plan_status    AS ENUM ('active', 'superseded', 'completed', 'abandoned');
CREATE TYPE session_source AS ENUM ('app', 'kiosk', 'imported');
CREATE TYPE reward_kind    AS ENUM ('free_session', 'smoothie', 'coaching', 'guest_pass', 'merch', 'custom');
CREATE TYPE claim_status   AS ENUM ('claimed', 'redeemed', 'expired', 'cancelled');
CREATE TYPE id_provider    AS ENUM ('sphery', 'nexus_kiosk', 'google', 'apple');
CREATE TYPE consent_kind   AS ENUM ('health_data', 'marketing', 'leaderboard_visibility');
CREATE TYPE restriction_source AS ENUM ('questionnaire', 'member', 'coach', 'clinician');

-- =============================================================================
-- 2. TENANCY AND THE FLOOR
-- =============================================================================

CREATE TABLE orgs (
  id         bigserial PRIMARY KEY,
  slug       text        NOT NULL UNIQUE,
  name       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE gyms (
  id         bigserial PRIMARY KEY,
  org_id     bigint      NOT NULL REFERENCES orgs(id) ON DELETE RESTRICT,
  slug       text        NOT NULL,
  name       text        NOT NULL,
  -- The kiosk's own identifier for this floor ("THESPHEREDARMSTADT"). It is how
  -- an inbound circle training resolves to a gym: V2 sends kioskId as a string
  -- and nothing else in the payload says where it happened. NULL for a gym with
  -- no kiosk, which is most of them.
  kiosk_id   text        UNIQUE,
  location   text,
  timezone   text        NOT NULL DEFAULT 'Europe/Berlin',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, slug)
);

-- Equipment is a catalogue of KINDS (31 in the Darmstadt sheet, 28 of which
-- appear as a primary; the rest are secondary only) rather than an enum,
-- because a gym owns equipment and an operator adds new kinds without a
-- release. This is the join that makes one exercise library serve every gym.
CREATE TABLE equipment (
  id            bigserial PRIMARY KEY,
  slug          text    NOT NULL,
  name          text    NOT NULL,
  is_sphery     boolean NOT NULL DEFAULT false,
  -- NULL = the shared library every gym gets. Set = this gym added its own
  -- kind. Symmetrical with exercises.owning_gym_id: a gym that can author an
  -- exercise can author the thing the exercise is performed on.
  owning_gym_id bigint  REFERENCES gyms(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_equipment_shared ON equipment (slug) WHERE owning_gym_id IS NULL;
CREATE UNIQUE INDEX uq_equipment_gym    ON equipment (owning_gym_id, slug) WHERE owning_gym_id IS NOT NULL;

-- Which stimuli a kind of equipment can deliver, and through which mode. This
-- is the resolver's index: a plan prescribes `cardio_intensity`, and this is
-- what turns that into "the ExerCube, in Fitness mode".
CREATE TABLE equipment_stimuli (
  equipment_id bigint        NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  stimulus     stimulus_type NOT NULL,
  mode         text,
  PRIMARY KEY (equipment_id, stimulus)
);
CREATE INDEX ix_equipment_stimuli ON equipment_stimuli (stimulus, equipment_id);

-- A STATION is one physical instance of a kind of equipment on one gym's floor.
--
-- This is a table and not a `station_count` column because the engine reasons
-- over instances, not counts: plangen.py's circuit resolver reserves a bookend
-- station, refuses to repeat a station while others are free, and when it must
-- repeat picks the one used longest ago. All three need station identity. It is
-- also what the kiosk means by a station, and what a floor plan labels.
CREATE TABLE stations (
  id           bigserial PRIMARY KEY,
  gym_id       bigint  NOT NULL REFERENCES gyms(id)      ON DELETE CASCADE,
  equipment_id bigint  NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
  name         text    NOT NULL,          -- "ExerCube 2", what the floor calls it
  position     smallint,                  -- order around the circuit, if fixed
  retired_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gym_id, name)
);
CREATE INDEX ix_stations_gym ON stations (gym_id) WHERE retired_at IS NULL;
CREATE INDEX ix_stations_equipment ON stations (equipment_id);

-- What a gym can deliver, derived: no count to keep in step with reality.
CREATE VIEW gym_equipment AS
  SELECT s.gym_id, s.equipment_id, count(*) AS station_count
    FROM stations s WHERE s.retired_at IS NULL
   GROUP BY s.gym_id, s.equipment_id;

-- =============================================================================
-- 3. THE EXERCISE CATALOGUE
-- =============================================================================

CREATE TABLE exercise_families (
  id         bigserial PRIMARY KEY,
  slug       text NOT NULL UNIQUE,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- The ladder a family offers is NOT stored: it is SELECT DISTINCT level FROM
-- exercises WHERE family_id = ..., and a stored copy is a copy that drifts.
-- The view at the end of section 3 serves it. Families with a single Foundation
-- card progress by load only; the engine must treat that as normal, not a gap.
--
-- A rung can also hold more than one card: Hip Stability carries two Foundation
-- exercises. So "advance this family" is not always "move up a level" — it may
-- be a sideways swap at the same level. Measured against the v5 sheet: 50
-- families — 14 ladder {foundation} (13 of them a single card, Hip Stability
-- two), 23 {foundation,progress}, and 13 the full three.

CREATE TABLE exercises (
  id                   bigserial PRIMARY KEY,
  code                 text        NOT NULL,          -- EX001
  name                 text        NOT NULL,
  family_id            bigint      NOT NULL REFERENCES exercise_families(id) ON DELETE RESTRICT,
  level                card_level  NOT NULL,
  primary_equipment_id bigint      NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,

  -- Three independent axes. See the header.
  intensity_min        smallint    NOT NULL CHECK (intensity_min BETWEEN 1 AND 5),
  intensity_max        smallint    NOT NULL CHECK (intensity_max BETWEEN 1 AND 5),
  complexity           smallint    NOT NULL CHECK (complexity BETWEEN 1 AND 5),
  impact               impact_level NOT NULL,

  movement             movement_pattern NOT NULL,
  training_modality    modality    NOT NULL,

  region_primary       body_region NOT NULL,
  region_secondary     body_region,
  region_tertiary      body_region,

  owning_gym_id        bigint      REFERENCES gyms(id) ON DELETE CASCADE,
  retired_at           timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ck_intensity_order CHECK (intensity_max >= intensity_min),
  CONSTRAINT ck_intensity_span  CHECK (intensity_max - intensity_min <= 2),
  CONSTRAINT ck_region_2 CHECK (region_secondary IS NULL OR region_secondary <> region_primary),
  CONSTRAINT ck_region_3 CHECK (
    region_tertiary IS NULL OR
    (region_secondary IS NOT NULL AND region_tertiary <> region_primary AND region_tertiary <> region_secondary)
  )
);
-- Codes are unique within their library, not globally: a gym authoring EX001
-- of its own must not collide with the shared catalogue's EX001.
CREATE UNIQUE INDEX uq_exercises_shared ON exercises (code) WHERE owning_gym_id IS NULL;
CREATE UNIQUE INDEX uq_exercises_gym    ON exercises (owning_gym_id, code) WHERE owning_gym_id IS NOT NULL;
CREATE INDEX ix_exercises_family    ON exercises (family_id, level);
CREATE INDEX ix_exercises_equipment ON exercises (primary_equipment_id) WHERE retired_at IS NULL;
CREATE INDEX ix_exercises_selection ON exercises (movement, impact, complexity) WHERE retired_at IS NULL;
-- Every rule the Taxonomy sheet states is a constraint here, so the catalogue
-- cannot regress on import. All 105 current rows satisfy every one of them,
-- verified by running load_catalogue.py against the v5 sheet.

CREATE TABLE exercise_body_qualities (
  exercise_id bigint       NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  quality     body_quality NOT NULL,
  PRIMARY KEY (exercise_id, quality)
);
CREATE INDEX ix_ebq_lookup ON exercise_body_qualities (quality, exercise_id);

CREATE TABLE exercise_brain_qualities (
  exercise_id bigint        NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  quality     brain_quality NOT NULL,
  PRIMARY KEY (exercise_id, quality)
);
CREATE INDEX ix_ebrq_lookup ON exercise_brain_qualities (quality, exercise_id);
-- These two tables are the whole Body/Brain model, and what the Body and Brain
-- scores are computed from: a session's contribution is the qualities of the
-- exercises actually performed, weighted by time. Nothing is invented.

CREATE TABLE exercise_goals (
  exercise_id bigint        NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  goal        exercise_goal NOT NULL,
  PRIMARY KEY (exercise_id, goal)
);
CREATE INDEX ix_eg_lookup ON exercise_goals (goal, exercise_id);

CREATE TABLE exercise_secondary_equipment (
  exercise_id  bigint NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  equipment_id bigint NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
  PRIMARY KEY (exercise_id, equipment_id)
);

CREATE VIEW exercise_family_ladders AS
  SELECT f.id AS family_id, f.slug, f.name,
         array_agg(DISTINCT e.level ORDER BY e.level) AS ladder,
         count(*) FILTER (WHERE e.retired_at IS NULL) AS live_cards
    FROM exercise_families f
    JOIN exercises e ON e.family_id = f.id
   GROUP BY f.id, f.slug, f.name;
-- Derived, never stored. card_level's declaration order is the ladder order, so
-- ORDER BY e.level sorts foundation -> progress -> mastery for free.

-- =============================================================================
-- 4. THE GOAL BRIDGE
-- =============================================================================
-- The member picks one of eight goals. Exercises are tagged with one of seven.
-- This table is the translation, and it exists because the two vocabularies are
-- authored by different people for different reasons and will keep drifting.
-- "Prepare for an Event" is the proof: it maps onto two catalogue tags and owns
-- neither of them.

CREATE TABLE goal_exercise_goals (
  goal          training_goal NOT NULL,
  exercise_goal exercise_goal NOT NULL,
  weight        numeric       NOT NULL DEFAULT 1.0 CHECK (weight > 0),
  PRIMARY KEY (goal, exercise_goal)
);

-- The second level of the funnel: up to two focus areas within the chosen goal.
-- The intake copy says this "determines your exact plan", and it does — each
-- focus biases the plan toward a stimulus. That map lived only in the frontend
-- (web/lib/intake/model.ts, FOCUS_STIMULUS), which meant the engine could not
-- see the thing steering it.
-- On language, once, for everything below:
--
--   Product copy (focus areas, metrics, emblems) is keyed by SLUG. The rendered
--   string lives in the frontend catalogue beside the code that renders it, and
--   ships with a release like the rest of the product. `label` columns on these
--   tables are a developer-facing fallback so the seed stays legible -- they are
--   NOT what a member reads.
--
--   Operator copy (rewards, gym-authored quests) is different in kind: a
--   manager in Darmstadt types "Freier Smoothie" into a form and no release can
--   translate it. Those carry a `_i18n` jsonb beside the fallback.
--
-- Getting this backwards is how product copy ends up split across two systems
-- and a German gym ends up with an English rewards list.
CREATE TABLE focus_areas (
  id         bigserial     PRIMARY KEY,
  goal       training_goal NOT NULL,
  slug       text          NOT NULL,
  label      text          NOT NULL,
  -- NULL = a valid choice that does not bias the plan ("Other").
  stimulus   stimulus_type,
  sort_order smallint      NOT NULL DEFAULT 0,
  active     boolean       NOT NULL DEFAULT true,
  UNIQUE (goal, slug)
);
CREATE INDEX ix_focus_areas_goal ON focus_areas (goal, sort_order) WHERE active;
-- Slugs repeat across goals on purpose ("balance" is both a Move Pain-Free and
-- a Sports Performance focus), so the key is (goal, slug) and never slug alone.

-- =============================================================================
-- 4b. EVENTS — what a member is training TOWARD
-- =============================================================================
-- "Prepare for an Event" is one of the eight goals and its own copy promises
-- "a clear ramp" to a race. A ramp needs a date, and there was nowhere to put
-- one: a plan could say HYROX but not WHEN, which makes the ramp unplannable
-- and the countdown unrenderable.
--
-- This is also where the kiosk's free-text eventId resolves to. V2 sends
-- "Super Circle March 2026" as a string; matching that to a row here is what
-- lets a member's event-prep plan and the event's own circle trainings be the
-- same thing rather than two unconnected records.

CREATE TABLE events (
  id           bigserial PRIMARY KEY,
  -- NULL = a public race nobody here owns (a HYROX in Frankfurt). Set = an
  -- event this org is running.
  org_id       bigint    REFERENCES orgs(id) ON DELETE CASCADE,
  slug         text      NOT NULL,
  name         text      NOT NULL,
  -- Matches a focus_areas.slug under prepare_for_event ('hyrox', 'marathon',
  -- 'triathlon'), so the plan's focus and the event agree on what this is.
  kind         text,
  starts_on    date,
  location     text,
  external_ref text,                   -- the kiosk's eventId string, if any
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, slug)
);
CREATE INDEX ix_events_date ON events (starts_on);
CREATE UNIQUE INDEX uq_events_external ON events (external_ref) WHERE external_ref IS NOT NULL;

-- =============================================================================
-- 5. IDENTITY, CONSENT
-- =============================================================================

CREATE TABLE accounts (
  id           bigserial PRIMARY KEY,
  -- Supabase Auth owns credentials. This is the join to auth.users; there is
  -- deliberately no password_hash, no reset token and no session table in this
  -- schema, because real auth is out of scope for v1 and a half-built
  -- credential store is worse than none. NULL until the account is claimed: a
  -- member created at the kiosk exists before they ever set a password.
  auth_user_id uuid        UNIQUE,
  email        text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);
CREATE UNIQUE INDEX uq_accounts_email ON accounts (lower(email));
CREATE TRIGGER tg_accounts_updated BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- If this ever moves off Supabase, credentials come back as an additive
-- migration. That direction is cheap; unwinding a half-finished auth system is
-- not, which is why it is not started here.
-- Sphery SSO is unaffected: it arrives through external_identities like any
-- other provider.

CREATE TABLE members (
  id           bigserial PRIMARY KEY,
  account_id   bigint      NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  org_id       bigint      NOT NULL REFERENCES orgs(id)     ON DELETE RESTRICT,
  home_gym_id  bigint      REFERENCES gyms(id)              ON DELETE SET NULL,
  display_name text        NOT NULL,
  dob          date,
  gender       text        CHECK (gender IS NULL OR gender IN ('male', 'female', 'diverse')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  UNIQUE (account_id, org_id)
);
CREATE INDEX ix_members_org ON members (org_id) WHERE deleted_at IS NULL;
CREATE TRIGGER tg_members_updated BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- dob, never age: a stored age is wrong within a year. This is the lesson
-- Sphery's own unused HealthData.age column already learned.
-- gender matches HealthDataV2's enum ("male"|"female"|"diverse") so an ingested
-- profile does not need a lossy translation.
-- One account, many memberships — training at two gyms in a chain does not
-- fork your history.

CREATE TABLE external_identities (
  id          bigserial PRIMARY KEY,
  account_id  bigint      NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider    id_provider NOT NULL,
  external_id text        NOT NULL,
  linked_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id),
  UNIQUE (account_id, provider)
);
-- The join the three apps agree on. Sphery is one provider, not a column.

CREATE TABLE consents (
  id             bigserial PRIMARY KEY,
  account_id     bigint       NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  kind           consent_kind NOT NULL,
  policy_version text         NOT NULL,
  granted_at     timestamptz  NOT NULL DEFAULT now(),
  revoked_at     timestamptz
);
CREATE INDEX ix_consents ON consents (account_id, kind, granted_at DESC);

CREATE TABLE erasure_requests (
  id           bigserial PRIMARY KEY,
  account_id   bigint      NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  note         text
);

-- =============================================================================
-- 6. THE MEMBER: BODY, PREFERENCES, SAFETY
-- =============================================================================
-- Everything in this section is collected by the intake today and had nowhere
-- to live but a jsonb blob. A blob is the right home for the raw answers (see
-- questionnaire_responses); it is the wrong home for the facts the engine has
-- to filter and re-read on every regeneration.

-- Weight and height are a dated series, not an intake fact. VO2max estimation,
-- calorie estimation and load prescription all key off weight, and a member who
-- loses 8 kg over the eight-week plan is the entire point of the product.
CREATE TABLE member_measurements (
  id          bigserial   PRIMARY KEY,
  member_id   bigint      NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  measured_at timestamptz NOT NULL DEFAULT now(),
  weight_kg   numeric(5,2) CHECK (weight_kg BETWEEN 20 AND 400),
  height_cm   smallint     CHECK (height_cm BETWEEN 80 AND 260),
  source      text        NOT NULL DEFAULT 'questionnaire',
  CONSTRAINT ck_measurement_not_empty CHECK (weight_kg IS NOT NULL OR height_cm IS NOT NULL)
);
CREATE INDEX ix_measurements_member ON member_measurements (member_id, measured_at DESC);

-- What the member told us about their week. Held separately from the plan
-- because it outlives any single plan: regenerating in November must not mean
-- re-asking which evenings they are free.
CREATE TABLE member_preferences (
  member_id            bigint      PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  fitness_level        fitness_level,
  weekly_minutes       smallint    CHECK (weekly_minutes IS NULL OR weekly_minutes BETWEEN 0 AND 2000),
  self_rated_intensity smallint    CHECK (self_rated_intensity IS NULL OR self_rated_intensity BETWEEN 1 AND 5),
  session_length_min   smallint    CHECK (session_length_min IS NULL OR session_length_min BETWEEN 10 AND 120),
  available_days       weekday[]   NOT NULL DEFAULT '{}',
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER tg_member_preferences_updated BEFORE UPDATE ON member_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Other sports the member already does, so the plan can balance total weekly
-- load instead of adding to an unknown baseline.
CREATE TABLE member_activities (
  id                  bigserial PRIMARY KEY,
  member_id           bigint    NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  name                text      NOT NULL,
  minutes_per_session smallint  NOT NULL CHECK (minutes_per_session > 0),
  intensity           smallint  NOT NULL CHECK (intensity BETWEEN 1 AND 5),
  days                weekday[] NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_member_activities ON member_activities (member_id);

-- THE SAFETY GATE.
--
-- `exercises.impact` is described as a safety gate, but a gate needs two sides.
-- This is the other side: what this member must not be given, in a form the
-- selection query can filter on.
--
-- Two columns for the same fact, deliberately. `reported_label` is what the
-- member actually said ("Lower back", "Hamstring", or free text they typed);
-- the structured columns are what the engine can act on. The intake offers nine
-- suggested body parts and an "Other" free-text box, so a verbatim column is
-- not optional — and a label we failed to map must never silently become "no
-- restriction".
CREATE TABLE member_restrictions (
  id             bigserial   PRIMARY KEY,
  member_id      bigint      NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  source         restriction_source NOT NULL DEFAULT 'questionnaire',
  reported_label text        NOT NULL,
  recovery_stage recovery_stage,

  -- The machine-readable gate. All three are nullable; a restriction that maps
  -- to none of them still shows a coach the verbatim label.
  avoid_region   body_region,
  avoid_movement movement_pattern,
  max_impact     impact_level,

  reported_at    timestamptz NOT NULL DEFAULT now(),
  expires_on     date,
  cleared_at     timestamptz,
  note           text
);
CREATE INDEX ix_restrictions_active ON member_restrictions (member_id)
  WHERE cleared_at IS NULL;
-- `e.impact > r.max_impact` works because impact_level is declared low ->
-- medium -> high, so the enum's own ordering is the safety ordering. The full
-- selection query is in the notes at the end of this file.

-- =============================================================================
-- 7. INTAKE, PLANS, PROGRESSION
-- =============================================================================

-- The raw answers, immutable, exactly as submitted. The tables in section 6 are
-- the projection the engine reads; this is the record of what was asked and
-- what was said, which is a different thing and survives a change to either.
CREATE TABLE questionnaire_responses (
  id         bigserial PRIMARY KEY,
  member_id  bigint      NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  version    text        NOT NULL,
  answers    jsonb       NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_qr_member ON questionnaire_responses (member_id, created_at DESC);

CREATE TABLE plans (
  id               bigserial     PRIMARY KEY,
  member_id        bigint        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  gym_id           bigint        NOT NULL REFERENCES gyms(id)    ON DELETE RESTRICT,
  questionnaire_id bigint        REFERENCES questionnaire_responses(id) ON DELETE SET NULL,
  goal             training_goal NOT NULL,
  -- What this plan is ramping toward, for the prepare_for_event goal. The date
  -- lives on the event, so "6 weeks out" is a query and the taper is placeable.
  -- Nullable because seven of the eight goals have no finish line.
  event_id         bigint        REFERENCES events(id) ON DELETE SET NULL,
  event_division   event_division,
  status           plan_status   NOT NULL DEFAULT 'active',
  -- When adaptation replaces a plan rather than editing it, this is the chain.
  -- Without it, "superseded" is a dead end and nobody can answer "what replaced
  -- my plan, and why".
  superseded_by_id bigint        REFERENCES plans(id) ON DELETE SET NULL,
  rationale        text          NOT NULL,
  -- The estimate this plan was generated from, frozen. Snapshotted rather than
  -- recomputed so an old plan stays explainable after the estimate moves on.
  fitness_estimate jsonb         NOT NULL,
  starts_on        date,
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT ck_no_self_supersede CHECK (superseded_by_id IS DISTINCT FROM id)
);
CREATE INDEX ix_plans_member ON plans (member_id, status);
CREATE TRIGGER tg_plans_updated BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- There is no `weeks` jsonb column. The prescription is plan_weeks ->
-- plan_sessions -> plan_session_exercises, and that is the only copy. A blob
-- alongside normalised rows is two sources of truth that disagree by Thursday.

CREATE TABLE plan_focuses (
  plan_id       bigint NOT NULL REFERENCES plans(id)       ON DELETE CASCADE,
  focus_area_id bigint NOT NULL REFERENCES focus_areas(id) ON DELETE RESTRICT,
  PRIMARY KEY (plan_id, focus_area_id)
);
-- Capped at two by the product (MAX_FOCUS), not by the database: a cardinality
-- check would be a trigger, and a trigger is a poor place for a copy rule.

CREATE TABLE plan_weeks (
  plan_id     bigint   NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  week_number smallint NOT NULL CHECK (week_number > 0),
  theme       text,                       -- "base building", "deload"
  PRIMARY KEY (plan_id, week_number)
);

CREATE TABLE plan_sessions (
  id              bigserial     PRIMARY KEY,
  plan_id         bigint        NOT NULL,
  week_number     smallint      NOT NULL,
  index_in_week   smallint      NOT NULL CHECK (index_in_week > 0),

  -- The prescription itself. Every field the shipped PlannedSession carries.
  stimulus        stimulus_type NOT NULL,
  adaptivity      adaptivity_type NOT NULL DEFAULT 'hr_tracking',
  hr_zone         smallint      CHECK (hr_zone BETWEEN 1 AND 5),
  hr_bpm_min      smallint      CHECK (hr_bpm_min BETWEEN 40 AND 230),
  hr_bpm_max      smallint      CHECK (hr_bpm_max BETWEEN 40 AND 230),
  duration_min    smallint      NOT NULL CHECK (duration_min > 0),
  -- How many times round the circuit. V2 carries `rounds` on the training, and
  -- a prescription that cannot say "three rounds" cannot be sent to a kiosk.
  rounds          smallint      NOT NULL DEFAULT 1 CHECK (rounds > 0),
  style           circuit_style NOT NULL DEFAULT 'duration',
  -- Internal 1-10 scale, finer-grained than RaceConfig's 0-3 so progression can
  -- make week-over-week adjustments that only sometimes cross an export
  -- boundary.
  difficulty      smallint      NOT NULL CHECK (difficulty BETWEEN 1 AND 10),

  scheduled_on    date,
  is_deload       boolean       NOT NULL DEFAULT false,
  is_benchmark    boolean       NOT NULL DEFAULT false,
  rationale       text,

  FOREIGN KEY (plan_id, week_number) REFERENCES plan_weeks (plan_id, week_number) ON DELETE CASCADE,
  UNIQUE (plan_id, week_number, index_in_week),
  CONSTRAINT ck_bpm_order CHECK (hr_bpm_max IS NULL OR hr_bpm_min IS NULL OR hr_bpm_max >= hr_bpm_min),
  CONSTRAINT ck_bpm_needs_zone CHECK ((hr_bpm_min IS NULL AND hr_bpm_max IS NULL) OR hr_zone IS NOT NULL)
);
CREATE INDEX ix_plan_sessions_due ON plan_sessions (plan_id, scheduled_on);
-- hr_zone is the PRESCRIBED zone and is a different thing from an exercise's
-- Intensity. Intensity says how hard the movement feels; this says what the
-- member's heart should be doing, and it is derived from their own estimate.
-- The bpm range is resolved from estimated hrMax at generation time and is
-- therefore optional: the zone is the source of truth and bpm can be
-- re-resolved as the estimate sharpens.
-- is_benchmark marks the retest that produces a VO2max estimate.

CREATE TABLE plan_session_exercises (
  id              bigserial PRIMARY KEY,
  plan_session_id bigint   NOT NULL REFERENCES plan_sessions(id) ON DELETE CASCADE,
  order_index     smallint NOT NULL CHECK (order_index > 0),
  exercise_id     bigint   NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  -- Which station on the floor this leg was resolved onto. Nullable because a
  -- plan can be generated before a floor is chosen, and because a plan must
  -- survive a station being retired.
  station_id      bigint   REFERENCES stations(id) ON DELETE SET NULL,
  role            exercise_role NOT NULL DEFAULT 'work',
  target_zone     smallint CHECK (target_zone BETWEEN 1 AND 5),
  target_seconds  integer  CHECK (target_seconds IS NULL OR target_seconds > 0),
  target_reps     smallint CHECK (target_reps IS NULL OR target_reps > 0),
  -- V2's free-text target ("1000m", "50m"). Distance targets are the norm for
  -- HYROX-style stations and fit neither seconds nor reps; this is what the
  -- kiosk receives verbatim.
  target_text     text,
  load_note       text,
  UNIQUE (plan_session_id, order_index)
);
CREATE INDEX ix_pse_station ON plan_session_exercises (station_id);

-- Progression state. The coarse axis: where a member stands on each family's
-- ladder. The fine axis: what load they are carrying on that card.
CREATE TABLE member_family_levels (
  member_id   bigint      NOT NULL REFERENCES members(id)           ON DELETE CASCADE,
  family_id   bigint      NOT NULL REFERENCES exercise_families(id) ON DELETE CASCADE,
  level       card_level  NOT NULL DEFAULT 'foundation',
  load        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  promoted_at timestamptz,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, family_id)
);
CREATE TRIGGER tg_member_family_levels_updated BEFORE UPDATE ON member_family_levels
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- `load` is jsonb because it means different things per family: kilograms on a
-- Farmer Carry, pace on a Treadmill, a game level on ICAROS. Forcing one column
-- would mean inventing a unit that fits none of them.

CREATE TABLE plan_changes (
  id               bigserial   PRIMARY KEY,
  plan_id          bigint      NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  session_log_id   bigint,
  triggered_by     text        NOT NULL,
  difficulty_delta smallint    NOT NULL DEFAULT 0,
  family_id        bigint      REFERENCES exercise_families(id) ON DELETE SET NULL,
  level_from       card_level,
  level_to         card_level,
  sessions_changed integer     NOT NULL DEFAULT 0,
  evidence         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  rationale        text        NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_plan_changes ON plan_changes (plan_id, created_at DESC);
-- A change records what it actually did: which family moved, from which level
-- to which. "You moved up to Squat" is a sentence the member understands, and
-- it is reconstructible from these columns rather than from prose.

-- =============================================================================
-- 8. SESSIONS
-- =============================================================================
-- Shaped to receive Michel's Circle Trainings V2 without flattening it:
--
--   CircleTrainingsV2          -> group_trainings
--   CircleTrainingGroupsV2     -> training_teams
--   CircleTrainingGroupMembers -> session_logs          (one per participant)
--   CircleTrainingExercisesV2  -> training_stations     (the circuit's legs)
--   CircleTrainingExerciseLogs -> session_exercise_logs (round x split)
--   CircleTrainingPauseLogsV2  -> session_pause_logs
--   CircleTrainingHrDataV2     -> session_hr_samples
--
-- An app-only solo session skips group_trainings entirely and writes a
-- session_log with team_id NULL. At the kiosk there is no solo path: every
-- participant is a group member, even a group of one.

CREATE TABLE group_trainings (
  id           bigserial   PRIMARY KEY,
  gym_id       bigint      REFERENCES gyms(id) ON DELETE SET NULL,
  kiosk_id     text,                          -- "THESPHEREDARMSTADT", ALLCAPS
  event_ref    text,                          -- V2's eventId, verbatim: "Super Circle March 2026"
  event_id     bigint      REFERENCES events(id) ON DELETE SET NULL,
  name         text        NOT NULL,
  mode         circuit_mode   NOT NULL DEFAULT 'single',
  type         circuit_type   NOT NULL DEFAULT 'standard',
  style        circuit_style  NOT NULL DEFAULT 'duration',
  rounds       smallint    NOT NULL DEFAULT 1 CHECK (rounds > 0),
  is_hyrox     boolean     NOT NULL DEFAULT false,
  status       training_status NOT NULL DEFAULT 'setup',
  started_at   timestamptz,
  completed_at timestamptz,
  -- Where this came from, so a re-delivered kiosk training is stored once.
  provider     id_provider,
  external_id  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);
CREATE INDEX ix_group_trainings_gym ON group_trainings (gym_id, started_at DESC);
CREATE TRIGGER tg_group_trainings_updated BEFORE UPDATE ON group_trainings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- mode, type, style and is_hyrox are kept for one reason, and it is not
-- competition reporting: they change how the training data must be READ.
--   mode 'relay'  — this member did a fraction of the circuit. Crediting them
--                   the whole thing corrupts their load, their points and their
--                   next plan.
--   type 'mutual' — athletes swap mid-station, which is what produces the
--                   split_index rows below.
--   style 'score' — the leg is judged on points, not elapsed time.
--   is_hyrox      — stations are counted differently (runs between them), so
--                   the session is not comparable to a normal circuit without it.
-- Competition classification (men/women/mixed) is deliberately NOT here: it
-- says nothing about training and belongs to whatever runs the event.

-- The circuit's legs, defined once for the whole training rather than per
-- participant — which is what V2's CircleTrainingExercisesV2 is.
CREATE TABLE training_stations (
  id                bigserial PRIMARY KEY,
  group_training_id bigint   NOT NULL REFERENCES group_trainings(id) ON DELETE CASCADE,
  order_index       smallint NOT NULL CHECK (order_index > 0),
  station_id        bigint   REFERENCES stations(id) ON DELETE SET NULL,
  name              text     NOT NULL,        -- "Run", "SkiErg", "Sled Push"
  style             circuit_style NOT NULL DEFAULT 'duration',
  target            text,                     -- "1000m", "50m"
  UNIQUE (group_training_id, order_index)
);
-- `name` beside station_id for the same reason exercise_name sits beside
-- exercise_id: it is what the leg was called on the day.

CREATE TABLE training_teams (
  id                   bigserial PRIMARY KEY,
  group_training_id    bigint    NOT NULL REFERENCES group_trainings(id) ON DELETE CASCADE,
  name                 text,                   -- "Team Red", or NULL for a team of one
  start_exercise_index smallint  NOT NULL DEFAULT 1 CHECK (start_exercise_index > 0),
  status               team_status NOT NULL DEFAULT 'active',
  started_at           timestamptz,
  finished_at          timestamptz,
  -- Computed at "finalize group" and recomputed if training data arrives after.
  -- Cached, not authoritative: every one is recomputable from the exercise logs.
  total_time_s          numeric,
  total_training_time_s numeric,
  total_pause_time_s    numeric,
  total_score           integer,
  finalized_at         timestamptz,
  provider             id_provider,
  external_id          text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_training_id, name),
  UNIQUE (provider, external_id)
);
-- V2 uniques (circleTrainingV2Id, name). A NULL name is distinct from another
-- NULL in Postgres, so several unnamed teams of one coexist, which is what a
-- public floor session actually looks like.

CREATE TABLE session_logs (
  id                bigserial      PRIMARY KEY,
  member_id         bigint         NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  plan_id           bigint         REFERENCES plans(id)         ON DELETE SET NULL,
  plan_session_id   bigint         REFERENCES plan_sessions(id) ON DELETE SET NULL,
  gym_id            bigint         REFERENCES gyms(id)          ON DELETE SET NULL,
  -- One participant inside one team. NULL for an app-logged solo session.
  team_id           bigint         REFERENCES training_teams(id) ON DELETE SET NULL,
  order_in_team     smallint       CHECK (order_in_team IS NULL OR order_in_team > 0),

  source            session_source NOT NULL DEFAULT 'app',
  started_at        timestamptz,
  completed_at      timestamptz,
  duration_seconds  integer        CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  avg_hr            smallint       CHECK (avg_hr IS NULL OR avg_hr BETWEEN 40 AND 230),
  max_hr            smallint       CHECK (max_hr IS NULL OR max_hr BETWEEN 40 AND 230),
  calories          integer,
  perceived_effort  smallint,
  points_earned     integer        NOT NULL DEFAULT 0,
  created_at        timestamptz    NOT NULL DEFAULT now(),
  CONSTRAINT ck_effort   CHECK (perceived_effort IS NULL OR perceived_effort BETWEEN 1 AND 5),
  CONSTRAINT ck_hr_order CHECK (max_hr IS NULL OR avg_hr IS NULL OR max_hr >= avg_hr)
);
CREATE INDEX ix_sessions_member       ON session_logs (member_id, completed_at DESC);
CREATE INDEX ix_sessions_plan_session ON session_logs (plan_session_id);
CREATE INDEX ix_sessions_team         ON session_logs (team_id);
-- V2 uniques (userId, circleTrainingsV2Id): one person appears once in one
-- training. Enforced here through the team, which belongs to exactly one
-- training.
CREATE UNIQUE INDEX uq_session_member_team ON session_logs (member_id, team_id)
  WHERE team_id IS NOT NULL;
-- plan_id / plan_session_id are ON DELETE SET NULL on purpose: a session that
-- happened, happened. History must not be a casualty of deleting a plan.
-- perceived_effort: 1 = too easy (plan hardens), 2-4 holds, 5 = too hard.
-- With ~90% of sessions having no HR belt, this is the strongest adaptation
-- signal available.

CREATE TABLE session_exercise_logs (
  id                  bigserial PRIMARY KEY,
  session_log_id      bigint   NOT NULL REFERENCES session_logs(id) ON DELETE CASCADE,
  training_station_id bigint   REFERENCES training_stations(id) ON DELETE SET NULL,
  order_index         smallint NOT NULL CHECK (order_index > 0),
  -- A circuit is (leg x round x split), never a flat list.
  --   round_index: which time round the circuit this is.
  --   split_index: V2's mutual mode — when two athletes swap mid-station the
  --                running log is stopped and a new split opens at the same
  --                timestamp. Server-assigned, MAX+1, never sent by a client.
  round_index         smallint NOT NULL DEFAULT 1 CHECK (round_index > 0),
  split_index         smallint NOT NULL DEFAULT 1 CHECK (split_index > 0),
  role                exercise_role NOT NULL DEFAULT 'work',
  status              log_status NOT NULL DEFAULT 'completed',

  exercise_id         bigint   REFERENCES exercises(id) ON DELETE SET NULL,
  exercise_name       text     NOT NULL,
  station_id          bigint   REFERENCES stations(id) ON DELETE SET NULL,
  station_name        text,

  prescribed_zone     smallint CHECK (prescribed_zone BETWEEN 1 AND 5),
  started_at          timestamptz,
  stopped_at          timestamptz,
  actual_seconds      integer  CHECK (actual_seconds IS NULL OR actual_seconds >= 0),
  seconds_in_zone     integer  CHECK (seconds_in_zone IS NULL OR seconds_in_zone >= 0),
  reps                smallint,
  score               integer,                 -- V2 score-style stations
  calories            integer,
  avg_hr              smallint,
  max_hr              smallint,
  load                jsonb,
  UNIQUE (session_log_id, order_index, round_index, split_index),
  CONSTRAINT ck_in_zone_fits CHECK (
    seconds_in_zone IS NULL OR actual_seconds IS NULL OR seconds_in_zone <= actual_seconds
  ),
  CONSTRAINT ck_log_times CHECK (stopped_at IS NULL OR started_at IS NULL OR stopped_at >= started_at)
);
CREATE INDEX ix_sel_session ON session_exercise_logs (session_log_id, round_index, order_index);
-- exercise_name and station_name are denormalised beside their ids: they are
-- what the member did on the day. Retiring either must not rewrite history.
-- seconds_in_zone plus `role` is what makes "did they hold the prescribed zone"
-- an honest query — the warmup and cooldown are excluded rather than quietly
-- averaged in.

-- The recovery between stations. V2 bulk-creates these from the kiosk, and
-- hr_60s_recovery is exactly the flagship longevity metric: beats dropped in
-- the first minute after effort. Without this table that number has nowhere to
-- come from.
CREATE TABLE session_pause_logs (
  id                     bigserial PRIMARY KEY,
  session_log_id         bigint    NOT NULL REFERENCES session_logs(id) ON DELETE CASCADE,
  after_exercise_log_id  bigint    REFERENCES session_exercise_logs(id) ON DELETE CASCADE,
  started_at             timestamptz,
  stopped_at             timestamptz,
  hr_avg_recovery        smallint,
  hr_60s_recovery        smallint,
  hr_max                 smallint,
  hr_min                 smallint,
  hr_avg                 smallint,
  CONSTRAINT ck_pause_times CHECK (stopped_at IS NULL OR started_at IS NULL OR stopped_at >= started_at)
);
CREATE INDEX ix_pause_session ON session_pause_logs (session_log_id);

-- Raw HR time series, bulk-inserted per member after the training is stopped.
-- Written LAST in V2's flow, so anything rendering an HR overlay must tolerate
-- a completed session that has no samples yet.
CREATE TABLE session_hr_samples (
  session_log_id bigint      NOT NULL REFERENCES session_logs(id) ON DELETE CASCADE,
  at             timestamptz NOT NULL,
  bpm            smallint    NOT NULL CHECK (bpm BETWEEN 20 AND 250),
  PRIMARY KEY (session_log_id, at)
);
-- Absolute UTC timestamps, not offsets: the frontend overlays them on the
-- exercise and pause timeline, and an offset would need a origin nobody agrees
-- on. The primary key also makes a re-delivered batch idempotent.

CREATE TABLE external_session_refs (
  session_log_id bigint      NOT NULL REFERENCES session_logs(id) ON DELETE CASCADE,
  provider       id_provider NOT NULL,
  external_id    text        NOT NULL,
  linked_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_log_id, provider),
  UNIQUE (provider, external_id)
);
-- One session, several views: ours, the kiosk's group member, Sphery's workout.
-- The unique on (provider, external_id) makes ingestion idempotent.

ALTER TABLE plan_changes
  ADD CONSTRAINT fk_plan_changes_session
  FOREIGN KEY (session_log_id) REFERENCES session_logs(id) ON DELETE SET NULL;

-- =============================================================================
-- 9. METRICS
-- =============================================================================

-- Where a metric is allowed to appear. Encoding the research finding as data:
-- calories and HR max are session facts and must never appear as progress.
CREATE TYPE metric_surface AS ENUM ('progress', 'session', 'profile');

-- What SHAPE a metric is. Consistency is a windowed ratio, weekly load a
-- windowed sum, VO2max a benchmark event. Storing those against a single
-- session_log_id was a lie the schema could not catch.
CREATE TYPE metric_scope AS ENUM ('session', 'window', 'event');

CREATE TABLE metric_definitions (
  key              text PRIMARY KEY,
  label            text    NOT NULL,
  unit             text,
  higher_is_better boolean NOT NULL,
  surface          metric_surface NOT NULL,
  scope            metric_scope   NOT NULL,
  -- Arrow thresholds, as fractional change between two comparison windows.
  -- Data, not code: body age and HR recovery point opposite ways for the same
  -- movement, and a component cannot be trusted to remember that.
  strong_delta     numeric NOT NULL DEFAULT 0.05,
  weak_delta       numeric NOT NULL DEFAULT 0.02,
  window_days      smallint NOT NULL DEFAULT 28,
  min_sessions     smallint NOT NULL DEFAULT 4,
  -- Where the number comes from, for a metric this schema does not itself
  -- store. VO2max lives in `benchmarks`; duplicating it would create two homes
  -- for one number.
  computed_from    text,
  description      text,
  UNIQUE (key, scope)
);
-- min_sessions is the honesty guard: no arrow is drawn until there is enough
-- history for the comparison to mean anything.
-- The KEYS here are the keys web/lib/types/engagement.ts renders. They are not
-- a parallel vocabulary invented for the database, which is what made an
-- earlier draft reject `body_score` outright.

CREATE TABLE session_metrics (
  session_log_id bigint  NOT NULL REFERENCES session_logs(id) ON DELETE CASCADE,
  metric_key     text    NOT NULL,
  -- Pinned, not passed in. Combined with the composite foreign key below, this
  -- makes it impossible to file a windowed metric against a single session.
  metric_scope   metric_scope NOT NULL GENERATED ALWAYS AS ('session'::metric_scope) STORED,
  value          numeric NOT NULL,
  PRIMARY KEY (session_log_id, metric_key),
  FOREIGN KEY (metric_key, metric_scope) REFERENCES metric_definitions (key, scope)
);
CREATE INDEX ix_session_metrics_key ON session_metrics (metric_key);

CREATE TABLE member_metrics (
  id           bigserial PRIMARY KEY,
  member_id    bigint    NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  metric_key   text      NOT NULL,
  metric_scope metric_scope NOT NULL GENERATED ALWAYS AS ('window'::metric_scope) STORED,
  period_start date      NOT NULL,
  period_end   date      NOT NULL,
  value        numeric   NOT NULL,
  computed_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, metric_key, period_start, period_end),
  FOREIGN KEY (metric_key, metric_scope) REFERENCES metric_definitions (key, scope),
  CONSTRAINT ck_period_order CHECK (period_end >= period_start)
);
CREATE INDEX ix_member_metrics ON member_metrics (member_id, metric_key, period_end DESC);
-- Cached, not authoritative: every row here is recomputable from session_logs
-- and plan_sessions. It exists because the Progress page must not run four
-- window functions per render, and it is safe to truncate.

-- Benchmarks: a dated, attributable estimate rather than a drifting guess.
CREATE TABLE benchmarks (
  id             bigserial   PRIMARY KEY,
  member_id      bigint      NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  session_log_id bigint      REFERENCES session_logs(id) ON DELETE SET NULL,
  measured_at    timestamptz NOT NULL DEFAULT now(),
  vo2max_est     numeric,
  hr_max_est     smallint,
  hr_rest_est    smallint,
  method         text        NOT NULL,
  confidence     numeric     CHECK (confidence BETWEEN 0 AND 1)
);
CREATE INDEX ix_benchmarks_member ON benchmarks (member_id, measured_at DESC);
-- `method` is required: a VO2max from a submaximal treadmill test and one from
-- a non-exercise equation are not the same claim, and the UI has to be able to
-- say which it is showing. This table is the ONLY home for vo2max_est.

-- =============================================================================
-- 10. HABIT LOOP
-- =============================================================================

-- What earns points, as data rather than as constants in the engine.
--
-- These rates are not settled: zone-tiered rates were designed on Aug 3 and
-- reworked on Aug 7 after they were found to punish members whose plan
-- prescribes zone 2 and to nudge everyone toward overtraining. A rule that has
-- already been rewritten once, and that a gym might want to double for a week,
-- is configuration. The validity window means an award made last month stays
-- explainable after the rate changes, which a constant in a deploy cannot do.
CREATE TABLE point_rules (
  id             bigserial   PRIMARY KEY,
  event          point_event NOT NULL,
  basis          point_basis NOT NULL,
  points         numeric     NOT NULL,
  -- NULL = the default every gym inherits. Set = this gym overrides it.
  gym_id         bigint      REFERENCES gyms(id) ON DELETE CASCADE,
  label          text        NOT NULL,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to   timestamptz,
  CONSTRAINT ck_rule_window CHECK (effective_to IS NULL OR effective_to > effective_from)
);
-- Exactly one open-ended rule per event per scope: closing the old one is how a
-- rate changes, so history is never rewritten.
CREATE UNIQUE INDEX uq_point_rules_current_global ON point_rules (event)
  WHERE gym_id IS NULL AND effective_to IS NULL;
CREATE UNIQUE INDEX uq_point_rules_current_gym ON point_rules (gym_id, event)
  WHERE gym_id IS NOT NULL AND effective_to IS NULL;

CREATE TABLE points_ledger (
  id              bigserial   PRIMARY KEY,
  member_id       bigint      NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  delta           integer     NOT NULL CHECK (delta <> 0),
  reason          text        NOT NULL,
  -- Which rule produced this, and how much of it was earned. A ledger row that
  -- cannot name its rule cannot answer "why did I get 90 points", which is the
  -- only question members ask about points.
  rule_id         bigint      REFERENCES point_rules(id) ON DELETE SET NULL,
  quantity        numeric     CHECK (quantity IS NULL OR quantity > 0),
  session_log_id  bigint      REFERENCES session_logs(id) ON DELETE SET NULL,
  idempotency_key text        UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_points_member ON points_ledger (member_id, created_at DESC);
-- Append-only. A balance is SUM(delta), never a stored counter.

-- The monthly status rank (Myzone's model, approved Aug 4). Distinct from the
-- weekly cohort below: this is the tier a member HOLDS, earned by hitting a
-- monthly point target, advancing one tier per consecutive month and dropping
-- one — never to zero — after a miss.
CREATE TABLE member_rank_months (
  member_id     bigint      NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  period_month  date        NOT NULL,          -- always the 1st
  points_earned integer     NOT NULL DEFAULT 0,
  -- Stored per row, not a constant: v1 is a flat 1,000 for everyone, and
  -- "scaled to the member's plan" is an open question that must not need a
  -- migration to answer.
  target_points integer     NOT NULL DEFAULT 1000 CHECK (target_points > 0),
  tier          league_tier NOT NULL DEFAULT 'bronze',
  change        rank_change NOT NULL DEFAULT 'held',
  finalized_at  timestamptz,
  PRIMARY KEY (member_id, period_month),
  CONSTRAINT ck_month_is_first CHECK (date_trunc('month', period_month) = period_month)
);
CREATE INDEX ix_rank_months ON member_rank_months (member_id, period_month DESC);
-- points_earned is a cached copy of SUM(delta) over the month; the ledger stays
-- authoritative. It is stored because a closed month must not silently restate
-- itself when a backdated correction lands.

-- The Duolingo-style social pull the home screen already renders (LeagueTier,
-- LeagueStanding in engagement.ts). Rank and points-this-week are DERIVED from
-- points_ledger inside the cohort's window; what cannot be derived is which
-- thirty people you were placed against and when that week ends.
CREATE TABLE league_cohorts (
  id         bigserial   PRIMARY KEY,
  tier       league_tier NOT NULL,
  gym_id     bigint      REFERENCES gyms(id) ON DELETE CASCADE,
  starts_at  timestamptz NOT NULL,
  ends_at    timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_cohort_window CHECK (ends_at > starts_at)
);
CREATE INDEX ix_cohorts_open ON league_cohorts (tier, ends_at DESC);
-- gym_id NULL = a chain-wide cohort. A small gym cannot fill a diamond league
-- on its own, so pooling has to be expressible from day one.

CREATE TABLE league_memberships (
  cohort_id  bigint      NOT NULL REFERENCES league_cohorts(id) ON DELETE CASCADE,
  member_id  bigint      NOT NULL REFERENCES members(id)        ON DELETE CASCADE,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  -- Filled when the week closes, so last week's outcome survives the reset.
  final_rank smallint    CHECK (final_rank IS NULL OR final_rank > 0),
  promoted   boolean,
  relegated  boolean,
  PRIMARY KEY (cohort_id, member_id),
  CONSTRAINT ck_not_both_ways CHECK (NOT (coalesce(promoted, false) AND coalesce(relegated, false)))
);
CREATE INDEX ix_league_member ON league_memberships (member_id);
-- One member, one cohort per window — enforced in the join transaction rather
-- than by a constraint, because "overlapping windows" is a range problem and
-- the windows are generated by us, not by users.

CREATE TABLE quests (
  id            bigserial PRIMARY KEY,
  gym_id        bigint  REFERENCES gyms(id) ON DELETE CASCADE,
  slug          text    NOT NULL,
  -- quick (today/this week), medium (weekly/monthly), long (per block).
  -- The product shows at most three at once, one of each: without the tier the
  -- engine cannot pick "one per tier", and every quest becomes the same size.
  tier          quest_tier NOT NULL DEFAULT 'quick',
  title         text    NOT NULL,
  description   text,
  -- Only for gym-authored quests, same reasoning as rewards.label_i18n.
  title_i18n    jsonb,
  -- Optional targeting. Quests are auto-assigned from plan + goal, so a quest
  -- that only makes sense for one goal says so.
  goal          training_goal,

  -- The rule, typed. "Three sessions this week" is
  -- (sessions_completed, week, at_least, 3) and the database can tell you that
  -- a threshold of zero or a missing metric is nonsense.
  metric        progress_metric NOT NULL,
  measured_over progress_window NOT NULL,
  comparison    comparator      NOT NULL DEFAULT 'at_least',
  threshold     numeric         NOT NULL CHECK (threshold > 0),

  reward_points integer NOT NULL DEFAULT 0,
  active        boolean NOT NULL DEFAULT true,
  CONSTRAINT ck_quests_i18n_object CHECK (title_i18n IS NULL OR jsonb_typeof(title_i18n) = 'object')
);
CREATE INDEX ix_quests_tier ON quests (tier) WHERE active;
CREATE UNIQUE INDEX uq_quests_global ON quests (slug) WHERE gym_id IS NULL;
CREATE UNIQUE INDEX uq_quests_gym    ON quests (gym_id, slug) WHERE gym_id IS NOT NULL;

CREATE TABLE member_quests (
  member_id    bigint      NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  quest_id     bigint      NOT NULL REFERENCES quests(id)  ON DELETE CASCADE,
  progress     integer     NOT NULL DEFAULT 0,
  target       integer     NOT NULL DEFAULT 1 CHECK (target > 0),
  completed_at timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, quest_id)
);
CREATE TRIGGER tg_member_quests_updated BEFORE UPDATE ON member_quests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- `target` is copied onto the member's row because Quest.progress in the UI is
-- {current, target}: changing a quest's rule must not silently re-score
-- everybody's half-finished attempt.

CREATE TABLE emblems (
  id            bigserial PRIMARY KEY,
  slug          text  NOT NULL UNIQUE,
  -- Product copy: `label` is the developer-facing fallback and the rendered
  -- string is looked up by slug in the frontend catalogue, which is where
  -- translations live for anything that ships with a release.
  label         text  NOT NULL,
  description   text  NOT NULL,
  metric        progress_metric NOT NULL,
  measured_over progress_window NOT NULL,
  comparison    comparator      NOT NULL DEFAULT 'at_least',
  threshold     numeric         NOT NULL CHECK (threshold > 0)
);

CREATE TABLE member_emblems (
  member_id      bigint      NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  emblem_id      bigint      NOT NULL REFERENCES emblems(id) ON DELETE CASCADE,
  earned_at      timestamptz NOT NULL DEFAULT now(),
  session_log_id bigint      REFERENCES session_logs(id) ON DELETE SET NULL,
  PRIMARY KEY (member_id, emblem_id)
);

CREATE TABLE rewards (
  id          bigserial   PRIMARY KEY,
  gym_id      bigint      NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  kind        reward_kind NOT NULL,
  label       text        NOT NULL,
  -- Operator-authored copy, so no release can translate it: a manager in
  -- Darmstadt types "Freier Smoothie" and there is no slug to look up. `label`
  -- is the fallback; label_i18n holds {"de": "...", "en": "..."} when the gym
  -- bothers. Product copy does NOT work this way -- see metric_definitions.
  label_i18n  jsonb,
  points_cost integer     NOT NULL CHECK (points_cost > 0),
  active      boolean     NOT NULL DEFAULT true,
  CONSTRAINT ck_rewards_i18n_object CHECK (label_i18n IS NULL OR jsonb_typeof(label_i18n) = 'object')
);
CREATE INDEX ix_rewards_gym ON rewards (gym_id) WHERE active;

CREATE TABLE reward_claims (
  id               bigserial    PRIMARY KEY,
  member_id        bigint       NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  reward_id        bigint       NOT NULL REFERENCES rewards(id) ON DELETE RESTRICT,
  -- The debit. A claim that does not spend points is a free reward, and the
  -- balance is SUM(delta) — so if this row does not exist, the member paid
  -- nothing. NOT NULL and UNIQUE: exactly one ledger entry per claim, written
  -- in the same transaction, and no two claims can point at the same debit.
  points_ledger_id bigint       NOT NULL UNIQUE REFERENCES points_ledger(id) ON DELETE RESTRICT,
  points_cost      integer      NOT NULL CHECK (points_cost > 0),
  status           claim_status NOT NULL DEFAULT 'claimed',
  claimed_at       timestamptz  NOT NULL DEFAULT now(),
  redeemed_at      timestamptz
);
CREATE INDEX ix_claims_member ON reward_claims (member_id, claimed_at DESC);
-- points_cost is copied at claim time: what this member paid is a fact about
-- the claim, not about today's catalogue. Sufficiency of balance is checked in
-- the claiming transaction; no constraint can express "the sum of other rows".

CREATE TABLE member_state (
  member_id            bigint      PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  streak_freezes       smallint    NOT NULL DEFAULT 1 CHECK (streak_freezes >= 0),
  streak_weeks         smallint    NOT NULL DEFAULT 0,
  longest_streak_weeks smallint    NOT NULL DEFAULT 0,
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER tg_member_state_updated BEFORE UPDATE ON member_state
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- Only what cannot be derived. Streak length is recomputable and cached here;
-- a freeze cannot be, because the point of a freeze is that nothing happened.

-- =============================================================================
-- 11. STAFF
-- =============================================================================
-- `member_restrictions.source` already allows 'coach' and 'clinician', and a
-- reward claim waits on "gym fulfilment". Both need someone to point at.

CREATE TABLE staff (
  id         bigserial PRIMARY KEY,
  account_id bigint    NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  org_id     bigint    NOT NULL REFERENCES orgs(id)     ON DELETE CASCADE,
  gym_id     bigint    REFERENCES gyms(id)              ON DELETE SET NULL,
  role       text      NOT NULL,               -- 'coach' | 'manager' | 'admin'
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (account_id, org_id)
);
CREATE INDEX ix_staff_org ON staff (org_id) WHERE revoked_at IS NULL;

ALTER TABLE member_restrictions
  ADD COLUMN recorded_by_staff_id bigint REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE reward_claims
  ADD COLUMN fulfilled_by_staff_id bigint REFERENCES staff(id) ON DELETE SET NULL;

-- =============================================================================
-- 11b. NOT MODELLED, ON PURPOSE
-- =============================================================================
-- Notifications and reminders. The habit loop would normally want a
-- streak-at-risk nudge, and there is no notification_preferences table, no
-- queue and no delivery log here.
--
-- This is a decision, not an oversight: nothing in v1 sends anything, and a
-- schema that implies a capability the product does not have is worse than one
-- that is honest about its edges. When it is built, `integration_events` is
-- already the right carrier -- an outbox row per nudge -- and the only new
-- table needed is what each member has consented to receive. `consents`
-- already models consent with a policy version, so that is where it hangs.

-- =============================================================================
-- 12. THE SEAM THE THREE APPS TALK ACROSS
-- =============================================================================

CREATE TABLE integration_events (
  id           bigserial   PRIMARY KEY,
  aggregate    text        NOT NULL,
  aggregate_id bigint      NOT NULL,
  event_type   text        NOT NULL,
  payload      jsonb       NOT NULL,
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  attempts     smallint    NOT NULL DEFAULT 0,
  last_error   text
);
CREATE INDEX ix_events_unpublished ON integration_events (occurred_at) WHERE published_at IS NULL;
-- Transactional outbox: the event is written in the same transaction as the
-- change that caused it. A worker publishes onward. If the kiosk is down the
-- row waits, so the systems converge instead of silently diverging.

CREATE TABLE inbound_events (
  id           bigserial   PRIMARY KEY,
  provider     id_provider NOT NULL,
  external_id  text        NOT NULL,
  event_type   text        NOT NULL,
  payload      jsonb       NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (provider, external_id)
);
-- The mirror image. A kiosk result arriving twice is stored once, so ingestion
-- is idempotent at the door rather than in every handler. This matters more
-- under V2 than v1: `trainingData` and `finalize` are both re-runnable by
-- design, and re-running them recomputes totals.

-- =============================================================================
-- 13. ROW-LEVEL SECURITY
-- =============================================================================
-- Multi-tenant isolation as a database guarantee rather than a promise every
-- query makes. This is the headline reason the design chose Postgres, so it
-- ships in the schema rather than as a follow-up ticket.
--
-- The API layer sets `app.org_id` per transaction. Every policy below fails
-- closed when it is unset, because app_current_org_id() returns NULL and
-- `org_id = NULL` is never true. The engine's own migration/ingest role is
-- expected to be created with BYPASSRLS.

ALTER TABLE gyms                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE members                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_measurements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_preferences      ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_activities       ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_restrictions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_family_levels    ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_metrics          ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_state            ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_quests           ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_emblems          ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_memberships      ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_rank_months      ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_ledger           ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_claims           ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmarks              ENABLE ROW LEVEL SECURITY;
-- The child tables too. Health data reachable by a direct query on a child is
-- just as leaked as health data on the parent.
ALTER TABLE session_exercise_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_pause_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_hr_samples      ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_metrics         ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_session_refs   ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation ON gyms    USING (org_id = app_current_org_id());
CREATE POLICY org_isolation ON members USING (org_id = app_current_org_id());
CREATE POLICY org_isolation ON staff   USING (org_id = app_current_org_id());

-- One shape, repeated: reachable only through a member of the current org. The
-- subselect is itself filtered by the policy on `members`, so it reads "members
-- of the current org" without repeating the org check in twenty places.
CREATE POLICY org_isolation ON member_measurements     USING (member_id IN (SELECT id FROM members));
CREATE POLICY org_isolation ON member_preferences      USING (member_id IN (SELECT id FROM members));
CREATE POLICY org_isolation ON member_activities       USING (member_id IN (SELECT id FROM members));
CREATE POLICY org_isolation ON member_restrictions     USING (member_id IN (SELECT id FROM members));
CREATE POLICY org_isolation ON member_family_levels    USING (member_id IN (SELECT id FROM members));
CREATE POLICY org_isolation ON member_metrics          USING (member_id IN (SELECT id FROM members));
CREATE POLICY org_isolation ON member_state            USING (member_id IN (SELECT id FROM members));
CREATE POLICY org_isolation ON member_quests           USING (member_id IN (SELECT id FROM members));
CREATE POLICY org_isolation ON member_emblems          USING (member_id IN (SELECT id FROM members));
CREATE POLICY org_isolation ON league_memberships      USING (member_id IN (SELECT id FROM members));
CREATE POLICY org_isolation ON member_rank_months      USING (member_id IN (SELECT id FROM members));
CREATE POLICY org_isolation ON questionnaire_responses USING (member_id IN (SELECT id FROM members));
CREATE POLICY org_isolation ON plans                   USING (member_id IN (SELECT id FROM members));
CREATE POLICY org_isolation ON session_logs            USING (member_id IN (SELECT id FROM members));
CREATE POLICY org_isolation ON points_ledger           USING (member_id IN (SELECT id FROM members));
CREATE POLICY org_isolation ON reward_claims           USING (member_id IN (SELECT id FROM members));
CREATE POLICY org_isolation ON benchmarks              USING (member_id IN (SELECT id FROM members));

CREATE POLICY org_isolation ON session_exercise_logs USING (session_log_id IN (SELECT id FROM session_logs));
CREATE POLICY org_isolation ON session_pause_logs    USING (session_log_id IN (SELECT id FROM session_logs));
CREATE POLICY org_isolation ON session_hr_samples    USING (session_log_id IN (SELECT id FROM session_logs));
CREATE POLICY org_isolation ON session_metrics       USING (session_log_id IN (SELECT id FROM session_logs));
CREATE POLICY org_isolation ON external_session_refs USING (session_log_id IN (SELECT id FROM session_logs));

COMMIT;

-- =============================================================================
-- 14. SEED: the vocabularies that are data
-- =============================================================================
-- Seeded here rather than in a fixture because none of these are test data:
-- the engine cannot generate a plan without them.

BEGIN;

-- --- Metric definitions ------------------------------------------------------
-- The KEYS are METRIC_KEYS from web/lib/types/engagement.ts — what the home
-- screen actually renders — plus the engine-side metrics the Progress page
-- computes from. Scope decides which table can hold the values.

INSERT INTO metric_definitions
  (key, label, unit, higher_is_better, surface, scope, strong_delta, weak_delta, min_sessions, computed_from, description) VALUES
  -- The two charts on the redesigned Progress page.
  --
  -- TREND, not score. A "Body Score of 82" is a number nobody can act on or
  -- even define; a line that climbs answers the only question a member has,
  -- which is whether this is working. The value stored per session is the
  -- weighted body/brain content of what was actually performed; the chart is
  -- the series, and the coarser ranges (weeks, months, years) aggregate these
  -- same rows rather than storing a second copy.
  ('body_trend',   'Body',         NULL,  true,  'progress', 'session', 0.05, 0.02, 4, 'exercise_body_qualities x session_exercise_logs',
   'Body qualities of the exercises actually performed, weighted by time. The Body line on Progress.'),
  ('brain_trend',  'Brain',        NULL,  true,  'progress', 'session', 0.05, 0.02, 4, 'exercise_brain_qualities x session_exercise_logs',
   'Brain qualities of the exercises actually performed, weighted by time. The Brain line on Progress.'),
  ('hr_recovery',  'HR Recovery',  'bpm', true,  'progress', 'session', 0.05, 0.02, 4, 'session_pause_logs.hr_60s_recovery',
   'Beats dropped in the first minute after effort. Abnormal recovery carries RR 4.0 for six-year mortality (NEJM). Comes from the kiosk pause logs.'),
  ('weekly_load',  'Weekly Load',  'min', true,  'progress', 'window',  0.10, 0.05, 3, 'session_logs.duration_seconds',
   'Training minutes per week.'),

  -- Engine-side, feeding the above or shown per session.
  ('time_in_zone', 'Time in Zone', '%',   true,  'progress', 'session', 0.05, 0.02, 3, 'session_exercise_logs WHERE role = work',
   'Share of working time inside the prescribed zone, warmup and cooldown excluded. Measures whether the plan was followed, which only this app can judge.'),
  ('hr_avg',       'Average HR',   'bpm', true,  'session',  'session', 0.05, 0.02, 1, 'session_logs.avg_hr',
   'A fact about one session.'),
  ('calories',     'Calories',     'kcal',true,  'session',  'session', 0.05, 0.02, 1, 'session_logs.calories',
   'A fact about one session. The least accurate number in fitness tech, and it quietly rewards being heavier.'),
  ('consistency',  'Consistency',  '%',   true,  'progress', 'window',  0.05, 0.02, 2, 'plan_sessions vs session_logs',
   'Prescribed sessions completed. The strongest predictor of long-term adherence (HR 0.73 per SD, n=389k), so it is a headline rather than a tile.'),
  ('level_ups',    'Level Ups',    NULL,  true,  'progress', 'window',  0.01, 0.01, 1, 'plan_changes.level_to',
   'Card levels gained across exercise families. Unambiguous, not an estimate, and no wearable can show it.'),
  ('vo2max_est',   'VO2 Max',      'ml/kg/min', true, 'progress', 'event', 0.05, 0.02, 1, 'benchmarks.vo2max_est',
   'Estimated at benchmark sessions only, never continuously. Strongest mortality predictor in the literature but not directly measurable here.'),
  ('hr_max',       'Max HR',       'bpm', false, 'profile',  'event',   0.05, 0.02, 1, 'benchmarks.hr_max_est',
   'Sets every zone boundary. Largely genetic and declines with age, so it is a parameter and never a progress metric.');

-- --- Point rules -------------------------------------------------------------
-- The earn table from docs/xp-leveling-design.md, as it stood after the Aug 7
-- rework. Rate changes close the open row and insert a new one; they never
-- UPDATE, so an award made in August stays explainable in December.
--
-- The design rule these encode: a beginner on a zone-2 plan and an athlete on a
-- zone-4 plan earn identically when both follow their plan, because the target
-- zone is theirs and not an absolute bar. That is why the doubled rate keys off
-- `target_zone_minute` and not off a zone number.

INSERT INTO point_rules (event, basis, points, label) VALUES
  ('training_minute',           'per_minute', 1,   'Every training minute counts'),
  ('target_zone_minute',        'per_minute', 2,   'Minutes in your prescribed target zone pay double'),
  ('planned_session_completed', 'per_event',  25,  'Completing a planned session'),
  ('benchmark_completed',       'per_event',  50,  'Completing a benchmark session'),
  ('feedback_given',            'per_event',  10,  'Giving post-session feedback'),
  ('plan_block_completed',      'per_event',  200, 'Finishing a full 8-week block');
-- Deliberately absent: opening the app, sharing, and the streak itself. The
-- HYROX app research is explicit that rewarding those produces vanity metrics
-- and guilt mechanics, so there is no rule here to award them by accident.

-- --- Member goal -> catalogue goal tag ---------------------------------------
-- Four of the eight differ only in spelling, which is exactly the kind of
-- mismatch that survives code review and dies in production.

INSERT INTO goal_exercise_goals (goal, exercise_goal, weight) VALUES
  ('lose_weight_burn_fat',       'fat_burn_weight_loss',       1.0),
  ('build_strength_muscle',      'build_strength_muscle',      1.0),
  ('improve_fitness_endurance',  'improve_endurance_fitness',  1.0),
  ('move_pain_free',             'move_pain_free',             1.0),
  ('boost_health_longevity',     'boost_health_longevity',     1.0),
  ('improve_sports_performance', 'improve_sports_performance', 1.0),
  ('train_body_mind',            'train_body_and_mind',        1.0),
  -- The one with no counterpart. An event is a deadline, not a quality, so it
  -- resolves to the two tags that actually carry someone to a start line.
  ('prepare_for_event',          'improve_endurance_fitness',  1.0),
  ('prepare_for_event',          'improve_sports_performance', 0.6);

-- --- Focus areas -------------------------------------------------------------
-- Labels verbatim from the concept (web/lib/intake/model.ts); slugs are what
-- the intake already sends; `stimulus` is FOCUS_STIMULUS, moved out of the
-- frontend so the engine can read the thing that steers it.

INSERT INTO focus_areas (goal, slug, label, stimulus, sort_order) VALUES
  ('lose_weight_burn_fat', 'maximum_fat_loss',           'Maximum Fat Loss',            'cardio_intensity',   1),
  ('lose_weight_burn_fat', 'sustainable_weight_loss',    'Sustainable Weight Loss',     'cardio_endurance',   2),
  ('lose_weight_burn_fat', 'improve_metabolism',         'Improve Metabolism',          'cardio_intensity',   3),
  ('lose_weight_burn_fat', 'increase_daily_activity',    'Increase Daily Activity',     'cardio_endurance',   4),
  ('lose_weight_burn_fat', 'tone_shape_body',            'Tone & Shape Body',           'strength',           5),
  ('lose_weight_burn_fat', 'improve_body_composition',   'Improve Body Composition',    'strength',           6),

  ('build_strength_muscle', 'muscle_growth_hypertrophy', 'Muscle Growth (Hypertrophy)', 'strength',           1),
  ('build_strength_muscle', 'functional_strength',       'Functional Strength',         'strength',           2),
  ('build_strength_muscle', 'full_body_strength',        'Full Body Strength',          'strength',           3),
  ('build_strength_muscle', 'upper_body',                'Upper Body',                  'strength',           4),
  ('build_strength_muscle', 'lower_body',                'Lower Body',                  'strength',           5),
  ('build_strength_muscle', 'core_strength',             'Core Strength',               'mobility_stability', 6),
  ('build_strength_muscle', 'explosive_strength',        'Explosive Strength',          'power_speed',        7),
  ('build_strength_muscle', 'maximum_strength',          'Maximum Strength',            'strength',           8),

  ('improve_fitness_endurance', 'cardiovascular_fitness','Cardiovascular Fitness',      'cardio_endurance',   1),
  ('improve_fitness_endurance', 'vo_max',                'VO₂max',                      'cardio_intensity',   2),
  ('improve_fitness_endurance', 'functional_fitness',    'Functional Fitness',          'cardio_endurance',   3),
  ('improve_fitness_endurance', 'stamina',               'Stamina',                     'cardio_endurance',   4),
  ('improve_fitness_endurance', 'interval_fitness',      'Interval Fitness',            'cardio_intensity',   5),
  ('improve_fitness_endurance', 'general_conditioning',  'General Conditioning',        'cardio_endurance',   6),
  ('improve_fitness_endurance', 'muscular_endurance',    'Muscular Endurance',          'strength',           7),

  ('move_pain_free', 'lower_back',        'Lower Back',        'mobility_stability', 1),
  ('move_pain_free', 'neck_shoulders',    'Neck & Shoulders',  'mobility_stability', 2),
  ('move_pain_free', 'knee_stability',    'Knee Stability',    'mobility_stability', 3),
  ('move_pain_free', 'hip_mobility',      'Hip Mobility',      'mobility_stability', 4),
  ('move_pain_free', 'better_posture',    'Better Posture',    'mobility_stability', 5),
  ('move_pain_free', 'balance',           'Balance',           'mobility_stability', 6),
  ('move_pain_free', 'injury_prevention', 'Injury Prevention', 'mobility_stability', 7),
  ('move_pain_free', 'return_to_sport',   'Return to Sport',   'cardio_endurance',   8),
  ('move_pain_free', 'joint_mobility',    'Joint Mobility',    'mobility_stability', 9),

  ('boost_health_longevity', 'healthy_aging',    'Healthy Aging',      'cardio_endurance',   1),
  ('boost_health_longevity', 'brain_health',     'Brain Health',       'cognitive_motor',    2),
  ('boost_health_longevity', 'heart_health',     'Heart Health',       'cardio_endurance',   3),
  ('boost_health_longevity', 'bone_health',      'Bone Health',        'strength',           4),
  ('boost_health_longevity', 'mobility',         'Mobility',           'mobility_stability', 5),
  ('boost_health_longevity', 'stress_reduction', 'Stress Reduction',   'recovery',           6),
  ('boost_health_longevity', 'better_sleep',     'Better Sleep',       'recovery',           7),
  ('boost_health_longevity', 'energy_vitality',  'Energy & Vitality',  'cardio_endurance',   8),
  ('boost_health_longevity', 'metabolic_health', 'Metabolic Health',   'cardio_intensity',   9),

  ('improve_sports_performance', 'speed',                       'Speed',                       'power_speed',        1),
  ('improve_sports_performance', 'agility',                     'Agility',                     'power_speed',        2),
  ('improve_sports_performance', 'acceleration',                'Acceleration',                'power_speed',        3),
  ('improve_sports_performance', 'reaction_speed',              'Reaction Speed',              'cognitive_motor',    4),
  ('improve_sports_performance', 'coordination',                'Coordination',                'cognitive_motor',    5),
  ('improve_sports_performance', 'balance',                     'Balance',                     'mobility_stability', 6),
  ('improve_sports_performance', 'power',                       'Power',                       'power_speed',        7),
  ('improve_sports_performance', 'jump_performance',            'Jump Performance',            'power_speed',        8),
  ('improve_sports_performance', 'change_of_direction',         'Change of Direction',         'power_speed',        9),
  ('improve_sports_performance', 'sport_specific_conditioning', 'Sport-Specific Conditioning', 'cardio_intensity',  10),

  ('prepare_for_event', 'hyrox',            'HYROX',             'cardio_intensity',  1),
  ('prepare_for_event', 'marathon',         'Marathon',          'cardio_endurance',  2),
  ('prepare_for_event', 'half_marathon',    'Half Marathon',     'cardio_endurance',  3),
  ('prepare_for_event', 'triathlon',        'Triathlon',         'cardio_endurance',  4),
  ('prepare_for_event', 'cycling',          'Cycling',           'cardio_endurance',  5),
  ('prepare_for_event', 'football_season',  'Football Season',   'power_speed',       6),
  ('prepare_for_event', 'tennis_season',    'Tennis Season',     'cognitive_motor',   7),
  ('prepare_for_event', 'ski_season',       'Ski Season',        'power_speed',       8),
  ('prepare_for_event', 'hiking',           'Hiking',            'cardio_endurance',  9),
  ('prepare_for_event', 'ocr_spartan_race', 'OCR / Spartan Race','cardio_intensity', 10),
  -- No stimulus: a valid pick that must not silently bias the plan.
  ('prepare_for_event', 'other',            'Other',              NULL,              11),

  ('train_body_mind', 'reaction_time',          'Reaction Time',          'cognitive_motor', 1),
  ('train_body_mind', 'focus',                  'Focus',                  'cognitive_motor', 2),
  ('train_body_mind', 'decision_making',        'Decision Making',        'cognitive_motor', 3),
  ('train_body_mind', 'dual_task_performance',  'Dual Task Performance',  'cognitive_motor', 4),
  ('train_body_mind', 'cognitive_endurance',    'Cognitive Endurance',    'cognitive_motor', 5),
  ('train_body_mind', 'executive_function',     'Executive Function',     'cognitive_motor', 6),
  ('train_body_mind', 'working_memory',         'Working Memory',         'cognitive_motor', 7),
  ('train_body_mind', 'processing_speed',       'Processing Speed',       'cognitive_motor', 8);

COMMIT;

-- =============================================================================
-- Notes on the reads this shape is designed for
-- =============================================================================
--
-- Points balance:
--   SELECT sum(delta) FROM points_ledger WHERE member_id = $1;
--
-- Candidate exercises for a member, goal and gym — selection, safety and
-- equipment in one statement:
--   SELECT DISTINCT e.* FROM exercises e
--     JOIN exercise_goals eg ON eg.exercise_id = e.id
--     JOIN goal_exercise_goals g ON g.exercise_goal = eg.goal AND g.goal = $2
--     JOIN stations st ON st.equipment_id = e.primary_equipment_id
--                     AND st.gym_id = $3 AND st.retired_at IS NULL
--    WHERE e.retired_at IS NULL
--      AND NOT EXISTS (SELECT 1 FROM member_restrictions r
--                       WHERE r.member_id = $1 AND r.cleared_at IS NULL
--                         AND (r.expires_on IS NULL OR r.expires_on >= current_date)
--                         AND (r.avoid_region IN (e.region_primary, e.region_secondary, e.region_tertiary)
--                           OR r.avoid_movement = e.movement
--                           OR e.impact > r.max_impact));
--
-- Which stations at this gym deliver a prescribed stimulus (the resolver):
--   SELECT st.* FROM stations st
--     JOIN equipment_stimuli es ON es.equipment_id = st.equipment_id
--    WHERE st.gym_id = $1 AND es.stimulus = $2 AND st.retired_at IS NULL;
--
-- Missed sessions, which drive the markers on the trend chart:
--   SELECT ps.* FROM plan_sessions ps
--     LEFT JOIN session_logs sl ON sl.plan_session_id = ps.id AND sl.completed_at IS NOT NULL
--    WHERE ps.plan_id = $1 AND ps.scheduled_on < current_date AND sl.id IS NULL;
--
-- Did they hold the zone — working legs only, every round:
--   SELECT sel.station_name,
--          sum(sel.seconds_in_zone)::float / nullif(sum(sel.actual_seconds), 0)
--     FROM session_exercise_logs sel
--     JOIN session_logs l ON l.id = sel.session_log_id
--    WHERE l.member_id = $1 AND sel.role = 'work'
--    GROUP BY sel.station_name;
--
-- HR recovery, the flagship longevity metric, straight off the pause logs:
--   SELECT avg(p.hr_60s_recovery) FROM session_pause_logs p
--     JOIN session_logs l ON l.id = p.session_log_id
--    WHERE l.member_id = $1 AND p.hr_60s_recovery IS NOT NULL;
--
-- League standing — rank and points derived, cohort stored:
--   SELECT m.member_id, sum(pl.delta) AS points,
--          rank() OVER (ORDER BY sum(pl.delta) DESC) AS rank
--     FROM league_memberships m
--     JOIN league_cohorts c ON c.id = m.cohort_id
--     LEFT JOIN points_ledger pl ON pl.member_id = m.member_id
--                               AND pl.created_at >= c.starts_at
--                               AND pl.created_at <  c.ends_at
--                               AND pl.delta > 0
--    WHERE m.cohort_id = $1
--    GROUP BY m.member_id;
--
-- The Body and Brain scores, derived from what was actually performed:
--   SELECT date_trunc('week', l.completed_at) AS wk,
--          sum(sel.actual_seconds) FILTER (WHERE bq.exercise_id IS NOT NULL) AS body_seconds,
--          sum(sel.actual_seconds) FILTER (WHERE rq.exercise_id IS NOT NULL) AS brain_seconds
--     FROM session_logs l
--     JOIN session_exercise_logs sel ON sel.session_log_id = l.id AND sel.role = 'work'
--     LEFT JOIN exercise_body_qualities  bq ON bq.exercise_id = sel.exercise_id
--     LEFT JOIN exercise_brain_qualities rq ON rq.exercise_id = sel.exercise_id
--    WHERE l.member_id = $1 AND l.completed_at IS NOT NULL
--    GROUP BY wk ORDER BY wk;
