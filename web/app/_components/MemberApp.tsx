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
  completedCount,
  lastUpdate,
  onComplete,
  onRestart,
}: {
  member: DemoMember;
  view: PlanView;
  completedCount: number;
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
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pt-8 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-fuchsia">{head.eyebrow}</p>
          <h1 className="mt-1 text-3xl leading-none">{head.title(member, view.plan.weeks.length)}</h1>
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
        {tab === 'today' && (
          <TodayTab view={view} completedCount={completedCount} lastUpdate={lastUpdate} onComplete={onComplete} />
        )}
        {tab === 'plan' && <PlanTab view={view} completedCount={completedCount} />}
        {tab === 'progress' && <ProgressTab view={view} />}
        {tab === 'circle' && <CircleTab view={view} />}
      </div>

      {toast && <Toast toast={toast} />}
      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}

const HEAD: Record<Tab, { eyebrow: string; title: (m: DemoMember, weeks: number) => string }> = {
  today: { eyebrow: 'Adaptive plan · live', title: (m) => `Hi, ${m.name}` },
  plan: { eyebrow: 'Adaptive protocol', title: (_m, weeks) => `${weeks}-Week Plan` },
  progress: { eyebrow: 'Directionally true', title: () => 'Progress' },
  circle: { eyebrow: 'Habit loop', title: () => 'Your Circle' },
};

// ---------------------------------------------------------------------------
// Today
// ---------------------------------------------------------------------------

