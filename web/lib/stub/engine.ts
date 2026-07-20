/**
 * Stub engine — a client-side stand-in for the real Python/FastAPI engine.
 *
 * It mirrors the real engine's *shape and behavior* so the front end is built
 * against the true contracts: ML estimates state, rules generate the plan,
 * plans re-adapt on new data. When the real engine exists, these functions
 * become `fetch('/estimate' | '/generate-plan' | '/update-plan')` calls and
 * nothing in the UI changes.
 *
 * What it demonstrates (maps to the acceptance criteria):
 *  1. Cold start — a guest with no history still gets a sensible plan.
 *  2. Personalization — different histories/goals → visibly different plans.
 *  3/5. Adaptive loop — completing a session moves metrics, streak, league,
 *       quests, rewards, and can progress the plan, each with a reason.
 *  4. Integration-ready — a plan week exports as a `CreateTrainingRequest`.
 *
 * Equipment-agnostic by construction: the plan is written in *stimulus*, then
 * resolved onto whatever stations the chosen gym actually has.
 */

import type {
  FitnessEstimate,
  Plan,
  PlannedSession,
  PlannedWeek,
  QuestionnaireAnswers,
  StimulusType,
  HrZone,
  TrainingGoal,
} from '../types/plan';
import type {
  MemberEngagement,
  MetricSnapshot,
  Reward,
  AdaptiveUpdate,
  LeagueTier,
} from '../types/engagement';
import type { GymConcept, GymStation } from '../types/gym';
import { STIMULUS_LABELS } from '../labels';
import { type DemoMember, rewardCatalogFor } from './data';

const now = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Fitness estimate — the "model" half
// ---------------------------------------------------------------------------

interface Estimate extends FitnessEstimate {
  bodyAge: number;
  brainAge: number;
  actualAge: number;
}

const ACTIVITY_BASE: Record<QuestionnaireAnswers['activityLevel'], number> = {
  sedentary: 30,
  light: 42,
  moderate: 54,
  active: 66,
  very_active: 76,
};

/** Tanaka cold-start prior for max HR. */
const tanaka = (age: number) => Math.round(208 - 0.7 * age);

export function estimate(member: DemoMember, answers: QuestionnaireAnswers): Estimate {
  if (member.baseline) {
    const b = member.baseline;
    return {
      source: 'session_history',
      fitnessScore: b.fitnessScore,
      estimatedHrRest: b.hrRest,
      estimatedHrMax: b.hrMax,
      confidence: Math.min(0.95, 0.4 + b.workoutsAnalyzed / 160),
      workoutsAnalyzed: b.workoutsAnalyzed,
      estimatedAt: now(),
      bodyAge: b.bodyAge,
      brainAge: b.brainAge,
      actualAge: b.actualAge,
    };
  }
  // Cold start: questionnaire only.
  const fitnessScore = ACTIVITY_BASE[answers.activityLevel];
  const age = answers.age;
  return {
    source: 'questionnaire_only',
    fitnessScore,
    estimatedHrRest: Math.round(74 - fitnessScore * 0.18),
    estimatedHrMax: tanaka(age),
    confidence: 0.3,
    workoutsAnalyzed: 0,
    estimatedAt: now(),
    bodyAge: Math.round(age + (50 - fitnessScore) / 5),
    brainAge: age,
    actualAge: age,
  };
}

// ---------------------------------------------------------------------------
// Plan generation — the "rules" half
// ---------------------------------------------------------------------------

