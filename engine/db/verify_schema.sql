-- =============================================================================
-- Verification for engine/db/schema.sql
--
-- Not a unit test. This builds a small but real world in the schema, then tries
-- to break it. Every claim the schema makes about what it rejects is executed
-- here rather than asserted in a comment.
--
--   createdb planapp
--   psql -d planapp -v ON_ERROR_STOP=1 -f engine/db/schema.sql
--   psql -d planapp -v ON_ERROR_STOP=1 -f engine/db/verify_schema.sql
--
-- Any failure raises and aborts. "every check passed" at the end means what it
-- says.
-- =============================================================================

\set ON_ERROR_STOP on
\timing off

-- A negative test: run `stmt` and require it to fail with a constraint error.
CREATE FUNCTION must_reject(stmt text, what text) RETURNS void AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION
    WHEN check_violation OR unique_violation OR foreign_key_violation
      OR not_null_violation OR invalid_text_representation OR exclusion_violation THEN
      RAISE NOTICE 'rejected, as designed: %', what;
      RETURN;
  END;
  RAISE EXCEPTION 'NOT REJECTED: % — the database allowed it', what;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION must_equal(got anyelement, want anyelement, what text) RETURNS void AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN
    RAISE EXCEPTION 'WRONG: % — got %, wanted %', what, got, want;
  END IF;
  RAISE NOTICE 'ok: %', what;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- A world: one org, three gyms, a floor of stations, four exercises, members.
-- =============================================================================
-- The fixture names rows by explicit id, so it needs the schema and nothing
-- else. Run against a database with schema.sql applied and the catalogue NOT
-- loaded; loading the real 105 exercises is a separate check (load_catalogue.py)
-- and the two would collide on id.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM exercises) OR EXISTS (SELECT 1 FROM orgs) THEN
    RAISE EXCEPTION 'this database already has data — run against a fresh schema.sql database';
  END IF;
END $$;

INSERT INTO orgs (id, slug, name) VALUES (1, 'sphery', 'Sphery AG'), (2, 'rival', 'Rival Fitness');
INSERT INTO gyms (id, org_id, slug, name) VALUES
  (1, 1, 'darmstadt', 'Sphere Darmstadt'),
  (2, 1, 'zurich',    'Sphere Zurich'),
  (3, 2, 'other',     'Rival Downtown');

INSERT INTO equipment (id, slug, name, is_sphery) VALUES
  (1, 'exercube', 'ExerCube', true),
  (2, 'ski-erg',  'Ski Erg',  false),
  (3, 'kettlebell', 'Kettlebell', false);

INSERT INTO equipment_stimuli (equipment_id, stimulus, mode) VALUES
  (1, 'cardio_intensity', 'Fitness'),
  (1, 'cognitive_motor',  'Game'),
  (2, 'cardio_endurance', NULL),
  (3, 'strength',         NULL);

-- Stations are instances, not counts: the circuit resolver needs identity.
INSERT INTO stations (id, gym_id, equipment_id, name, position) VALUES
  (1, 1, 1, 'ExerCube 1',   1),
  (2, 1, 1, 'ExerCube 2',   2),
  (3, 1, 2, 'Ski Erg',      3),
  (4, 1, 3, 'Kettlebells',  4),
  (5, 2, 1, 'ExerCube',     1);

INSERT INTO exercise_families (id, slug, name) VALUES
  (1, 'squat', 'Squat'), (2, 'carry', 'Carry'), (3, 'cube-sprint', 'Cube Sprint');

INSERT INTO exercises
  (id, code, name, family_id, level, primary_equipment_id, intensity_min, intensity_max,
   complexity, impact, movement, training_modality, region_primary, region_secondary) VALUES
  (1, 'EX001', 'Sumo Squat',    1, 'foundation', 3, 2, 3, 2, 'low',    'squat',      'strength', 'legs',   'glutes'),
  (2, 'EX002', 'Wall Ball',     1, 'mastery',    3, 4, 5, 4, 'high',   'squat',      'power',    'legs',   'shoulders'),
  (3, 'EX003', 'Farmer Carry',  2, 'foundation', 3, 3, 4, 2, 'low',    'carry',      'strength', 'core',   'arms'),
  (4, 'EX004', 'Cube Sprint',   3, 'progress',   1, 4, 5, 3, 'medium', 'locomotion', 'cardio',   'full_body', NULL);

INSERT INTO exercise_body_qualities (exercise_id, quality) VALUES
  (1, 'strength'), (2, 'strength'), (2, 'speed'), (3, 'strength'), (4, 'endurance'), (4, 'coordination');
INSERT INTO exercise_brain_qualities (exercise_id, quality) VALUES
  (4, 'reaction'), (4, 'perception_orientation');
INSERT INTO exercise_goals (exercise_id, goal) VALUES
  (1, 'build_strength_muscle'), (2, 'build_strength_muscle'), (2, 'improve_sports_performance'),
  (3, 'build_strength_muscle'), (4, 'improve_endurance_fitness'), (4, 'improve_sports_performance');

INSERT INTO accounts (id, email) VALUES
  (1, 'Lena@example.com'), (2, 'max@example.com'), (3, 'coach@example.com');
INSERT INTO members (id, account_id, org_id, home_gym_id, display_name, dob) VALUES
  (1, 1, 1, 1, 'Lena', '1991-04-02'),
  (2, 2, 2, 3, 'Rival Member', '1988-01-01');
INSERT INTO staff (id, account_id, org_id, gym_id, role) VALUES (1, 3, 1, 1, 'coach');

-- The fixture supplies explicit ids so the assertions can name rows; that
-- leaves every sequence behind. Catch them all up.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT table_name, column_name,
                  pg_get_serial_sequence(quote_ident(table_name), column_name) AS seq
             FROM information_schema.columns
            WHERE table_schema = 'public' AND column_default LIKE 'nextval%'
  LOOP
    EXECUTE format('SELECT setval(%L, coalesce(max(%I), 0) + 1, false) FROM %I',
                   r.seq, r.column_name, r.table_name);
  END LOOP;
END $$;

-- =============================================================================
-- 1. THE MEMBER'S GOAL VOCABULARY
-- =============================================================================

INSERT INTO questionnaire_responses (id, member_id, version, answers)
  VALUES (1, 1, '2026-08', '{"goal":"prepare_for_event","focus":["hyrox"]}');

