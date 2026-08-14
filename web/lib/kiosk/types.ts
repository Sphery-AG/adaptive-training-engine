/**
 * Shapes for live NEXUS kiosk reads.
 *
 * These are the app's view of the kiosk, not the kiosk's own wire format: the
 * route handler in app/api/kiosk/trainings flattens what the v1 API returns and
 * drops values it cannot vouch for. Anything the kiosk did not actually record
 * arrives here as null rather than as a zero or a negative number, so the UI
 * never has to guess whether 0 bpm means "resting" or "no strap".
 *
 * v1 reads are public (docs/kiosk-api.md), which is why this can run from the
 * deployed web app with no token. When the engine is hosted this moves there and
 * the web app fetches it from the engine instead.
 */

/** One station within a completed circle training. */
export interface KioskExercise {
  /** 1-based position in the circuit, as the kiosk orders it. */
  orderIndex: number;
  name: string;
  /** Work target as the kiosk stores it, e.g. "1000m" or "50x". */
  target: string | null;
  /** Seconds actually spent, when the member's log recorded it. */
  measuredDuration: number | null;
  /** Mean HR for this station, or null when nothing was recorded. */
  hrAverage: number | null;
}

/** A completed circle training as the app displays it. */
export interface KioskTraining {
  id: number;
  /** Which physical kiosk ran it, e.g. "THESPHEREZUERICH". */
  kioskId: string;
  name: string;
  /** ISO timestamp the training finished. */
  completedAt: string | null;
  /** Total seconds across the circuit, when the kiosk finalised it. */
  totalTime: number | null;
  /** Mean HR across the session, or null when no strap was worn. */
  hrAverage: number | null;
  exercises: KioskExercise[];
}

export interface KioskTrainingsResponse {
  trainings: KioskTraining[];
  /** Where the data came from, shown in the UI so it reads as real, not seeded. */
  source: string;
  /** When this response was assembled, ISO. */
  fetchedAt: string;
}
