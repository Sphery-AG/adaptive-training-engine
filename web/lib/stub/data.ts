/**
 * Stub data for the front-end prototype. Stands in for the Python engine +
 * MySQL export until they exist. Everything here is fake but *shaped exactly*
 * like the real contracts (lib/types), so swapping in the real engine later is
 * a fetch call, not a rewrite.
 *
 * Three gyms deliberately span the range the product must cover:
 *   - a full Sphere circle, a bare hotel gym, and a HYROX box —
 * proving one engine personalizes for any equipment.
 */

import type { GymConcept } from '../types/gym';
import type { Reward } from '../types/engagement';
import type { QuestionnaireAnswers } from '../types/plan';

/** A selectable demo identity. `null` history = guest / cold start. */
export interface DemoMember {
  id: string;
  name: string;
  tagline: string;
  /**
   * Bridge key into the real Sphery export (Users.id), the same seam the
   * schema doc reserves as members.sphery_user_id. Only used when
   * NEXT_PUBLIC_ENGINE_URL points at the local Python engine; the Vercel
   * demo never touches it.
   */
  spheryUserId?: number;
  /** Fake baseline the stub engine seeds the fitness estimate from. */
  baseline: {
    workoutsAnalyzed: number;
    fitnessScore: number;
    /** Movement quality 0–100: share of exercises performed correctly. */
    bodyScore: number;
    /** Cognitive sharpness 0–100: share of reactions timed right under load. */
    brainScore: number;
    hrRest: number;
    hrMax: number;
    bodyAge: number;
    brainAge: number;
    /** Real chronological age, so we can show "body age vs. actual". */
    actualAge: number;
  } | null;
  /**
   * The setup a returning member already has on file. Demo stand-in for the
   * row that would live in the members table: someone who has trained here for
   * two years does not re-answer the questionnaire on their way in, they walk
   * in with a plan already running. `null` sends the member through intake.
   *
   * Lena and Marco share a goal on purpose. Same goal, different histories,
   * different plans is acceptance criterion 2, and switching between them is
   * the fastest way to show it.
   */
  currentPlan: QuestionnaireAnswers | null;
}

export const DEMO_MEMBERS: DemoMember[] = [
  // Names are ours; the training history is a real member's. Baselines below
  // mirror what the engine actually returns for that member, so the stub and
  // the live engine never contradict each other on screen (the sign-in screen
  // renders the baseline before any engine call can happen).
  {
    id: 'user-1',
    name: 'Lena',
    tagline: 'Two years of ExerCube history · strong engine',
    spheryUserId: 535, // Elite, 99th percentile: 108 completed, 66 HR-tracked
    baseline: {
      workoutsAnalyzed: 108,
      fitnessScore: 99,
      bodyScore: 84,
      brainScore: 76,
      hrRest: 52,
      hrMax: 185,
      bodyAge: 34,
      brainAge: 32,
      actualAge: 42,
    },
    currentPlan: {
      age: 42,
      weightKg: 64,
      heightCm: 170,
      goal: 'improve_fitness_endurance',
      activityLevel: 'very_active',
      fitnessLevel: 'high',
      sessionsPerWeek: 3,
      sessionLengthMinutes: 45,
      currentTrainingMinutesPerWeek: 240,
      currentIntensity: 4,
      availableDays: ['mon', 'wed', 'fri'],
      hasMedicalFlags: false,
    },
  },
  {
    id: 'user-2',
    name: 'Marco',
    tagline: 'Long history, still building · mid-pack engine',
    spheryUserId: 19, // Developing, 41st percentile: 257 completed, 27 HR-tracked
    baseline: {
      workoutsAnalyzed: 257,
      fitnessScore: 41,
      bodyScore: 58,
      brainScore: 52,
      hrRest: 64,
      hrMax: 196,
      bodyAge: 39,
      brainAge: 37,
      actualAge: 38,
    },
    currentPlan: {
      age: 38,
      weightKg: 82,
      heightCm: 181,
      goal: 'improve_fitness_endurance',
      activityLevel: 'moderate',
      fitnessLevel: 'medium',
      sessionsPerWeek: 3,
      sessionLengthMinutes: 45,
      currentTrainingMinutesPerWeek: 120,
      currentIntensity: 3,
      availableDays: ['tue', 'thu', 'sat'],
      hasMedicalFlags: false,
    },
  },
  {
    id: 'guest',
    name: 'Guest',
    tagline: 'No account yet · plan built from the questionnaire',
    baseline: null,
    currentPlan: null,
  },
];