-- The race this plan ramps toward. Without a dated event, "prepare for an
-- event" is a goal with no finish line.
INSERT INTO events (id, slug, name, kind, starts_on, location, external_ref)
  VALUES (1, 'hyrox-frankfurt-2026', 'HYROX Frankfurt', 'hyrox',
          current_date + 49, 'Frankfurt', 'Super Circle March 2026');

-- The goal that could not previously be stored at all.
INSERT INTO plans (id, member_id, gym_id, questionnaire_id, goal, event_id, event_division,
                   rationale, fitness_estimate, starts_on)
  VALUES (1, 1, 1, 1, 'prepare_for_event', 1, 'pro', 'HYROX in ten weeks; building the engine first.',
          '{"vo2max": 41.2, "confidence": 0.6}', current_date - 21);

DO $$ BEGIN PERFORM must_equal(
  (SELECT goal::text FROM plans WHERE id = 1), 'prepare_for_event',
  'plans.goal stores prepare_for_event (was unstorable)'); END $$;

DO $$
DECLARE g text;
BEGIN
  FOREACH g IN ARRAY ARRAY['lose_weight_burn_fat','build_strength_muscle','improve_fitness_endurance',
                           'move_pain_free','boost_health_longevity','improve_sports_performance',
                           'prepare_for_event','train_body_mind']
  LOOP PERFORM g::training_goal; END LOOP;
  RAISE NOTICE 'ok: all 8 intake goal slugs are valid training_goal values';
END $$;

-- The two vocabularies stay separate: an exercise cannot be tagged with a race.
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO exercise_goals (exercise_id, goal) VALUES (1, 'prepare_for_event')$q$,
  'exercise tagged with a member-only goal'); END $$;

DO $$ BEGIN PERFORM must_equal(
  (SELECT count(DISTINCT e.id) FROM exercises e
     JOIN exercise_goals eg ON eg.exercise_id = e.id
     JOIN goal_exercise_goals g ON g.exercise_goal = eg.goal AND g.goal = 'prepare_for_event'),
  2::bigint, 'goal bridge resolves prepare_for_event to real exercises'); END $$;

INSERT INTO plan_focuses (plan_id, focus_area_id)
  SELECT 1, id FROM focus_areas WHERE goal = 'prepare_for_event' AND slug = 'hyrox';
DO $$ BEGIN PERFORM must_equal(
  (SELECT f.stimulus::text FROM plan_focuses pf JOIN focus_areas f ON f.id = pf.focus_area_id
    WHERE pf.plan_id = 1), 'cardio_intensity', 'chosen focus carries its stimulus'); END $$;
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM focus_areas WHERE slug = 'balance'), 2::bigint,
  'the same focus slug lives under two goals'); END $$;

-- The ramp has a date, so "how far out are we" is a query.
DO $$ BEGIN PERFORM must_equal(
  (SELECT (e.starts_on - current_date) FROM plans p JOIN events e ON e.id = p.event_id
    WHERE p.id = 1), 49, 'the plan knows the race is seven weeks out'); END $$;
DO $$ BEGIN PERFORM must_equal(
  (SELECT e.kind = f.slug FROM plans p
     JOIN events e ON e.id = p.event_id
     JOIN plan_focuses pf ON pf.plan_id = p.id
     JOIN focus_areas f ON f.id = pf.focus_area_id
    WHERE p.id = 1), true, 'the event kind and the chosen focus agree on what the race is'); END $$;
DO $$ BEGIN PERFORM must_equal(
  (SELECT event_division::text FROM plans WHERE id = 1), 'pro',
  'the division is on the plan, where it can change prescribed load'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO events (slug, name, external_ref)
     VALUES ('dupe', 'Duplicate kiosk event', 'Super Circle March 2026')$q$,
  'two events claiming the same kiosk eventId'); END $$;
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM pg_type WHERE typname = 'competition_category'), 0::bigint,
  'competition classification is gone — it says nothing about training'); END $$;

-- =============================================================================
-- 2. THE PRESCRIPTION IS ROWS
-- =============================================================================

INSERT INTO plan_weeks (plan_id, week_number, theme) VALUES (1, 1, 'base building'), (1, 2, 'deload');
INSERT INTO plan_sessions (id, plan_id, week_number, index_in_week, stimulus, adaptivity,
                           hr_zone, hr_bpm_min, hr_bpm_max, duration_min, rounds, difficulty,
                           scheduled_on, rationale)
VALUES
  (1, 1, 1, 1, 'cardio_intensity', 'hr_tracking', 4, 152, 168, 45, 3, 6, current_date - 20, 'Threshold work, three rounds.'),
  (2, 1, 1, 2, 'strength',         'performance', 3, NULL, NULL, 45, 1, 5, current_date - 17, 'Posterior chain.'),
  (3, 1, 2, 1, 'recovery',         'performance', 2, NULL, NULL, 30, 1, 3, current_date - 13, 'Deload.');

INSERT INTO plan_session_exercises (plan_session_id, order_index, exercise_id, station_id, role, target_zone, target_seconds, target_text) VALUES
  (1, 1, 4, 1, 'warmup', 2, 300, NULL),
  (1, 2, 4, 2, 'work',   4, 300, '1000m'),
  (1, 3, 1, 4, 'work',   4, 240, NULL),
  (1, 4, 4, 1, 'cooldown', 1, 180, NULL),
  (2, 1, 1, 4, 'work',   3, 240, NULL),
  (2, 2, 3, 4, 'work',   3, 180, '50m');

DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name IN ('weeks', 'resolved')),
  0::bigint, 'plans has no weeks/resolved blob'); END $$;
DO $$ BEGIN PERFORM must_equal(
  (SELECT stimulus::text||'/'||adaptivity::text||'/'||difficulty::text||'/'||rounds::text
     FROM plan_sessions WHERE id = 1),
  'cardio_intensity/hr_tracking/6/3', 'stimulus, adaptivity, difficulty and rounds are columns'); END $$;
DO $$ BEGIN PERFORM must_equal(
  (SELECT target_text FROM plan_session_exercises WHERE plan_session_id = 1 AND order_index = 2),
  '1000m', 'a distance target survives — it fits neither seconds nor reps'); END $$;

DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO plan_sessions (plan_id, week_number, index_in_week, stimulus, duration_min, difficulty)
     VALUES (1, 9, 1, 'strength', 45, 5)$q$, 'session in a week the plan does not have'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO plan_sessions (plan_id, week_number, index_in_week, stimulus, duration_min, difficulty)
     VALUES (1, 1, 1, 'strength', 45, 5)$q$, 'two sessions at the same position in a week'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO plan_sessions (plan_id, week_number, index_in_week, stimulus, duration_min, difficulty)
     VALUES (1, 2, 2, 'strength', 45, 44)$q$, 'difficulty outside the 1-10 scale'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO plan_sessions (plan_id, week_number, index_in_week, stimulus, duration_min, difficulty, rounds)
     VALUES (1, 2, 2, 'strength', 45, 5, 0)$q$, 'a circuit with zero rounds'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO plan_sessions (plan_id, week_number, index_in_week, stimulus, duration_min, difficulty, hr_bpm_min, hr_bpm_max)
     VALUES (1, 2, 2, 'strength', 45, 5, 150, 140)$q$, 'bpm range that runs backwards'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO plan_sessions (plan_id, week_number, index_in_week, stimulus, duration_min, difficulty, hr_bpm_min, hr_bpm_max)
     VALUES (1, 2, 2, 'strength', 45, 5, 150, 160)$q$, 'an absolute bpm range with no zone behind it'); END $$;

-- Plan lineage: "superseded" is no longer a dead end.
INSERT INTO plans (id, member_id, gym_id, goal, rationale, fitness_estimate)
  VALUES (2, 1, 1, 'prepare_for_event', 'Re-planned after the first block.', '{"vo2max": 43.0}');
UPDATE plans SET status = 'superseded', superseded_by_id = 2 WHERE id = 1;
DO $$ BEGIN PERFORM must_equal(
  (SELECT superseded_by_id FROM plans WHERE id = 1), 2::bigint,
  'a superseded plan names what replaced it'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$UPDATE plans SET superseded_by_id = 2 WHERE id = 2$q$, 'a plan superseding itself'); END $$;

-- =============================================================================
-- 3. THE SAFETY GATE
-- =============================================================================

INSERT INTO member_restrictions (member_id, reported_label, recovery_stage, max_impact, recorded_by_staff_id)
  VALUES (1, 'Knee', 'early', 'low', 1);

CREATE TEMP VIEW candidates AS
  SELECT DISTINCT e.id, e.name FROM exercises e
    JOIN exercise_goals eg ON eg.exercise_id = e.id
    JOIN goal_exercise_goals g ON g.exercise_goal = eg.goal AND g.goal = 'prepare_for_event'
    JOIN stations st ON st.equipment_id = e.primary_equipment_id
                    AND st.gym_id = 1 AND st.retired_at IS NULL
   WHERE e.retired_at IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM member_restrictions r
        WHERE r.member_id = 1 AND r.cleared_at IS NULL
          AND (r.expires_on IS NULL OR r.expires_on >= current_date)
          AND ( r.avoid_region IN (e.region_primary, e.region_secondary, e.region_tertiary)
             OR r.avoid_movement = e.movement
             OR e.impact > r.max_impact));

DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM candidates), 0::bigint,
  'a low-impact cap excludes every medium/high-impact candidate'); END $$;

UPDATE member_restrictions SET max_impact = 'medium' WHERE member_id = 1;
DO $$ BEGIN PERFORM must_equal(
  (SELECT string_agg(name, ', ' ORDER BY name) FROM candidates), 'Cube Sprint',
  'raising the cap to medium admits Cube Sprint but still blocks high-impact Wall Ball'); END $$;

UPDATE member_restrictions SET max_impact = NULL, avoid_region = 'legs' WHERE member_id = 1;
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM exercises e WHERE NOT EXISTS (
     SELECT 1 FROM member_restrictions r WHERE r.member_id = 1 AND r.cleared_at IS NULL
       AND r.avoid_region IN (e.region_primary, e.region_secondary, e.region_tertiary))),
  2::bigint, 'a leg restriction hides both leg exercises and nothing else'); END $$;

DO $$ BEGIN PERFORM must_equal(
  (SELECT s.role FROM member_restrictions r JOIN staff s ON s.id = r.recorded_by_staff_id
    WHERE r.member_id = 1), 'coach',
  'a restriction records who put it there'); END $$;

UPDATE member_restrictions SET cleared_at = now() WHERE member_id = 1;
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM candidates), 2::bigint, 'clearing a restriction restores the full candidate set'); END $$;
DO $$ BEGIN PERFORM must_equal(
  (SELECT reported_label FROM member_restrictions WHERE member_id = 1), 'Knee',
  'what the member actually said is still on the row'); END $$;

-- =============================================================================
-- 4. THE MEMBER'S BODY AND WEEK
-- =============================================================================

INSERT INTO member_measurements (member_id, weight_kg, height_cm, measured_at)
  VALUES (1, 68.40, 171, now() - interval '60 days'), (1, 64.90, NULL, now());
DO $$ BEGIN PERFORM must_equal(
  (SELECT weight_kg FROM member_measurements WHERE member_id = 1 ORDER BY measured_at DESC LIMIT 1),
  64.90::numeric, 'weight is a dated series, so the latest reading wins'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO member_measurements (member_id, weight_kg) VALUES (1, 900)$q$, 'a 900 kg member'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO member_measurements (member_id) VALUES (1)$q$, 'a measurement that measures nothing'); END $$;

INSERT INTO member_preferences (member_id, fitness_level, weekly_minutes, self_rated_intensity,
                                session_length_min, available_days)
  VALUES (1, 'medium', 180, 3, 45, '{mon,wed,sat}');
DO $$ BEGIN PERFORM must_equal(
  (SELECT array_length(available_days, 1) FROM member_preferences WHERE member_id = 1),
  3, 'availability survives outside the questionnaire blob'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$UPDATE member_preferences SET available_days = '{funday}' WHERE member_id = 1$q$,
  'a weekday that does not exist'); END $$;

INSERT INTO member_activities (member_id, name, minutes_per_session, intensity, days)
  VALUES (1, 'Bouldering', 90, 4, '{tue,thu}');
