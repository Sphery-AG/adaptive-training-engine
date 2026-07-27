'use client';

/**
 * The member's home after a plan is generated — a 4-tab app (Today / Plan /
 * Progress / Circle) with a bottom nav, modeled on the Sphere Loop concept
 * (docs/design-reference/sphere-loop). Mobile-framed single column. Renders
 * pure engine output (PlanView + engagement); the "Complete session" action is
 * the demo's adaptive money-moment (criteria 3 + 5).
 */
import { useEffect, useState } from 'react';
import type { PlanView, ResolvedSession } from '@/lib/stub/engine';
import { toCreateTrainingRequest } from '@/lib/stub/engine';
import type { AdaptiveUpdate, MetricKey, MetricSnapshot, Quest, Reward } from '@/lib/types/engagement';
import { LEAGUE_TIERS, type LeagueTier } from '@/lib/types/engagement';
import type { StimulusType } from '@/lib/types/plan';
import { STIMULUS_LABELS } from '@/lib/labels';
import type { DemoMember } from '@/lib/stub/data';
import { Icon, type IconName } from './icons';
import { RingGauge } from './RingGauge';
import { Sparkline } from './Sparkline';

type Tab = 'today' | 'plan' | 'progress' | 'circle';

const TABS: Array<{ id: Tab; label: string; icon: IconName }> = [
  { id: 'today', label: 'Today', icon: 'sparkle' },
  { id: 'plan', label: 'Plan', icon: 'orbit' },
  { id: 'progress', label: 'Progress', icon: 'pulse' },
  { id: 'circle', label: 'Circle', icon: 'users' },
];

const STIMULUS_DOT: Record<StimulusType, string> = {
  cardio_endurance: 'bg-sky-400',
  cardio_intensity: 'bg-orange-400',
  cognitive_motor: 'bg-violet-400',
  recovery: 'bg-emerald-400',
  strength: 'bg-rose-400',
  mobility_stability: 'bg-teal-400',
  power_speed: 'bg-amber-400',
};

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}

function metric(metrics: MetricSnapshot[], key: MetricKey): MetricSnapshot | undefined {
  return metrics.find((m) => m.key === key);
}

function deltaIsGood(m?: MetricSnapshot): boolean {
  if (!m || m.delta === undefined || m.delta === 0) return true;
  return m.polarity === 'higher_is_better' ? m.delta > 0 : m.delta < 0;
}

function trendOf(m?: MetricSnapshot): 'up' | 'down' | 'flat' {
  if (!m || m.delta === undefined || m.delta === 0) return 'flat';
  return deltaIsGood(m) ? 'up' : 'down';
}

function confidenceLevel(c: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (c >= 0.66) return 'HIGH';
  if (c >= 0.33) return 'MEDIUM';
  return 'LOW';
}

function nextTier(tier: LeagueTier): string {
  const i = LEAGUE_TIERS.indexOf(tier);
  return i >= 0 && i < LEAGUE_TIERS.length - 1 ? LEAGUE_TIERS[i + 1] : 'top tier';
}

export default function MemberApp({
  member,
  view,
  lastUpdate,
  onComplete,
  onRestart,
}: {
  member: DemoMember;
  view: PlanView;
  lastUpdate: AdaptiveUpdate | null;
  onComplete: () => void;
  onRestart: () => void;
}) {
  const [tab, setTab] = useState<Tab>('today');
  const [dismissed, setDismissed] = useState<AdaptiveUpdate | null>(null);
  const toast = lastUpdate && lastUpdate !== dismissed ? lastUpdate : null;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setDismissed(toast), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const head = HEAD[tab];

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pt-8 pb-28">
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-fuchsia">{head.eyebrow}</p>
          <h1 className="mt-1 text-3xl leading-none">{head.title(member)}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRestart}
            className="rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-faint transition-colors hover:text-white"
          >
            Start over
          </button>
          <span className="relative grid h-10 w-10 place-items-center rounded-full border border-border text-dim">
            <Icon name="bell" size={18} />
            <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-fuchsia" />
          </span>
        </div>
      </header>

      <div key={tab} className="animate-screen-in mt-6 flex-1">
        {tab === 'today' && <TodayTab view={view} lastUpdate={lastUpdate} onComplete={onComplete} />}
        {tab === 'plan' && <PlanTab view={view} />}
        {tab === 'progress' && <ProgressTab view={view} />}
        {tab === 'circle' && <CircleTab view={view} />}
      </div>

      {toast && <Toast toast={toast} />}
      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}

