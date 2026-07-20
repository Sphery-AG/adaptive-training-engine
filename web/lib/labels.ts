/**
 * Human-readable display strings for the slug unions in lib/types. Kept out of
 * the type files so the contracts stay pure data and the copy can change
 * without touching the model. UI reads from here; the engine never does.
 */

import type { StimulusType, TrainingGoal } from './types/plan';

export const GOAL_LABELS: Record<TrainingGoal, string> = {
  lose_weight_burn_fat: 'Lose Weight & Burn Fat',
  build_strength_muscle: 'Build Strength & Muscle',
  improve_fitness_endurance: 'Improve Fitness & Endurance',
  move_pain_free: 'Move Pain-Free',
  boost_health_longevity: 'Boost Health & Longevity',
  improve_sports_performance: 'Improve Sports Performance',
  prepare_for_event: 'Prepare for an Event',
  train_body_mind: 'Train Body & Mind',
};

/** Short blurb per goal, used on the goal-picker cards. */
export const GOAL_BLURBS: Record<TrainingGoal, string> = {
  lose_weight_burn_fat: 'Higher-burn sessions that keep you moving.',
  build_strength_muscle: 'Resistance-led work to build muscle and power.',
  improve_fitness_endurance: 'Grow your engine — go longer, recover faster.',
  move_pain_free: 'Gentle, mobility-first training that protects your joints.',
  boost_health_longevity: 'Balanced training for long-term health.',
  improve_sports_performance: 'Sharpen speed, agility, and reactions.',
  prepare_for_event: 'Build toward a race or event with a clear ramp.',
  train_body_mind: 'Dual-task sessions that train focus as well as fitness.',
};

/** Emoji marker per goal — cheap, friendly iconography for the prototype. */
export const GOAL_EMOJI: Record<TrainingGoal, string> = {
  lose_weight_burn_fat: '🔥',
  build_strength_muscle: '💪',
  improve_fitness_endurance: '🫁',
  move_pain_free: '🧘',
  boost_health_longevity: '🌱',
  improve_sports_performance: '⚡',
  prepare_for_event: '🏁',
  train_body_mind: '🧠',
};

export const STIMULUS_LABELS: Record<StimulusType, string> = {
  cardio_endurance: 'Cardio · Endurance',
  cardio_intensity: 'Cardio · Intensity',
  cognitive_motor: 'Dual-Task · Brain + Body',
  recovery: 'Active Recovery',
  strength: 'Strength',
  mobility_stability: 'Mobility & Stability',
  power_speed: 'Power & Speed',
};

/** Accent color token per stimulus, for session cards. Tailwind class stems. */
export const STIMULUS_ACCENT: Record<StimulusType, string> = {
  cardio_endurance: 'sky',
  cardio_intensity: 'orange',
  cognitive_motor: 'violet',
  recovery: 'emerald',
  strength: 'rose',
  mobility_stability: 'teal',
  power_speed: 'amber',
};