DO $$ BEGIN PERFORM must_equal(
  (SELECT minutes_per_session * array_length(days, 1) FROM member_activities WHERE member_id = 1),
  180, 'outside weekly load is computable, so the plan can balance against it'); END $$;

-- =============================================================================
-- 5. A KIOSK CIRCLE TRAINING, V2-SHAPED
-- =============================================================================
-- Michel's V2.6: a training holds groups, a group holds members, and every
-- exercise log carries roundIndex and splitIndex. There is no solo path.

INSERT INTO group_trainings (id, gym_id, kiosk_id, event_ref, event_id, name, mode, type, style,
                             rounds, is_hyrox, status, started_at, provider, external_id)
  VALUES (1, 1, 'THESPHEREDARMSTADT', 'Super Circle March 2026', 1, 'HYROX Zirkel',
          'single', 'mutual', 'duration', 3, true,
          'completed', now() - interval '20 days', 'nexus_kiosk', 'ct-8891');

DO $$ BEGIN PERFORM must_equal(
  (SELECT e.name FROM group_trainings gt JOIN events e ON e.id = gt.event_id WHERE gt.id = 1),
  'HYROX Frankfurt', 'a kiosk training resolves onto the same event the plan targets'); END $$;
DO $$ BEGIN PERFORM must_equal(
  (SELECT mode::text||'/'||type::text FROM group_trainings WHERE id = 1), 'single/mutual',
  'mode and type survive, because a relay leg is not a full circuit'); END $$;

INSERT INTO training_stations (id, group_training_id, order_index, station_id, name, style, target) VALUES
  (1, 1, 1, 1, 'Run',       'duration', '1000m'),
  (2, 1, 2, 3, 'SkiErg',    'duration', '1000m'),
  (3, 1, 3, 4, 'Sled Push', 'duration', '50m');

INSERT INTO training_teams (id, group_training_id, name, start_exercise_index, status, provider, external_id)
  VALUES (1, 1, NULL, 1, 'completed', 'nexus_kiosk', 'grp-5501');

DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO group_trainings (name, provider, external_id) VALUES ('Replay', 'nexus_kiosk', 'ct-8891')$q$,
  'the same kiosk training delivered twice'); END $$;

-- A team of one is still a team.
INSERT INTO session_logs (id, member_id, plan_id, plan_session_id, gym_id, team_id, order_in_team,
                          source, started_at, completed_at, duration_seconds,
                          avg_hr, max_hr, perceived_effort)
VALUES (1, 1, 1, 1, 1, 1, 1, 'kiosk',
        now() - interval '20 days', now() - interval '20 days' + interval '45 min', 2700, 154, 176, 4);

DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO session_logs (member_id, team_id, source) VALUES (1, 1, 'kiosk')$q$,
  'one person appearing twice in the same team'); END $$;

-- THREE ROUNDS. The previous shape had UNIQUE (session_log_id, order_index) and
-- rejected this outright.
INSERT INTO session_exercise_logs (id, session_log_id, training_station_id, order_index, round_index,
                                   split_index, role, exercise_id, exercise_name, station_id, station_name,
                                   prescribed_zone, actual_seconds, seconds_in_zone, score) VALUES
  (1, 1, 1, 1, 1, 1, 'warmup', 4, 'Cube Sprint',  1, 'ExerCube 1', 2, 300, 40,  NULL),
  (2, 1, 2, 2, 1, 1, 'work',   4, 'Cube Sprint',  3, 'Ski Erg',    4, 300, 240, 1234),
  (3, 1, 3, 3, 1, 1, 'work',   1, 'Sumo Squat',   4, 'Kettlebells',4, 240, 180, NULL),
  (4, 1, 2, 2, 2, 1, 'work',   4, 'Cube Sprint',  3, 'Ski Erg',    4, 300, 225, 1180),
  (5, 1, 3, 3, 2, 1, 'work',   1, 'Sumo Squat',   4, 'Kettlebells',4, 240, 170, NULL),
  (6, 1, 2, 2, 3, 1, 'work',   4, 'Cube Sprint',  3, 'Ski Erg',    4, 300, 210, 1090),
  (7, 1, 3, 3, 3, 1, 'work',   1, 'Sumo Squat',   4, 'Kettlebells',4, 240, 165, NULL);

DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM session_exercise_logs WHERE session_log_id = 1 AND role = 'work'),
  6::bigint, 'a three-round circuit stores all six working legs'); END $$;

-- Second catch-up: the V2 fixture above also supplied explicit ids.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT table_name, column_name,
                  pg_get_serial_sequence(quote_ident(table_name), column_name) AS seq
             FROM information_schema.columns
            WHERE table_schema = 'public' AND column_default LIKE 'nextval%'
  LOOP
    EXECUTE format('SELECT setval(%L, coalesce(max(%I), 0) + 1, false) FROM %I',
                   r.seq, r.column_name, r.table_name);
  END LOOP;
END $$;

-- Mutual mode: the swap stops one split and opens the next at the same instant.
INSERT INTO session_exercise_logs (session_log_id, training_station_id, order_index, round_index,
                                   split_index, role, exercise_name, actual_seconds, status)
  VALUES (1, 3, 3, 3, 2, 'work', 'Sumo Squat', 60, 'completed');
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM session_exercise_logs WHERE session_log_id = 1 AND order_index = 3 AND round_index = 3),
  2::bigint, 'a mutual-mode swap opens a second split at the same station and round'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO session_exercise_logs (session_log_id, order_index, round_index, split_index, exercise_name)
     VALUES (1, 3, 3, 2, 'Duplicate split')$q$,
  'the same (leg, round, split) recorded twice'); END $$;

DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO session_exercise_logs (session_log_id, order_index, exercise_name, actual_seconds, seconds_in_zone)
     VALUES (1, 9, 'Impossible', 100, 200)$q$, 'more seconds in the zone than seconds performed'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO session_exercise_logs (session_log_id, order_index, exercise_name, started_at, stopped_at)
     VALUES (1, 9, 'Backwards', now(), now() - interval '5 min')$q$, 'a leg that stopped before it started'); END $$;

-- Time in zone, working legs only. The warmup held zone 2 for 40 of 300s and
-- must not drag the number down.
DO $$ BEGIN PERFORM must_equal(
  (SELECT round(100.0 * sum(seconds_in_zone) / sum(actual_seconds))
     FROM session_exercise_logs WHERE session_log_id = 1 AND role = 'work'), 71::numeric,
  'time-in-zone counts working legs only, not the warmup'); END $$;
