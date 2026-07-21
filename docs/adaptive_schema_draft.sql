-- Adaptive Training Plan Generator - draft schema for Michel review.
-- This file is intentionally not applied automatically.
-- It is a concrete proposal for local shadow tables or future backend migrations.

-- ---------------------------------------------------------------------------
-- 1. Questionnaire answers
-- ---------------------------------------------------------------------------
-- Purpose:
--   Stores intent and constraints that existing Sphery tables do not contain.
-- Example:
--   goal = 'build_strength_muscle'
--   focusJson = ["hypertrophy", "functional_strength"]
--   sessionsPerWeek = 3
--   sessionLengthMinutes = 45
--   availableDaysJson = ["mon", "wed", "fri"]
-- Truth:
--   Self-reported, not physiological. Still required because intent and
--   availability cannot be inferred safely from historical workouts.
CREATE TABLE IF NOT EXISTS AdaptiveQuestionnaireAnswers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL COMMENT 'FK to Users.id / Spieler ID.',
  goal VARCHAR(64) NOT NULL COMMENT 'Required primary goal from onboarding.',
  focusJson JSON NULL COMMENT 'Zero to two focus choices within the selected goal.',
  experienceLevel VARCHAR(32) NULL COMMENT 'Self-reported: beginner/intermediate/advanced.',
  activityLevel VARCHAR(32) NULL COMMENT 'Self-reported baseline activity level.',
  sessionsPerWeek INT NULL COMMENT 'Preferred weekly session count.',
  sessionLengthMinutes INT NULL COMMENT 'Preferred session duration.',
  availableDaysJson JSON NULL COMMENT 'Preferred weekdays, e.g. ["mon","wed","fri"].',
  currentTrainingMinutesPerWeek INT NULL COMMENT 'Current external + Sphery training load estimate from questionnaire.',
  currentIntensity INT NULL COMMENT 'Self-rated 1-5 intensity of current training.',
  otherActivitiesJson JSON NULL COMMENT 'External sports/activities, used to avoid overload.',
  gymId VARCHAR(128) NULL COMMENT 'Gym concept/equipment profile, e.g. sphere_darmstadt or hotel_basic.',
  injuriesJson JSON NULL COMMENT 'Branching injury details from health section.',
  medicalJson JSON NULL COMMENT 'Medical clearance/restriction details from health section.',
  hasMedicalFlags BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'True means automatic plan issue may be held for trainer review.',
  heightCmSnapshot INT NULL COMMENT 'Snapshot from questionnaire or HealthData at answer time.',
  weightKgSnapshot INT NULL COMMENT 'Snapshot from questionnaire or HealthData at answer time.',
  genderSnapshot VARCHAR(32) NULL COMMENT 'Optional snapshot; never required for generation.',
  questionnaireVersion VARCHAR(32) NOT NULL DEFAULT 'v1',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_adaptive_questionnaire_user (userId),
  CONSTRAINT fk_adaptive_questionnaire_user
    FOREIGN KEY (userId) REFERENCES Users(id)
) COMMENT='Adaptive plan intake answers: member intent, availability, and safety context.';

