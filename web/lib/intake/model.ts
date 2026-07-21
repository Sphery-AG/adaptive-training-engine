/**
 * Intake domain model.
 *
 * Ported from Stephan's UX concept (training-plan-ux-concept_11.html DATA MODEL)
 * and reconciled with the engine's contract: the concept's goal ids
 * (`strength`, `pain_free`, …) are mapped onto the canonical `TrainingGoal`
 * slugs in lib/types/plan.ts, so the stub/real engine's goal→stimulus logic is
 * untouched. This file is pure data + pure helpers — no React, no state.
 */

import type {
  ActivityLevel,
  FitnessLevel,
  RecoveryStage,
  StimulusType,
  TrainingGoal,
  WeekdayId,
} from '../types/plan';
import type { IconName } from '../../app/_components/icons';

/** One selectable focus within a goal. `id` is stable; `label` is display copy. */
export interface Focus {
  id: string;
  label: string;
}

export interface Goal {
  /** Canonical engine slug — drives generation. */
  slug: TrainingGoal;
  /** Concept id, kept for traceability against the source design. */
  conceptId: string;
  title: string;
  /** One-line supporting copy for the goal card. */
  blurb: string;
  icon: IconName;
  /**
   * Safety-/outcome-critical goals require at least one focus (the concept
   * flags these with a "Required focus" badge): Move Pain-Free, Prepare Event.
   */
  requiresFocus: boolean;
  focuses: Focus[];
}

