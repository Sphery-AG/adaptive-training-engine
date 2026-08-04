/**
 * Training plan data model.
 *
 * Stimulus-based and equipment-agnostic by design: a session prescribes a
 * training stimulus, intensity, and duration — never a piece of equipment.
 * Equipment is resolved later by matching `stimulusType` against an
 * `EquipmentProfile` (ExerCube is the only profile implemented in v1).
 *
 * Every type here crosses the HTTP boundary to the Python engine as JSON:
 * string-literal unions (not TS enums) map 1:1 to Pydantic `Literal`s, and
 * dates are ISO 8601 strings, never `Date`.
 */

// ---------------------------------------------------------------------------
// Enums — const arrays exported so UI code can iterate the options
// ---------------------------------------------------------------------------

export const STIMULUS_TYPES = [
  /** Sustained aerobic work, zones 2–3. */
  'cardio_endurance',
  /** Threshold / interval work, zones 4–5. */
  'cardio_intensity',
  /** Dual-task load: reaction, precision, decisions under physical load. */
  'cognitive_motor',
  /** Active recovery, zones 1–2. */
  'recovery',
  /** Resistance / hypertrophy work — sleds, sandbags, weights, wall balls. */
  'strength',
  /** Mobility, balance, joint stability — the "move pain-free" stimulus. */
  'mobility_stability',
  /** Explosive power and speed — jumps, sprints, agility. */
  'power_speed',
] as const;
export type StimulusType = (typeof STIMULUS_TYPES)[number];

/**
 * How the equipment adapts during the session. Mirrors
 * `RaceConfigs.adaptivityType` in the Sphery production schema, where it is
 * always present.
 */
export const ADAPTIVITY_TYPES = [
  'performance',
  'hrTracking',
  'cognitionOnly',
] as const;
export type AdaptivityType = (typeof ADAPTIVITY_TYPES)[number];

/**
 * The eight goals from the team's questionnaire funnel (whiteboard "Ebene 1",
 * emotional motivation — exactly one is chosen). Slugs are stable; display
 * labels live in lib/labels.ts.
 */
export const TRAINING_GOALS = [
  'lose_weight_burn_fat',
  'build_strength_muscle',
  'improve_fitness_endurance',
  'move_pain_free',
  'boost_health_longevity',
  'improve_sports_performance',
  'prepare_for_event',
  'train_body_mind',
] as const;
export type TrainingGoal = (typeof TRAINING_GOALS)[number];

