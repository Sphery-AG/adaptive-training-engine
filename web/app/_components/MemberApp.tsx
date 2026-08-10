'use client';

/**
 * The member's home after a plan is generated — a 4-tab app (Today / Plan /
 * Progress / Circle) with a bottom nav, modeled on the Sphere Loop concept
 * (docs/design-reference/sphere-loop). Mobile-framed single column. Renders
 * pure engine output (PlanView + engagement); the "Complete session" action is
 * the demo's adaptive money-moment (criteria 3 + 5).
 */
import { useState } from 'react';
import type { PlanView, ResolvedSession, AdaptationResult } from '@/lib/stub/engine';
import { circuitFor, CIRCUIT_NAMES } from '@/lib/stub/engine';
import type {
  AdaptiveUpdate,
  MetricKey,
  MetricSnapshot,
  PerceivedEffort,
  Quest,
  Reward,
} from '@/lib/types/engagement';
import { LEAGUE_TIERS } from '@/lib/types/engagement';
import type { StimulusType } from '@/lib/types/plan';
import { STIMULUS_LABELS } from '@/lib/labels';
import type { DemoMember } from '@/lib/stub/data';
import { Icon, type IconName } from './icons';
import { RingGauge } from './RingGauge';
import { Sparkline } from './Sparkline';
import LiveSession from './LiveSession';

/** Flatten the plan into session order, so completedCount maps to "current". */
function flatSessions(view: PlanView) {
  return view.resolved.flatMap((wk) =>
    wk.sessions.map((rs, i) => ({ rs, weekNumber: wk.weekNumber, sessionInWeek: i + 1 })),
  );
}

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
  onComplete: (livePoints: number, effort?: PerceivedEffort) => Promise<AdaptationResult>;
  onRestart: () => void;
}) {
  const [tab, setTab] = useState<Tab>('today');
  const [training, setTraining] = useState(false);

  const flat = flatSessions(view);
  const trainingSession = flat[Math.min(completedCount, flat.length - 1)];

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
          <TodayTab view={view} completedCount={completedCount} lastUpdate={lastUpdate} onStart={() => setTraining(true)} />
        )}
        {tab === 'plan' && <PlanTab view={view} completedCount={completedCount} />}
        {tab === 'progress' && <ProgressTab view={view} />}
        {tab === 'circle' && <CircleTab view={view} completedCount={completedCount} />}
      </div>

      <BottomNav tab={tab} setTab={setTab} />

      {training && trainingSession && (
        <LiveSession
          view={view}
          rs={trainingSession.rs}
          weekNumber={trainingSession.weekNumber}
          sessionInWeek={trainingSession.sessionInWeek}
          onFinish={onComplete}
          onClose={() => setTraining(false)}
          onDone={() => {
            setTraining(false);
            setTab('today');
          }}
        />
      )}
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
  onStart,
}: {
  view: PlanView;
  completedCount: number;
  lastUpdate: AdaptiveUpdate | null;
  onStart: () => void;
}) {
  const { engagement: e } = view;
  // Walk the plan as sessions are logged: flatten every week's sessions in
  // order, then point at the next one to do. This is what makes logging a
  // session visibly advance the current protocol instead of freezing on #1.
  const flat = flatSessions(view);
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
                {CIRCUIT_NAMES[view.plan.goal]} · {circuitFor(view, next).length} stations
              </div>
            </div>
            <button
              type="button"
              onClick={onStart}
              aria-label="Start this session"
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
  // Sessions collapse to one line each; at most one is expanded at a time
  // (Max's review, Aug 6: the full list read as too busy).
  const [openSession, setOpenSession] = useState<string | null>(null);
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
      <Card>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setWeekMenuOpen((v) => !v)}
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
        {weekMenuOpen ? (
          // In-flow, and it replaces the session list while open, so nothing
          // shows through behind it (Max's review, Aug 6).
          <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-white/[0.03]">
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
        ) : (
          <ul className="mt-3 space-y-1">
            {sel.wk.sessions.map((rs, i) => {
              const flatIdx = sel.start + i;
              const state = flatIdx < completedCount ? 'done' : flatIdx === completedCount ? 'next' : 'todo';
              return (
                <SessionRow
                  key={rs.session.id}
                  view={view}
                  rs={rs}
                  state={state}
                  open={openSession === rs.session.id}
                  onToggle={() => setOpenSession((v) => (v === rs.session.id ? null : rs.session.id))}
                />
              );
            })}
          </ul>
        )}
      </Card>

    </div>
  );
}

