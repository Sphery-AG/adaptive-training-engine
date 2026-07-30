/**
 * Intake state machine.
 *
 * The whole questionnaire is one reducer, not a scatter of useState: the
 * current screen, the branch (injury detail only when an injury is flagged),
 * per-screen validity, and the section progress are all derived from a single
 * typed state. The component stays a thin renderer; this file is pure and unit-
 * testable. `toQuestionnaireAnswers` is the single adapter to the engine
 * contract, so the UI's shape and the API's shape can evolve independently.
 */

import type {
  FitnessLevel,
  InjuryDetail,
  OtherActivity,
  QuestionnaireAnswers,
  TrainingGoal,
  WeekdayId,
} from '../types/plan';
import {
  FITNESS_TO_ACTIVITY,
  goalBySlug,
  MAX_FOCUS,
  SECTIONS,
  sectionIndexForScreen,
  type ScreenId,
} from './model';

export interface IntakeState {
  screen: ScreenId;
  /** Visited-screen stack, so Back replays the real path (branches included). */
  history: ScreenId[];
  /**
   * Set when the user jumped to a screen via an "Edit" link on Review; once the
   * edited section is complete, advancing returns to Review instead of walking
   * the rest of the flow again.
   */
  returnToReview: boolean;

  // Ebene 1 — Goal & Focus
  goal: TrainingGoal | null;
  focus: string[];

  // Profile (needed for the cold-start estimate; prefilled for known members)
  age: number;
  weightKg: number;
  heightCm: number;

  // Ebene 2 — Training Setup
  // Total current weekly training time + typical intensity are the primary
  // signal (asked with a slider on the Setup screen). Breaking that total down
  // into specific sports is optional (`otherActivities`), nested under it.
  fitnessLevel: FitnessLevel | null;
  trainingMinutesPerWeek: number;
  trainingIntensity: 1 | 2 | 3 | 4 | 5;
  availableDays: WeekdayId[];
  sessionLengthMinutes: 20 | 30 | 45 | 60;
  otherActivities: OtherActivity[];

  // Ebene 3 — Health
  hasInjury: boolean | null;
  healthConditions: string[];
  injury: InjuryDetail;
}

export interface IntakeSeed {
  age?: number;
}

export function initialState(seed: IntakeSeed = {}): IntakeState {
  return {
    screen: 'goal',
    history: [],
    returnToReview: false,
    goal: null,
    focus: [],
    age: seed.age ?? 35,
    weightKg: 75,
    heightCm: 175,
    fitnessLevel: null,
    trainingMinutesPerWeek: 0,
    trainingIntensity: 3,
    availableDays: [],
    sessionLengthMinutes: 45,
    otherActivities: [],
    hasInjury: null,
    healthConditions: [],
    injury: {},
  };
}

// --- Navigation -------------------------------------------------------------

/** Linear order; `injury` is conditional on a flagged injury. */
const LINEAR: ScreenId[] = ['goal', 'focus', 'status', 'health', 'review'];

function nextScreen(screen: ScreenId, state: IntakeState): ScreenId | null {
  const i = LINEAR.indexOf(screen);
  const next = LINEAR[i + 1] as ScreenId | undefined;
  return next ?? null;
}

// --- Actions ----------------------------------------------------------------

export type IntakeAction =
  | { type: 'advance' }
  | { type: 'back' }
  | { type: 'goto'; screen: ScreenId }
  | { type: 'setGoal'; goal: TrainingGoal }
  | { type: 'toggleFocus'; id: string }
  | { type: 'setProfile'; patch: Partial<Pick<IntakeState, 'age' | 'weightKg' | 'heightCm'>> }
  | { type: 'setFitness'; level: FitnessLevel }
  | { type: 'setTraining'; patch: Partial<Pick<IntakeState, 'trainingMinutesPerWeek' | 'trainingIntensity'>> }
  | { type: 'toggleDay'; day: WeekdayId }
  | { type: 'setSessionLength'; minutes: 20 | 30 | 45 | 60 }
  | { type: 'addActivity'; activity: OtherActivity }
  | { type: 'removeActivity'; index: number }
  | { type: 'setHasInjury'; value: boolean }
  | { type: 'toggleCondition'; label: string }
  | { type: 'setInjury'; patch: Partial<InjuryDetail> };

