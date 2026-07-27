'use client';

/**
 * "Your plan is ready" — the payoff screen (UX concept ux_09). Shown right after
 * generation, before the full dashboard: the weekly cadence, the member's
 * training days, this week's sessions, and the points earned, with Start
 * Training / Edit Setup. It reads the generated PlanView + the answers (for the
 * chosen days), so it's a pure view of engine output.
 */
import type { QuestionnaireAnswers, StimulusType, WeekdayId } from '@/lib/types/plan';
import { GOAL_LABELS, STIMULUS_LABELS } from '@/lib/labels';
import { WEEKDAYS } from '@/lib/intake/model';
import type { PlanView } from '@/lib/stub/engine';
import { Icon, type IconName } from './icons';

const PLAN_BONUS = 50;

const STIMULUS_ICON: Record<StimulusType, IconName> = {
  strength: 'dumbbell',
  power_speed: 'zap',
  cardio_endurance: 'pulse',
  cardio_intensity: 'pulse',
  cognitive_motor: 'brain',
  mobility_stability: 'mobility',
  recovery: 'heart',
};

/** Sensible default training days when the member didn't pick any. */
const DEFAULT_DAYS: Record<number, WeekdayId[]> = {
  2: ['mon', 'thu'],
  3: ['mon', 'wed', 'fri'],
  4: ['mon', 'tue', 'thu', 'fri'],
  5: ['mon', 'tue', 'wed', 'thu', 'fri'],
};

export default function PlanReadyStep({
  view,
  answers,
  onStart,
  onEdit,
}: {
  view: PlanView;
  answers: QuestionnaireAnswers;
  onStart: () => void;
  onEdit: () => void;
}) {
  const { plan, gym, resolved, engagement } = view;
  const week1 = resolved[0];
  const perWeek = answers.sessionsPerWeek ?? week1.sessions.length;

  const chosen = WEEKDAYS.filter((d) => answers.availableDays?.includes(d.id)).map((d) => d.id);
  const trainingDays: WeekdayId[] = chosen.length ? chosen : DEFAULT_DAYS[perWeek] ?? DEFAULT_DAYS[3];
  const pointsAvailable = engagement.wallet.pointsBalance + PLAN_BONUS;

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-5 pt-6 pb-5 sm:pt-10">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-[28px] border border-[var(--accent-soft2)] px-6 py-9 text-center"
        style={{ background: 'var(--gradient-accent2, radial-gradient(120% 120% at 50% 0%, rgba(0,209,255,0.16), transparent 70%))' }}
      >
        <div
          className="mx-auto grid h-16 w-16 place-items-center rounded-2xl text-[var(--accent-contrast)]"
          style={{ background: 'var(--gradient-accent)', boxShadow: 'var(--shadow-glow)' }}
        >
          <Icon name="trend" size={30} />
        </div>
        <h1 className="mt-5 text-3xl font-bold tracking-tight">Your plan is ready</h1>
        <p className="mt-2 text-base text-dim">
          {GOAL_LABELS[plan.goal]} · {perWeek}× / week
        </p>
      </div>

      {/* Weekday selector */}
      <div className="mt-6 flex justify-between gap-1.5" role="list" aria-label="Your training week">
        {WEEKDAYS.map((d) => {
          const on = trainingDays.includes(d.id);
          return (
            <div
              key={d.id}
              role="listitem"
              aria-label={`${d.full}${on ? ', training day' : ''}`}
              className={`grid h-11 flex-1 place-items-center rounded-xl border text-sm font-semibold transition-colors ${
                on ? 'border-accent bg-[var(--accent-soft)] text-accent' : 'border-border text-faint'
              }`}
            >
              {d.label}
            </div>
          );
        })}
      </div>

      {/* This week's sessions */}
      <div className="mt-6 grid flex-1 gap-3">
        {week1.sessions.map((rs, i) => {
          const s = rs.session;
          const day = trainingDays[i % trainingDays.length];
          const dayLabel = WEEKDAYS.find((d) => d.id === day)?.full ?? '';
          return (
            <div key={s.id} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-accent">
                <Icon name={STIMULUS_ICON[s.stimulusType]} size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">
                  {dayLabel} — {STIMULUS_LABELS[s.stimulusType]}
                </div>
                <div className="mt-0.5 text-[13px] text-dim">
                  {s.durationMinutes} min · zone {s.hrTarget.zone}/5 · {rs.stationName}
                  {rs.stationIsSphery && <span className="ml-1.5 rounded bg-[var(--accent-soft2)] px-1.5 py-0.5 text-[10px] font-semibold text-accent">Sphery</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Points */}
      <button
        type="button"
        onClick={onStart}
        className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-colors hover:border-[var(--border-strong)]"
      >
        <span className="text-fuchsia">
          <Icon name="trend" size={20} />
        </span>
        <div className="flex-1">
          <div className="font-semibold">+{PLAN_BONUS} pts earned for this plan</div>
          <div className="text-[13px] text-dim">{pointsAvailable} pts available · View my rewards</div>
        </div>
        <Icon name="chevron-left" size={18} className="rotate-180 text-faint" />
      </button>

      {/* CTAs */}
      <div className="sticky bottom-0 mt-5 flex flex-col gap-2.5 bg-gradient-to-t from-background via-background to-transparent pt-4">
        <button
          type="button"
          onClick={onStart}
          className="h-14 w-full rounded-full text-base font-semibold text-[var(--accent-contrast)]"
          style={{ background: 'var(--gradient-accent)', boxShadow: 'var(--shadow-glow)' }}
        >
          Start Training
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="h-12 w-full rounded-full border border-border text-sm font-medium text-dim transition-colors hover:border-[var(--border-strong)] hover:text-white"
        >
          Edit Setup
        </button>
        <p className="mt-1 text-center text-xs text-faint">Plan generated at {gym.name}</p>
      </div>
    </div>
  );
}
