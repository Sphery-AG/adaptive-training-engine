-- =============================================================================
-- Seed: the orgs, the gyms, and the floors they actually have.
--
--   psql -d planapp -f engine/db/schema.sql
--   psql -d planapp -f engine/db/seed_gyms.sql
--   python engine/db/load_catalogue.py <xlsx> <url>     (either order)
--
-- Without this the plan engine has no floor to build a plan onto.
--
-- The Sphere Darmstadt's 17 stations are the verified July 2026 floor from
-- the-sphere.fit. Station names match the CircleTraining names in the Sphery
-- export so the kiosk handoff lines up. The other gyms exist to prove the model
-- is not ExerCube-shaped: a hotel gym with no Sphery equipment at all, and a
-- HYROX box. Both generate valid plans.
--
-- Three orgs rather than one, because a hotel chain and a HYROX box are not
-- Sphery's customers-of-a-customer, they are separate tenants — and a seed that
-- puts everything under one org never exercises row-level security.
--
-- Idempotent: re-running updates names rather than duplicating rows. It shares
-- the `equipment` table with load_catalogue.py, and both upsert on slug, so the
-- two can run in either order.
-- =============================================================================

BEGIN;

INSERT INTO orgs (slug, name) VALUES
  ('sphery',      'Sphery AG'),
  ('grand-hotel', 'Grand Hotel Group'),
  ('hyrox-berlin','HYROX Box Berlin')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO gyms (org_id, slug, name, kiosk_id, location, timezone)
SELECT o.id, v.slug, v.name, v.kiosk_id, v.location, v.tz
  FROM (VALUES
    ('sphery',      'sphere-darmstadt', 'The Sphere Darmstadt', 'THESPHEREDARMSTADT', 'Darmstadt, DE', 'Europe/Berlin'),
    ('sphery',      'sphere-zuerich',   'The Sphere Zürich',    'THESPHEREZUERICH',   'Zürich, CH',    'Europe/Zurich'),
    ('grand-hotel', 'hotel-gym',        'Grand Hotel Fitness',  NULL,                 'Zürich, CH',    'Europe/Zurich'),
    ('hyrox-berlin','hyrox-box',        'HYROX Box Berlin',     NULL,                 'Berlin, DE',    'Europe/Berlin')
  ) AS v(org, slug, name, kiosk_id, location, tz)
  JOIN orgs o ON o.slug = v.org
ON CONFLICT (org_id, slug) DO UPDATE
  SET name = EXCLUDED.name, kiosk_id = EXCLUDED.kiosk_id, location = EXCLUDED.location;

-- --- Equipment kinds ---------------------------------------------------------
-- A KIND, not an instance. What a floor calls its two ExerCubes is a station
-- name; that they are both ExerCubes is this table.

INSERT INTO equipment (slug, name, is_sphery) VALUES
  ('exercube',       'ExerCube',             true),
  ('xr-fighter',     'XR Fighter',           true),
  ('icaros',         'ICAROS Guardian',      true),
  ('runner',         'Runner',               false),
  ('treadmill',      'Treadmill',            false),
  ('run',            'Run',                  false),
  ('ski-erg',        'Ski Erg',              false),
  ('row-erg',        'Row Erg',              false),
  ('bike',           'Bike',                 false),
  ('leg-press',      'Medical Leg Press',    false),
  ('free-weights',   'Free Weights & Racks', false),
  ('cable-pulls',    'Cable Pulls',          false),
  ('tidal-tank',     'Tidal Tanks',          false),
  ('sled-push',      'Sled Push',            false),
  ('sled-pull',      'Sled Pull',            false),
  ('wall-balls',     'Wall Balls',           false),
  ('sandbag-lunges', 'Sandbag Lunges',       false),
  ('farmers-carry',  'Farmers Carry',        false),
  ('burpees',        'Burpee Broad Jump',    false),
  ('dumbbells',      'Dumbbells',            false),
  ('mat',            'Yoga Mat',             false)
ON CONFLICT (slug) WHERE owning_gym_id IS NULL
DO UPDATE SET name = EXCLUDED.name, is_sphery = EXCLUDED.is_sphery;

