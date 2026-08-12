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
import { circuitFor, CIRCUIT_NAMES, MONTHLY_TARGET, monthlyPointsFor } from '@/lib/stub/engine';
import type {
  AdaptiveUpdate,
  LeagueTier,
  MetricKey,
  MetricSnapshot,
  PerceivedEffort,
  Quest,
  Reward,
} from '@/lib/types/engagement';
import { LEAGUE_TIERS } from '@/lib/types/engagement';
import type { StimulusType, WeekdayId } from '@/lib/types/plan';
import { STIMULUS_LABELS } from '@/lib/labels';
import { WEEKDAYS } from '@/lib/intake/model';
import type { DemoMember } from '@/lib/stub/data';
import type { PlanSummary } from '@/lib/plan-summary';
import { Icon, type IconName } from './icons';
import PlanSwitcher from './PlanSwitcher';
import TrainingProgressChart from './TrainingProgressChart';
import CardsTab from './CardsTab';
import { RingGauge } from './RingGauge';
import { Sparkline } from './Sparkline';
import LiveSession from './LiveSession';

/**
 * Which weekday it is right now, in the member's own timezone. Safe to read
 * during render: the dashboard is only ever reached by clicking through from
 * the welcome step, so this never runs during SSR and cannot mismatch on
 * hydration. `getDay()` is Sunday-first; WEEKDAYS is Monday-first.
 */
function todayWeekday(): WeekdayId {
  return WEEKDAYS[(new Date().getDay() + 6) % 7].id;
}

/** Flatten the plan into session order, so completedCount maps to "current". */
function flatSessions(view: PlanView) {
  return view.resolved.flatMap((wk) =>
    wk.sessions.map((rs, i) => ({ rs, weekNumber: wk.weekNumber, sessionInWeek: i + 1 })),
  );
}

type Tab = 'today' | 'plan' | 'cards' | 'circle';

const TABS: Array<{ id: Tab; label: string; icon: IconName }> = [
  { id: 'today', label: 'Today', icon: 'sparkle' },
  { id: 'plan', label: 'Plan', icon: 'orbit' },
  { id: 'cards', label: 'Cards', icon: 'trophy' },
  { id: 'circle', label: 'Circle', icon: 'users' },
];

/**
 * Stimulus dot color, assigned by meaning rather than by variety: physical work
 * is cyan, cognitive work is violet, recovery is the one restorative stimulus
 * and takes mint. Several stimuli share a color on purpose — the dot marks what
 * kind of work a session is, not which of seven it happens to be.
 */
