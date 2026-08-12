/**
 * MOCK training-progress series. NOT REAL DATA.
 *
 * Max asked for a body/brain trend chart on Today (Aug 11). The engine has no
 * series endpoint yet: MemberEngagement carries one current value per metric,
 * so there is nothing truthful to plot. This file invents a plausible shape so
 * the chart can be designed and reviewed, and the UI labels it as sample data
 * wherever it is drawn.
 *
 * When the real endpoint lands it returns the same `ProgressPoint[]` shape and
 * this file is deleted. The real source exists in the export already: per
 * workout scores in Workouts, and the per-event precision in TimelineMarkers
 * that body/brain scores are computed from.
 */
import type { DemoMember } from './data';

/** How far back the chart looks. Matches the selector in Max's sketch. */
export type ProgressRange = 'plan' | 'weeks' | 'months' | 'years';

export interface ProgressPoint {
  /** Axis label for this point, e.g. "W3" or "Mar". */
  label: string;
  /** Body score 0-100 at this point. */
  body: number;
  /** Brain score 0-100 at this point. */
  brain: number;
  /** A scheduled session the member did not do. Drives the miss markers. */
  missed?: boolean;
}

export const RANGES: { id: ProgressRange; label: string }[] = [
  { id: 'plan', label: 'Training plan' },
  { id: 'weeks', label: 'Weeks' },
  { id: 'months', label: 'Months' },
  { id: 'years', label: 'Years' },
];

/**
 * Deterministic noise. A chart that re-randomises on every render flickers,
 * and differs between the server and client render, so the wobble is seeded
 * from the member instead of Math.random.
 */
function seeded(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function seedOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 4294967296;
  return h;
}

const SHAPE: Record<ProgressRange, { n: number; label: (i: number) => string; missed: number[] }> = {
  // One point per session in the 8-week plan, 3 a week.
  plan: { n: 24, label: (i) => `S${i + 1}`, missed: [9, 12] },
  weeks: { n: 12, label: (i) => `W${i + 1}`, missed: [5] },
  months: {
    n: 12,
    label: (i) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
    missed: [4],
  },
  years: { n: 4, label: (i) => `${2023 + i}`, missed: [] },
};

/**
 * A member's trend over a range.
 *
 * The shape is the point Max is making: progress compounds while you keep
 * showing up, and stalls or slides where sessions get missed. Brain trails
 * body early and catches up, because cognitive gains need the physical base
 * first. Both land near the member's current real scores, so the end of the
 * fake series meets the number shown everywhere else in the app.
 */
export function progressSeries(
  member: DemoMember,
  range: ProgressRange,
  endBody: number,
  endBrain: number,
): ProgressPoint[] {
  const { n, label, missed } = SHAPE[range];
  const rand = seeded(seedOf(member.id + range));
  const missedAt = new Set(missed);

  // Start well below today's scores so the line has somewhere to travel.
  const bodyFrom = Math.max(20, endBody - 26);
  const brainFrom = Math.max(18, endBrain - 30);

  const points: ProgressPoint[] = [];
  let bodyPenalty = 0;
  let brainPenalty = 0;

  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : i / (n - 1);
    // Ease-out: fast early adaptation, then it flattens, which is how training
    // actually goes and keeps the line from reading as a straight ramp.
    const curve = 1 - Math.pow(1 - t, 1.7);
    if (missedAt.has(i)) {
      bodyPenalty += 5;
      brainPenalty += 3.5;
    }
    // Missing costs you, and the cost fades once you are back on plan.
    bodyPenalty = Math.max(0, bodyPenalty - 0.7);
    brainPenalty = Math.max(0, brainPenalty - 0.5);

    const wobble = (rand() - 0.5) * 3.5;
    points.push({
      label: label(i),
      body: clamp(bodyFrom + (endBody - bodyFrom) * curve - bodyPenalty + wobble),
      brain: clamp(brainFrom + (endBrain - brainFrom) * curve * 0.95 - brainPenalty + wobble * 0.8),
      missed: missedAt.has(i),
    });
  }
  return points;
}

const clamp = (v: number) => Math.round(Math.max(0, Math.min(100, v)) * 10) / 10;