-- ---------------------------------------------------------------------------
-- 2. Fitness estimates
-- ---------------------------------------------------------------------------
-- Purpose:
--   Freezes the engine interpretation of the member at generation/adaptation time.
-- Example derivation:
--   estimatedMaxHr = observed max HR, falling back to Tanaka: 208 - 0.7 * age.
--   confidence rises with workout count and HR coverage.
-- Truth:
--   Estimate, not medical truth. Useful for directional personalization and
--   explainable plan changes.
CREATE TABLE IF NOT EXISTS AdaptiveFitnessEstimates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL COMMENT 'FK to Users.id / Spieler ID.',
  questionnaireAnswerId INT NULL COMMENT 'Nullable for estimates from history only.',
  source ENUM('questionnaire_only','session_history','adaptation') NOT NULL,
  sourceWorkoutCount INT NOT NULL DEFAULT 0,
  sourceSpeedCageCount INT NOT NULL DEFAULT 0,
  sourceCircleTrainingCount INT NOT NULL DEFAULT 0,
  sourceStartDate DATE NULL,
  sourceEndDate DATE NULL,
  estimatedRestingHr INT NULL COMMENT 'Derived from low sustained HR values or cold-start prior.',
  estimatedMaxHr INT NULL COMMENT 'Observed max HR with Tanaka fallback.',
  fitnessScore FLOAT NULL COMMENT 'Composite 0-100 fitness estimate.',
  recoveryScore FLOAT NULL COMMENT 'Derived from HR recovery where available.',
  enduranceScore FLOAT NULL COMMENT 'Derived from aerobic zone time, volume, and completion.',
  performanceScore FLOAT NULL COMMENT 'Derived from score/reps/distance relative to duration/difficulty.',
  cognitiveMotorScore FLOAT NULL COMMENT 'Derived from SpeedCage reaction/brainSpeed or ExerCube cognitive signals.',
  bodyAge FLOAT NULL COMMENT 'Motivational metric, not clinical.',
  brainAge FLOAT NULL COMMENT 'Motivational metric, not clinical.',
  confidence FLOAT NOT NULL DEFAULT 0 COMMENT '0-1 confidence in estimate.',
  featuresJson JSON NULL COMMENT 'Exact derived model inputs for audit/explanation.',
  modelVersion VARCHAR(64) NOT NULL COMMENT 'Estimator/rules version.',
  basedOnThroughWorkoutId INT NULL COMMENT 'Latest Workouts.id used.',
  basedOnThroughSpeedCageId INT NULL COMMENT 'Latest SpeedCages.id used.',
  basedOnThroughCircleTrainingParticipantId INT NULL COMMENT 'Latest CircleTrainingParticipants.id used.',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_adaptive_estimate_user_created (userId, createdAt),
  INDEX idx_adaptive_estimate_questionnaire (questionnaireAnswerId),
  CONSTRAINT fk_adaptive_estimate_user
    FOREIGN KEY (userId) REFERENCES Users(id),
  CONSTRAINT fk_adaptive_estimate_questionnaire
    FOREIGN KEY (questionnaireAnswerId) REFERENCES AdaptiveQuestionnaireAnswers(id)
) COMMENT='Frozen adaptive fitness estimate used to generate or adapt plans.';

-- ---------------------------------------------------------------------------
-- 3. Plans
-- ---------------------------------------------------------------------------
-- Purpose:
--   Active/superseded generated plan parent object.
-- Design:
--   One plan points to one questionnaire snapshot and one fitness estimate.
--   This makes the generated recommendation auditable.
CREATE TABLE IF NOT EXISTS AdaptiveTrainingPlans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL COMMENT 'FK to Users.id / Spieler ID.',
  questionnaireAnswerId INT NOT NULL,
  fitnessEstimateId INT NOT NULL,
  status ENUM('draft','active','completed','superseded','held_for_review') NOT NULL DEFAULT 'draft',
  goal VARCHAR(64) NOT NULL COMMENT 'Copied from questionnaire for querying.',
  startDate DATE NULL,
  endDate DATE NULL,
  cycleWeeks INT NOT NULL DEFAULT 4 COMMENT 'Default 4-week Sphere plan cycle.',
  sessionsPerWeek INT NULL,
  generatorVersion VARCHAR(64) NOT NULL COMMENT 'Plan generator version.',
  configFormat VARCHAR(64) NOT NULL DEFAULT 'CreateTrainingRequest',
  rationale TEXT NULL COMMENT 'Plain-language reason for this plan.',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_adaptive_plan_user_status (userId, status),
  INDEX idx_adaptive_plan_questionnaire (questionnaireAnswerId),
  INDEX idx_adaptive_plan_estimate (fitnessEstimateId),
  CONSTRAINT fk_adaptive_plan_user
    FOREIGN KEY (userId) REFERENCES Users(id),
  CONSTRAINT fk_adaptive_plan_questionnaire
    FOREIGN KEY (questionnaireAnswerId) REFERENCES AdaptiveQuestionnaireAnswers(id),
  CONSTRAINT fk_adaptive_plan_estimate
    FOREIGN KEY (fitnessEstimateId) REFERENCES AdaptiveFitnessEstimates(id)
) COMMENT='Generated adaptive training plan parent.';