/** Ordered stimulus priority per goal; the week rotates through it. */
const GOAL_STIMULI: Record<TrainingGoal, StimulusType[]> = {
  lose_weight_burn_fat: ['cardio_intensity', 'cardio_endurance', 'strength', 'cardio_intensity'],
  build_strength_muscle: ['strength', 'strength', 'power_speed', 'cardio_intensity'],
  improve_fitness_endurance: ['cardio_endurance', 'cardio_intensity', 'cardio_endurance', 'cognitive_motor'],
  move_pain_free: ['mobility_stability', 'recovery', 'mobility_stability', 'cardio_endurance'],
  boost_health_longevity: ['cardio_endurance', 'strength', 'mobility_stability', 'recovery'],
  improve_sports_performance: ['power_speed', 'cognitive_motor', 'cardio_intensity', 'strength'],
  prepare_for_event: ['cardio_intensity', 'cardio_endurance', 'strength', 'cardio_intensity'],
  train_body_mind: ['cognitive_motor', 'cardio_intensity', 'cognitive_motor', 'recovery'],
};

const ZONE_FOR_STIMULUS: Record<StimulusType, HrZone> = {
  cardio_endurance: 3,
  cardio_intensity: 4,
  cognitive_motor: 3,
  recovery: 1,
  strength: 3,
  mobility_stability: 1,
  power_speed: 4,
};

const ZONE_FRACTION: Record<HrZone, number> = { 1: 0.5, 2: 0.6, 3: 0.7, 4: 0.82, 5: 0.9 };

function bpmForZone(zone: HrZone, est: Estimate): { min: number; max: number } {
  const frac = ZONE_FRACTION[zone];
  const reserve = est.estimatedHrMax - est.estimatedHrRest;
  const mid = est.estimatedHrRest + frac * reserve;
  return { min: Math.round(mid - 5), max: Math.round(mid + 5) };
}

/** Find a station at this gym that can deliver the stimulus. */
function resolveStation(gym: GymConcept, stimulus: StimulusType): { station: GymStation; substituted: boolean } {
  const direct = gym.stations.find((s) => s.stimulusTypes.includes(stimulus));
  if (direct) return { station: direct, substituted: false };
  // Fallback: this gym can't deliver that stimulus — substitute its best cardio
  // station and flag it honestly in the rationale.
  const fallback =
    gym.stations.find((s) => s.stimulusTypes.includes('cardio_intensity')) ?? gym.stations[0];
  return { station: fallback, substituted: true };
}

/** A plan session resolved onto a concrete station at the member's gym. */
export interface ResolvedSession {
  session: PlannedSession;
  stationName: string;
  stationIsSphery: boolean;
  substituted: boolean;
}
export interface ResolvedWeek {
  weekNumber: number;
  focus?: string;
  sessions: ResolvedSession[];
}

/** The full engine output the UI renders: canonical plan + gym resolution + engagement. */
export interface PlanView {
  plan: Plan;
  gym: GymConcept;
  resolved: ResolvedWeek[];
  engagement: MemberEngagement;
}

function baseDifficulty(fitnessScore: number): number {
  return Math.min(8, Math.max(1, Math.round(fitnessScore / 12)));
}

