-- Additions to the Sphery database to support the adaptive training plan app.
--
-- Everything lives in one database: Sphery's. The plan app does not host its
-- own store. These are the tables and columns Michel would add, written in the
-- conventions already used in `spherych_devapp` (PascalCase plural tables,
-- camelCase columns, createdAt/updatedAt on every row) so they drop into the
-- existing Sequelize migration flow.
--
-- Nothing here changes an existing column or an existing behaviour. Every new
-- column is nullable. Every new table is additive. No current client breaks.
--
-- Checked against the July 2026 export, so "does not exist today" means it
-- genuinely is not there.

-- ===========================================================================
-- PART 1 — New tables
-- ===========================================================================

-- A physical location. Today a gym exists only as free text in three
-- unconnected places: Users.roleLocation, LicenseKeys.location, and
-- CircleTrainings.kioskId. Those are already inconsistent in the export
-- ("SPHERY-TESTENV1" and "SPHERY_TESTENV1" are the same kiosk), so there is no
-- reliable way to ask "which gym is this member training at".
--
-- A plan is built onto one gym's actual floor, so this is the first thing the
-- plan app needs and it is useful well beyond the plan app.
CREATE TABLE `Gyms` (
  `id`        INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name`      VARCHAR(120) NOT NULL,
  `slug`      VARCHAR(120) NOT NULL,
  `kioskId`   VARCHAR(80) NULL COMMENT 'matches CircleTrainings.kioskId',
  `location`  VARCHAR(120) NULL,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  UNIQUE KEY `uq_Gyms_slug` (`slug`),
  KEY `ix_Gyms_kioskId` (`kioskId`)
) ENGINE=InnoDB;

-- The equipment on that floor. `stimulusTypes` is the vocabulary the plan
-- engine reasons in (cardio_endurance, strength, cognitive_motor, ...), which
-- is what lets one plan model serve a Sphere location, a bare hotel gym, and a
-- HYROX box without any of them being special-cased in code.
--
-- Adding a gym becomes an INSERT rather than a release.
CREATE TABLE `GymStations` (
  `id`                INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `gymId`             INT NOT NULL,
  `slug`              VARCHAR(80) NOT NULL,
  `name`              VARCHAR(120) NOT NULL,
  `isSpheryEquipment` TINYINT(1) NOT NULL DEFAULT 0,
  `stimulusTypes`     JSON NOT NULL,
  `createdAt`         DATETIME NOT NULL,
  `updatedAt`         DATETIME NOT NULL,
  UNIQUE KEY `uq_GymStations_gym_slug` (`gymId`, `slug`),
  CONSTRAINT `fk_GymStations_gym` FOREIGN KEY (`gymId`) REFERENCES `Gyms` (`id`)
) ENGINE=InnoDB;

-- One generated training block for one member.
--
-- `weeks` and `resolved` are JSON documents: read whole, written whole, and
-- versioned by this row. Normalising them into a sessions table buys nothing
-- until something needs to query across sessions, and costs a join on every
-- read today. `fitnessEstimate` is the snapshot the plan was built from, kept
-- so an old plan can always be explained by the numbers that produced it.
CREATE TABLE `TrainingPlans` (
  `id`              INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId`          INT NOT NULL,
  `gymId`           INT NOT NULL,
  `goal`            VARCHAR(60) NOT NULL,
  `status`          ENUM('active','superseded','completed') NOT NULL DEFAULT 'active',
  `rationale`       TEXT NOT NULL,
  `fitnessEstimate` JSON NOT NULL,
  `weeks`           JSON NOT NULL,
  `resolved`        JSON NOT NULL,
  `createdAt`       DATETIME NOT NULL,
  `updatedAt`       DATETIME NOT NULL,
  KEY `ix_TrainingPlans_user_status` (`userId`, `status`),
  CONSTRAINT `fk_TrainingPlans_user` FOREIGN KEY (`userId`) REFERENCES `Users` (`id`),
  CONSTRAINT `fk_TrainingPlans_gym`  FOREIGN KEY (`gymId`)  REFERENCES `Gyms` (`id`)
) ENGINE=InnoDB;
-- Note: a member may hold more than one active plan at a time (for example a
-- strength block and an event block). Nothing above prevents that.