-- ---------------------------------------------------------------------------
-- 4. Plan sessions
-- ---------------------------------------------------------------------------
-- Purpose:
--   Equipment-agnostic planned session plus resolved kiosk payload.
-- Important:
--   primaryStimulusType/stimulusMixJson are the adaptive truth.
--   createTrainingRequestJson is the Nexus kiosk runtime truth.
CREATE TABLE IF NOT EXISTS AdaptiveTrainingPlanSessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  planId INT NOT NULL,
  weekIndex INT NOT NULL COMMENT '1-based week in cycle.',
  sessionIndex INT NOT NULL COMMENT '1-based session within week.',
  stimulusMixJson JSON NULL COMMENT 'Example: {"strength":0.65,"cardio_intensity":0.25}.',
  primaryStimulusType VARCHAR(64) NOT NULL COMMENT 'Primary training stimulus, equipment-agnostic.',
  intensityZone INT NULL COMMENT 'Target HR zone 1-5.',
  targetHrMin INT NULL COMMENT 'Resolved from estimate at generation time.',
  targetHrMax INT NULL COMMENT 'Resolved from estimate at generation time.',
  hrTarget INT NULL COMMENT 'Optional midpoint target bpm if API needs one scalar.',
  durationMinutes INT NULL,
  difficulty INT NULL COMMENT 'Internal 1-10 difficulty scale.',
  progressionRule TEXT NULL COMMENT 'Rule for next adjustment.',
  scheduledSlot VARCHAR(64) NULL COMMENT 'Example: freies_training.',
  resolvedEquipmentType VARCHAR(128) NULL COMMENT 'Example: sphere_circle, treadmill, dumbbells.',
  resolvedModeKey VARCHAR(128) NULL COMMENT 'Gym/equipment-specific resolver key.',
  resolvedExerciseName VARCHAR(255) NULL COMMENT 'Name sent to kiosk exercise payload.',
  resolvedTarget VARCHAR(255) NULL COMMENT 'Work target sent to kiosk, e.g. 50x or 8min.',
  circleTrainingId INT NULL COMMENT 'Set if/when this session creates a real CircleTraining.',
  createdExerciseLogIdsJson JSON NULL COMMENT 'ExerciseLog ids returned by TrainingResponse after create.',
  createTrainingRequestJson JSON NULL COMMENT 'Exact kiosk payload preview/snapshot.',
  status ENUM('planned','done','skipped') NOT NULL DEFAULT 'planned',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_adaptive_session_plan (planId, weekIndex, sessionIndex),
  INDEX idx_adaptive_session_circle (circleTrainingId),
  CONSTRAINT fk_adaptive_session_plan
    FOREIGN KEY (planId) REFERENCES AdaptiveTrainingPlans(id),
  CONSTRAINT fk_adaptive_session_circle
    FOREIGN KEY (circleTrainingId) REFERENCES CircleTrainings(id)
) COMMENT='Planned adaptive session and optional Nexus CreateTrainingRequest output.';