const STIMULUS_DOT: Record<StimulusType, string> = {
  cardio_endurance: 'bg-cyan',
  cardio_intensity: 'bg-cyan',
  cognitive_motor: 'bg-violet',
  recovery: 'bg-mint',
  strength: 'bg-cyan',
  mobility_stability: 'bg-cyan',
  power_speed: 'bg-cyan',
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

/**
 * Age metrics move in fractions of a year, so one card would read "28.7 yrs"
 * beside another reading "27 yrs". Ages always carry one decimal; everything
 * else stays whole.
 */
function formatMetric(value: number, unit: string): string {
  return unit === 'yrs' ? value.toFixed(1) : String(value);
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
  availableDays,
  plans,
  activeId,
  onSwitchPlan,
  onAddPlan,
  onComplete,
  onRestart,
}: {
  member: DemoMember;
  view: PlanView;
  completedCount: number;
  lastUpdate: AdaptiveUpdate | null;
  /** Training days from the intake. Undefined means the member never said. */
  availableDays?: WeekdayId[];
  plans: PlanSummary[];
  activeId: string;
  onSwitchPlan: (id: string) => void;
  onAddPlan: () => void;
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
            className="grid min-h-11 place-items-center rounded-full border border-border px-4 text-xs font-medium text-faint transition-colors hover:text-white"
          >
            Start over
          </button>
          {/* No unread dot: nothing here is tappable yet, and an unread marker is
           * the strongest "tap me" signal on a phone. Decorative, so it stays out
           * of the accessibility tree until notifications actually exist. */}
          <span
            aria-hidden="true"
            className="relative grid h-11 w-11 place-items-center rounded-full border border-border text-dim"
          >
            <Icon name="bell" size={18} />
          </span>
        </div>
      </header>

      <div key={tab} className="animate-screen-in mt-6 flex-1">
        {tab === 'today' && (
          <TodayTab
            member={member}
            view={view}
            completedCount={completedCount}
            lastUpdate={lastUpdate}
            availableDays={availableDays}
            onStart={() => setTraining(true)}
          />
        )}
        {tab === 'plan' && (
          <PlanTab
            view={view}
            completedCount={completedCount}
            plans={plans}
            activeId={activeId}
            onSwitchPlan={onSwitchPlan}
            onAddPlan={onAddPlan}
          />
        )}
        {tab === 'cards' && <CardsTab view={view} completedCount={completedCount} />}
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
  cards: { eyebrow: 'Collect as you train', title: () => 'Your Cards' },
  circle: { eyebrow: 'Habit loop', title: () => 'Your Circle' },
};

// ---------------------------------------------------------------------------
// Today
// ---------------------------------------------------------------------------

function TodayTab({
  member,
  view,
  completedCount,
  lastUpdate,
  availableDays,
  onStart,
}: {
  member: DemoMember;
  view: PlanView;
  completedCount: number;
  lastUpdate: AdaptiveUpdate | null;
  availableDays?: WeekdayId[];
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
  // Today serves the session in front of you: is today even a training day,
  // what exactly are you about to do, and what did last time change. Weekly
  // progress still lives on Plan, quests on Circle, metrics on Progress.
  const upNext = allDone ? undefined : flat[completedCount + 1];
  const circuit = next ? circuitFor(view, next) : [];
  // A rest day demotes the session but never hides it: the plan is a
  // recommendation, and a member who turns up on an off day can still train.
  const rest = restDay(availableDays);
  const last = completedCount > 0 ? flat[completedCount - 1] : undefined;

  return (
    <div className="space-y-4">
      {/* Max's trend chart (Aug 11). Sample data until the engine grows a
        * series endpoint; the card badges itself as such. Only for members who
        * have a history to plot: showing a cold-start member 24 sessions of
        * invented past progress is the one version of this that lies. */}
      {member.baseline && (
        <TrainingProgressChart
          member={member}
          bodyScore={metric(e.metrics, 'body_trend')?.value ?? 60}
          brainScore={metric(e.metrics, 'brain_trend')?.value ?? 55}
        />
      )}

      {/* Rest day. The tab is called Today and used to ignore what day it
        * actually was, telling people to train on their own days off. */}
      {rest && (
        <Card className="border-mint/25">
          <div className="flex items-center justify-between">
            <p className="eyebrow text-mint">Rest day</p>
            <Icon name="heart" size={15} className="text-mint" />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-dim">
            Today is not one of your training days. You adapt between sessions rather than during
            them, so this is the part that makes the last one count. Your next session is{' '}
            {rest.nextDay}.
          </p>
        </Card>
      )}

      {/* Current-protocol hero */}
      {next && (
        <div className="relative overflow-hidden rounded-[26px] border border-[var(--accent-soft2)] p-6"
          style={{ background: 'radial-gradient(120% 130% at 15% 0%, var(--accent-soft), transparent 62%)' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow text-accent">{allDone ? 'Plan complete' : 'Up next'}</p>
              <p className="mt-1 text-xs tracking-wide text-faint">
                {allDone
                  ? 'Every session logged · retest to recalibrate'
                  : `WEEK ${current.weekNumber} · SESSION ${String(current.sessionInWeek).padStart(2, '0')}`}
              </p>
            </div>
            <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-dim">
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

      {/* The circuit itself. The hero counts the stations; this names them,
        * so the brief you need before starting is not two taps away on Plan. */}
      {next && circuit.length > 0 && (
        <Card>
          <div className="flex items-baseline justify-between">
            <p className="eyebrow text-accent">{CIRCUIT_NAMES[view.plan.goal]}</p>
            <span className="text-xs text-faint tabular">{next.session.durationMinutes} min total</span>
          </div>
          <ol className="mt-3 space-y-2">
            {circuit.map((leg, i) => (
              <li key={i} className="flex items-center gap-2.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/[0.06] text-xs font-semibold text-dim tabular">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{leg.station.name}</span>
                <span className="shrink-0 text-xs text-faint tabular">
                  zone {leg.targetZone} · {leg.minutes} min
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Streak + up next, one slim row */}
      <Card className="flex items-center justify-between gap-3">
        <span className="flex shrink-0 items-center gap-2 whitespace-nowrap">
          <Icon name="flame" size={18} className="text-fuchsia" />
          <span className="text-lg font-semibold tabular">{e.streak.currentWeeks}</span>
          <span className="text-xs uppercase tracking-wide text-faint">wk streak</span>
        </span>
        {upNext && (
          <span className="whitespace-nowrap text-xs text-faint">
            Next: {STIMULUS_LABELS[upNext.rs.session.stimulusType]} · Zone {upNext.rs.session.hrTarget.zone}
          </span>
        )}
      </Card>

      {/* Last session, and what it changed. The adaptation used to appear here
        * only in the moment right after a session and then vanish; giving it a
        * standing home is the whole point of the product being adaptive. */}
      {last && (
        <Card className={lastUpdate ? 'border-violet/25' : ''}>
          <div className="flex items-center justify-between">
            <p className="eyebrow text-violet">Last session</p>
            <Icon name={lastUpdate ? 'refresh' : 'check'} size={15} className="text-violet" />
          </div>
          <p className="mt-2 text-sm font-semibold">{STIMULUS_LABELS[last.rs.session.stimulusType]}</p>
          <p className="mt-0.5 text-xs text-faint">
            Week {last.weekNumber} · session {String(last.sessionInWeek).padStart(2, '0')} ·{' '}
            {last.rs.session.durationMinutes} min · zone {last.rs.session.hrTarget.zone}
          </p>
          {lastUpdate && (
            <>
              <p className="mt-3 text-sm leading-relaxed text-dim">{lastUpdate.summary}</p>
              {lastUpdate.planChanges.map((c) => (
                <p key={c} className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-violet">
                  <Icon name="refresh" size={12} className="mt-0.5 shrink-0" />
                  {c}
                </p>
              ))}
            </>
          )}
        </Card>
      )}
    </div>
  );
}

/**
 * Rest-day check. Today is a rest day only when the member actually told us
 * which days they train and today is not one of them; without that answer we
 * say nothing rather than guess. Returns when the next session lands, since
 * "not today" is only useful next to "then when".
 */
function restDay(availableDays?: WeekdayId[]): { nextDay: string } | null {
  if (!availableDays?.length) return null;
  const today = todayWeekday();
  if (availableDays.includes(today)) return null;
  const from = WEEKDAYS.findIndex((d) => d.id === today);
  for (let i = 1; i <= 7; i++) {
    const d = WEEKDAYS[(from + i) % 7];
    if (availableDays.includes(d.id)) return { nextDay: i === 1 ? 'tomorrow' : d.full };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

function PlanTab({
  view,
  completedCount,
  plans,
  activeId,
  onSwitchPlan,
  onAddPlan,
}: {
  view: PlanView;
  completedCount: number;
  plans: PlanSummary[];
  activeId: string;
  onSwitchPlan: (id: string) => void;
  onAddPlan: () => void;
}) {
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
      {/* Switching plans here rather than only on the way in: this is the tab
        * about the plan, so it is where you look for the other one. */}
      <PlanSwitcher plans={plans} activeId={activeId} onSwitch={onSwitchPlan} />

      <p className="text-sm leading-relaxed text-dim">{plan.rationale}</p>

      {/* Adherence — am I doing the plan? These came off the old Progress tab:
        * they are about following the prescription, so they belong beside it
        * rather than on a dashboard of their own. */}
      <div className="grid grid-cols-3 gap-3">
        <Adherence
          label="Sessions"
          value={`${completedCount}/${totalSessions}`}
          note="of the block"
        />
        <Adherence
          label="This week"
          value={`${Math.round(metric(view.engagement.metrics, 'weekly_load')?.value ?? 0)}`}
          unit="min"
          note="trained so far"
        />
        <Adherence
          label="HR recovery"
          value={`${Math.round(metric(view.engagement.metrics, 'hr_recovery')?.value ?? 0)}`}
          unit="bpm"
          note="after effort"
        />
      </div>

      {/* Block progress: percent, week strip, where you are */}
      <Card>
        <div className="flex items-center justify-between">
          <p className="eyebrow text-accent">Plan progress</p>
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
                className={`flex-1 rounded-lg py-1.5 text-center text-xs font-semibold tabular ${
                  done ? 'bg-mint/15 text-mint' : isCurrent ? 'bg-[var(--accent-soft)] text-accent' : 'bg-white/[0.05] text-faint'
                }`}
              >
                {done ? <Icon name="check" size={12} className="mx-auto" /> : m.wk.weekNumber}
              </div>
            );
          })}
        </div>
        <p className="mt-2.5 text-xs text-faint">
          {allDone
            ? `Plan complete, all ${totalSessions} sessions logged. The retest sets up your next plan.`
            : `Week ${weekMeta[currentIdx].wk.weekNumber} of ${resolved.length} · ${completedCount} of ${totalSessions} sessions done`}
        </p>
      </Card>

      <div className="flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--accent-soft)] px-3.5 py-2.5">
        <Icon name="refresh" size={14} className="mt-0.5 shrink-0 text-accent" />
        <p className="text-sm leading-snug text-dim">
          Your current week is set. The weeks ahead are projections and re-tune from how you actually perform.
        </p>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Icon name="info" size={15} className="text-accent" />
            <span className="eyebrow text-dim">What this plan is based on</span>
          </span>
          <LevelPill level={confidenceLevel(plan.fitnessEstimate.confidence)} />
        </div>
        {/* Same fact as the reveal screen, said the same way. "Cold start" and
         * "analyzed workouts" were the model's vocabulary, not the member's. */}
        <p className="mt-2 text-xs text-faint">
          {plan.fitnessEstimate.source === 'questionnaire_only' || plan.fitnessEstimate.workoutsAnalyzed === 0
            ? 'What you told us at setup. It sharpens after your first session.'
            : `Your last ${plan.fitnessEstimate.workoutsAnalyzed} training ${
                plan.fitnessEstimate.workoutsAnalyzed === 1 ? 'session' : 'sessions'
              }: heart rate, scores, and how fast you recover.`}
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

      <button
        type="button"
        onClick={onAddPlan}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-colors hover:border-[var(--border-strong)]"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--accent-soft2)] text-accent">
          <Icon name="plus" size={16} />
        </span>
        <div className="flex-1">
          <div className="font-semibold">Add another training plan</div>
          <div className="text-sm text-dim">
            {plans.length > 1 ? `You are running ${plans.length} plans` : 'Training for something else too?'}
          </div>
        </div>
        <Icon name="chevron-left" size={18} className="rotate-180 text-faint" />
      </button>
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

function Adherence({ label, value, unit, note }: { label: string; value: string; unit?: string; note: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-2.5">
      <p className="eyebrow text-dim">{label}</p>
      <p className="mt-1 text-xl leading-none text-hi tabular">
        {value}
        {unit && <span className="ml-0.5 text-xs text-faint">{unit}</span>}
      </p>
      <p className="mt-1 text-[11px] leading-tight text-faint">{note}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress became Cards (see CardsTab). Body Score, Brain Score, Body Age and
// Brain Age were dropped with it: a score out of 100 is a number nobody can act
// on. What survived moved to where it means something — adherence onto Plan,
// and HR recovery onto the post-session screen, attached to the session that
// caused it.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Circle
// ---------------------------------------------------------------------------

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
          {/* The ring is the member's own metal: filling it is what moves the
            * rank, so it should not be lit in an accent that means nothing. */}
          <RingGauge
            fraction={monthly / MONTHLY_TARGET}
            color={TIER_COLORS[l.tier].main}
            label="Monthly rank progress"
            valueText={`${l.tier} rank, ${monthly} of ${MONTHLY_TARGET} points this month`}
          >
            <div className="grid place-items-center">
              <TierMedal tier={l.tier} size={92} />
              <div className="mt-1.5 text-2xl uppercase leading-none tracking-wide" style={{ color: TIER_COLORS[l.tier].main }}>
                {l.tier}
              </div>
              <div className="eyebrow mt-1.5" style={{ color: TIER_COLORS[l.tier].main }}>
                {monthly >= MONTHLY_TARGET ? 'rank secured' : `${monthly} / ${MONTHLY_TARGET} pts`}
              </div>
            </div>
          </RingGauge>
        </div>
        <span
          className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
          style={{ color: TIER_COLORS[l.tier].main, borderColor: `${TIER_COLORS[l.tier].main}4d` }}
        >
          <Icon name="trophy" size={14} />
          {e.streak.weekProgress.completed} / {e.streak.weekProgress.target} sessions this week
        </span>
        <span className="mt-2 inline-flex items-center gap-1 text-xs text-faint">
          Rank details <Icon name="chevron-left" size={11} className="rotate-180" />
        </span>
      </button>

      {/* Active quests */}
      <Card>
        <div className="flex items-center justify-between">
          <p className="eyebrow" style={{ color: TIER_COLORS[l.tier].main }}>
            Active Quests
          </p>
          <span className="eyebrow text-faint">Near-term wins</span>
        </div>
        <ul className="mt-4 space-y-4">
          {e.quests.map((q) => (
            <QuestRow key={q.id} q={q} tier={l.tier} />
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

      <p className="px-4 text-center text-xs leading-relaxed text-faint">
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
  { label: 'Full 8-week plan finished', pts: '+200', why: 'The big earn' },
];

const QUEST_TIER_LABELS = ['Quick win · this week', 'Medium · this month', 'Long · this plan'];

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
    { id: 'block', label: 'Plan Finisher', icon: 'trophy', earned: completedCount >= totalSessions, hint: 'Finish the full 8-week plan', meaning: 'You finished a full 8-week training plan.', earnedAt: 'Today' },
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
          <RingGauge
            fraction={monthly / MONTHLY_TARGET}
            color={TIER_COLORS[l.tier].main}
            size={196}
            stroke={10}
            label="Monthly rank progress"
            valueText={`${l.tier} rank, ${monthly} of ${MONTHLY_TARGET} points this month`}
          >
            <div className="grid place-items-center">
              <TierMedal tier={l.tier} size={104} />
              <div className="mt-1.5 text-2xl uppercase leading-none tracking-wide" style={{ color: TIER_COLORS[l.tier].main }}>
                {l.tier}
              </div>
              <div className="eyebrow mt-1.5 tabular" style={{ color: TIER_COLORS[l.tier].main }}>
                {monthly} / {MONTHLY_TARGET}
              </div>
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
                  className="flex items-center gap-3 rounded-xl px-3 py-2"
                  style={
                    state === 'current'
                      ? {
                          border: `1px solid ${TIER_COLORS[t].main}66`,
                          background: `${TIER_COLORS[t].main}1a`,
                        }
                      : undefined
                  }
                >
                  <TierMedal tier={t} size={34} dimmed={state === 'ahead'} />
                  <span className={`flex-1 text-sm font-semibold capitalize ${state === 'ahead' ? 'text-faint' : ''}`}>{t}</span>
                  {state === 'passed' && (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-mint/20 text-mint">
                      <Icon name="check" size={11} />
                    </span>
                  )}
                  {state === 'current' && (
                    <span className="eyebrow" style={{ color: TIER_COLORS[t].main }}>
                      You are here
                    </span>
                  )}
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
                  <span className="block text-xs text-faint">{row.why}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-cyan tabular">{row.pts}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-faint">
            A beginner and an athlete working equally hard earn equally. No points for opening the app.
          </p>
        </Card>

        {/* Quests, tiered */}
        <Card className="mt-4">
          <p className="eyebrow" style={{ color: TIER_COLORS[l.tier].main }}>
            Your Quests
          </p>
          <ul className="mt-4 space-y-4">
            {e.quests.map((q, i) => (
              <QuestRow
                key={q.id}
                q={q}
                tier={l.tier}
                tierLabel={QUEST_TIER_LABELS[i % QUEST_TIER_LABELS.length]}
              />
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
            <p className="mt-2 text-xs text-faint">Tap an earned emblem to see what it means and when you got it.</p>
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
  // Locked tiles flip too. Every tile carrying the same affordance is a simpler
  // rule than "some of these are tappable", and the back of a locked one says
  // what the emblem actually means rather than only how to get it.
  const tone = em.earned ? 'border-mint/40' : 'border-border';

  return (
    <button
      type="button"
      onClick={() => setFlipped((v) => !v)}
      aria-label={`${em.label}, tap for details`}
      className="[perspective:900px]"
    >
      <div
        /* Tall enough for the wordiest locked hint on two lines under a
         * two-line label; the earned face just has more air. */
        className="relative h-[128px] transition-transform duration-500"
        style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'none' }}
      >
        {/* Only the face actually facing the viewer is exposed, so the tile does
         * not read out both sides at once. */}
        <div
          className={`${face} ${tone} ${em.earned ? 'bg-mint/10' : 'bg-transparent opacity-60'}`}
          aria-hidden={flipped}
        >
          {/* The tell that there is a back to this tile. Without it the flip is
            * a secret: nothing about a badge says "tap me". */}
          <Icon name="info" size={11} className="absolute right-2 top-2 text-faint" />
          <span
            className={`mx-auto grid h-9 w-9 place-items-center rounded-full ${
              em.earned ? 'bg-mint/20 text-mint' : 'bg-white/[0.05] text-faint'
            }`}
          >
            <Icon name={em.earned ? em.icon : 'lock'} size={16} />
          </span>
          <p className="mt-2 text-xs font-semibold leading-tight">{em.label}</p>
          <p className="mt-0.5 text-[10px] leading-tight text-faint">
            {em.earned ? 'Earned' : em.hint}
          </p>
        </div>
        <div
          className={`${face} ${tone} bg-card`}
          style={{ transform: 'rotateY(180deg)' }}
          aria-hidden={!flipped}
        >
          <p className="text-[10px] leading-snug text-dim">{em.meaning}</p>
          <p className={`eyebrow mt-1.5 ${em.earned ? 'text-mint' : 'text-faint'}`}>
            {em.earned ? em.earnedAt : 'Not yet earned'}
          </p>
        </div>
      </div>
    </button>
  );
}

/**
 * A quest carries the member's own rank color rather than a fixed accent, so
 * the whole habit loop reads as one thing: the ring you are filling, the rank
 * you hold, and the quests that move it are all the same metal.
 */
function QuestRow({ q, tier, tierLabel }: { q: Quest; tier: LeagueTier; tierLabel?: string }) {
  const c = TIER_COLORS[tier].main;
  return (
    <li className={q.completed ? 'opacity-55' : ''}>
      {tierLabel && <p className="eyebrow mb-1.5 text-faint">{tierLabel}</p>}
      <div className="flex items-center gap-3">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border"
          style={{ color: c, borderColor: `${c}66` }}
        >
          <Icon name={q.completed ? 'check' : 'target'} size={16} />
        </span>
        <span className="flex-1 text-sm font-medium">{q.title}</span>
        <span className="text-xs text-faint tabular">{q.progress.current}/{q.progress.target}</span>
      </div>
      <Bar className="mt-2.5" fraction={q.progress.current / Math.max(1, q.progress.target)} color={c} />
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
              className={`flex min-h-11 flex-col items-center justify-center gap-1 px-3 transition-colors ${active ? 'text-accent' : 'text-faint hover:text-dim'}`}
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