/** Self-rated activity level from the intake questionnaire. */
export const ACTIVITY_LEVELS = [
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

// ---------------------------------------------------------------------------
// Intensity
// ---------------------------------------------------------------------------

/** Heart-rate zone, matching Sphery's timeInTier1–5 workout columns. */
export type HrZone = 1 | 2 | 3 | 4 | 5;

export interface HrTarget {
  /** Canonical, user-independent intensity prescription. */
  zone: HrZone;
  /**
   * Absolute range resolved from the user's *estimated* hrMax at generation
   * time (hrMax is never written in production data — the engine estimates
   * it). Optional because the zone is the source of truth: bpm can be
   * re-resolved as the estimate sharpens with new workouts.
   */
  bpm?: { min: number; max: number };
}

// ---------------------------------------------------------------------------
// Fitness estimate
// ---------------------------------------------------------------------------

/**
 * Snapshot of the fitness estimate a plan was generated from. Embedded whole
 * (not just a score) so adaptive updates can diff against it and explain
 * changes: "HR recovery improved, so intensity increased."
 */
export interface FitnessEstimate {
  /** Cold start (questionnaire only) vs. data-driven. */
  source: 'questionnaire_only' | 'session_history';
  /** Composite fitness score, 0–100. */
  fitnessScore: number;
  /** Estimated resting HR in bpm (lowest sustained HrValues readings). */
  estimatedHrRest: number;
  /** Estimated max HR in bpm (Tanaka prior, refined by observed maxima). */
  estimatedHrMax: number;
  /** Confidence in the estimate, 0–1. Low for cold start. */
  confidence: number;
  /** Number of workouts the estimate is based on; 0 for cold start. */
  workoutsAnalyzed: number;
  /** ISO 8601. */
  estimatedAt: string;
}

// ---------------------------------------------------------------------------
// Plan hierarchy: Plan → PlannedWeek → PlannedSession
// ---------------------------------------------------------------------------

/**
 * One prescribed session. Equipment-agnostic — resolved to concrete
 * equipment (e.g. an ExerCube game mode) via `EquipmentProfile` at
 * display/export time.
 *
 * Translation to Sphery's RaceConfig format:
 *
 *   difficulty (1–10) → RaceConfig.difficulty (0–3), via a single scaling
 *                       function at export. Empirically (July 2026
 *                       production export) RaceConfig.difficulty is a
 *                       4-level enum 0–3 (2 dominant, 3 rare), with -1 as a
 *                       sentinel meaning "no fixed difficulty / fully auto".
 *   adaptivityType    → RaceConfig.adaptivityType (pass-through).
 *                       CONSTRAINT: hrTracking rows never use -1 — an
 *                       HR-driven session must export a fixed difficulty
 *                       0–3 (only 0–2 observed in production). Sessions
 *                       prescribing an HR zone export as hrTracking + fixed
 *                       difficulty + hrTarget; skill/score-focused sessions
 *                       may export as performance with difficulty -1 (auto).
 *   hrTarget.bpm      → RaceConfig.hrTarget (midpoint of the range).
 *   durationMinutes   → RaceConfig.duration.
 *   startSpeed        → derived at export time from difficulty + fitness
 *                       estimate; deliberately NOT stored here — it is
 *                       ExerCube-race-specific and would break
 *                       equipment-agnosticism.
 */
export interface PlannedSession {
  id: string;
  /**
   * Position within the week, 1-based. No fixed weekday in v1 — the
   * questionnaire doesn't capture weekday availability.
   */
  order: number;
  stimulusType: StimulusType;
  adaptivityType: AdaptivityType;
  hrTarget: HrTarget;
  durationMinutes: number;
  /**
   * Internal 1–10 integer scale, deliberately finer-grained than
   * RaceConfig's 0–3 so progression logic can make small week-over-week
   * adjustments that only sometimes cross an export-level boundary.
   */
  difficulty: number;
  /** Why this session looks the way it does, in plain language. */
  rationale: string;
}

export interface PlannedWeek {
  /**
   * 1-based and relative to plan start — plans carry no calendar dates;
   * scheduling is out of scope for v1.
   */
  weekNumber: number;
  /** Optional theme, e.g. "base building", "deload". */
  focus?: string;
  sessions: PlannedSession[];
}

export interface Plan {
  id: string;
  userId: string;
  goal: TrainingGoal;
  /** ISO 8601. */
  createdAt: string;
  /** The estimate this plan was generated from — frozen at generation time. */
  fitnessEstimate: FitnessEstimate;
  /** Why the plan looks the way it does, in plain language. */
  rationale: string;
  weeks: PlannedWeek[];
}

// ---------------------------------------------------------------------------
// Equipment resolution
// ---------------------------------------------------------------------------

/**
 * Describes what training stimuli a piece of equipment can deliver, and
 * through which of its modes. A resolver matches a session's `stimulusType`
 * against `modes[].stimulusTypes` to pick concrete equipment settings.
 *
 * The ExerCube profile is data, not code — e.g.:
 *
 *   {
 *     equipmentId: 'exercube',
 *     name: 'ExerCube',
 *     modes: [
 *       { modeId: 'racer:dualflow',    name: 'Racer — DualFlow',    stimulusTypes: ['cognitive_motor', 'cardio_intensity', 'cardio_endurance'] },
 *       { modeId: 'speedcage:season',  name: 'SpeedCage — Season',  stimulusTypes: ['cognitive_motor', 'cardio_intensity'] },
 *     ],
 *   }
 *
 * Racer and SpeedCage are both ExerCube games (modes), not separate
 * equipment. The full draft mapping, with the observed data behind each
 * assignment, lives in docs/mode-stimulus-mapping.md.
 */
export interface EquipmentProfile {
  equipmentId: string;
  name: string;
  modes: EquipmentMode[];
}

export interface EquipmentMode {
  modeId: string;
  name: string;
  /** Which stimuli this mode can deliver. */
  stimulusTypes: StimulusType[];
}

// ---------------------------------------------------------------------------
// API contract (engine: POST /generate-plan)
// ---------------------------------------------------------------------------

/** Self-rated fitness level (concept Ebene 2). */
export type FitnessLevel = 'low' | 'medium' | 'high';

/** Weekday availability ids (concept Ebene 2). */
export type WeekdayId = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** Injury recovery stage (concept Ebene 3, branched injury detail). */
export type RecoveryStage = 'acute' | 'early' | 'strength' | 'return' | 'recovered';

/** Another sport the member does, so the engine can balance total load.
 * Captured per session (`minutesPerSession`) plus which weekdays it happens on,
 * so weekly volume = minutesPerSession × days, and the plan can show those days. */
export interface OtherActivity {
  name: string;
  minutesPerSession: number;
  intensity: 1 | 2 | 3 | 4 | 5;
  days: WeekdayId[];
}

/** Optional branched detail when the member flags an injury. */
export interface InjuryDetail {
  bodyPart?: string;
  recoveryStage?: RecoveryStage;
}

export interface QuestionnaireAnswers {
  age: number;
  weightKg: number;
  heightCm: number;
  /** Optional — ~28% filled in production; never required, optional model input. */
  gender?: 'male' | 'female' | 'other';
  goal: TrainingGoal;
  /**
   * Up to two focus ids within the goal (concept Ebene 1). For safety-/outcome-
   * critical goals (Move Pain-Free, Prepare for an Event) at least one is
   * required; otherwise optional. Refines the plan within the goal.
   */
  focus?: string[];
  /**
   * Coarse activity level the engine's cold-start estimate keys off. Derived
   * from `fitnessLevel` by the intake so the estimate stays unchanged.
   */
  activityLevel: ActivityLevel;
  /** Self-rated fitness level (concept Ebene 2), a finer signal than activityLevel. */
  fitnessLevel?: FitnessLevel;
  /** Availability; the engine picks a default if omitted. */
  sessionsPerWeek?: number;
  /** Preferred session length in minutes (whiteboard Ebene 2). */
  sessionLengthMinutes?: 20 | 30 | 45 | 60;
  /** Current weekly training volume in minutes (concept Ebene 2 slider, 0–720). */
  currentTrainingMinutesPerWeek?: number;
  /** Current typical training intensity, 1 (very light) – 5 (maximal). */
  currentIntensity?: 1 | 2 | 3 | 4 | 5;
  /** Weekdays the member can train (concept Ebene 2). */
  availableDays?: WeekdayId[];
  /** Other sports the member already does, to balance recovery. */
  otherActivities?: OtherActivity[];
  /** Flagged injuries / medical conditions (concept Ebene 3). */
  healthConditions?: string[];
  /** Branched injury detail when an injury is flagged. */
  injury?: InjuryDetail;
  /**
   * Safety gate (whiteboard Ebene 3, "Move Pain-Free"/medical): if the member
   * flags a medical condition or recent injury, the plan is held for trainer
   * sign-off rather than auto-issued.
   */
  hasMedicalFlags?: boolean;
}

export interface GeneratePlanRequest {
  /**
   * References a user in the loaded Sphery export so the engine can use
   * their session history. Omitted = pure cold start from the
   * questionnaire alone (e.g. a guest).
   */
  userId?: string;
  /**
   * Which gym's equipment this plan is generated against. The engine resolves
   * each session's stimulus to a station this gym actually has. Omitted =
   * the flagship Sphere circle profile.
   */
  gymId?: string;
  questionnaire: QuestionnaireAnswers;
}

/**
 * Thin wrapper (rather than `Plan` directly) so the engine can add sibling
 * fields later — warnings, estimate diagnostics — without breaking clients.
 */
export interface GeneratePlanResponse {
  plan: Plan;
}