function buildWeeks(gym: GymConcept, answers: QuestionnaireAnswers, est: Estimate): {
  weeks: PlannedWeek[];
  resolved: ResolvedWeek[];
} {
  const perWeek = answers.sessionsPerWeek ?? 3;
  const length = answers.sessionLengthMinutes ?? 30;
  const rotation = GOAL_STIMULI[answers.goal];
  const startDiff = baseDifficulty(est.fitnessScore);
  const WEEKS = 4;

  const weeks: PlannedWeek[] = [];
  const resolved: ResolvedWeek[] = [];

  for (let w = 1; w <= WEEKS; w++) {
    const isDeload = w === WEEKS;
    const weekDiff = isDeload ? Math.max(1, startDiff - 1) : Math.min(10, startDiff + (w - 1));
    const focus = isDeload ? 'Consolidation week — lighter, lock in gains' : w === 1 ? 'Base' : `Progression +${w - 1}`;

    const sessions: PlannedSession[] = [];
    const rSessions: ResolvedSession[] = [];

    for (let i = 0; i < perWeek; i++) {
      const stimulus = rotation[i % rotation.length];
      const zone = isDeload && stimulus === 'cardio_intensity' ? (2 as HrZone) : ZONE_FOR_STIMULUS[stimulus];
      const { station, substituted } = resolveStation(gym, stimulus);
      const adaptivityType =
        stimulus === 'cognitive_motor' ? 'cognitionOnly' : zone >= 3 ? 'hrTracking' : 'performance';

      const session: PlannedSession = {
        id: `w${w}-s${i + 1}`,
        order: i + 1,
        stimulusType: stimulus,
        adaptivityType,
        hrTarget: { zone, bpm: bpmForZone(zone, est) },
        durationMinutes: length,
        difficulty: weekDiff,
        rationale: substituted
          ? `${gym.name} has no dedicated ${STIMULUS_LABELS[stimulus]} station — substituted ${station.name} to keep the stimulus close.`
          : `${STIMULUS_LABELS[stimulus]} on the ${station.name}, zone ${zone}. ${isDeload ? 'Eased off this week to consolidate.' : `Difficulty ${weekDiff} matches your fitness estimate.`}`,
      };
      sessions.push(session);
      rSessions.push({
        session,
        stationName: station.name,
        stationIsSphery: !!station.isSpheryEquipment,
        substituted,
      });
    }

    weeks.push({ weekNumber: w, focus, sessions });
    resolved.push({ weekNumber: w, focus, sessions: rSessions });
  }

  return { weeks, resolved };
}

// ---------------------------------------------------------------------------
// Engagement — the habit loop
// ---------------------------------------------------------------------------

function tierFor(fitnessScore: number): LeagueTier {
  if (fitnessScore >= 75) return 'gold';
  if (fitnessScore >= 60) return 'silver';
  return 'bronze';
}

function metricsFor(est: Estimate): MetricSnapshot[] {
  return [
    { key: 'fitness_score', label: 'Fitness', value: est.fitnessScore, unit: 'pts', polarity: 'higher_is_better', caption: est.source === 'session_history' ? `From ${est.workoutsAnalyzed} workouts` : 'Estimated from your questionnaire', measuredAt: now() },
    { key: 'body_age', label: 'Body Age', value: est.bodyAge, unit: 'yrs', polarity: 'lower_is_better', caption: `You're ${est.actualAge}. ${est.bodyAge < est.actualAge ? `Training ${est.actualAge - est.bodyAge} yrs younger.` : est.bodyAge > est.actualAge ? `${est.bodyAge - est.actualAge} yrs to catch up.` : 'Right on your age.'}`, measuredAt: now() },
    { key: 'brain_age', label: 'Brain Age', value: est.brainAge, unit: 'yrs', polarity: 'lower_is_better', caption: est.source === 'session_history' ? 'From your Brain Speed benchmark' : 'Baseline — take a Brain Speed test to refine', measuredAt: now() },
    { key: 'weekly_load', label: 'This Week', value: 0, unit: 'min', polarity: 'higher_is_better', caption: 'Minutes trained so far', measuredAt: now() },
  ];
}