-- Every adaptive change, with the sentence the member was shown.
--
-- This is a product feature, not a log: "why did my plan change" has to be
-- answerable months later, by the member and by a coach.
CREATE TABLE `TrainingPlanChanges` (
  `id`             INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `trainingPlanId` INT NOT NULL,
  `triggeredBy`    VARCHAR(120) NOT NULL COMMENT 'the plan session that caused it',
  `changes`        JSON NOT NULL,
  `rationale`      TEXT NOT NULL,
  `createdAt`      DATETIME NOT NULL,
  `updatedAt`      DATETIME NOT NULL,
  KEY `ix_TrainingPlanChanges_plan` (`trainingPlanId`, `createdAt`),
  CONSTRAINT `fk_TrainingPlanChanges_plan`
    FOREIGN KEY (`trainingPlanId`) REFERENCES `TrainingPlans` (`id`)
) ENGINE=InnoDB;

-- The intake answers a plan was generated from, versioned so a change to the
-- questionnaire never invalidates the plans built from an older version.
CREATE TABLE `TrainingPlanQuestionnaires` (
  `id`        INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId`    INT NOT NULL,
  `answers`   JSON NOT NULL,
  `version`   VARCHAR(20) NOT NULL,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  KEY `ix_TrainingPlanQuestionnaires_user` (`userId`, `createdAt`),
  CONSTRAINT `fk_TrainingPlanQuestionnaires_user`
    FOREIGN KEY (`userId`) REFERENCES `Users` (`id`)
) ENGINE=InnoDB;

-- ===========================================================================
-- PART 2 — Columns on existing tables
-- ===========================================================================

-- 1. Link a run back to the plan session that prescribed it.
--
-- Without this the adaptive loop cannot close: a circle training comes back
-- with results and nothing says which prescription it fulfilled. Because the
-- plan now lives in the same database, this is a real foreign key rather than
-- a loose reference.
ALTER TABLE `CircleTrainings`
  ADD COLUMN `trainingPlanId` INT NULL AFTER `setupByUserId`,
  ADD COLUMN `planSessionRef` VARCHAR(80) NULL COMMENT 'which session inside the plan, e.g. sess-w3-2' AFTER `trainingPlanId`,
  ADD KEY `ix_CircleTrainings_plan` (`trainingPlanId`),
  ADD CONSTRAINT `fk_CircleTrainings_plan`
    FOREIGN KEY (`trainingPlanId`) REFERENCES `TrainingPlans` (`id`);

-- 2. An intensity target per exercise.
--
-- `target` carries the work ("1000m", "50x") but never the effort, so a
-- prescribed zone is lost the moment a session reaches the kiosk. Precedent
-- already exists in this schema: RaceConfigs.hrTarget does exactly this for
-- ExerCube races. This extends the same idea to circle trainings.
ALTER TABLE `CircleTrainingExercises`
  ADD COLUMN `hrTargetZone` TINYINT NULL COMMENT '1-5 target heart-rate zone for this station' AFTER `target`,
  ADD COLUMN `sets`         TINYINT NULL COMMENT 'optional; the model has no set concept today' AFTER `hrTargetZone`;

-- 3. Real intensity detail per station.
--
-- hrAverage alone cannot tell whether a member held the prescribed zone or
-- spiked and recovered. Workouts already carries timeInTier1-5, so the concept
-- exists in this schema; it simply does not reach circle trainings.
ALTER TABLE `CircleTrainingExerciseLogs`
  ADD COLUMN `hrMax`           INT NULL AFTER `hrAverage`,
  ADD COLUMN `timeInTier1` FLOAT NULL AFTER `hrMax`,
  ADD COLUMN `timeInTier2` FLOAT NULL AFTER `timeInTier1`,
  ADD COLUMN `timeInTier3` FLOAT NULL AFTER `timeInTier2`,
  ADD COLUMN `timeInTier4` FLOAT NULL AFTER `timeInTier3`,
  ADD COLUMN `timeInTier5` FLOAT NULL AFTER `timeInTier4`;

-- 4. Session-level max HR, and the member's own rating.
--
-- hrMax feeds the max-HR estimate that every zone boundary in the app derives
-- from; Workouts has it, circle trainings do not. perceivedEffort is a 1-5
-- rating where 1 means too easy (the plan hardens), 2-4 holds, and 5 means too
-- hard (the plan eases). It is the strongest signal available from the ~90% of
-- sessions with no heart-rate belt.
ALTER TABLE `CircleTrainingParticipants`
  ADD COLUMN `hrMax`           INT NULL AFTER `hrAverage`,
  ADD COLUMN `perceivedEffort` TINYINT NULL COMMENT '1 = too easy, 5 = too hard' AFTER `hrMax`;