-- ---------------------------------------------------------------------------
-- 5. Adaptation events
-- ---------------------------------------------------------------------------
-- Purpose:
--   Audit trail for plan changes. Without this, adaptation looks random.
CREATE TABLE IF NOT EXISTS AdaptiveTrainingPlanAdjustments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  planId INT NOT NULL COMMENT 'Plan being evaluated/changed.',
  userId INT NULL COMMENT 'Duplicated for easier querying.',
  previousPlanId INT NULL,
  newPlanId INT NULL,
  triggerType ENUM('logs','missed_sessions','re_questionnaire','manual') NOT NULL,
  basedOnLogsJson JSON NULL COMMENT 'Source log ids used by the adaptation decision.',
  triggerWorkoutId INT NULL,
  triggerSpeedCageId INT NULL,
  triggerCircleTrainingParticipantId INT NULL,
  previousFitnessEstimateId INT NULL,
  newFitnessEstimateId INT NULL,
  adjustmentType ENUM('increase_load','maintain','reduce_load','recover','regenerate') NOT NULL,
  changeSummary TEXT NULL COMMENT 'What changed in plain language.',
  rationale TEXT NULL COMMENT 'Why it changed in plain language.',
  signalsJson JSON NULL COMMENT 'Concrete signals that caused the rule to fire.',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_adaptive_adjustment_plan (planId, createdAt),
  INDEX idx_adaptive_adjustment_user (userId, createdAt),
  CONSTRAINT fk_adaptive_adjustment_plan
    FOREIGN KEY (planId) REFERENCES AdaptiveTrainingPlans(id),
  CONSTRAINT fk_adaptive_adjustment_user
    FOREIGN KEY (userId) REFERENCES Users(id),
  CONSTRAINT fk_adaptive_adjustment_prev_plan
    FOREIGN KEY (previousPlanId) REFERENCES AdaptiveTrainingPlans(id),
  CONSTRAINT fk_adaptive_adjustment_new_plan
    FOREIGN KEY (newPlanId) REFERENCES AdaptiveTrainingPlans(id),
  CONSTRAINT fk_adaptive_adjustment_prev_estimate
    FOREIGN KEY (previousFitnessEstimateId) REFERENCES AdaptiveFitnessEstimates(id),
  CONSTRAINT fk_adaptive_adjustment_new_estimate
    FOREIGN KEY (newFitnessEstimateId) REFERENCES AdaptiveFitnessEstimates(id)
) COMMENT='Explainable audit log for adaptive plan changes.';

-- ---------------------------------------------------------------------------
-- Optional but important: circle HR-zone additions
-- ---------------------------------------------------------------------------
-- These align circle training with SpeedCage-style HR-zone data.
-- They are vital for measuring physical strain beyond reps, duration, distance,
-- score, and average HR.
--
-- ALTER TABLE CircleTrainingExerciseLogs
--   ADD COLUMN hrMin INT NULL COMMENT 'Minimum HR during station.',
--   ADD COLUMN hrMax INT NULL COMMENT 'Maximum HR during station.',
--   ADD COLUMN zone1DurationSeconds INT NULL COMMENT 'Time in HR zone 1 during station.',
--   ADD COLUMN zone2DurationSeconds INT NULL COMMENT 'Time in HR zone 2 during station.',
--   ADD COLUMN zone3DurationSeconds INT NULL COMMENT 'Time in HR zone 3 during station.',
--   ADD COLUMN zone4DurationSeconds INT NULL COMMENT 'Time in HR zone 4 during station.',
--   ADD COLUMN zone5DurationSeconds INT NULL COMMENT 'Time in HR zone 5 during station.';
--
-- ALTER TABLE CircleTrainingParticipants
--   ADD COLUMN hrMin INT NULL COMMENT 'Minimum HR across participant session.',
--   ADD COLUMN hrMax INT NULL COMMENT 'Maximum HR across participant session.',
--   ADD COLUMN zone1DurationSeconds INT NULL COMMENT 'Participant rollup time in HR zone 1.',
--   ADD COLUMN zone2DurationSeconds INT NULL COMMENT 'Participant rollup time in HR zone 2.',
--   ADD COLUMN zone3DurationSeconds INT NULL COMMENT 'Participant rollup time in HR zone 3.',
--   ADD COLUMN zone4DurationSeconds INT NULL COMMENT 'Participant rollup time in HR zone 4.',
--   ADD COLUMN zone5DurationSeconds INT NULL COMMENT 'Participant rollup time in HR zone 5.';