function engagementFor(member: DemoMember, gym: GymConcept, answers: QuestionnaireAnswers, est: Estimate): MemberEngagement {
  const perWeek = answers.sessionsPerWeek ?? 3;
  const history = member.baseline;
  const pointsBalance = history ? (history.workoutsAnalyzed > 100 ? 420 : 180) : 0;
  const currentWeeks = history ? (history.workoutsAnalyzed > 100 ? 12 : 3) : 0;

  const catalog = rewardCatalogFor(gym.id).map((r) => ({
    ...r,
    status: (pointsBalance >= r.pointsCost ? 'unlocked' : 'locked') as Reward['status'],
  }));

  return {
    userId: member.id,
    metrics: metricsFor(est),
    streak: {
      currentWeeks,
      longestWeeks: Math.max(currentWeeks, history ? 14 : 0),
      weekProgress: { completed: 0, target: perWeek },
      freezesAvailable: 1,
      lastSessionAt: history ? now() : undefined,
    },
    league: {
      tier: tierFor(est.fitnessScore),
      pointsThisWeek: history ? 240 : 0,
      rank: history ? (history.workoutsAnalyzed > 100 ? 4 : 11) : 30,
      cohortSize: 30,
      pointsToPromotion: history ? 90 : 360,
      inPromotionZone: false,
      inRelegationZone: !history,
      weekEndsAt: now(),
    },
    quests: [
      { id: 'q-week', title: 'Show up this week', description: `Complete ${perWeek} sessions`, progress: { current: 0, target: perWeek }, rewardPoints: 100, completed: false },
      { id: 'q-pr', title: 'Beat your last score', description: 'Top your previous best in any session', progress: { current: 0, target: 1 }, rewardPoints: 60, completed: false },
      { id: 'q-explore', title: 'Try something new', description: 'Complete a stimulus you haven\'t done yet', progress: { current: 0, target: 1 }, rewardPoints: 50, completed: false },
    ],
    wallet: { pointsBalance, catalog },
    updatedAt: now(),
  };
}

// ---------------------------------------------------------------------------
// Public API — mirrors the real engine endpoints
// ---------------------------------------------------------------------------

/** POST /generate-plan */
export function generatePlan(member: DemoMember, gym: GymConcept, answers: QuestionnaireAnswers): PlanView {
  const est = estimate(member, answers);
  const { weeks, resolved } = buildWeeks(gym, answers, est);
  const perWeek = answers.sessionsPerWeek ?? 3;

  const plan: Plan = {
    id: `plan-${member.id}-${Date.now()}`,
    userId: member.id,
    goal: answers.goal,
    createdAt: now(),
    fitnessEstimate: est,
    rationale: `${perWeek}×/week for ${member.name === 'Guest' ? 'you' : member.name} at ${gym.name}, built for "${answers.goal.replace(/_/g, ' ')}". Starting difficulty ${baseDifficulty(est.fitnessScore)} from a fitness estimate of ${est.fitnessScore}/100 (${est.source === 'session_history' ? `${est.workoutsAnalyzed} workouts analyzed` : 'cold start — questionnaire only'}).`,
    weeks,
  };

  return { plan, gym, resolved, engagement: engagementFor(member, gym, answers, est) };
}

/**
 * POST /update-plan — apply one completed session and return what changed.
 * Mutates a copy of the view and hands back the AdaptiveUpdate for the toast.
 */