function SessionRow({
  view,
  rs,
  state = 'todo',
  open,
  onToggle,
}: {
  view: PlanView;
  rs: ResolvedSession;
  state?: 'done' | 'next' | 'todo';
  open: boolean;
  onToggle: () => void;
}) {
  const s = rs.session;
  const circuit = circuitFor(view, rs);
  const hasSphery = circuit.some((leg) => leg.station.isSpheryEquipment);
  return (
    <li className={state === 'done' ? 'opacity-55' : ''}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 rounded-xl px-1 py-2 text-left transition-colors hover:bg-white/[0.03]"
      >
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
            {hasSphery && (
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
        <Icon
          name="chevron-left"
          size={13}
          className={`mt-1 shrink-0 text-faint transition-transform ${open ? 'rotate-90' : '-rotate-90'}`}
        />
      </button>
      {open && (
        <div className="mb-2 ml-8 mr-1">
          <p className="eyebrow text-faint">{CIRCUIT_NAMES[view.plan.goal]}</p>
          <ol className="mt-1.5 space-y-1.5">
            {circuit.map((leg, i) => (
              <li key={i} className="flex items-center gap-2.5 text-xs">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[10px] font-semibold text-dim tabular">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">{leg.station.name}</span>
                <span className="shrink-0 text-faint tabular">{leg.minutes} min</span>
              </li>
            ))}
          </ol>
        </div>
      )}
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

/** Fixed monthly point target that advances the rank (approved Aug 4). */
const MONTHLY_TARGET = 1000;

/** Medal metal per tier, light face + dark trim. */
const TIER_COLORS: Record<(typeof LEAGUE_TIERS)[number], { main: string; dark: string }> = {
  bronze: { main: '#d08a4b', dark: '#8a5a2e' },
  silver: { main: '#cdd5e0', dark: '#8a94a6' },
  gold: { main: '#f6c945', dark: '#b8891c' },
  platinum: { main: '#a7e8df', dark: '#5aa39b' },
  diamond: { main: '#b9e0ff', dark: '#5b8fc9' },
};

/**
 * The rank medal itself: twin ribbons and a gradient coin with a star,
 * colored per tier. Gradient ids are keyed by tier; the same tier rendered
 * twice shares an identical def, so collisions are harmless.
 */
function TierMedal({ tier, size = 56, dimmed = false }: { tier: (typeof LEAGUE_TIERS)[number]; size?: number; dimmed?: boolean }) {
  const c = TIER_COLORS[tier];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      aria-hidden="true"
      style={dimmed ? { filter: 'grayscale(1)', opacity: 0.35 } : { filter: `drop-shadow(0 0 ${Math.round(size / 4)}px ${c.main}66)` }}
    >
      <defs>
        <linearGradient id={`medal-face-${tier}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="0.35" stopColor={c.main} />
          <stop offset="1" stopColor={c.dark} />
        </linearGradient>
        <linearGradient id={`medal-ribbon-${tier}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.main} />
          <stop offset="1" stopColor={c.dark} />
        </linearGradient>
      </defs>
      {/* Ribbons, notched at the top */}
      <path d="M25 0h14l5 28-14 8-10-30z" fill={`url(#medal-ribbon-${tier})`} />
      <path d="M55 0H41l-5 28 14 8 10-30z" fill={`url(#medal-ribbon-${tier})`} opacity="0.72" />
      <path d="M25 0h14l-3.5 7h-8z" fill={c.dark} opacity="0.55" />
      <path d="M55 0H41l3.5 7h8z" fill={c.dark} opacity="0.55" />
      {/* Coin */}
      <circle cx="40" cy="52" r="26" fill={`url(#medal-face-${tier})`} stroke={c.dark} strokeWidth="2.5" />
      <circle cx="40" cy="52" r="19.5" fill="none" stroke={c.dark} strokeWidth="1.6" opacity="0.6" />
      <circle cx="40" cy="52" r="22.5" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.35" />
      {/* Star */}
      <path
        d="M40 39l3.9 7.9 8.7 1.3-6.3 6.1 1.5 8.7-7.8-4.1-7.8 4.1 1.5-8.7-6.3-6.1 8.7-1.3z"
        fill={c.dark}
        stroke="#ffffff"
        strokeWidth="0.8"
        strokeOpacity="0.5"
      />
      {/* Shine */}
      <ellipse cx="31" cy="43" rx="9" ry="5" fill="#ffffff" opacity="0.3" transform="rotate(-28 31 43)" />
    </svg>
  );
}

/**
 * Display-only monthly points for the stub: this week's points plus a credit
 * for the weeks already banked this month. The real engine will sum the
 * points ledger by calendar month.
 */
function monthlyPointsFor(e: PlanView['engagement']): number {
  return Math.min(1400, e.league.pointsThisWeek + e.streak.currentWeeks * 40);
}

function CircleTab({ view, completedCount }: { view: PlanView; completedCount: number }) {
  const e = view.engagement;
  const l = e.league;
  const [showRank, setShowRank] = useState(false);
  const monthly = monthlyPointsFor(e);

  return (
    <div className="space-y-5">
      {/* Monthly rank ring — tap for the full ladder */}
      <button
        type="button"
        onClick={() => setShowRank(true)}
        aria-label="Open rank details"
        className="grid w-full place-items-center rounded-[26px] border border-border bg-card py-7 transition-colors hover:border-fuchsia/40"
      >
        <p className="eyebrow text-fuchsia">Monthly Rank</p>
        <div className="mt-3">
          <RingGauge fraction={monthly / MONTHLY_TARGET} color="var(--orbit-fuchsia)">
            <div className="grid place-items-center">
              <TierMedal tier={l.tier} size={92} />
              <div className="mt-1.5 text-2xl uppercase leading-none tracking-wide" style={{ color: TIER_COLORS[l.tier].main }}>
                {l.tier}
              </div>
              <div className="eyebrow mt-1.5 text-fuchsia">
                {monthly >= MONTHLY_TARGET ? 'rank secured' : `${monthly} / ${MONTHLY_TARGET} pts`}
              </div>
            </div>
          </RingGauge>
        </div>
        <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-fuchsia/30 px-3 py-1.5 text-xs font-semibold text-fuchsia">
          <Icon name="trophy" size={14} />
          {e.streak.weekProgress.completed} / {e.streak.weekProgress.target} sessions this week
        </span>
        <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-faint">
          Rank details <Icon name="chevron-left" size={11} className="rotate-180" />
        </span>
      </button>

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

      {showRank && <RankDetail view={view} completedCount={completedCount} onClose={() => setShowRank(false)} />}
    </div>
  );
}

// How points are earned (docs/xp-leveling-design.md). Reworked Aug 7 per
// Max's review: rewarding zones 4–5 more punished members whose plan
// prescribes zone 2. Rates match the live session so the app never
// contradicts itself.
const EARN_TABLE: Array<{ label: string; pts: string; why: string }> = [
  { label: 'Training time', pts: '1 pt / min', why: 'Showing up counts' },
  { label: 'Time in your target zone', pts: '2 pts / min', why: 'Following your plan pays double' },
  { label: 'Planned session completed', pts: '+25', why: 'The plan is the product' },
  { label: 'Benchmark session', pts: '+50', why: 'Marks the re-estimate' },
  { label: 'Post-session feedback', pts: '+10', why: 'Feeds the adaptive loop' },
  { label: 'Full 8-week block finished', pts: '+200', why: 'The big earn' },
];

const QUEST_TIER_LABELS = ['Quick win · this week', 'Medium · this month', 'Long · this block'];

function RankDetail({ view, completedCount, onClose }: { view: PlanView; completedCount: number; onClose: () => void }) {
  const e = view.engagement;
  const l = e.league;
  const [emblemInfo, setEmblemInfo] = useState(false);
  const monthly = monthlyPointsFor(e);
  const tierIdx = LEAGUE_TIERS.indexOf(l.tier);
  const totalSessions = view.resolved.reduce((n, wk) => n + wk.sessions.length, 0);

  // Returning members earned their emblems in the past (stub dates until the
  // real ledger exists); a fresh member's first earns land today.
  const returning = e.streak.currentWeeks > 0;
  const emblems: Array<{ id: string; label: string; icon: IconName; earned: boolean; hint: string; meaning: string; earnedAt?: string }> = [
    { id: 'first', label: 'First Session', icon: 'sparkle', earned: completedCount > 0 || e.streak.weekProgress.completed > 0, hint: 'Log your first session', meaning: 'You logged your first session. Every plan starts with one.', earnedAt: returning ? 'May 12' : 'Today' },
    { id: 'streak12', label: '12-Week Streak', icon: 'flame', earned: e.streak.longestWeeks >= 12, hint: '12 weeks on plan in a row', meaning: 'You hit your session target 12 weeks in a row.', earnedAt: 'Jul 28' },
    { id: 'zones', label: 'Zone Chaser', icon: 'pulse', earned: l.pointsThisWeek >= 200, hint: '200 effort pts in one week', meaning: 'You earned 200 effort points in a single week.', earnedAt: returning ? 'Aug 2' : 'Today' },
    { id: 'benchmark', label: 'Benchmark Done', icon: 'target', earned: false, hint: 'Complete a retest session', meaning: 'You completed a benchmark session and re-measured your fitness.' },
    { id: 'block', label: 'Block Finisher', icon: 'trophy', earned: completedCount >= totalSessions, hint: 'Finish the full 8-week block', meaning: 'You finished a full 8-week training block.', earnedAt: 'Today' },
    { id: 'gold', label: 'A Month at Gold', icon: 'orbit', earned: tierIdx >= 2, hint: 'Hold Gold for a month', meaning: 'You held Gold rank for a full month.', earnedAt: 'Aug 1' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--background)]">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-5 pt-8 pb-10">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            className="grid h-10 w-10 place-items-center rounded-full border border-border text-dim transition-colors hover:text-white"
          >
            <Icon name="chevron-left" size={18} />
          </button>
          <span className="eyebrow text-faint">Monthly Rank</span>
          <span className="w-10" />
        </div>

        {/* Current rank */}
        <div className="mt-6 grid place-items-center">
          <RingGauge fraction={monthly / MONTHLY_TARGET} color="var(--orbit-fuchsia)" size={196} stroke={10}>
            <div className="grid place-items-center">
              <TierMedal tier={l.tier} size={104} />
              <div className="mt-1.5 text-2xl uppercase leading-none tracking-wide" style={{ color: TIER_COLORS[l.tier].main }}>
                {l.tier}
              </div>
              <div className="eyebrow mt-1.5 text-fuchsia tabular">{monthly} / {MONTHLY_TARGET}</div>
            </div>
          </RingGauge>
          <p className="mt-4 max-w-[19rem] text-center text-sm leading-relaxed text-dim">
            Hit {MONTHLY_TARGET.toLocaleString()} pts in a month to move up one rank. Miss a month and you
            drop one, never below Bronze. Effort moves the ring, not ability.
          </p>
        </div>

        {/* The ladder */}
        <Card className="mt-6">
          <p className="eyebrow text-fuchsia">The Ladder</p>
          <ul className="mt-3 space-y-2.5">
            {[...LEAGUE_TIERS].reverse().map((t) => {
              const idx = LEAGUE_TIERS.indexOf(t);
              const state = idx === tierIdx ? 'current' : idx < tierIdx ? 'passed' : 'ahead';
              return (
                <li
                  key={t}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                    state === 'current' ? 'border border-fuchsia/40 bg-fuchsia/10' : ''
                  }`}
                >
                  <TierMedal tier={t} size={34} dimmed={state === 'ahead'} />
                  <span className={`flex-1 text-sm font-semibold capitalize ${state === 'ahead' ? 'text-faint' : ''}`}>{t}</span>
                  {state === 'passed' && (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-mint/20 text-mint">
                      <Icon name="check" size={11} />
                    </span>
                  )}
                  {state === 'current' && <span className="eyebrow text-fuchsia">You are here</span>}
                  {state === 'ahead' && <Icon name="lock" size={12} className="text-faint" />}
                </li>
              );
            })}
          </ul>
        </Card>

        {/* How you earn */}
        <Card className="mt-4">
          <p className="eyebrow text-cyan">How You Earn</p>
          <ul className="mt-3 space-y-2.5">
            {EARN_TABLE.map((row) => (
              <li key={row.label} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-sm">{row.label}</span>
                  <span className="block text-[11px] text-faint">{row.why}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-cyan tabular">{row.pts}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-faint">
            A beginner and an athlete working equally hard earn equally. No points for opening the app.
          </p>
        </Card>

        {/* Quests, tiered */}
        <Card className="mt-4">
          <p className="eyebrow text-fuchsia">Your Quests</p>
          <ul className="mt-4 space-y-4">
            {e.quests.map((q, i) => (
              <QuestRow key={q.id} q={q} index={i} tierLabel={QUEST_TIER_LABELS[i % QUEST_TIER_LABELS.length]} />
            ))}
          </ul>
        </Card>

        {/* Emblems */}
        <Card className="mt-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <p className="eyebrow text-mint">Emblems</p>
              <button
                type="button"
                onClick={() => setEmblemInfo((v) => !v)}
                aria-label="How emblems work"
                aria-expanded={emblemInfo}
                className="grid h-5 w-5 place-items-center rounded-full text-faint transition-colors hover:bg-white/5 hover:text-white"
              >
                <Icon name="info" size={13} />
              </button>
            </span>
            <span className="eyebrow text-faint">Earned, never bought</span>
          </div>
          {emblemInfo && (
            <p className="mt-2 text-[11px] text-faint">Tap an earned emblem to see what it means and when you got it.</p>
          )}
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {emblems.map((em) => (
              <EmblemTile key={em.id} em={em} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/**
 * One emblem tile. Earned emblems flip over to show what they mean and when
 * they were earned; locked ones just show how to get them.
 */
function EmblemTile({ em }: { em: { id: string; label: string; icon: IconName; earned: boolean; hint: string; meaning: string; earnedAt?: string } }) {
  const [flipped, setFlipped] = useState(false);
  const face = 'absolute inset-0 rounded-2xl border p-2.5 text-center [backface-visibility:hidden]';

  if (!em.earned) {
    return (
      <div className="rounded-2xl border border-border p-2.5 text-center opacity-50">
        <span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-white/[0.05] text-faint">
          <Icon name="lock" size={16} />
        </span>
        <p className="mt-2 text-[11px] font-semibold leading-tight">{em.label}</p>
        <p className="mt-0.5 text-[10px] leading-tight text-faint">{em.hint}</p>
      </div>
    );
  }

  return (
    <button type="button" onClick={() => setFlipped((v) => !v)} aria-label={`${em.label}, tap for details`} className="[perspective:900px]">
      <div
        className="relative h-[108px] transition-transform duration-500"
        style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'none' }}
      >
        <div className={`${face} border-mint/40 bg-mint/10`}>
          <span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-mint/20 text-mint">
            <Icon name={em.icon} size={16} />
          </span>
          <p className="mt-2 text-[11px] font-semibold leading-tight">{em.label}</p>
          <p className="mt-0.5 text-[10px] leading-tight text-faint">Earned</p>
        </div>
        <div className={`${face} border-mint/40 bg-card`} style={{ transform: 'rotateY(180deg)' }}>
          <p className="text-[10px] leading-snug text-dim">{em.meaning}</p>
          <p className="eyebrow mt-1.5 text-mint">{em.earnedAt}</p>
        </div>
      </div>
    </button>
  );
}

const QUEST_TONE = ['text-fuchsia border-fuchsia/40', 'text-cyan border-cyan/40', 'text-violet border-violet/40'];

function QuestRow({ q, index, tierLabel }: { q: Quest; index: number; tierLabel?: string }) {
  const tone = QUEST_TONE[index % QUEST_TONE.length];
  return (
    <li className={q.completed ? 'opacity-55' : ''}>
      {tierLabel && <p className="eyebrow mb-1.5 text-faint">{tierLabel}</p>}
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
