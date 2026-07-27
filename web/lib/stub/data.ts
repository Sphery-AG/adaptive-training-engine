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

/** A selectable demo identity. `null` history = guest / cold start. */
export interface DemoMember {
  id: string;
  name: string;
  tagline: string;
  /** Fake baseline the stub engine seeds the fitness estimate from. */
  baseline: {
    workoutsAnalyzed: number;
    fitnessScore: number;
    hrRest: number;
    hrMax: number;
    bodyAge: number;
    brainAge: number;
    /** Real chronological age, so we can show "body age vs. actual". */
    actualAge: number;
  } | null;
}

export const DEMO_MEMBERS: DemoMember[] = [
  {
    id: 'user-1',
    name: 'Lena',
    tagline: '2 years of ExerCube history · strong engine',
    baseline: {
      workoutsAnalyzed: 143,
      fitnessScore: 78,
      hrRest: 52,
      hrMax: 188,
      bodyAge: 29,
      brainAge: 27,
      actualAge: 34,
    },
  },
  {
    id: 'user-2',
    name: 'Marco',
    tagline: 'Returning after a break · moderate base',
    baseline: {
      workoutsAnalyzed: 21,
      fitnessScore: 54,
      hrRest: 64,
      hrMax: 181,
      bodyAge: 46,
      brainAge: 41,
      actualAge: 41,
    },
  },
  {
    id: 'guest',
    name: 'Guest',
    tagline: 'No account yet · plan built from the questionnaire',
    baseline: null,
  },
];

export const GYMS: GymConcept[] = [
  {
    id: 'sphere-darmstadt',
    name: 'The Sphere Darmstadt',
    location: 'Darmstadt, DE',
    tagline: 'Full Sphere circle — the flagship concept',
    stations: [
      { id: 'exercube', name: 'ExerCube', isSpheryEquipment: true, stimulusTypes: ['cardio_endurance', 'cardio_intensity', 'cognitive_motor', 'recovery'] },
      { id: 'xr-fighter', name: 'XR Fighter', isSpheryEquipment: true, stimulusTypes: ['cardio_intensity', 'cognitive_motor', 'power_speed'] },
      { id: 'icaros', name: 'ICAROS', isSpheryEquipment: true, stimulusTypes: ['mobility_stability', 'cognitive_motor'] },
      { id: 'ski-erg', name: 'Ski Erg', stimulusTypes: ['cardio_endurance', 'cardio_intensity'] },
      { id: 'row-erg', name: 'Row Erg', stimulusTypes: ['cardio_endurance', 'cardio_intensity'] },
      { id: 'sled', name: 'Sled', stimulusTypes: ['strength', 'power_speed'] },
      { id: 'sandbag', name: 'Sandbag', stimulusTypes: ['strength'] },
      { id: 'wall-balls', name: 'Wall Balls', stimulusTypes: ['strength', 'cardio_intensity'] },
      { id: 'runner', name: 'Runner', stimulusTypes: ['cardio_endurance', 'cardio_intensity', 'power_speed'] },
    ],
  },
  {
    id: 'hotel-gym',
    name: 'Grand Hotel Fitness',
    location: 'Zürich, CH',
    tagline: 'Bare hotel gym — no Sphery equipment at all',
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