function TodayTab({
  view,
  completedCount,
  lastUpdate,
  onComplete,
}: {
  view: PlanView;
  completedCount: number;
  lastUpdate: AdaptiveUpdate | null;
  onComplete: () => void;
}) {
  const { resolved, engagement: e } = view;
  // Walk the plan as sessions are logged: flatten every week's sessions in
  // order, then point at the next one to do. This is what makes logging a
  // session visibly advance the current protocol instead of freezing on #1.
  const flat = resolved.flatMap((wk) =>
    wk.sessions.map((rs, i) => ({ rs, weekNumber: wk.weekNumber, sessionInWeek: i + 1 })),
  );
  const allDone = completedCount >= flat.length;
  const current = flat[Math.min(completedCount, flat.length - 1)];
  const next = current?.rs;
  // Today shows only what serves today's session: the hero, one slim
  // streak/up-next row, and the adaptation note when the plan just changed.
  // Weekly progress lives on Plan, quests on Circle, metrics on Progress.
  const upNext = allDone ? undefined : flat[completedCount + 1];

  return (
    <div className="space-y-4">
      {/* Current-protocol hero */}
      {next && (
        <div className="relative overflow-hidden rounded-[26px] border border-[var(--accent-soft2)] p-6"
          style={{ background: 'radial-gradient(120% 130% at 15% 0%, var(--accent-soft), transparent 62%)' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow text-accent">{allDone ? 'Plan complete' : 'Current protocol'}</p>
              <p className="mt-1 text-xs tracking-wide text-faint">
                {allDone
                  ? 'Every session logged · retest to recalibrate'
                  : `WEEK ${current.weekNumber} · SESSION ${String(current.sessionInWeek).padStart(2, '0')}`}
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

      {/* Streak + up next, one slim row */}
      <Card className="flex items-center justify-between gap-3">
        <span className="flex shrink-0 items-center gap-2 whitespace-nowrap">
          <Icon name="flame" size={18} className="text-fuchsia" />
          <span className="text-lg font-semibold tabular">{e.streak.currentWeeks}</span>
          <span className="text-[11px] uppercase tracking-wide text-faint">wk streak</span>
        </span>
        {upNext && (
          <span className="whitespace-nowrap text-[11px] text-faint">
            Next: {STIMULUS_LABELS[upNext.rs.session.stimulusType]} · Zone {upNext.rs.session.hrTarget.zone}
          </span>
        )}
      </Card>

      {/* Plan adapted, only when there is something to say */}
      {lastUpdate && (
        <Card className="border-violet/25">
          <div className="flex items-center justify-between">
            <p className="eyebrow text-violet">Plan Adapted</p>
            <Icon name="refresh" size={15} className="text-violet" />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-dim">{lastUpdate.summary}</p>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

function PlanTab({ view, completedCount }: { view: PlanView; completedCount: number }) {
  const { plan, resolved } = view;
  const [showJson, setShowJson] = useState(false);

  // Map completedCount (a flat session index) onto per-week boundaries so the
  // strip and the detail card can mark weeks and sessions done/current/ahead.
  let acc = 0;
  const weekMeta = resolved.map((wk) => {
    const start = acc;
    acc += wk.sessions.length;
    return { wk, start, end: acc };
  });
  const totalSessions = acc;
  const pct = Math.round(Math.min(1, completedCount / Math.max(1, totalSessions)) * 100);
  const currentIdx = weekMeta.findIndex((m) => completedCount < m.end);
  const allDone = currentIdx === -1;
  // One week of detail at a time — the current week by default. The strip is
  // the drill-down into the rest; the full plan is never dumped in one list.
  const [selectedIdx, setSelectedIdx] = useState(allDone ? resolved.length - 1 : currentIdx);
  const [weekMenuOpen, setWeekMenuOpen] = useState(false);
  const sel = weekMeta[selectedIdx];
  const selStatus: 'done' | 'current' | 'projected' =
    sel.end <= completedCount ? 'done' : selectedIdx === currentIdx ? 'current' : 'projected';

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-dim">{plan.rationale}</p>

      {/* Block progress: percent, week strip, where you are */}
      <Card>
        <div className="flex items-center justify-between">
          <p className="eyebrow text-accent">Block Progress</p>
          <span className="text-xs font-semibold text-accent tabular">{pct}% complete</span>
        </div>
        <Bar className="mt-2.5" fraction={completedCount / Math.max(1, totalSessions)} color="var(--orbit-cyan)" />
        <div className="mt-3 flex gap-1.5">
          {weekMeta.map((m, i) => {
            const done = m.end <= completedCount;
            const isCurrent = i === currentIdx;
            return (
              <div
                key={m.wk.weekNumber}
                className={`flex-1 rounded-lg py-1.5 text-center text-[11px] font-semibold tabular ${
                  done ? 'bg-mint/15 text-mint' : isCurrent ? 'bg-[var(--accent-soft)] text-accent' : 'bg-white/[0.05] text-faint'
                }`}
              >
                {done ? <Icon name="check" size={12} className="mx-auto" /> : m.wk.weekNumber}
              </div>
            );
          })}
        </div>
        <p className="mt-2.5 text-[11px] text-faint">
          {allDone
            ? `Block complete, all ${totalSessions} sessions logged. The retest sets up your next block.`
            : `Week ${weekMeta[currentIdx].wk.weekNumber} of ${resolved.length} · ${completedCount} of ${totalSessions} sessions done`}
        </p>
      </Card>

      <div className="flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--accent-soft)] px-3.5 py-2.5">
        <Icon name="refresh" size={14} className="mt-0.5 shrink-0 text-accent" />
        <p className="text-[13px] leading-snug text-dim">
          Your current week is set. The weeks ahead are projections and re-tune from how you actually perform.
        </p>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Icon name="info" size={15} className="text-accent" />
            <span className="eyebrow text-dim">Plan Confidence</span>
          </span>
          <LevelPill level={confidenceLevel(plan.fitnessEstimate.confidence)} />
        </div>
        <p className="mt-2 text-xs text-faint">
          {plan.fitnessEstimate.source === 'questionnaire_only'
            ? 'Cold start, built from your questionnaire. Sharpens with every session.'
            : `Based on ${plan.fitnessEstimate.workoutsAnalyzed} analyzed workouts.`}
        </p>
      </Card>

      {/* Selected week detail, week picked via the dropdown on the title */}
      <Card className="relative">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={(e) => {
              // The panel is absolutely positioned, so it can't extend the
              // page's scroll area; center the trigger first so the capped
              // panel always fits on a phone screen.
              if (!weekMenuOpen) e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
              setWeekMenuOpen((v) => !v);
            }}
            aria-expanded={weekMenuOpen}
            aria-label="Choose week"
            className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
          >
            <span className="eyebrow text-accent">
              Week {sel.wk.weekNumber}
              {sel.wk.focus ? ` · ${sel.wk.focus}` : ''}
            </span>
            <Icon
              name="chevron-left"
              size={13}
              className={`text-accent transition-transform ${weekMenuOpen ? 'rotate-90' : '-rotate-90'}`}
            />
          </button>
          {selStatus === 'done' && (
            <span className="rounded bg-mint/15 px-1.5 py-0.5 text-[10px] font-semibold text-mint">Done</span>
          )}
          {selStatus === 'current' && (
            <span className="rounded bg-[var(--accent-soft2)] px-1.5 py-0.5 text-[10px] font-semibold text-accent">Current</span>
          )}
          {selStatus === 'projected' && (
            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-violet">Projected</span>
          )}
        </div>
        {weekMenuOpen && (
          <div className="absolute inset-x-3 top-11 z-20 max-h-60 overflow-y-auto overscroll-contain rounded-2xl border border-border bg-zinc-900/95 shadow-xl backdrop-blur">
            {weekMeta.map((m, i) => {
              const done = m.end <= completedCount;
              const isCurrent = i === currentIdx;
              return (
                <button
                  key={m.wk.weekNumber}
                  type="button"
                  onClick={() => {
                    setSelectedIdx(i);
                    setWeekMenuOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-white/5 ${
                    i === selectedIdx ? 'text-accent' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {done ? (
                      <Icon name="check" size={13} className="text-mint" />
                    ) : isCurrent ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    ) : (
                      <span className="w-3" />
                    )}
                    Week {m.wk.weekNumber}
                    {m.wk.focus ? ` · ${m.wk.focus}` : ''}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-faint">
                    {done ? 'Done' : isCurrent ? 'Current' : 'Projected'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <ul className="mt-3 space-y-3">
          {sel.wk.sessions.map((rs, i) => {
            const flatIdx = sel.start + i;
            const state = flatIdx < completedCount ? 'done' : flatIdx === completedCount ? 'next' : 'todo';
            return <SessionRow key={rs.session.id} rs={rs} state={state} />;
          })}
        </ul>
      </Card>

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
{JSON.stringify(toCreateTrainingRequest(view, sel.wk.weekNumber), null, 2)}
        </pre>
      )}
    </div>
  );
}

function SessionRow({ rs, state = 'todo' }: { rs: ResolvedSession; state?: 'done' | 'next' | 'todo' }) {
  const s = rs.session;
  return (
    <li className={`flex items-start gap-3 ${state === 'done' ? 'opacity-55' : ''}`}>
      {state === 'done' ? (
        <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-mint/20 text-mint">
          <Icon name="check" size={10} />
        </span>
      ) : (
        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${STIMULUS_DOT[s.stimulusType]}`} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-semibold">{STIMULUS_LABELS[s.stimulusType]}</span>
          {state === 'next' && (
            <span className="rounded bg-[var(--accent-soft2)] px-1.5 text-[10px] font-semibold text-accent">Next up</span>
          )}
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

  return (
    <div className="space-y-5">
      {/* Body + Brain scores, Sphery's own vocabulary, each explained in a line */}
      <div className="grid grid-cols-2 gap-4">
        <ScoreRing
          m={metric(e.metrics, 'body_score')}
          color="var(--orbit-cyan)"
          tone="text-accent"
          blurb="How well you move: the share of exercises performed correctly."
        />
        <ScoreRing
          m={metric(e.metrics, 'brain_score')}
          color="var(--orbit-violet)"
          tone="text-violet"
          blurb="How sharp you stay under load: the share of reactions timed right."
        />
      </div>

      {/* Metric grid (Body Age / Brain Age / Weekly Load / HR Recovery) */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard m={metric(e.metrics, 'body_age')} accent="var(--orbit-cyan)" tone="text-accent" />
        <MetricCard m={metric(e.metrics, 'brain_age')} accent="var(--orbit-violet)" tone="text-violet" />
        <MetricCard m={metric(e.metrics, 'weekly_load')} accent="var(--orbit-mint)" tone="text-mint" />
        <MetricCard m={metric(e.metrics, 'hr_recovery')} accent="var(--orbit-fuchsia)" tone="text-fuchsia" />
      </div>

      <p className="px-2 text-center text-[11px] leading-relaxed text-faint">
        Body Age &amp; Brain Age are motivational, directionally-true metrics from your real data, not medical claims.
      </p>
    </div>
  );
}

function ScoreRing({ m, color, tone, blurb }: { m?: MetricSnapshot; color: string; tone: string; blurb: string }) {
  if (!m) return null;
  const good = deltaIsGood(m);
  return (
    <div className="grid place-items-center rounded-[26px] border border-border bg-card px-3 py-5 text-center">
      <p className="eyebrow text-dim">{m.label}</p>
      <div className="mt-2">
        <RingGauge fraction={m.value / 100} size={122} stroke={8} color={color}>
          <div>
            <div className={`text-4xl leading-none ${tone}`}>{Math.round(m.value)}</div>
            <div className="eyebrow mt-1 text-faint">/ 100</div>
          </div>
        </RingGauge>
      </div>
      {m.delta !== undefined && m.delta !== 0 && (
        <div className={`mt-1.5 inline-flex items-center gap-0.5 text-xs font-semibold ${good ? 'text-mint' : 'text-rose-400'}`}>
          <Icon name={m.delta > 0 ? 'arrow-up' : 'arrow-down'} size={12} />
          {Math.abs(m.delta)}
        </div>
      )}
      <p className="mt-2 text-[11px] leading-snug text-faint">{blurb}</p>
    </div>
  );
}

// What each Progress metric means + how it's derived, shown on the flip side.
const METRIC_INFO: Record<string, string> = {
  body_age: 'How old your body performs, not your real age. Estimated from your resting heart rate, recovery speed, and training intensity in real sessions. Below your age means it is working.',
  brain_age: 'How sharp your reactions are under load. From your dual-task precision and reaction speed, benchmarked to age norms. Lower means you react younger.',
  weekly_load: 'Training minutes logged this week. Resets weekly and feeds your push-versus-recover balance.',
  hr_recovery: 'How many beats your heart rate drops in the first minute after hard effort. Faster recovery means a fitter heart, and it is one of the strongest longevity signals.',
};

function MetricCard({ m, accent, tone }: { m?: MetricSnapshot; accent: string; tone: string }) {
  const [flipped, setFlipped] = useState(false);
  if (!m) return <Card><p className="text-xs text-faint">—</p></Card>;
  const good = deltaIsGood(m);
  const info = METRIC_INFO[m.key];
  const face = 'absolute inset-0 rounded-2xl border border-border bg-card p-4 [backface-visibility:hidden]';

  return (
    <div className="[perspective:1200px]">
      <div
        className="relative h-[176px] transition-transform duration-500"
        style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'none' }}
      >
        {/* Front */}
        <div className={face}>
          {info && (
            <button
              type="button"
              onClick={() => setFlipped(true)}
              aria-label={`What is ${m.label}?`}
              className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full text-faint transition-colors hover:bg-white/5 hover:text-white"
            >
              <Icon name="info" size={15} />
            </button>
          )}
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
        </div>

        {/* Back */}
        <div className={`${face} flex flex-col`} style={{ transform: 'rotateY(180deg)' }}>
          <button
            type="button"
            onClick={() => setFlipped(false)}
            aria-label="Close"
            className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full text-faint transition-colors hover:bg-white/5 hover:text-white"
          >
            <Icon name="close" size={15} />
          </button>
          <p className={`eyebrow ${tone}`}>{m.label}</p>
          <p className="mt-1.5 overflow-y-auto text-[11px] leading-snug text-dim">{info}</p>
        </div>
      </div>
    </div>
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
        No live leaderboards or history yet. That lives in the Sphery app.
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
      <div className="mx-auto flex max-w-md items-center justify-around px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
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