const slugifyFocus = (label: string): string =>
  label
    .toLowerCase()
    .replace(/[()₂/]/g, ' ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const focuses = (...labels: string[]): Focus[] =>
  labels.map((label) => ({ id: slugifyFocus(label), label }));

/** The 8 goals, in the concept's order. `focuses` copy is verbatim from the concept. */
export const GOALS: Goal[] = [
  {
    slug: 'lose_weight_burn_fat',
    conceptId: 'lose_weight',
    title: 'Lose Weight & Burn Fat',
    blurb: 'Higher-burn sessions that keep you moving.',
    icon: 'flame',
    requiresFocus: false,
    focuses: focuses(
      'Maximum Fat Loss',
      'Sustainable Weight Loss',
      'Improve Metabolism',
      'Increase Daily Activity',
      'Tone & Shape Body',
      'Improve Body Composition',
    ),
  },
  {
    slug: 'build_strength_muscle',
    conceptId: 'strength',
    title: 'Build Strength & Muscle',
    blurb: 'Resistance-led work to build muscle and power.',
    icon: 'dumbbell',
    requiresFocus: false,
    focuses: focuses(
      'Muscle Growth (Hypertrophy)',
      'Functional Strength',
      'Full Body Strength',
      'Upper Body',
      'Lower Body',
      'Core Strength',
      'Explosive Strength',
      'Maximum Strength',
    ),
  },
  {
    slug: 'improve_fitness_endurance',
    conceptId: 'endurance',
    title: 'Improve Fitness & Endurance',
    blurb: 'Grow your engine — go longer, recover faster.',
    icon: 'pulse',
    requiresFocus: false,
    focuses: focuses(
      'Cardiovascular Fitness',
      'VO₂max',
      'Functional Fitness',
      'Stamina',
      'Interval Fitness',
      'General Conditioning',
      'Muscular Endurance',
    ),
  },
  {
    slug: 'move_pain_free',
    conceptId: 'pain_free',
    title: 'Move Pain-Free',
    blurb: 'Mobility-first training that protects your joints.',
    icon: 'mobility',
    requiresFocus: true,
    focuses: focuses(
      'Lower Back',
      'Neck & Shoulders',
      'Knee Stability',
      'Hip Mobility',
      'Better Posture',
      'Balance',
      'Injury Prevention',
      'Return to Sport',
      'Joint Mobility',
    ),
  },
  {
    slug: 'boost_health_longevity',
    conceptId: 'longevity',
    title: 'Boost Health & Longevity',
    blurb: 'Balanced training for long-term health.',
    icon: 'heart',
    requiresFocus: false,
    focuses: focuses(
      'Healthy Aging',
      'Brain Health',
      'Heart Health',
      'Bone Health',
      'Mobility',
      'Stress Reduction',
      'Better Sleep',
      'Energy & Vitality',
      'Metabolic Health',
    ),
  },
  {
    slug: 'improve_sports_performance',
    conceptId: 'sports',
    title: 'Improve Sports Performance',
    blurb: 'Sharpen speed, agility, and reactions.',
    icon: 'zap',
    requiresFocus: false,
    focuses: focuses(
      'Speed',
      'Agility',
      'Acceleration',
      'Reaction Speed',
      'Coordination',
      'Balance',
      'Power',
      'Jump Performance',
      'Change of Direction',
      'Sport-Specific Conditioning',
    ),
  },
  {
    slug: 'prepare_for_event',
    conceptId: 'event',
    title: 'Prepare for an Event',
    blurb: 'Build toward a race or event with a clear ramp.',
    icon: 'flag',
    requiresFocus: true,
    focuses: focuses(
      'HYROX',
      'Marathon',
      'Half Marathon',
      'Triathlon',
      'Cycling',
      'Football Season',
      'Tennis Season',
      'Ski Season',
      'Hiking',
      'OCR / Spartan Race',
      'Other',
    ),
  },
  {
    slug: 'train_body_mind',
    conceptId: 'mind',
    title: 'Train Body & Mind',
    blurb: 'Dual-task sessions that train focus as well as fitness.',
    icon: 'brain',
    requiresFocus: false,
    focuses: focuses(
      'Reaction Time',
      'Focus',
      'Decision Making',
      'Dual Task Performance',
      'Cognitive Endurance',
      'Executive Function',
      'Working Memory',
      'Processing Speed',
    ),
  },
];

export const goalBySlug = (slug: TrainingGoal): Goal =>
  GOALS.find((g) => g.slug === slug)!;

export const MAX_FOCUS = 2;

/**
 * Focus → primary training stimulus. This is the versioned, hand-made mapping
 * the schema handoff calls `AdaptiveStimulusMappings` (docs/michel_schema_handoff.md):
 * it lets a chosen focus bias the generated plan within its goal, so two members
 * with the same goal but different focus get visibly different plans. Keys are
 * focus ids (slugified labels). Unmapped focuses simply don't bias the plan.
 * v0.1 — refine with sports-science input before Week 3.
 */
export const FOCUS_STIMULUS: Record<string, StimulusType> = {
  // Lose Weight & Burn Fat
  maximum_fat_loss: 'cardio_intensity',
  sustainable_weight_loss: 'cardio_endurance',
  improve_metabolism: 'cardio_intensity',
  increase_daily_activity: 'cardio_endurance',
  tone_shape_body: 'strength',
  improve_body_composition: 'strength',
  // Build Strength & Muscle
  muscle_growth_hypertrophy: 'strength',
  functional_strength: 'strength',
  full_body_strength: 'strength',
  upper_body: 'strength',
  lower_body: 'strength',
  core_strength: 'mobility_stability',
  explosive_strength: 'power_speed',
  maximum_strength: 'strength',
  // Improve Fitness & Endurance
  cardiovascular_fitness: 'cardio_endurance',
  vo_max: 'cardio_intensity',
  functional_fitness: 'cardio_endurance',
  stamina: 'cardio_endurance',
  interval_fitness: 'cardio_intensity',
  general_conditioning: 'cardio_endurance',
  muscular_endurance: 'strength',
  // Move Pain-Free (mobility-led)
  lower_back: 'mobility_stability',
  neck_shoulders: 'mobility_stability',
  knee_stability: 'mobility_stability',
  hip_mobility: 'mobility_stability',
  better_posture: 'mobility_stability',
  balance: 'mobility_stability',
  injury_prevention: 'mobility_stability',
  return_to_sport: 'cardio_endurance',
  joint_mobility: 'mobility_stability',
  // Boost Health & Longevity
  healthy_aging: 'cardio_endurance',
  brain_health: 'cognitive_motor',
  heart_health: 'cardio_endurance',
  bone_health: 'strength',
  mobility: 'mobility_stability',
  stress_reduction: 'recovery',
  better_sleep: 'recovery',
  energy_vitality: 'cardio_endurance',
  metabolic_health: 'cardio_intensity',
  // Improve Sports Performance
  speed: 'power_speed',
  agility: 'power_speed',
  acceleration: 'power_speed',
  reaction_speed: 'cognitive_motor',
  coordination: 'cognitive_motor',
  power: 'power_speed',
  jump_performance: 'power_speed',
  change_of_direction: 'power_speed',
  sport_specific_conditioning: 'cardio_intensity',
  // Prepare for an Event
  hyrox: 'cardio_intensity',
  marathon: 'cardio_endurance',
  half_marathon: 'cardio_endurance',
  triathlon: 'cardio_endurance',
  cycling: 'cardio_endurance',
  football_season: 'power_speed',
  tennis_season: 'cognitive_motor',
  ski_season: 'power_speed',
  hiking: 'cardio_endurance',
  ocr_spartan_race: 'cardio_intensity',
  // Train Body & Mind (dual-task, cognitive-led)
  reaction_time: 'cognitive_motor',
  focus: 'cognitive_motor',
  decision_making: 'cognitive_motor',
  dual_task_performance: 'cognitive_motor',
  cognitive_endurance: 'cognitive_motor',
  executive_function: 'cognitive_motor',
  working_memory: 'cognitive_motor',
  processing_speed: 'cognitive_motor',
};

/** The distinct stimuli implied by a set of chosen focus ids, in pick order. */
export const focusStimuliFor = (focusIds: readonly string[]): StimulusType[] => {
  const out: StimulusType[] = [];
  for (const id of focusIds) {
    const s = FOCUS_STIMULUS[id];
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
};

export const FITNESS_LEVELS: { id: FitnessLevel; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
];

export const WEEKDAYS: { id: WeekdayId; label: string; full: string }[] = [
  { id: 'mon', label: 'Mo', full: 'Monday' },
  { id: 'tue', label: 'Tu', full: 'Tuesday' },
  { id: 'wed', label: 'We', full: 'Wednesday' },
  { id: 'thu', label: 'Th', full: 'Thursday' },
  { id: 'fri', label: 'Fr', full: 'Friday' },
  { id: 'sat', label: 'Sa', full: 'Saturday' },
  { id: 'sun', label: 'Su', full: 'Sunday' },
];

export const RECOVERY_STAGES: { id: RecoveryStage; title: string; desc: string }[] = [
  { id: 'acute', title: 'Acute', desc: 'Very recent — still painful / swollen.' },
  { id: 'early', title: 'Early Rehabilitation', desc: 'Pain settling, movement returning gradually.' },
  { id: 'strength', title: 'Strength Building', desc: 'Rebuilding strength & load tolerance.' },
  { id: 'return', title: 'Return to Sport', desc: 'Back to normal training, easing into full load.' },
  { id: 'recovered', title: 'Fully Recovered', desc: 'No more limitations from this injury.' },
];

/** Fitness level → the engine's ActivityLevel, so the estimate stays unchanged. */
export const FITNESS_TO_ACTIVITY: Record<FitnessLevel, ActivityLevel> = {
  low: 'light',
  medium: 'moderate',
  high: 'active',
};

/** Macro sections that drive the 3-segment progress bar. */
export const SECTIONS = [
  { key: 'goals', label: 'Goals', screens: ['goal', 'focus'] },
  { key: 'setup', label: 'Setup', screens: ['status', 'activities'] },
  { key: 'health', label: 'Health', screens: ['health', 'injury'] },
] as const;

export type ScreenId = (typeof SECTIONS)[number]['screens'][number] | 'review';
export type SectionKey = (typeof SECTIONS)[number]['key'];

export const sectionIndexForScreen = (screen: ScreenId): number =>
  SECTIONS.findIndex((s) => (s.screens as readonly string[]).includes(screen));