DO $$ BEGIN PERFORM must_equal(
  (SELECT round(100.0 * sum(seconds_in_zone) / sum(actual_seconds))
     FROM session_exercise_logs WHERE session_log_id = 1), 62::numeric,
  'and the unfiltered number is 9 points worse — which is why role exists'); END $$;

-- Pause logs: where HR recovery actually comes from.
INSERT INTO session_pause_logs (session_log_id, after_exercise_log_id, started_at, stopped_at,
                                hr_avg_recovery, hr_60s_recovery, hr_max, hr_min, hr_avg) VALUES
  (1, 2, now() - interval '20 days', now() - interval '20 days' + interval '40 sec', 145, 38, 170, 132, 148),
  (1, 4, now() - interval '20 days', now() - interval '20 days' + interval '40 sec', 149, 32, 172, 139, 152);
DO $$ BEGIN PERFORM must_equal(
  (SELECT avg(hr_60s_recovery)::int FROM session_pause_logs p
     JOIN session_logs l ON l.id = p.session_log_id WHERE l.member_id = 1), 35,
  'HR recovery is computable from the pause logs the kiosk bulk-creates'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO session_pause_logs (session_log_id, started_at, stopped_at)
     VALUES (1, now(), now() - interval '1 min')$q$, 'a pause that ended before it began'); END $$;

-- HR time series, written last and idempotent on redelivery.
INSERT INTO session_hr_samples (session_log_id, at, bpm) VALUES
  (1, '2026-07-13T10:00:00Z', 132), (1, '2026-07-13T10:00:05Z', 145), (1, '2026-07-13T10:00:10Z', 151);
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM session_hr_samples WHERE session_log_id = 1), 3::bigint,
  'HR samples land against the session'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO session_hr_samples (session_log_id, at, bpm) VALUES (1, '2026-07-13T10:00:05Z', 145)$q$,
  'a re-delivered HR sample at the same instant'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO session_hr_samples (session_log_id, at, bpm) VALUES (1, now(), 400)$q$,
  'a heart rate of 400'); END $$;

INSERT INTO external_session_refs (session_log_id, provider, external_id) VALUES (1, 'nexus_kiosk', 'gm-7701');
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO external_session_refs (session_log_id, provider, external_id) VALUES (1, 'nexus_kiosk', 'gm-9999')$q$,
  'two kiosk identities for one session'); END $$;

-- An app-only solo session: no team, and that is legal.
INSERT INTO session_logs (id, member_id, plan_id, plan_session_id, gym_id, source,
                          started_at, completed_at, duration_seconds, avg_hr, max_hr, perceived_effort)
VALUES (2, 1, 1, 2, 1, 'app', now() - interval '17 days',
        now() - interval '17 days' + interval '45 min', 2700, 131, 150, 2);
INSERT INTO session_exercise_logs (session_log_id, order_index, exercise_id, exercise_name, role,
                                   prescribed_zone, actual_seconds, seconds_in_zone) VALUES
  (2, 1, 1, 'Sumo Squat',   'work', 3, 240, 194),
  (2, 2, 3, 'Farmer Carry', 'work', 3, 180, 150);
DO $$ BEGIN PERFORM must_equal(
  (SELECT team_id FROM session_logs WHERE id = 2), NULL::bigint,
  'an app-logged session needs no team'); END $$;

DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO session_logs (member_id, perceived_effort) VALUES (1, 7)$q$,
  'perceived_effort = 7 on a 1-5 scale'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO session_logs (member_id, avg_hr, max_hr) VALUES (1, 170, 150)$q$,
  'max HR below average HR'); END $$;

-- Missed sessions and history outliving the plan.
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM plan_sessions ps
     LEFT JOIN session_logs sl ON sl.plan_session_id = ps.id AND sl.completed_at IS NOT NULL
    WHERE ps.plan_id = 1 AND ps.scheduled_on < current_date AND sl.id IS NULL),
  1::bigint, 'a missed session is the absence of a log against a prescribed row'); END $$;

DELETE FROM plans WHERE id = 1;
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM session_logs WHERE member_id = 1 AND plan_id IS NULL), 2::bigint,
  'deleting a plan nulls plan_id and leaves both sessions standing'); END $$;
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM session_exercise_logs), 10::bigint,
  'and every leg of every round survives with it'); END $$;

-- =============================================================================
-- 6. METRICS SPEAK THE UI'S LANGUAGE, AND KNOW THEIR OWN SHAPE
-- =============================================================================

-- The keys web/lib/types/engagement.ts renders all exist.
DO $$
DECLARE k text; missing int := 0;
BEGIN
  FOREACH k IN ARRAY ARRAY['body_trend','brain_trend','weekly_load','hr_recovery','time_in_zone','consistency']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM metric_definitions WHERE key = k) THEN missing := missing + 1; END IF;
  END LOOP;
  PERFORM must_equal(missing, 0, 'every metric the redesigned Progress page renders has a definition');
END $$;

INSERT INTO session_metrics (session_log_id, metric_key, value)
  VALUES (1, 'body_trend', 62), (1, 'brain_trend', 48), (1, 'hr_recovery', 35), (1, 'time_in_zone', 71);
INSERT INTO session_metrics (session_log_id, metric_key, value)
  VALUES (2, 'body_trend', 67), (2, 'brain_trend', 51);
INSERT INTO member_metrics (member_id, metric_key, period_start, period_end, value)
  VALUES (1, 'consistency', current_date - 28, current_date, 66.7);

-- The two lines on Progress: a series that can be plotted, not a bare score.
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM session_metrics WHERE metric_key = 'body_trend'), 2::bigint,
  'body_trend accumulates one point per session, which is what a trend line is'); END $$;
DO $$ BEGIN PERFORM must_equal(
  (SELECT (max(value) > min(value)) FROM session_metrics WHERE metric_key = 'body_trend'), true,
  'and the series can show improvement, which a single score never could'); END $$;
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM metric_definitions WHERE key IN ('body_score','brain_score','body_age','brain_age')),
  0::bigint, 'the score and age framings are gone, not merely unused'); END $$;