const HEAD: Record<Tab, { eyebrow: string; title: (m: DemoMember) => string }> = {
  today: { eyebrow: 'Adaptive plan · live', title: (m) => `Hi, ${m.name}` },
  plan: { eyebrow: 'Adaptive protocol', title: () => '4-Week Plan' },
  progress: { eyebrow: 'Directionally true', title: () => 'Progress' },
  circle: { eyebrow: 'Habit loop', title: () => 'Your Circle' },
};

// ---------------------------------------------------------------------------
// Today
// ---------------------------------------------------------------------------

function TodayTab({
  view,
  lastUpdate,
  onComplete,
}: {
  view: PlanView;
  lastUpdate: AdaptiveUpdate | null;
  onComplete: () => void;
}) {
  const { plan, resolved, engagement: e } = view;
  const week1 = resolved[0];
  const next = week1?.sessions[0];
  const bodyAge = metric(e.metrics, 'body_age');
  const conf = plan.fitnessEstimate;
  const quest = e.quests.find((q) => !q.completed) ?? e.quests[0];

  return (
    <div className="space-y-4">
      {/* Current-protocol hero */}
      {next && (
        <div className="relative overflow-hidden rounded-[26px] border border-[var(--accent-soft2)] p-6"
          style={{ background: 'radial-gradient(120% 130% at 15% 0%, var(--accent-soft), transparent 62%)' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow text-accent">Current protocol</p>
              <p className="mt-1 text-xs tracking-wide text-faint">
                WEEK {week1.weekNumber} · SESSION 01
              </p>
            </div>
            <span className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-dim">
              Zone {next.session.hrTarget.zone}
            </span>
          </div>
          <h2 className="mt-4 text-4xl leading-[0.95]">{STIMULUS_LABELS[next.session.stimulusType]}</h2>
          <p className="mt-3 max-w-[16rem] text-sm leading-relaxed text-dim">{next.session.rationale}</p>
          <div className="mt-6 flex items-end justify-between">
            <div>
              <div className="text-2xl text-fuchsia">{next.session.durationMinutes} MIN</div>
              <div className="eyebrow mt-1 text-faint">
                Duration · {next.stationName}
              </div>
            </div>
            <button
              type="button"
              onClick={onComplete}
              aria-label="Start and complete this session"
              className="grid h-16 w-16 place-items-center rounded-full bg-white text-black transition hover:brightness-95"
              style={{ boxShadow: '0 0 30px -6px var(--orbit-cyan)' }}
            >
              <Icon name="play" size={26} />
            </button>
          </div>
        </div>
      )}

      {/* Body Age + Streak */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <p className="eyebrow text-accent">Body Age</p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-4xl text-accent">{bodyAge?.value ?? '—'}</span>
            {bodyAge?.delta !== undefined && bodyAge.delta !== 0 && (
              <span className="eyebrow text-mint">
                {bodyAge.delta > 0 ? '+' : ''}{bodyAge.delta} yrs
              </span>
            )}
          </div>
          <p className="mt-2 text-xs leading-tight text-faint">{bodyAge?.caption ?? 'Trending with your training.'}</p>
        </Card>
        <Card>
          <p className="eyebrow text-fuchsia">Streak</p>
          <div className="mt-1 flex items-center gap-2 text-4xl">
            <Icon name="flame" size={26} className="text-fuchsia" />
            {e.streak.currentWeeks}
            <span className="text-base text-faint">wks</span>
          </div>
          <p className="mt-2 text-xs text-faint">Longest: {e.streak.longestWeeks} wks</p>
        </Card>
      </div>

      {/* This week's load */}
      <Card>
        <div className="flex items-center justify-between">
          <p className="eyebrow text-dim">This Week</p>
          <p className="text-sm font-semibold text-accent tabular">
            {e.streak.weekProgress.completed}/{e.streak.weekProgress.target}
          </p>
        </div>
        <Bar fraction={e.streak.weekProgress.completed / Math.max(1, e.streak.weekProgress.target)} />
        <div className="mt-2 flex justify-between text-[11px] text-faint">
          <span>Sessions completed</span>
          <span>Target {e.streak.weekProgress.target}</span>
        </div>
      </Card>

      {/* Today's quest */}
      {quest && (
        <Card>
          <div className="flex items-center justify-between">
            <p className="eyebrow text-fuchsia">Today&rsquo;s Quest</p>
            <span className="text-xs text-faint tabular">{quest.progress.current}/{quest.progress.target}</span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-fuchsia/40 text-fuchsia">
              <Icon name="target" size={16} />
            </span>
            <span className="text-sm font-medium">{quest.title}</span>
          </div>
          <Bar className="mt-3" fraction={quest.progress.current / Math.max(1, quest.progress.target)} color="var(--orbit-fuchsia)" />
        </Card>
      )}

      {/* Plan adapted / confidence */}
      {lastUpdate ? (
        <Card className="border-violet/25">
          <div className="flex items-center justify-between">
            <p className="eyebrow text-violet">Plan Adapted</p>
            <Icon name="refresh" size={15} className="text-violet" />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-dim">{lastUpdate.summary}</p>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Icon name="info" size={15} className="text-accent" />
              <span className="eyebrow text-dim">Plan Confidence</span>
            </span>
            <LevelPill level={confidenceLevel(conf.confidence)} />
          </div>
          <p className="mt-2 text-xs text-faint">
            {conf.source === 'questionnaire_only'
              ? 'Cold start — built from your questionnaire. Sharpens with every session.'
              : `Based on ${conf.workoutsAnalyzed} analyzed workouts.`}
          </p>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

function PlanTab({ view }: { view: PlanView }) {
  const { plan, resolved } = view;
  const [showJson, setShowJson] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-dim">{plan.rationale}</p>

      {resolved.map((wk) => (
        <Card key={wk.weekNumber}>
          <div className="flex items-center justify-between">
            <p className="eyebrow text-accent">Week {wk.weekNumber}{wk.focus ? ` · ${wk.focus}` : ''}</p>
            <span className="text-[11px] text-faint">{wk.sessions.length} sessions</span>
          </div>
          <ul className="mt-3 space-y-3">
            {wk.sessions.map((rs) => (
              <SessionRow key={rs.session.id} rs={rs} />
            ))}
          </ul>
        </Card>
      ))}

      {/* Integration proof */}
      <button
        type="button"
        onClick={() => setShowJson((v) => !v)}
        className="flex w-full items-center gap-2 text-sm text-faint transition-colors hover:text-white"
      >
        <Icon name={showJson ? 'chevron-left' : 'chevron-left'} size={16} className={showJson ? '-rotate-90' : 'rotate-180'} />
        Integration-ready output (kiosk <code className="text-accent">CreateTrainingRequest</code>)
      </button>
      {showJson && (
        <pre className="overflow-x-auto rounded-2xl border border-border bg-black/40 p-4 text-[11px] leading-relaxed text-zinc-300">
{JSON.stringify(toCreateTrainingRequest(view, 1), null, 2)}
        </pre>
      )}
    </div>
  );
}

function SessionRow({ rs }: { rs: ResolvedSession }) {
  const s = rs.session;
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${STIMULUS_DOT[s.stimulusType]}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-semibold">{STIMULUS_LABELS[s.stimulusType]}</span>
          <span className="text-xs text-faint">on {rs.stationName}</span>
          {rs.stationIsSphery && (
            <span className="rounded bg-[var(--accent-soft2)] px-1.5 text-[10px] font-semibold text-accent">Sphery</span>
          )}
          {rs.substituted && (
            <span className="inline-flex items-center gap-0.5 rounded bg-amber/15 px-1.5 text-[10px] font-semibold text-amber">
              <Icon name="refresh" size={9} /> substituted
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-faint">
          {s.durationMinutes} min · zone {s.hrTarget.zone}
          {s.hrTarget.bpm ? ` (${s.hrTarget.bpm.min}–${s.hrTarget.bpm.max} bpm)` : ''} · difficulty {s.difficulty}/10
        </div>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

function ProgressTab({ view }: { view: PlanView }) {
  const e = view.engagement;
  const est = view.plan.fitnessEstimate;
  const fitness = metric(e.metrics, 'fitness_score');
  const score = fitness?.value ?? est.fitnessScore;

  return (
    <div className="space-y-5">
      {/* Fitness ring */}
      <div className="grid place-items-center rounded-[26px] border border-border bg-card py-7">
        <p className="eyebrow text-accent">Your Fitness</p>
        <div className="mt-3">
          <RingGauge fraction={score / 100} color="var(--orbit-cyan)">
            <div>
              <div className="text-6xl leading-none text-accent">{score}</div>
              <div className="eyebrow mt-1 text-faint">/ 100</div>
            </div>
          </RingGauge>
        </div>
        {fitness?.caption && <p className="mt-1 max-w-xs px-6 text-center text-sm text-dim">{fitness.caption}</p>}
      </div>

      {/* Metric grid (Body Age / Brain Age / Weekly Load / Fitness delta) */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard m={metric(e.metrics, 'body_age')} accent="var(--orbit-cyan)" tone="text-accent" />
        <MetricCard m={metric(e.metrics, 'brain_age')} accent="var(--orbit-violet)" tone="text-violet" />
        <MetricCard m={metric(e.metrics, 'weekly_load')} accent="var(--orbit-mint)" tone="text-mint" />
        <MetricCard m={fitness} accent="var(--orbit-cyan)" tone="text-accent" />
      </div>

      <p className="px-2 text-center text-[11px] leading-relaxed text-faint">
        Body Age &amp; Brain Age are motivational, directionally-true metrics from your real data — not medical claims.
      </p>
    </div>
  );
}

function MetricCard({ m, accent, tone }: { m?: MetricSnapshot; accent: string; tone: string }) {
  if (!m) return <Card><p className="text-xs text-faint">—</p></Card>;
  const good = deltaIsGood(m);
  return (
    <Card>
      <p className="eyebrow text-dim">{m.label}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`text-3xl ${tone}`}>{m.value}</span>
        <span className="text-xs text-faint">{m.unit}</span>
      </div>
      {m.delta !== undefined && m.delta !== 0 && (
        <div className={`mt-0.5 inline-flex items-center gap-0.5 text-xs font-semibold ${good ? 'text-mint' : 'text-rose-400'}`}>
          <Icon name={m.delta > 0 ? 'arrow-up' : 'arrow-down'} size={12} />
          {Math.abs(m.delta)} {m.unit}
        </div>
      )}
      <div className="mt-2">
        <Sparkline direction={trendOf(m)} color={accent} width={110} height={26} />
      </div>
      {m.caption && <p className="mt-2 text-[11px] leading-tight text-faint">{m.caption}</p>}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Circle
// ---------------------------------------------------------------------------

function CircleTab({ view }: { view: PlanView }) {
  const e = view.engagement;
  const l = e.league;
  const toPromo = l.pointsToPromotion ?? 0;
  const promoFraction = l.inPromotionZone
    ? 1
    : toPromo > 0
      ? l.pointsThisWeek / (l.pointsThisWeek + toPromo)
      : 0.5;

  return (
    <div className="space-y-5">
      {/* League ring */}
      <div className="grid place-items-center rounded-[26px] border border-border bg-card py-7">
        <p className="eyebrow text-fuchsia">This Week&rsquo;s League</p>
        <div className="mt-3">
          <RingGauge fraction={promoFraction} color="var(--orbit-fuchsia)">
            <div>
              <div className="text-5xl uppercase leading-none">{l.tier}</div>
              <div className="eyebrow mt-2 text-fuchsia">
                {toPromo > 0 ? `${toPromo} to ${nextTier(l.tier)}` : 'promoting'}
              </div>
            </div>
          </RingGauge>
        </div>
        <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-fuchsia/30 px-3 py-1.5 text-xs font-semibold text-fuchsia">
          <Icon name="trophy" size={14} />
          {e.streak.weekProgress.completed} / {e.streak.weekProgress.target} sessions
        </span>
        <p className="mt-2 text-[11px] text-faint">{l.rank}{ordinal(l.rank)} of {l.cohortSize}</p>
      </div>

      {/* Active quests */}
      <Card>
        <div className="flex items-center justify-between">
          <p className="eyebrow text-fuchsia">Active Quests</p>
          <span className="eyebrow text-faint">Near-term wins</span>
        </div>
        <ul className="mt-4 space-y-4">
          {e.quests.map((q, i) => (
            <QuestRow key={q.id} q={q} index={i} />
          ))}
        </ul>
      </Card>

      {/* Gym rewards */}
      <Card>
        <div className="flex items-center justify-between">
          <p className="eyebrow text-mint">Gym Rewards</p>
          <span className="eyebrow text-faint">Set by your gym</span>
        </div>
        <ul className="mt-3 space-y-2.5">
          {e.wallet.catalog.map((r) => (
            <RewardRow key={r.id} r={r} balance={e.wallet.pointsBalance} />
          ))}
        </ul>
      </Card>

      <p className="px-4 text-center text-[11px] leading-relaxed text-faint">
        No live leaderboards or history — that lives in the Sphery app.
      </p>
    </div>
  );
}

const QUEST_TONE = ['text-fuchsia border-fuchsia/40', 'text-cyan border-cyan/40', 'text-violet border-violet/40'];

function QuestRow({ q, index }: { q: Quest; index: number }) {
  const tone = QUEST_TONE[index % QUEST_TONE.length];
  return (
    <li className={q.completed ? 'opacity-55' : ''}>
      <div className="flex items-center gap-3">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border ${tone}`}>
          <Icon name={q.completed ? 'check' : 'target'} size={16} />
        </span>
        <span className="flex-1 text-sm font-medium">{q.title}</span>
        <span className="text-xs text-faint tabular">{q.progress.current}/{q.progress.target}</span>
      </div>
      <Bar
        className="mt-2.5"
        fraction={q.progress.current / Math.max(1, q.progress.target)}
        color="var(--orbit-fuchsia)"
      />
    </li>
  );
}

function RewardRow({ r, balance }: { r: Reward; balance: number }) {
  const unlocked = r.status !== 'locked';
  const away = Math.max(0, r.pointsCost - balance);
  return (
    <li className="flex items-center gap-3">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border ${unlocked ? 'border-mint/40 bg-mint/10 text-mint' : 'border-border text-faint'}`}>
        <Icon name={unlocked ? 'gift' : 'lock'} size={18} />
      </span>
      <span className={`flex-1 text-sm font-medium ${unlocked ? '' : 'text-dim'}`}>{r.label}</span>
      <span className={`eyebrow ${unlocked ? 'text-mint' : 'text-faint'}`}>
        {unlocked ? 'Unlocked' : away > 0 ? `${away} away` : `${r.pointsCost} pts`}
      </span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-4 ${className}`}>{children}</div>;
}

function Bar({ fraction, color = 'var(--orbit-cyan)', className = '' }: { fraction: number; color?: string; className?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-white/10 ${className}`}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function LevelPill({ level }: { level: 'LOW' | 'MEDIUM' | 'HIGH' }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-dim">
      <Icon name="bar-chart" size={12} className="text-accent" />
      {level}
    </span>
  );
}

function Toast({ toast }: { toast: AdaptiveUpdate }) {
  return (
    <div className="animate-pop fixed inset-x-0 bottom-24 z-50 mx-auto w-[92%] max-w-md rounded-2xl border border-violet/40 bg-zinc-900/95 p-4 shadow-xl backdrop-blur">
      <div className="flex items-center gap-2 text-sm font-semibold text-violet">
        <Icon name="refresh" size={15} /> {toast.summary}
      </div>
      {toast.newlyUnlocked.map((r) => (
        <div key={r.id} className="mt-1 flex items-center gap-1.5 text-xs text-zinc-300">
          <Icon name="gift" size={13} className="text-mint" /> Unlocked: {r.label}
        </div>
      ))}
    </div>
  );
}

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-[var(--background)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-around px-4 py-3">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 px-3 transition-colors ${active ? 'text-accent' : 'text-faint hover:text-dim'}`}
            >
              <Icon name={t.icon} size={22} />
              <span className="text-[10px] font-semibold uppercase tracking-wider">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