export const GYMS: GymConcept[] = [
  {
    id: 'sphere-darmstadt',
    name: 'The Sphere Darmstadt',
    location: 'Darmstadt, DE',
    tagline: 'Full Sphere circle, the flagship concept',
    // The real floor per the-sphere.fit (verified Jul 2026): digital stations,
    // ergs and bikes, the medical/strength area, and the full HYROX setup.
    // Station names match the CircleTraining names in the Sphery export.
    stations: [
      { id: 'exercube', name: 'ExerCube', isSpheryEquipment: true, stimulusTypes: ['cardio_endurance', 'cardio_intensity', 'cognitive_motor', 'recovery'] },
      { id: 'xr-fighter', name: 'XR Fighter', isSpheryEquipment: true, stimulusTypes: ['cardio_intensity', 'cognitive_motor', 'power_speed'] },
      { id: 'icaros', name: 'ICAROS Guardian', isSpheryEquipment: true, stimulusTypes: ['mobility_stability', 'cognitive_motor'] },
      { id: 'runner', name: 'Runner', stimulusTypes: ['power_speed', 'cardio_intensity', 'cardio_endurance'] },
      { id: 'ski-erg', name: 'Ski Erg', stimulusTypes: ['cardio_endurance', 'cardio_intensity'] },
      { id: 'row-erg', name: 'Row Erg', stimulusTypes: ['cardio_endurance', 'cardio_intensity'] },
      { id: 'bike', name: 'Performance Bike', stimulusTypes: ['cardio_endurance', 'cardio_intensity', 'recovery'] },
      { id: 'leg-press', name: 'Medical Leg Press', stimulusTypes: ['strength', 'mobility_stability'] },
      { id: 'free-weights', name: 'Free Weights & Racks', stimulusTypes: ['strength', 'power_speed'] },
      { id: 'cable-pulls', name: 'Cable Pulls', stimulusTypes: ['strength', 'mobility_stability'] },
      { id: 'tidal-tank', name: 'Tidal Tanks', stimulusTypes: ['strength', 'mobility_stability'] },
      { id: 'sled-push', name: 'Sled Push', stimulusTypes: ['strength', 'power_speed'] },
      { id: 'sled-pull', name: 'Sled Pull', stimulusTypes: ['strength'] },
      { id: 'wall-balls', name: 'Wall Balls', stimulusTypes: ['strength', 'cardio_intensity'] },
      { id: 'sandbag-lunges', name: 'Sandbag Lunges', stimulusTypes: ['strength'] },
      { id: 'farmers-carry', name: 'Farmers Carry', stimulusTypes: ['strength'] },
      { id: 'burpees', name: 'Burpee Broad Jump', stimulusTypes: ['power_speed', 'cardio_intensity'] },
    ],
  },
  {
    id: 'hotel-gym',
    name: 'Grand Hotel Fitness',
    location: 'Zürich, CH',
    tagline: 'Bare hotel gym, no Sphery equipment at all',
    stations: [
      { id: 'treadmill', name: 'Treadmill', stimulusTypes: ['cardio_endurance', 'cardio_intensity', 'power_speed'] },
      { id: 'bike', name: 'Stationary Bike', stimulusTypes: ['cardio_endurance', 'cardio_intensity', 'recovery'] },
      { id: 'dumbbells', name: 'Dumbbells', stimulusTypes: ['strength'] },
      { id: 'mat', name: 'Yoga Mat', stimulusTypes: ['mobility_stability', 'recovery'] },
    ],
  },
  {
    id: 'hyrox-box',
    name: 'HYROX Box Berlin',
    location: 'Berlin, DE',
    tagline: 'Functional HYROX stations',
    stations: [
      { id: 'run', name: 'Run', stimulusTypes: ['cardio_endurance', 'cardio_intensity', 'power_speed'] },
      { id: 'ski-erg', name: 'Ski Erg', stimulusTypes: ['cardio_endurance', 'cardio_intensity'] },
      { id: 'row-erg', name: 'Row Erg', stimulusTypes: ['cardio_endurance', 'cardio_intensity'] },
      { id: 'sled-push', name: 'Sled Push', stimulusTypes: ['strength', 'power_speed'] },
      { id: 'sled-pull', name: 'Sled Pull', stimulusTypes: ['strength'] },
      { id: 'sandbag', name: 'Sandbag Lunges', stimulusTypes: ['strength'] },
      { id: 'wall-balls', name: 'Wall Balls', stimulusTypes: ['strength', 'cardio_intensity'] },
      { id: 'burpees', name: 'Burpee Broad Jump', stimulusTypes: ['power_speed', 'cardio_intensity'] },
      { id: 'farmers', name: 'Farmers Carry', stimulusTypes: ['strength'] },
    ],
  },
];

/** Per-gym reward catalog (the perks the gym chooses to offer). Fresh copy per member. */
export function rewardCatalogFor(gymId: string): Reward[] {
  const base: Omit<Reward, 'status'>[] =
    gymId === 'hotel-gym'
      ? [
          { id: 'r-water', kind: 'merch', label: 'Branded water bottle', pointsCost: 150 },
          { id: 'r-daypass', kind: 'guest_pass', label: 'Guest day-pass', pointsCost: 300 },
          { id: 'r-massage', kind: 'coaching', label: '15-min recovery massage', pointsCost: 700 },
        ]
      : [
          { id: 'r-smoothie', kind: 'smoothie', label: 'Free smoothie', pointsCost: 200 },
          { id: 'r-guest', kind: 'guest_pass', label: 'Bring-a-friend pass', pointsCost: 300 },
          { id: 'r-session', kind: 'free_session', label: 'Free session', pointsCost: 500 },
          { id: 'r-coach', kind: 'coaching', label: '1:1 coaching slot', pointsCost: 800 },
        ];
  return base.map((r) => ({ ...r, status: 'locked' }));
}