-- Polarity is still data: max HR points the other way from everything else.
DO $$ BEGIN PERFORM must_equal(
  (SELECT higher_is_better FROM metric_definitions WHERE key = 'hr_max'), false,
  'max HR is lower-is-better and lives on the profile, which is why polarity is a column'); END $$;

DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO session_metrics (session_log_id, metric_key, value) VALUES (1, 'consistency', 66.7)$q$,
  'a windowed metric filed against a single session'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO member_metrics (member_id, metric_key, period_start, period_end, value)
     VALUES (1, 'hr_avg', current_date - 7, current_date, 150)$q$, 'a per-session fact filed as a window'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO session_metrics (session_log_id, metric_key, value) VALUES (1, 'invented_metric', 1)$q$,
  'a metric with no definition'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO member_metrics (member_id, metric_key, period_start, period_end, value)
     VALUES (1, 'consistency', current_date, current_date - 28, 10)$q$, 'a window that ends before it starts'); END $$;

INSERT INTO benchmarks (member_id, session_log_id, vo2max_est, method, confidence)
  VALUES (1, 1, 43.8, 'submaximal_hr_regression', 0.62);
DO $$ BEGIN PERFORM must_equal(
  (SELECT computed_from FROM metric_definitions WHERE key = 'vo2max_est'), 'benchmarks.vo2max_est',
  'the VO2max metric points at benchmarks instead of storing a second copy'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO benchmarks (member_id, method, confidence) VALUES (1, 'guess', 1.4)$q$,
  'a confidence above 1'); END $$;

-- =============================================================================
-- 7. POINTS, LEAGUES, REWARDS
-- =============================================================================

INSERT INTO points_ledger (id, member_id, delta, reason, session_log_id, idempotency_key)
  VALUES (1, 1, 120, 'session.completed', 1, 'session-1-award');
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO points_ledger (member_id, delta, reason, idempotency_key)
     VALUES (1, 120, 'session.completed', 'session-1-award')$q$, 'a replayed points award'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO points_ledger (member_id, delta, reason) VALUES (1, 0, 'nothing happened')$q$,
  'a ledger entry that moves no points'); END $$;

-- The league the home screen renders: cohort stored, rank derived.
INSERT INTO league_cohorts (id, tier, gym_id, starts_at, ends_at)
  VALUES (1, 'silver', 1, now() - interval '3 days', now() + interval '4 days');
INSERT INTO league_memberships (cohort_id, member_id) VALUES (1, 1);
DO $$ BEGIN PERFORM must_equal(
  (SELECT sum(pl.delta) FROM league_memberships m
     JOIN league_cohorts c ON c.id = m.cohort_id
     JOIN points_ledger pl ON pl.member_id = m.member_id
                          AND pl.created_at >= c.starts_at AND pl.created_at < c.ends_at
                          AND pl.delta > 0
    WHERE m.cohort_id = 1), 120::bigint,
  'points-this-week is derived from the ledger inside the cohort window'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO league_cohorts (tier, starts_at, ends_at) VALUES ('gold', now(), now() - interval '1 day')$q$,
  'a league week that ends before it starts'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$UPDATE league_memberships SET promoted = true, relegated = true WHERE cohort_id = 1$q$,
  'a member both promoted and relegated'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO league_memberships (cohort_id, member_id) VALUES (1, 1)$q$,
  'the same member joining one cohort twice'); END $$;

INSERT INTO rewards (id, gym_id, kind, label, points_cost) VALUES (1, 1, 'smoothie', 'Recovery smoothie', 100);
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO rewards (gym_id, kind, label, points_cost) VALUES (1, 'merch', 'Free hoodie', 0)$q$,
  'a reward priced at zero points'); END $$;

INSERT INTO points_ledger (id, member_id, delta, reason) VALUES (2, 1, -100, 'reward.claimed');
INSERT INTO reward_claims (member_id, reward_id, points_ledger_id, points_cost, fulfilled_by_staff_id)
  VALUES (1, 1, 2, 100, 1);
DO $$ BEGIN PERFORM must_equal(
  (SELECT sum(delta) FROM points_ledger WHERE member_id = 1), 20::bigint,
  'claiming a reward actually moves the balance'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO reward_claims (member_id, reward_id, points_cost) VALUES (1, 1, 100)$q$,
  'a reward claimed without spending anything'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO reward_claims (member_id, reward_id, points_ledger_id, points_cost) VALUES (1, 1, 2, 100)$q$,
  'two claims charged to one debit'); END $$;

-- --- Earn rules are data ------------------------------------------------------

DO $$ BEGIN PERFORM must_equal(
  (SELECT points FROM point_rules WHERE event = 'target_zone_minute' AND effective_to IS NULL),
  2::numeric, 'a minute in your target zone pays double, and that lives in a table'); END $$;
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM point_rules WHERE event IN ('quest_completed','manual_adjustment')), 0::bigint,
  'nothing awards points for opening the app or keeping a streak'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO point_rules (event, basis, points, label)
     VALUES ('training_minute', 'per_minute', 5, 'Sneaky second global rule')$q$,
  'a second open-ended global rule for the same event'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO point_rules (event, basis, points, label, effective_from, effective_to)
     VALUES ('training_minute', 'per_minute', 5, 'Backwards window', now(), now() - interval '1 day')$q$,
  'a rule that expires before it starts'); END $$;

-- Changing a rate closes the old row rather than editing it, so an award made
-- under the old rate stays explainable.
UPDATE point_rules SET effective_to = now() WHERE event = 'training_minute' AND gym_id IS NULL;
INSERT INTO point_rules (event, basis, points, label) VALUES
  ('training_minute', 'per_minute', 1.5, 'Autumn promotion');
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM point_rules WHERE event = 'training_minute'), 2::bigint,
  'the old rate is retained beside the new one'); END $$;

-- A gym may override the default without disturbing it.
INSERT INTO point_rules (event, basis, points, gym_id, label)
  VALUES ('planned_session_completed', 'per_event', 40, 1, 'Darmstadt double-points month');
DO $$ BEGIN PERFORM must_equal(
  (SELECT points FROM point_rules WHERE gym_id = 1 AND event = 'planned_session_completed'),
  40::numeric, 'a gym can override an earn rate for itself alone'); END $$;