export function completeSession(view: PlanView, completedSoFar: number): { view: PlanView; update: AdaptiveUpdate } {
  const e = structuredClone(view.engagement);
  const planChanges: string[] = [];
  const newlyUnlocked: Reward[] = [];

  // Streak + week progress
  e.streak.weekProgress.completed = Math.min(e.streak.weekProgress.target, e.streak.weekProgress.completed + 1);
  e.streak.lastSessionAt = now();
  const hitTarget = e.streak.weekProgress.completed >= e.streak.weekProgress.target;
  if (hitTarget) e.streak.currentWeeks += 1;

  // Points → league + wallet
  const earned = 120;
  e.league.pointsThisWeek += earned;
  e.wallet.pointsBalance += earned;
  if (e.league.pointsToPromotion !== undefined) {
    e.league.pointsToPromotion = Math.max(0, e.league.pointsToPromotion - earned);
    e.league.inPromotionZone = e.league.pointsToPromotion === 0;
    if (e.league.rank > 1) e.league.rank -= 1;
  }
  e.league.inRelegationZone = false;

  // Quests
  const weekQuest = e.quests.find((q) => q.id === 'q-week');
  if (weekQuest && !weekQuest.completed) {
    weekQuest.progress.current = Math.min(weekQuest.progress.target, weekQuest.progress.current + 1);
    if (weekQuest.progress.current >= weekQuest.progress.target) {
      weekQuest.completed = true;
      e.wallet.pointsBalance += weekQuest.rewardPoints;
    }
  }
  const exploreQuest = e.quests.find((q) => q.id === 'q-explore');
  if (exploreQuest && !exploreQuest.completed && completedSoFar === 0) {
    exploreQuest.completed = true;
    exploreQuest.progress.current = 1;
    e.wallet.pointsBalance += exploreQuest.rewardPoints;
  }

  // Rewards newly unlocked by the new balance
  for (const r of e.wallet.catalog) {
    if (r.status === 'locked' && e.wallet.pointsBalance >= r.pointsCost) {
      r.status = 'unlocked';
      newlyUnlocked.push(r);
    }
  }

  // Metrics move
  const metricChanges: MetricSnapshot[] = [];
  const bump = (key: MetricSnapshot['key'], d: number, caption: string) => {
    const m = e.metrics.find((x) => x.key === key);
    if (!m) return;
    m.value = Math.round((m.value + d) * 10) / 10;
    m.delta = d;
    m.caption = caption;
    m.measuredAt = now();
    metricChanges.push(m);
  };
  bump('fitness_score', +1, 'HR recovery improved after this session');
  bump('body_age', -0.3, 'Trending younger');
  const load = e.metrics.find((x) => x.key === 'weekly_load');
  if (load) bump('weekly_load', view.resolved[0].sessions[0]?.session.durationMinutes ?? 30, 'Added this session');

  // Plan progression — on the 2nd session, nudge intensity up (the adaptive story)
  const next = structuredClone(view);
  if (completedSoFar + 1 === 2) {
    for (const wk of next.resolved) {
      for (const rs of wk.sessions) {
        if (rs.session.stimulusType === 'cardio_intensity' && rs.session.difficulty < 10) {
          rs.session.difficulty += 1;
        }
      }
    }
    for (const wk of next.plan.weeks) {
      for (const s of wk.sessions) {
        if (s.stimulusType === 'cardio_intensity' && s.difficulty < 10) s.difficulty += 1;
      }
    }
    planChanges.push('HR recovery improved, so intensity sessions were bumped one level.');
  }

  next.engagement = e;

  const summary = hitTarget
    ? `Weekly target hit — streak now ${e.streak.currentWeeks} weeks! +${earned} pts.`
    : `Session logged. +${earned} pts · fitness ${e.metrics.find((m) => m.key === 'fitness_score')?.value}.`;

  return { view: next, update: { userId: view.engagement.userId, triggeredBy: now(), planChanges, metricChanges, newlyUnlocked, summary } };
}

// ---------------------------------------------------------------------------
// Integration proof — export a plan week as a kiosk CreateTrainingRequest
// ---------------------------------------------------------------------------

/** Shapes the real kiosk `POST circle-trainings` body (see kiosk repo). */
export interface CreateTrainingRequest {
  kioskId: string;
  setupByUserId: number | null;
  hyrox: boolean;
  name: string;
  mode: 'single' | 'double' | 'relay';
  style: 'duration' | 'score' | 'repetitions';
  exercises: { orderIndex: number; style: 'duration' | 'score' | 'repetitions'; name: string; target: string }[];
}

export function toCreateTrainingRequest(view: PlanView, weekNumber = 1): CreateTrainingRequest {
  const week = view.resolved.find((w) => w.weekNumber === weekNumber) ?? view.resolved[0];
  return {
    kioskId: view.gym.id,
    setupByUserId: null,
    hyrox: false,
    name: `${view.plan.goal.replace(/_/g, ' ')} — week ${week.weekNumber}`,
    mode: 'single',
    style: 'duration',
    exercises: week.sessions.map((rs, i) => ({
      orderIndex: i,
      style: 'duration',
      name: rs.stationName,
      target: `${rs.session.durationMinutes} min @ zone ${rs.session.hrTarget.zone}`,
    })),
  };
}
