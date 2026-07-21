/**
 * Habit-loop / engagement data model — the retention layer that wraps the
 * training plan (see ./plan.ts). This is what turns "a plan generator" into
 * "a reason to come back": intuitive progress metrics, a session streak, a
 * Duolingo-style league, small quests, and gym-defined rewards.
 *
 * Same boundary rules as plan.ts: every type crosses HTTP to the Python
 * engine as JSON — string-literal unions map 1:1 to Pydantic `Literal`s, and
 * all dates are ISO 8601 strings, never `Date`.
 *
 * Design stance:
 *  - Metrics are *intuitive* (Strava/Whoop/Garmin), never abstract (no
 *    ring-style "close a goal you can't interpret"). Every metric answers
 *    "am I fitter, and by how much?" at a glance.
 *  - The *software* tracks and triggers rewards; the *gym* supplies the
 *    real-world perk. Reward catalogs are therefore per-gym data, not code.
 */

// ---------------------------------------------------------------------------
// Progress metrics — the "am I getting fitter?" numbers
// ---------------------------------------------------------------------------

export const METRIC_KEYS = [
  /** Composite 0–100, mirrors FitnessEstimate.fitnessScore. */
  'fitness_score',
  /** Intuitive, motivational "you train like a 34-year-old". NOT clinical. */
  'body_age',
  /** Cognitive analogue from the monthly Brain Speed benchmark. */
  'brain_age',
  /** Training volume this week (minutes in target zones), Strava-style. */
  'weekly_load',
] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

/** Which way is "good" for a metric — so the UI colors trends correctly. */
export type MetricPolarity = 'higher_is_better' | 'lower_is_better';

/**
 * One metric at one point in time, with everything the UI needs to render it
 * without extra lookups. The engine owns the interpretation; the UI draws it.
 */
export interface MetricSnapshot {
  key: MetricKey;
  /** Human label, e.g. "Body Age", "Fitness". */
  label: string;
  value: number;
  /** e.g. "years", "pts", "min". Empty string for unitless. */
  unit: string;
  polarity: MetricPolarity;
  /**
   * Signed change since the previous snapshot. A body_age delta of -2 means
   * "2 years younger" — the UI uses `polarity` to know that's an improvement.
   * Undefined for the first ever snapshot.
   */
  delta?: number;
  /** One-line plain read, e.g. "2 years younger than last month." */
  caption?: string;
  /** ISO 8601. */
  measuredAt: string;
}

/**
 * IMPORTANT (Body Age / Brain Age): motivational metrics derived from real
 * data, framed to inspire — never medical claims. The bar is "directionally
 * true and moves correctly with training," not clinical validity.
 */

// ---------------------------------------------------------------------------
// Streak — the "don't break the chain" unit
// ---------------------------------------------------------------------------

/**
 * Consistency is measured in *weeks that hit the plan's session target*, not
 * calendar days — nobody trains at a gym daily, so a daily streak would
 * punish a healthy 3×/week routine. A forgiving "freeze" absorbs one missed
 * week so a single slip doesn't wipe out months of habit.
 */
export interface Streak {
  currentWeeks: number;
  longestWeeks: number;
  /** Sessions completed this week vs. the plan's target. */
  weekProgress: { completed: number; target: number };
  /** Freezes available to absorb a missed week (forgiveness). */
  freezesAvailable: number;
  /** ISO 8601 date of the most recent completed session, if any. */
  lastSessionAt?: string;
}

// ---------------------------------------------------------------------------
// League / rank — the Duolingo-style social pull
// ---------------------------------------------------------------------------

export const LEAGUE_TIERS = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
] as const;
export type LeagueTier = (typeof LEAGUE_TIERS)[number];

export interface LeagueStanding {
  tier: LeagueTier;
  /** Points earned this league week. */
  pointsThisWeek: number;
  /** 1-based rank within the current league cohort. */
  rank: number;
  /** Cohort size, so the UI can say "3rd of 30". */
  cohortSize: number;
  /**
   * Points to reach the next promotion slot. Undefined when already promoting
   * or in the top tier. This is the "you're this close" hook.
   */
  pointsToPromotion?: number;
  inPromotionZone: boolean;
  inRelegationZone: boolean;
  /** ISO 8601 — when the current league week resets. */
  weekEndsAt: string;
}

// ---------------------------------------------------------------------------
// Quests — small, completable near-term wins
// ---------------------------------------------------------------------------

/**
 * A bite-sized goal a member can knock out in days, not months ("train twice
 * this week", "beat your last score"). Early wins convert first-timers into
 * returning members — the whole reason quests sit on top of the long arc of
 * the plan.
 */
export interface Quest {
  id: string;
  title: string;
  /** One line of "what to do". */
  description: string;
  progress: { current: number; target: number };
  /** Points awarded on completion. */
  rewardPoints: number;
  completed: boolean;
}

// ---------------------------------------------------------------------------
// Rewards — points → gym-defined perks
// ---------------------------------------------------------------------------

export const REWARD_KINDS = [
  'free_session',
  'smoothie',
  'coaching',
  'guest_pass',
  'merch',
  'custom',
] as const;
export type RewardKind = (typeof REWARD_KINDS)[number];

export type RewardStatus =
  /** Not enough points yet. */
  | 'locked'
  /** Enough points — claimable. */
  | 'unlocked'
  /** Claimed by the member; awaiting gym fulfilment. */
  | 'claimed'
  /** Fulfilled by the gym (redemption is out of scope for v1 — shown, tracked, not live). */
  | 'redeemed';

export interface Reward {
  id: string;
  kind: RewardKind;
  /** e.g. "Free smoothie", "1 guest pass". */
  label: string;
  pointsCost: number;
  status: RewardStatus;
}

/**
 * The member's standing in the rewards economy. `pointsBalance` is the
 * spendable balance for the catalog, distinct from LeagueStanding.pointsThisWeek
 * (which resets weekly).
 */
export interface RewardsWallet {
  pointsBalance: number;
  /** The gym's catalog with per-reward status for this member. */
  catalog: Reward[];
}

// ---------------------------------------------------------------------------
// Aggregate — the single object the engagement UI reads
// ---------------------------------------------------------------------------

/**
 * Everything the habit-loop surfaces need in one payload, so the home screen
 * renders from a single fetch. Sibling to `Plan`; the UI composes the two.
 */
export interface MemberEngagement {
  userId: string;
  metrics: MetricSnapshot[];
  streak: Streak;
  league: LeagueStanding;
  quests: Quest[];
  wallet: RewardsWallet;
  /** ISO 8601 — when this snapshot was assembled. */
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Adaptive-loop event — the "something changed, and here's why" payload
// ---------------------------------------------------------------------------

/**
 * Emitted after new session data is processed (engine: POST /update-plan).
 * Drives the demo's money moment: complete a session → metrics move, streak
 * ticks, league updates, a quest advances, maybe a reward unlocks — each with
 * a plain-language reason. Acceptance criteria 3 and 5 are both satisfied by
 * rendering this.
 */
export interface AdaptiveUpdate {
  userId: string;
  /** ISO 8601 of the session that triggered the update. */
  triggeredBy: string;
  /** What changed in the plan, in plain language. Empty if the plan held steady. */
  planChanges: string[];
  /** Metrics that moved, post-update (each carries its own delta + caption). */
  metricChanges: MetricSnapshot[];
  /** Rewards newly unlocked by this update, if any. */
  newlyUnlocked: Reward[];
  /** Human-readable summary for the toast/notification, one sentence. */
  summary: string;
}