export function reducer(state: IntakeState, action: IntakeAction): IntakeState {
  switch (action.type) {
    case 'advance': {
      const next = nextScreen(state.screen, state);
      if (!next) return state;
      const history = [...state.history, state.screen];
      // When editing from Review, go straight back as soon as this one screen's
      // change is captured, so changing a single answer never replays the rest
      // of the flow. Two selections need a follow-up screen first: a goal that
      // requires a focus (none picked yet), and a newly flagged injury (detail).
      if (state.returnToReview) {
        const needsFollowUp =
          state.screen === 'goal' &&
          state.goal !== null &&
          goalBySlug(state.goal).requiresFocus &&
          state.focus.length === 0;
        if (!needsFollowUp) return { ...state, screen: 'review', history, returnToReview: false };
      }
      return { ...state, screen: next, history };
    }
    case 'back': {
      if (state.history.length === 0) return state;
      const history = state.history.slice(0, -1);
      const screen = state.history[state.history.length - 1];
      return { ...state, screen, history };
    }
    case 'goto': {
      if (action.screen === state.screen) return state;
      return {
        ...state,
        screen: action.screen,
        history: [...state.history, state.screen],
        // Jumping from Review means "edit this, then bring me back".
        returnToReview: state.screen === 'review' ? true : state.returnToReview,
      };
    }
    case 'setGoal':
      // Changing the goal invalidates any focus picked under the old goal.
      return state.goal === action.goal
        ? state
        : { ...state, goal: action.goal, focus: [] };
    case 'toggleFocus': {
      const has = state.focus.includes(action.id);
      if (has) return { ...state, focus: state.focus.filter((f) => f !== action.id) };
      if (state.focus.length >= MAX_FOCUS) return state; // cap at 2
      return { ...state, focus: [...state.focus, action.id] };
    }
    case 'setProfile':
      return { ...state, ...action.patch };
    case 'setFitness':
      return { ...state, fitnessLevel: action.level };
    case 'setTraining':
      return { ...state, ...action.patch };
    case 'toggleDay': {
      const has = state.availableDays.includes(action.day);
      return {
        ...state,
        availableDays: has
          ? state.availableDays.filter((d) => d !== action.day)
          : [...state.availableDays, action.day],
      };
    }
    case 'setSessionLength':
      return { ...state, sessionLengthMinutes: action.minutes };
    case 'addActivity':
      return { ...state, otherActivities: [...state.otherActivities, action.activity] };
    case 'removeActivity':
      return {
        ...state,
        otherActivities: state.otherActivities.filter((_, i) => i !== action.index),
      };
    case 'setHasInjury':
      return { ...state, hasInjury: action.value };
    case 'toggleCondition': {
      const has = state.healthConditions.includes(action.label);
      return {
        ...state,
        healthConditions: has
          ? state.healthConditions.filter((c) => c !== action.label)
          : [...state.healthConditions, action.label],
      };
    }
    case 'setInjury':
      return { ...state, injury: { ...state.injury, ...action.patch } };
    default:
      return state;
  }
}

// --- Selectors --------------------------------------------------------------

/** Whether the current screen's requirements are met, so the CTA can enable. */
export function canAdvance(state: IntakeState): boolean {
  switch (state.screen) {
    case 'goal':
      return state.goal !== null;
    case 'focus':
      // Required only for safety-/outcome-critical goals; otherwise skippable.
      return state.goal ? !goalBySlug(state.goal).requiresFocus || state.focus.length >= 1 : false;
    case 'health':
      return state.hasInjury !== null; // must answer yes/no
    default:
      return true; // setup + detail screens are optional
  }
}

/** True on screens whose answers are optional (renders a "Skip" affordance). */
export function isSkippable(state: IntakeState): boolean {
  if (state.screen === 'focus') {
    return state.goal ? !goalBySlug(state.goal).requiresFocus : false;
  }
  return state.screen === 'status';
}

/** Fill fraction (0–1) for each of the three macro sections, for the progress bar. */
export function sectionProgress(state: IntakeState): number[] {
  const current = state.screen === 'review' ? SECTIONS.length : sectionIndexForScreen(state.screen);
  return SECTIONS.map((section, i) => {
    if (i < current) return 1;
    if (i > current) return 0;
    const idx = section.screens.indexOf(state.screen as never);
    // Half-fill the active segment on its first screen, full on its second.
    return section.screens.length <= 1 ? 0.5 : (idx + 0.5) / section.screens.length;
  });
}

export const isLastScreen = (state: IntakeState): boolean => state.screen === 'review';

export const derivedSessionsPerWeek = (state: IntakeState): number =>
  state.availableDays.length > 0 ? Math.min(5, Math.max(2, state.availableDays.length)) : 3;

/** Single adapter from UI state to the engine's questionnaire contract. */
export function toQuestionnaireAnswers(state: IntakeState): QuestionnaireAnswers {
  const fitnessLevel = state.fitnessLevel ?? 'medium';
  const flaggedInjury = state.hasInjury === true;
  // Total weekly volume + typical intensity come from the Setup slider (the
  // primary signal). If the member skipped the slider but listed specific
  // sports, fall back to summing those. Nothing given → left undefined.
  const activityMinutes = state.otherActivities.reduce(
    (sum, a) => sum + a.minutesPerSession * Math.max(1, a.days.length),
    0,
  );
  const weeklyMinutes = state.trainingMinutesPerWeek || activityMinutes;
  const avgIntensity: 1 | 2 | 3 | 4 | 5 | undefined = state.trainingMinutesPerWeek
    ? state.trainingIntensity
    : state.otherActivities.length
      ? (Math.round(
          state.otherActivities.reduce((sum, a) => sum + a.intensity, 0) / state.otherActivities.length,
        ) as 1 | 2 | 3 | 4 | 5)
      : undefined;
  return {
    age: state.age,
    weightKg: state.weightKg,
    heightCm: state.heightCm,
    goal: state.goal!, // guaranteed set before review/submit
    focus: state.focus.length ? state.focus : undefined,
    activityLevel: FITNESS_TO_ACTIVITY[fitnessLevel],
    fitnessLevel: state.fitnessLevel ?? undefined,
    sessionsPerWeek: derivedSessionsPerWeek(state),
    sessionLengthMinutes: state.sessionLengthMinutes,
    currentTrainingMinutesPerWeek: weeklyMinutes || undefined,
    currentIntensity: avgIntensity,
    availableDays: state.availableDays.length ? state.availableDays : undefined,
    otherActivities: state.otherActivities.length ? state.otherActivities : undefined,
    healthConditions: state.healthConditions.length ? state.healthConditions : undefined,
    injury: flaggedInjury && (state.injury.bodyPart || state.injury.recoveryStage) ? state.injury : undefined,
    hasMedicalFlags: flaggedInjury || state.healthConditions.length > 0,
  };
}
