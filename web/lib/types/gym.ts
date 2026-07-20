/**
 * Gym / equipment model — the piece that makes plans equipment-agnostic.
 *
 * A plan is written in *stimulus* ("cardio_intensity, zone 4, 6 min"); a
 * GymConcept says what equipment a given gym has and which stimuli each
 * station can deliver. The engine resolves each planned session's stimulus to
 * a real station at the member's gym. Same plan, any gym:
 *
 *   - The Sphere Darmstadt: ExerCube + XR Fighter + ICAROS + HYROX stations.
 *   - A bare hotel gym: treadmill + bike + dumbbells.
 *
 * This mirrors how Sphery's own circle-training data already works — a single
 * logged circle can mix HYROX stations, an ExerCube, and an XR Fighter.
 *
 * JSON boundary rules as in plan.ts: string-literal unions, ISO dates.
 */

import type { StimulusType } from './plan';

/** A single trainable station at a gym. */
export interface GymStation {
  id: string;
  /** Display name, e.g. "ExerCube", "Treadmill", "Ski Erg", "Sandbag". */
  name: string;
  /** Which stimuli this station can deliver. */
  stimulusTypes: StimulusType[];
  /**
   * True for Sphery's own instrumented equipment (ExerCube, XR Fighter,
   * ICAROS) — the stations that produce rich data. Used only for UI
   * emphasis; the engine never hard-codes equipment.
   */
  isSpheryEquipment?: boolean;
}

export interface GymConcept {
  id: string;
  name: string;
  /** City / venue label for display. */
  location: string;
  /** One-line description of the concept, e.g. "Full Sphere circle". */
  tagline: string;
  stations: GymStation[];
}