-- An award names the rule that produced it.
INSERT INTO points_ledger (member_id, delta, reason, rule_id, quantity, session_log_id)
  SELECT 1, 90, 'target zone minutes', id, 45, 1 FROM point_rules
   WHERE event = 'target_zone_minute' AND effective_to IS NULL;
DO $$ BEGIN PERFORM must_equal(
  (SELECT r.label FROM points_ledger l JOIN point_rules r ON r.id = l.rule_id WHERE l.delta = 90),
  'Minutes in your prescribed target zone pay double',
  'a ledger row can answer "why did I get 90 points"'); END $$;

-- --- The monthly status rank --------------------------------------------------
-- Distinct mechanic from the weekly cohort: this is the tier you HOLD.

INSERT INTO member_rank_months (member_id, period_month, points_earned, tier, change) VALUES
  (1, date_trunc('month', current_date - interval '2 months')::date, 1120, 'silver', 'advanced'),
  (1, date_trunc('month', current_date - interval '1 month')::date,   640, 'bronze', 'dropped'),
  (1, date_trunc('month', current_date)::date,                       210, 'bronze', 'held');
DO $$ BEGIN PERFORM must_equal(
  (SELECT tier::text FROM member_rank_months WHERE member_id = 1
    ORDER BY period_month DESC LIMIT 1), 'bronze',
  'a missed month drops one tier and the history keeps both'); END $$;
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM member_rank_months WHERE member_id = 1 AND points_earned >= target_points),
  1::bigint, 'the month that hit the 1,000-point target is identifiable'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO member_rank_months (member_id, period_month) VALUES (1, current_date + 3)$q$,
  'a rank month that is not the first of a month'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO member_rank_months (member_id, period_month, target_points)
     VALUES (1, date_trunc('month', current_date + interval '1 month')::date, 0)$q$,
  'a monthly target of zero points'); END $$;
DO $$ BEGIN PERFORM must_equal(
  (SELECT target_points FROM member_rank_months WHERE member_id = 1 LIMIT 1), 1000,
  'the target is stored per month, so scaling it later needs no migration'); END $$;

-- The two ranking mechanics coexist and do not collide.
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM member_rank_months WHERE member_id = 1) > 0
    AND (SELECT count(*) FROM league_memberships WHERE member_id = 1) > 0, true,
  'a member holds a monthly tier AND sits in a weekly cohort'); END $$;

-- --- Quest tiers --------------------------------------------------------------

INSERT INTO quests (gym_id, slug, tier, title, metric, measured_over, threshold, reward_points) VALUES
  (NULL, 'show-up-this-week', 'quick',  'Show up this week',       'sessions_completed',   'week',       3, 50),
  (NULL, 'monthly-target',    'medium', 'Hit your monthly target', 'points_earned',        'month',   1000, 200),
  (NULL, 'finish-the-block',  'long',   'Finish the 8-week block', 'plan_blocks_completed','plan_block', 1, 500);
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(DISTINCT tier) FROM quests WHERE active), 3::bigint,
  'quests carry a tier, so the engine can offer one of each'); END $$;

-- A rule is a promise to a member; the database checks the promise is sayable.
DO $$ BEGIN PERFORM must_equal(
  (SELECT metric::text||' '||comparison::text||' '||threshold::text||' per '||measured_over::text
     FROM quests WHERE slug = 'show-up-this-week'),
  'sessions_completed at_least 3 per week', 'a quest rule reads as a sentence, not a blob'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO quests (slug, tier, title, metric, measured_over, threshold)
     VALUES ('impossible', 'quick', 'Never completable', 'sessions_completed', 'week', 0)$q$,
  'a quest with a threshold of zero'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO quests (slug, tier, title, metric, measured_over, threshold)
     VALUES ('typo', 'quick', 'Typo in the metric', 'sesions_completed', 'week', 3)$q$,
  'a quest measuring something that does not exist'); END $$;

-- Emblems are typed the same way.
INSERT INTO emblems (slug, label, description, metric, measured_over, threshold) VALUES
  ('first-block', 'First Block', 'Finished an eight-week block.', 'plan_blocks_completed', 'all_time', 1),
  ('gold-streak', 'Gold Standard', 'Three months at Gold or above.', 'months_at_tier', 'all_time', 3);
INSERT INTO member_emblems (member_id, emblem_id, session_log_id)
  SELECT 1, id, 1 FROM emblems WHERE slug = 'first-block';
DO $$ BEGIN PERFORM must_equal(
  (SELECT e.label FROM member_emblems me JOIN emblems e ON e.id = me.emblem_id WHERE me.member_id = 1),
  'First Block', 'an earned emblem points at a rule the database understands'); END $$;

-- --- Language -----------------------------------------------------------------
-- Operator copy carries translations; product copy is keyed by slug.
INSERT INTO rewards (gym_id, kind, label, label_i18n, points_cost)
  VALUES (1, 'smoothie', 'Recovery smoothie', '{"de":"Regenerations-Smoothie","en":"Recovery smoothie"}', 120);
DO $$ BEGIN PERFORM must_equal(
  (SELECT label_i18n->>'de' FROM rewards WHERE points_cost = 120), 'Regenerations-Smoothie',
  'a gym can name its own reward in German'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO rewards (gym_id, kind, label, label_i18n, points_cost)
     VALUES (1, 'merch', 'Cap', '"just a string"', 50)$q$,
  'a translations column that is not an object'); END $$;
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM information_schema.columns
    WHERE table_name = 'focus_areas' AND column_name LIKE '%i18n%'), 0::bigint,
  'product copy has no translations column — the frontend owns it by slug'); END $$;

-- --- Auth ---------------------------------------------------------------------
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name IN ('password_hash', 'email_verified')),
  0::bigint, 'no credentials in this schema — Supabase Auth owns them'); END $$;
UPDATE accounts SET auth_user_id = '11111111-1111-1111-1111-111111111111' WHERE id = 1;
DO $$ BEGIN PERFORM must_reject(
  $q$UPDATE accounts SET auth_user_id = '11111111-1111-1111-1111-111111111111' WHERE id = 2$q$,
  'two accounts claiming one Supabase auth user'); END $$;

-- =============================================================================
-- 8. IDENTITY, THE FLOOR, HOUSEKEEPING
-- =============================================================================

