/**
 * Live read of completed circle trainings from the NEXUS kiosk API.
 *
 * Runs server-side so it works from the deployed app: v1 reads are public
 * (docs/kiosk-api.md), so there is no token here and nothing to leak. The
 * browser never talks to Sphery directly, which also keeps us off the kiosk
 * API's CORS behaviour.
 *
 * Two hops are needed. The list endpoint returns trainings without their
 * exercises or participants, so the per-training detail is fetched for the
 * handful being displayed. That is why the count is small and cached.
 *
 * Architecture note: this belongs in engine/ under the rule that all data
 * access lives there, and it will move once the engine is hosted somewhere the
 * deployed web app can reach. Until then the engine is localhost-only, so
 * engine-side code cannot reach the public deployment at all. Nothing here
 * computes anything — it fetches, drops values the kiosk did not record, and
 * reshapes.
 */

import type {
  KioskExercise,
  KioskTraining,
  KioskTrainingsResponse,
} from '@/lib/kiosk/types';

const KIOSK_BASE = 'https://devapp.sphery.ch/api/v1';

/** How many completed trainings to show. Each costs one extra detail request. */
const LIMIT = 6;

/** Seconds before a cached response is refetched. The kiosk is not real-time. */
const REVALIDATE = 300;

/**
 * The kiosk records 0 for heart rate when no strap was worn, and has been seen
 * returning negative calorie counts. Neither is a measurement, so both become
 * null rather than reaching the UI as a number a member might believe.
 */
function measured(value: unknown): number | null {
  if (typeof value !== 'number') return null;
  if (!Number.isFinite(value)) return null;
  return value > 0 ? value : null;
}

interface RawLogged {
  orderIndex?: number;
  name?: string;
  target?: string | null;
}

/** Pull one training's detail and flatten it into the app's shape. */
async function fetchTraining(id: number): Promise<KioskTraining | null> {
  const res = await fetch(`${KIOSK_BASE}/circle-trainings/${id}`, {
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) return null;
  const raw = await res.json();

  // v1 exposes one participant per member; the demo reads the first, since we
  // are showing that the connection is live rather than a specific member's
  // history. Per-member history arrives with auth.
  const participant = Array.isArray(raw.participants) ? raw.participants[0] : null;
  const logs: Record<string, unknown>[] = Array.isArray(participant?.exerciseLogs)
    ? participant.exerciseLogs
    : [];

  const exercises: KioskExercise[] = (Array.isArray(raw.exercises) ? raw.exercises : [])
    .map((ex: RawLogged, i: number) => {
      const log = logs[i] ?? {};
      return {
        orderIndex: typeof ex.orderIndex === 'number' ? ex.orderIndex : i + 1,
        name: typeof ex.name === 'string' ? ex.name : 'Station',
        target: typeof ex.target === 'string' ? ex.target : null,
        measuredDuration: measured(log.measuredDuration),
        hrAverage: measured(log.hrAverage),
      };
    })
    .sort((a: KioskExercise, b: KioskExercise) => a.orderIndex - b.orderIndex);

  return {
    id: raw.id,
    kioskId: typeof raw.kioskId === 'string' ? raw.kioskId : 'unknown',
    name: typeof raw.name === 'string' ? raw.name : 'Circle training',
    completedAt: typeof raw.completedAt === 'string' ? raw.completedAt : null,
    totalTime: measured(participant?.totalTime),
    hrAverage: measured(participant?.hrAverage),
    exercises,
  };
}

export async function GET(): Promise<Response> {
  try {
    const listRes = await fetch(
      `${KIOSK_BASE}/circle-trainings?status=completed&size=${LIMIT}`,
      { next: { revalidate: REVALIDATE } },
    );
    if (!listRes.ok) {
      return Response.json({ trainings: [], source: KIOSK_BASE, fetchedAt: new Date().toISOString() });
    }

    const list = await listRes.json();
    const ids: number[] = (Array.isArray(list.entries) ? list.entries : [])
      .map((e: { id?: number }) => e.id)
      .filter((id: unknown): id is number => typeof id === 'number');

    const settled = await Promise.all(ids.map((id) => fetchTraining(id).catch(() => null)));

    const body: KioskTrainingsResponse = {
      // A training with no stations recorded says nothing useful on screen.
      trainings: settled.filter((t): t is KioskTraining => t !== null && t.exercises.length > 0),
      source: KIOSK_BASE,
      fetchedAt: new Date().toISOString(),
    };
    return Response.json(body);
  } catch {
    // The kiosk being unreachable must never break the app: the caller renders
    // nothing rather than an error, exactly like the engine bridge does.
    return Response.json({ trainings: [], source: KIOSK_BASE, fetchedAt: new Date().toISOString() });
  }
}