-- What each kind can deliver. This is the resolver's index: a plan prescribes a
-- stimulus and this is what turns it into a machine.
INSERT INTO equipment_stimuli (equipment_id, stimulus)
SELECT e.id, v.stimulus::stimulus_type
  FROM (VALUES
    ('exercube','cardio_endurance'), ('exercube','cardio_intensity'),
    ('exercube','cognitive_motor'),  ('exercube','recovery'),
    ('xr-fighter','cardio_intensity'),('xr-fighter','cognitive_motor'),('xr-fighter','power_speed'),
    ('icaros','mobility_stability'), ('icaros','cognitive_motor'),
    ('runner','power_speed'),        ('runner','cardio_intensity'),   ('runner','cardio_endurance'),
    ('treadmill','cardio_endurance'),('treadmill','cardio_intensity'),('treadmill','power_speed'),
    ('run','cardio_endurance'),      ('run','cardio_intensity'),      ('run','power_speed'),
    ('ski-erg','cardio_endurance'),  ('ski-erg','cardio_intensity'),
    ('row-erg','cardio_endurance'),  ('row-erg','cardio_intensity'),
    ('bike','cardio_endurance'),     ('bike','cardio_intensity'),     ('bike','recovery'),
    ('leg-press','strength'),        ('leg-press','mobility_stability'),
    ('free-weights','strength'),     ('free-weights','power_speed'),
    ('cable-pulls','strength'),      ('cable-pulls','mobility_stability'),
    ('tidal-tank','strength'),       ('tidal-tank','mobility_stability'),
    ('sled-push','strength'),        ('sled-push','power_speed'),
    ('sled-pull','strength'),
    ('wall-balls','strength'),       ('wall-balls','cardio_intensity'),
    ('sandbag-lunges','strength'),
    ('farmers-carry','strength'),
    ('burpees','power_speed'),       ('burpees','cardio_intensity'),
    ('dumbbells','strength'),
    ('mat','mobility_stability'),    ('mat','recovery')
  ) AS v(slug, stimulus)
  JOIN equipment e ON e.slug = v.slug AND e.owning_gym_id IS NULL
ON CONFLICT (equipment_id, stimulus) DO NOTHING;

-- --- The floors --------------------------------------------------------------
-- One row per physical station. `position` is the order around the circuit.

INSERT INTO stations (gym_id, equipment_id, name, position)
SELECT g.id, e.id, v.station_name, v.position
  FROM (VALUES
    -- The Sphere Darmstadt: the real 17-station floor. Three are Sphery kit.
    ('sphere-darmstadt','exercube',      'ExerCube',              1),
    ('sphere-darmstadt','xr-fighter',    'XR Fighter',            2),
    ('sphere-darmstadt','icaros',        'ICAROS Guardian',       3),
    ('sphere-darmstadt','runner',        'Runner',                4),
    ('sphere-darmstadt','ski-erg',       'Ski Erg',               5),
    ('sphere-darmstadt','row-erg',       'Row Erg',               6),
    ('sphere-darmstadt','bike',          'Performance Bike',      7),
    ('sphere-darmstadt','leg-press',     'Medical Leg Press',     8),
    ('sphere-darmstadt','free-weights',  'Free Weights & Racks',  9),
    ('sphere-darmstadt','cable-pulls',   'Cable Pulls',          10),
    ('sphere-darmstadt','tidal-tank',    'Tidal Tanks',          11),
    ('sphere-darmstadt','sled-push',     'Sled Push',            12),
    ('sphere-darmstadt','sled-pull',     'Sled Pull',            13),
    ('sphere-darmstadt','wall-balls',    'Wall Balls',           14),
    ('sphere-darmstadt','sandbag-lunges','Sandbag Lunges',       15),
    ('sphere-darmstadt','farmers-carry', 'Farmers Carry',        16),
    ('sphere-darmstadt','burpees',       'Burpee Broad Jump',    17),

    -- No Sphery equipment at all: proves the plan model is equipment-agnostic.
    ('hotel-gym','treadmill', 'Treadmill',       1),
    ('hotel-gym','bike',      'Stationary Bike', 2),
    ('hotel-gym','dumbbells', 'Dumbbells',       3),
    ('hotel-gym','mat',       'Yoga Mat',        4),

    -- The Gold's / RSG story: a HYROX floor, no Sphery equipment.
    ('hyrox-box','run',           'Run',               1),
    ('hyrox-box','ski-erg',       'Ski Erg',           2),
    ('hyrox-box','row-erg',       'Row Erg',           3),
    ('hyrox-box','sled-push',     'Sled Push',         4),
    ('hyrox-box','sled-pull',     'Sled Pull',         5),
    ('hyrox-box','sandbag-lunges','Sandbag Lunges',    6),
    ('hyrox-box','wall-balls',    'Wall Balls',        7),
    ('hyrox-box','burpees',       'Burpee Broad Jump', 8),
    ('hyrox-box','farmers-carry', 'Farmers Carry',     9)
  ) AS v(gym_slug, equipment_slug, station_name, position)
  JOIN gyms g      ON g.slug = v.gym_slug
  JOIN equipment e ON e.slug = v.equipment_slug AND e.owning_gym_id IS NULL
ON CONFLICT (gym_id, name) DO UPDATE
  SET equipment_id = EXCLUDED.equipment_id, position = EXCLUDED.position, retired_at = NULL;

COMMIT;

-- Sanity, printed on every run:
SELECT g.slug AS gym, count(s.id) AS stations,
       count(*) FILTER (WHERE e.is_sphery) AS sphery_stations
  FROM gyms g
  LEFT JOIN stations s  ON s.gym_id = g.id AND s.retired_at IS NULL
  LEFT JOIN equipment e ON e.id = s.equipment_id
 GROUP BY g.slug ORDER BY g.slug;
