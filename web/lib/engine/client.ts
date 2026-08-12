/**
 * Bridge to the real Python engine (local dev only).
 *
 * When NEXT_PUBLIC_ENGINE_URL is set and the signed-in demo member carries a
 * spheryUserId, the app asks the engine for a fitness estimate computed from
 * the real MySQL export and grafts it onto the member's baseline before plan
 * generation. When the variable is unset (the Vercel demo), everything runs
 * on the stub exactly as before — same screens, same flow.
 *
 * The web stays UI-only: nothing here computes; it fetches and reshapes.
 */

import type { DemoMember } from '../stub/data';
import type { PerceivedEffort } from '../types/engagement';

/** Raw response of GET /estimate/{user_id} on the Python engine. */
export interface EngineEstimate {
  user_id: number;
  ready: boolean;
  level: string | null;
  percentile: number | null;
  population_n: number;
  workouts_analyzed: number;
  hr_workouts: number;
  avg_score: number | null;
  score_swing: number | null;
  avg_brain_score: number | null;
  est_rest_hr: number | null;
  est_max_hr: number | null;
  max_hr_source: 'observed' | 'tanaka' | null;
  hr_recovery_bpm: number | null;
  recovery_quality: string | null;
  effort_habit: string | null;
  zone_shares: number[] | null;
  rationale: string[];
}

export function engineUrl(): string | null {
  return process.env.NEXT_PUBLIC_ENGINE_URL || null;
}

export async function fetchEngineEstimate(spheryUserId: number): Promise<EngineEstimate | null> {
  const base = engineUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/estimate/${spheryUserId}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as EngineEstimate;
  } catch {
    // Engine down or unreachable: fall back to the stub silently. The demo
    // must never break because a local service isn't running.
    return null;
  }
}

/**
 * Ask the Python engine to generate the full plan. Returns null whenever the
 * engine isn't configured or reachable, so callers can fall back to the stub.
 * The gym's stations travel in the request — the engine stays
 * equipment-agnostic and this app stays UI-only.
 */
export async function fetchEnginePlan(
  member: DemoMember,
  gym: { id: string; name: string; stations: unknown[] },
  answers: { age: number; goal: string; focus?: string[]; activityLevel: string; sessionsPerWeek?: number; sessionLengthMinutes?: number; currentIntensity?: 1 | 2 | 3 | 4 | 5 },
): Promise<{ plan: unknown; resolved: unknown[] } | null> {
  const base = engineUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/generate-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spheryUserId: member.spheryUserId ?? null,
        memberName: member.name,
        answers: {
          age: answers.age,
          goal: answers.goal,
          focus: answers.focus ?? [],
          activityLevel: answers.activityLevel,
          sessionsPerWeek: answers.sessionsPerWeek ?? 3,
          sessionLengthMinutes: answers.sessionLengthMinutes ?? 30,
          // Optional: the intake only sets it when the member filled in the
          // volume slider or listed sports. Omitted means "no signal", not 3.
          currentIntensity: answers.currentIntensity,
        },
        gym: { id: gym.id, name: gym.name, stations: gym.stations },
      }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as { plan: unknown; resolved: unknown[] };
  } catch {
    return null;
  }
}

/**
 * Report a completed session to the engine's adaptive loop. Returns the
 * adjusted plan + what changed and why, or null to keep the stub behavior.
 *
 * We send the member's own effort rating and deliberately do NOT send
 * `hrAverage`. The engine's evidence ladder (engine/app/adapt.py) puts heart
 * rate above perceived effort, and our live-session HR is simulated — sending
 * it would make invented numbers outrank the member's real answer and then
 * quote them back as the reason. Without it the ladder falls to perceived
 * effort, then to the real score trend from the export. Both are honest.
 * Send HR here the day it comes from an actual belt or watch.
 */
export async function fetchEngineUpdate(
  member: DemoMember,
  view: { plan: unknown; resolved: unknown[] },
  completedSessionId: string,
  effort?: PerceivedEffort,
): Promise<{ plan: unknown; resolved: unknown[]; planChanges: string[]; summary: string } | null> {
  const base = engineUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/update-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spheryUserId: member.spheryUserId ?? null,
        plan: view.plan,
        resolved: view.resolved,
        completedSessionId,
        result: effort ? { perceivedEffort: effort } : undefined,
      }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as { plan: unknown; resolved: unknown[]; planChanges: string[]; summary: string };
  } catch {
    return null;
  }
}

/**
 * Return the member with their baseline replaced by real engine numbers.
 * Falls back to the member unchanged whenever live data isn't available.
 */
export async function withLiveBaseline(
  member: DemoMember,
): Promise<{ member: DemoMember; live: EngineEstimate | null }> {
  if (!member.spheryUserId) return { member, live: null };
  const est = await fetchEngineEstimate(member.spheryUserId);
  if (!est || !est.ready) return { member, live: est };

  const prior = member.baseline;
  return {
    live: est,
    member: {
      ...member,
      baseline: {
        // Real history: the percentile among regular members is the composite
        // 0-100 fitness score the plan difficulty derives from.
        workoutsAnalyzed: est.workouts_analyzed,
        fitnessScore: est.percentile ?? prior?.fitnessScore ?? 50,
        hrRest: est.est_rest_hr ?? prior?.hrRest ?? 60,
        hrMax: est.est_max_hr ?? prior?.hrMax ?? 180,
        // The export's bodyScore column is degenerate (~1 everywhere, see
        // engine/app/features.py), so movement/cognitive scores keep the
        // persona seed until a real source exists.
        bodyScore: prior?.bodyScore ?? est.percentile ?? 50,
        brainScore: prior?.brainScore ?? est.percentile ?? 50,
        bodyAge: prior?.bodyAge ?? 35,
        brainAge: prior?.brainAge ?? 35,
        actualAge: prior?.actualAge ?? 35,
      },
    },
  };
}
