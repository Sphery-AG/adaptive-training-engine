-- Seed: the gyms and their floors.
--
-- Run after sphery_additions.sql. Without this the new Gyms and GymStations
-- tables are empty and the plan engine has no floor to build a plan onto.
--
-- Darmstadt's 17 stations are the verified July 2026 floor from the-sphere.fit.
-- Station names match the CircleTraining names in the export so the kiosk
-- handoff lines up. The other two gyms exist to prove the model is not
-- ExerCube-shaped: a bare hotel gym with no Sphery equipment at all, and a
-- HYROX box. Both generate valid plans today.
--
-- Idempotent: re-running updates names rather than duplicating rows.

INSERT INTO `Gyms` (`name`, `slug`, `kioskId`, `location`, `createdAt`, `updatedAt`) VALUES
  ('The Sphere Darmstadt', 'sphere-darmstadt', 'THESPHEREDARMSTADT', 'Darmstadt, DE', NOW(), NOW()),
  ('The Sphere Zürich',    'sphere-zuerich',   'THESPHEREZUERICH',   'Zürich, CH',    NOW(), NOW()),
  ('Grand Hotel Fitness',  'hotel-gym',        NULL,                 'Zürich, CH',    NOW(), NOW()),
  ('HYROX Box Berlin',     'hyrox-box',        NULL,                 'Berlin, DE',    NOW(), NOW())
  ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `kioskId` = VALUES(`kioskId`), `updatedAt` = NOW();

SET @darmstadt := (SELECT `id` FROM `Gyms` WHERE `slug` = 'sphere-darmstadt');
SET @hotel     := (SELECT `id` FROM `Gyms` WHERE `slug` = 'hotel-gym');
SET @hyrox     := (SELECT `id` FROM `Gyms` WHERE `slug` = 'hyrox-box');

-- The Sphere Darmstadt: the real 17-station floor. Three are Sphery equipment.
INSERT INTO `GymStations` (`gymId`, `slug`, `name`, `isSpheryEquipment`, `stimulusTypes`, `createdAt`, `updatedAt`) VALUES
  (@darmstadt, 'exercube',       'ExerCube',             1, '["cardio_endurance","cardio_intensity","cognitive_motor","recovery"]', NOW(), NOW()),
  (@darmstadt, 'xr-fighter',     'XR Fighter',           1, '["cardio_intensity","cognitive_motor","power_speed"]',                 NOW(), NOW()),
  (@darmstadt, 'icaros',         'ICAROS Guardian',      1, '["mobility_stability","cognitive_motor"]',                             NOW(), NOW()),
  (@darmstadt, 'runner',         'Runner',               0, '["power_speed","cardio_intensity","cardio_endurance"]',                NOW(), NOW()),
  (@darmstadt, 'ski-erg',        'Ski Erg',              0, '["cardio_endurance","cardio_intensity"]',                              NOW(), NOW()),
  (@darmstadt, 'row-erg',        'Row Erg',              0, '["cardio_endurance","cardio_intensity"]',                              NOW(), NOW()),
  (@darmstadt, 'bike',           'Performance Bike',     0, '["cardio_endurance","cardio_intensity","recovery"]',                   NOW(), NOW()),
  (@darmstadt, 'leg-press',      'Medical Leg Press',    0, '["strength","mobility_stability"]',                                    NOW(), NOW()),
  (@darmstadt, 'free-weights',   'Free Weights & Racks', 0, '["strength","power_speed"]',                                           NOW(), NOW()),
  (@darmstadt, 'cable-pulls',    'Cable Pulls',          0, '["strength","mobility_stability"]',                                    NOW(), NOW()),
  (@darmstadt, 'tidal-tank',     'Tidal Tanks',          0, '["strength","mobility_stability"]',                                    NOW(), NOW()),
  (@darmstadt, 'sled-push',      'Sled Push',            0, '["strength","power_speed"]',                                           NOW(), NOW()),
  (@darmstadt, 'sled-pull',      'Sled Pull',            0, '["strength"]',                                                         NOW(), NOW()),
  (@darmstadt, 'wall-balls',     'Wall Balls',           0, '["strength","cardio_intensity"]',                                      NOW(), NOW()),
  (@darmstadt, 'sandbag-lunges', 'Sandbag Lunges',       0, '["strength"]',                                                         NOW(), NOW()),
  (@darmstadt, 'farmers-carry',  'Farmers Carry',        0, '["strength"]',                                                         NOW(), NOW()),
  (@darmstadt, 'burpees',        'Burpee Broad Jump',    0, '["power_speed","cardio_intensity"]',                                   NOW(), NOW())
  ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `stimulusTypes` = VALUES(`stimulusTypes`), `updatedAt` = NOW();

-- No Sphery equipment at all: proves the plan model is equipment-agnostic.
INSERT INTO `GymStations` (`gymId`, `slug`, `name`, `isSpheryEquipment`, `stimulusTypes`, `createdAt`, `updatedAt`) VALUES
  (@hotel, 'treadmill', 'Treadmill',       0, '["cardio_endurance","cardio_intensity","power_speed"]', NOW(), NOW()),
  (@hotel, 'bike',      'Stationary Bike', 0, '["cardio_endurance","cardio_intensity","recovery"]',    NOW(), NOW()),
  (@hotel, 'dumbbells', 'Dumbbells',       0, '["strength"]',                                         NOW(), NOW()),
  (@hotel, 'mat',       'Yoga Mat',        0, '["mobility_stability","recovery"]',                    NOW(), NOW())
  ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `stimulusTypes` = VALUES(`stimulusTypes`), `updatedAt` = NOW();

-- The Gold's / RSG story: a HYROX floor, no Sphery equipment.
INSERT INTO `GymStations` (`gymId`, `slug`, `name`, `isSpheryEquipment`, `stimulusTypes`, `createdAt`, `updatedAt`) VALUES
  (@hyrox, 'run',        'Run',               0, '["cardio_endurance","cardio_intensity","power_speed"]', NOW(), NOW()),
  (@hyrox, 'ski-erg',    'Ski Erg',           0, '["cardio_endurance","cardio_intensity"]',              NOW(), NOW()),
  (@hyrox, 'row-erg',    'Row Erg',           0, '["cardio_endurance","cardio_intensity"]',              NOW(), NOW()),
  (@hyrox, 'sled-push',  'Sled Push',         0, '["strength","power_speed"]',                           NOW(), NOW()),
  (@hyrox, 'sled-pull',  'Sled Pull',         0, '["strength"]',                                         NOW(), NOW()),
  (@hyrox, 'sandbag',    'Sandbag Lunges',    0, '["strength"]',                                         NOW(), NOW()),
  (@hyrox, 'wall-balls', 'Wall Balls',        0, '["strength","cardio_intensity"]',                      NOW(), NOW()),
  (@hyrox, 'burpees',    'Burpee Broad Jump', 0, '["power_speed","cardio_intensity"]',                   NOW(), NOW()),
  (@hyrox, 'farmers',    'Farmers Carry',     0, '["strength"]',                                         NOW(), NOW())
  ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `stimulusTypes` = VALUES(`stimulusTypes`), `updatedAt` = NOW();