INSERT INTO external_identities (account_id, provider, external_id) VALUES (1, 'sphery', '48221');
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO external_identities (account_id, provider, external_id) VALUES (2, 'sphery', '48221')$q$,
  'one Sphery user linked to two accounts'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO accounts (email) VALUES ('LENA@example.com')$q$,
  'the same email in different capitalisation'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO members (account_id, org_id, display_name) VALUES (1, 1, 'Lena again')$q$,
  'a member joining the same org twice'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO members (account_id, org_id, display_name, gender) VALUES (2, 1, 'X', 'unknown')$q$,
  'a gender outside the values HealthDataV2 uses'); END $$;

INSERT INTO members (id, account_id, org_id, home_gym_id, display_name) VALUES (3, 1, 2, 3, 'Lena at Rival');
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM members WHERE account_id = 1), 2::bigint,
  'one account can hold memberships in two orgs'); END $$;

-- Stations are instances, and the floor's equipment is derived from them.
DO $$ BEGIN PERFORM must_equal(
  (SELECT station_count FROM gym_equipment WHERE gym_id = 1 AND equipment_id = 1), 2::bigint,
  'the gym has two ExerCubes, counted from the stations that exist'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO stations (gym_id, equipment_id, name) VALUES (1, 1, 'ExerCube 1')$q$,
  'two stations with the same name on one floor'); END $$;
UPDATE stations SET retired_at = now() WHERE id = 2;
DO $$ BEGIN PERFORM must_equal(
  (SELECT station_count FROM gym_equipment WHERE gym_id = 1 AND equipment_id = 1), 1::bigint,
  'retiring a station updates the derived count with no second place to edit'); END $$;
DO $$ BEGIN PERFORM must_equal(
  (SELECT station_name FROM session_exercise_logs WHERE id = 1), 'ExerCube 1',
  'and history still says which station it was, by the name it had'); END $$;

DO $$ BEGIN PERFORM must_equal(
  (SELECT string_agg(st.name, ', ' ORDER BY st.name) FROM stations st
     JOIN equipment_stimuli es ON es.equipment_id = st.equipment_id
    WHERE st.gym_id = 1 AND es.stimulus = 'cardio_intensity' AND st.retired_at IS NULL),
  'ExerCube 1', 'a prescribed stimulus resolves to the live stations that deliver it'); END $$;

-- Catalogue ownership and taxonomy rules.
INSERT INTO exercises (code, name, family_id, level, primary_equipment_id, intensity_min, intensity_max,
                       complexity, impact, movement, training_modality, region_primary, owning_gym_id)
  VALUES ('EX001', 'House Squat', 1, 'foundation', 3, 2, 3, 2, 'low', 'squat', 'strength', 'legs', 1);
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO exercises (code, name, family_id, level, primary_equipment_id, intensity_min, intensity_max,
                            complexity, impact, movement, training_modality, region_primary)
     VALUES ('EX001', 'Duplicate', 1, 'foundation', 3, 2, 3, 2, 'low', 'squat', 'strength', 'legs')$q$,
  'a duplicate code inside the shared catalogue'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO exercises (code, name, family_id, level, primary_equipment_id, intensity_min, intensity_max,
                            complexity, impact, movement, training_modality, region_primary, region_secondary)
     VALUES ('EX900', 'Same region twice', 1, 'foundation', 3, 2, 3, 2, 'low', 'squat', 'strength', 'legs', 'legs')$q$,
  'the same body region listed twice on one exercise'); END $$;
DO $$ BEGIN PERFORM must_reject(
  $q$INSERT INTO exercises (code, name, family_id, level, primary_equipment_id, intensity_min, intensity_max,
                            complexity, impact, movement, training_modality, region_primary)
     VALUES ('EX901', 'Impossible span', 1, 'foundation', 3, 1, 5, 2, 'low', 'squat', 'strength', 'legs')$q$,
  'an intensity span wider than the taxonomy allows'); END $$;

DO $$ BEGIN PERFORM must_equal(
  (SELECT ladder::text FROM exercise_family_ladders WHERE slug = 'squat'),
  '{foundation,mastery}', 'the ladder is a view over the cards that exist'); END $$;
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM information_schema.columns
    WHERE table_name = 'exercise_families' AND column_name = 'ladder'),
  0::bigint, 'no stored ladder column to drift'); END $$;

DO $$
DECLARE before timestamptz; after timestamptz;
BEGIN
  SELECT updated_at INTO before FROM members WHERE id = 1;
  PERFORM pg_sleep(0.01);
  UPDATE members SET display_name = 'Lena M.' WHERE id = 1;
  SELECT updated_at INTO after FROM members WHERE id = 1;
  PERFORM must_equal(after > before, true, 'updated_at moves on UPDATE without the caller helping');
END $$;

-- =============================================================================
-- 9. ROW-LEVEL SECURITY
-- =============================================================================
-- Superusers bypass RLS, so this runs as an ordinary role — which is how the
-- API will connect.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_reader') THEN
    CREATE ROLE app_reader NOLOGIN;
  END IF;
END $$;
GRANT USAGE ON SCHEMA public TO app_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_reader;

SET ROLE app_reader;

SET app.org_id = '1';
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM members), 1::bigint, 'org 1 sees only its own membership'); END $$;
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM session_logs), 2::bigint, 'and only its own sessions'); END $$;
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM session_exercise_logs), 10::bigint,
  'child rows follow the parent, not a separate rule'); END $$;

SET app.org_id = '2';
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM members), 2::bigint,
  'org 2 sees a different set — including the same person under a second membership'); END $$;
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM session_logs), 0::bigint, 'and none of org 1 sessions'); END $$;
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM session_exercise_logs), 0::bigint,
  'nor its exercise logs — the leak a parent-only policy would have left'); END $$;
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM session_hr_samples), 0::bigint, 'nor its raw heart-rate series'); END $$;
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM member_restrictions), 0::bigint, 'health data does not leak across tenants'); END $$;

RESET app.org_id;
DO $$ BEGIN PERFORM must_equal(
  (SELECT count(*) FROM members), 0::bigint, 'an unset tenant sees nothing — the policies fail closed'); END $$;

RESET ROLE;

-- =============================================================================
DO $$ BEGIN RAISE NOTICE '--- every check passed ---'; END $$;
