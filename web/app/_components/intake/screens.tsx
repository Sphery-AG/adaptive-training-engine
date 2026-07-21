'use client';

/**
 * The intake screens + a registry the orchestrator renders. Each screen is a
 * pure function of (state, dispatch): no local navigation, no engine calls. The
 * registry declares the header copy and body per screen so the shell chrome and
 * the content stay decoupled.
 */
import { useState, type Dispatch, type FC } from 'react';
import { Icon } from '../icons';
import {
  GOALS,
  goalBySlug,
  MAX_FOCUS,
  RECOVERY_STAGES,
  FITNESS_LEVELS,
  WEEKDAYS,
} from '../../../lib/intake/model';
import type { ScreenId } from '../../../lib/intake/model';
import type { IntakeAction, IntakeState } from '../../../lib/intake/state';
import { derivedSessionsPerWeek } from '../../../lib/intake/state';
import { CheckRow, FieldLabel, InfoNote, MinutesSlider, RadioRow, Scale5, Segmented } from './controls';

type ScreenProps = { state: IntakeState; dispatch: Dispatch<IntakeAction> };

export interface ScreenDef {
  eyebrow: string;
  title: string;
  subtitle?: (s: IntakeState) => string;
  required?: (s: IntakeState) => boolean;
  Body: FC<ScreenProps>;
}

// --- Ebene 1: Goal ----------------------------------------------------------

const GoalScreen: FC<ScreenProps> = ({ state, dispatch }) => (
  <div role="radiogroup" aria-label="Training goal" className="grid grid-cols-2 gap-2.5">
    {GOALS.map((g) => {
      const selected = state.goal === g.slug;
      return (
        <label key={g.slug} className="block cursor-pointer">
          <input
            type="radio"
            name="goal"
            value={g.slug}
            checked={selected}
            onChange={() => dispatch({ type: 'setGoal', goal: g.slug })}
            className="peer sr-only"
          />
          <div className="relative flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-[var(--border-strong)] peer-checked:border-accent peer-checked:bg-[var(--accent-soft)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)]">
            {g.requiresFocus && (
              <span
                className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                style={{ background: 'var(--required-soft)', color: 'var(--required)' }}
              >
                Required focus
              </span>
            )}
            <span
              className={`grid h-11 w-11 place-items-center rounded-xl transition-colors ${
                selected ? 'bg-accent text-[var(--accent-contrast)]' : 'bg-white/[0.06] text-dim'
              }`}
            >
              <Icon name={g.icon} size={22} />
            </span>
            <span className="text-base font-semibold leading-tight">{g.title}</span>
          </div>
        </label>
      );
    })}
  </div>
);

// --- Ebene 1: Focus ---------------------------------------------------------

const FocusScreen: FC<ScreenProps> = ({ state, dispatch }) => {
  if (!state.goal) return null;
  const goal = goalBySlug(state.goal);
  const atCap = state.focus.length >= MAX_FOCUS;
  return (
    <div className="grid gap-2.5">
      {goal.focuses.map((f) => (
        <CheckRow
          key={f.id}
          name="focus"
          checked={state.focus.includes(f.id)}
          disabled={atCap}
          onChange={() => dispatch({ type: 'toggleFocus', id: f.id })}
        >
          {f.label}
        </CheckRow>
      ))}
    </div>
  );
};

// --- Ebene 2: Training status ----------------------------------------------

const NumberField = ({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (n: number) => void;
}) => (
  <label className="rounded-2xl border border-border bg-card px-3.5 py-3">
    <span className="text-xs text-faint">{label}</span>
    <div className="mt-1 flex items-baseline gap-1">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full min-w-0 bg-transparent text-xl font-semibold outline-none"
      />
      <span className="text-xs text-faint">{unit}</span>
    </div>
  </label>
);

const StatusScreen: FC<ScreenProps> = ({ state, dispatch }) => (
  <div className="grid gap-7">
    <div>
      <FieldLabel>About you</FieldLabel>
      <div className="grid grid-cols-3 gap-2.5">
        <NumberField label="Age" value={state.age} unit="yrs" onChange={(n) => dispatch({ type: 'setProfile', patch: { age: n } })} />
        <NumberField label="Weight" value={state.weightKg} unit="kg" onChange={(n) => dispatch({ type: 'setProfile', patch: { weightKg: n } })} />
        <NumberField label="Height" value={state.heightCm} unit="cm" onChange={(n) => dispatch({ type: 'setProfile', patch: { heightCm: n } })} />
      </div>
    </div>

    <div>
      <FieldLabel>Fitness level</FieldLabel>
      <Segmented
        name="fitness"
        options={FITNESS_LEVELS}
        value={state.fitnessLevel}
        onChange={(level) => dispatch({ type: 'setFitness', level })}
      />
    </div>

    <MinutesSlider
      value={state.currentTrainingMinutesPerWeek}
      onChange={(minutes) => dispatch({ type: 'setMinutes', minutes })}
    />

    <div>
      <FieldLabel>Current training intensity</FieldLabel>
      <Scale5 name="intensity" value={state.currentIntensity} onChange={(intensity) => dispatch({ type: 'setIntensity', intensity })} />
      <p className="mt-2 text-xs text-faint">1 = very light, 5 = maximal effort</p>
    </div>

    <div>
      <FieldLabel>Available training days</FieldLabel>
      <div role="group" aria-label="Available training days" className="grid grid-cols-7 gap-2">
        {WEEKDAYS.map((d) => (
          <label key={d.id} className="cursor-pointer">
            <input
              type="checkbox"
              checked={state.availableDays.includes(d.id)}
              onChange={() => dispatch({ type: 'toggleDay', day: d.id })}
              aria-label={d.full}
              className="peer sr-only"
            />
            <span className="grid h-11 place-items-center rounded-xl border border-border bg-card text-sm font-medium text-dim transition-colors peer-checked:border-accent peer-checked:bg-[var(--accent-soft)] peer-checked:text-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)]">
              {d.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  </div>
);

// --- Ebene 2: Other activities ---------------------------------------------

const QUICK_SPORTS = ['Running', 'Cycling', 'Football', 'Tennis', 'Swimming', 'Yoga'];

const ActivitiesScreen: FC<ScreenProps> = ({ state, dispatch }) => {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState(QUICK_SPORTS[0]);
  const [minutes, setMinutes] = useState(60);
  const [intensity, setIntensity] = useState<1 | 2 | 3 | 4 | 5>(3);

  function confirm() {
    if (!name.trim()) return;
    dispatch({ type: 'addActivity', activity: { name: name.trim(), minutesPerWeek: minutes, intensity } });
    setAdding(false);
    setName(QUICK_SPORTS[0]);
    setMinutes(60);
    setIntensity(3);
  }

  const INTENSITY_WORD = ['', 'very light', 'light', 'moderate', 'hard', 'maximal'];

  return (
    <div className="grid gap-3">
      {state.otherActivities.map((a, i) => (
        <div key={`${a.name}-${i}`} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-dim">
            <Icon name="run" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{a.name}</div>
            <div className="text-[13px] text-dim">
              {a.minutesPerWeek} min · {INTENSITY_WORD[a.intensity]} intensity / week
            </div>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'removeActivity', index: i })}
            aria-label={`Remove ${a.name}`}
            className="grid h-9 w-9 place-items-center rounded-full text-faint transition-colors hover:bg-white/5 hover:text-white"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      ))}

      {adding ? (
        <div className="grid gap-3 rounded-2xl border border-[var(--border-strong)] bg-card p-4">
          <div className="flex flex-wrap gap-2">
            {QUICK_SPORTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setName(s)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  name === s ? 'border-accent bg-[var(--accent-soft)] text-accent' : 'border-border text-dim hover:border-[var(--border-strong)]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="rounded-xl border border-border bg-background px-3 py-2">
              <span className="text-xs text-faint">Minutes / week</span>
              <input
                type="number"
                value={minutes}
                min={0}
                step={15}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="mt-0.5 w-full bg-transparent text-lg font-semibold outline-none"
              />
            </label>
            <label className="rounded-xl border border-border bg-background px-3 py-2">
              <span className="text-xs text-faint">Intensity (1–5)</span>
              <input
                type="number"
                value={intensity}
                min={1}
                max={5}
                onChange={(e) => setIntensity(Math.min(5, Math.max(1, Number(e.target.value))) as 1 | 2 | 3 | 4 | 5)}
                className="mt-0.5 w-full bg-transparent text-lg font-semibold outline-none"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirm}
              className="flex-1 rounded-full bg-accent py-2.5 text-sm font-semibold text-[var(--accent-contrast)]"
            >
              Add
            </button>
            <button type="button" onClick={() => setAdding(false)} className="rounded-full px-4 py-2.5 text-sm text-dim hover:text-white">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border-strong)] py-4 text-base font-medium text-dim transition-colors hover:border-accent hover:text-white"
        >
          <Icon name="plus" size={18} /> Add sport or activity
        </button>
      )}
    </div>
  );
};

// --- Ebene 3: Health --------------------------------------------------------

const HealthScreen: FC<ScreenProps> = ({ state, dispatch }) => (
  <div className="grid gap-4">
    <div role="radiogroup" aria-label="Any injuries or medical conditions" className="grid grid-cols-2 gap-3">
      {[
        { value: false, label: "No, I'm good" },
        { value: true, label: 'Yes' },
      ].map((o) => (
        <label key={o.label} className="cursor-pointer">
          <input
            type="radio"
            name="hasInjury"
            checked={state.hasInjury === o.value}
            onChange={() => dispatch({ type: 'setHasInjury', value: o.value })}
            className="peer sr-only"
          />
          <span className="grid h-16 place-items-center rounded-2xl border border-border bg-card text-base font-semibold transition-colors peer-checked:border-accent peer-checked:bg-[var(--accent-soft)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)]">
            {o.label}
          </span>
        </label>
      ))}
    </div>
    <InfoNote>
      This helps us tailor your plan safely. It does not replace professional medical advice — copy pending
      medical/legal review.
    </InfoNote>
  </div>
);

// --- Ebene 3: Injury detail -------------------------------------------------

const InjuryScreen: FC<ScreenProps> = ({ state, dispatch }) => (
  <div className="grid gap-7">
    <div>
      <FieldLabel>Affected body part</FieldLabel>
      <input
        type="text"
        value={state.injury.bodyPart ?? ''}
        onChange={(e) => dispatch({ type: 'setInjury', patch: { bodyPart: e.target.value } })}
        placeholder="e.g. Knee"
        className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-base outline-none placeholder:text-faint focus:border-[var(--border-strong)]"
      />
    </div>
    <div>
      <FieldLabel>Current recovery stage</FieldLabel>
      <div role="radiogroup" aria-label="Current recovery stage" className="grid gap-2.5">
        {RECOVERY_STAGES.map((s) => (
          <RadioRow
            key={s.id}
            name="recovery"
            value={s.id}
            checked={state.injury.recoveryStage === s.id}
            onChange={() => dispatch({ type: 'setInjury', patch: { recoveryStage: s.id } })}
            title={s.title}
            desc={s.desc}
          />
        ))}
      </div>
    </div>
  </div>
);

// --- Review -----------------------------------------------------------------

const ReviewRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-4 py-2 text-base">
    <span className="text-dim">{label}</span>
    <span className="text-right font-medium">{value}</span>
  </div>
);

const ReviewGroup = ({
  icon,
  title,
  onEdit,
  children,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl border border-border bg-card p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5 font-semibold">
        <Icon name={icon} size={18} />
        {title}
      </div>
      <button type="button" onClick={onEdit} className="text-sm font-medium text-accent hover:underline">
        Edit
      </button>
    </div>
    <div className="mt-2 divide-y divide-white/5">{children}</div>
  </section>
);

const ReviewScreen: FC<ScreenProps> = ({ state, dispatch }) => {
  const goal = state.goal ? goalBySlug(state.goal) : null;
  const focusLabels = goal
    ? goal.focuses.filter((f) => state.focus.includes(f.id)).map((f) => f.label).join(', ')
    : '';
  const days = state.availableDays.length
    ? WEEKDAYS.filter((d) => state.availableDays.includes(d.id)).map((d) => d.label).join(', ')
    : '—';
  const goTo = (screen: ScreenId) => dispatch({ type: 'goto', screen });

  return (
    <div className="grid gap-4">
      <ReviewGroup icon="flag" title="Goal & Focus" onEdit={() => goTo('goal')}>
        <ReviewRow label={goal?.title ?? '—'} value={focusLabels || 'No focus set'} />
      </ReviewGroup>

      <ReviewGroup icon="pulse" title="Training Setup" onEdit={() => goTo('status')}>
        <ReviewRow label="Fitness level" value={state.fitnessLevel ? state.fitnessLevel : '—'} />
        <ReviewRow label="Current training" value={`${state.currentTrainingMinutesPerWeek} min/week`} />
        <ReviewRow label="Current intensity" value={`${state.currentIntensity}/5`} />
        <ReviewRow label="Available days" value={days} />
        <ReviewRow label="Sessions / week" value={`${derivedSessionsPerWeek(state)}×`} />
        <ReviewRow
          label="Other activities"
          value={state.otherActivities.length ? `${state.otherActivities.length} added` : '—'}
        />
      </ReviewGroup>

      <ReviewGroup icon="heart" title="Health" onEdit={() => goTo('health')}>
        <ReviewRow
          label="Injuries / conditions"
          value={
            state.hasInjury === null
              ? '—'
              : state.hasInjury
                ? state.injury.bodyPart || 'Flagged'
                : "None — you're good"
          }
        />
      </ReviewGroup>
    </div>
  );
};

// --- Registry ---------------------------------------------------------------

export const SCREENS: Record<ScreenId, ScreenDef> = {
  goal: {
    eyebrow: 'Goal',
    title: 'What do you want to achieve?',
    subtitle: () => 'Choose your main goal — this shapes your entire plan.',
    required: () => true,
    Body: GoalScreen,
  },
  focus: {
    eyebrow: `Focus · up to ${MAX_FOCUS}`,
    title: "What's your focus?",
    subtitle: (s) => {
      const goal = s.goal ? goalBySlug(s.goal) : null;
      return `Within ${goal?.title ?? 'your goal'} — pick up to ${MAX_FOCUS}, this determines your exact plan. (${s.focus.length}/${MAX_FOCUS} selected)`;
    },
    required: (s) => (s.goal ? goalBySlug(s.goal).requiresFocus : false),
    Body: FocusScreen,
  },
  status: {
    eyebrow: 'Training Setup',
    title: 'Current training status',
    subtitle: () => "Optional — tell us where you're starting from today.",
    Body: StatusScreen,
  },
  activities: {
    eyebrow: 'Training Setup',
    title: 'Other sports & activities',
    subtitle: () => 'Optional — so we can balance your recovery and avoid overload. Add as many as apply.',
    Body: ActivitiesScreen,
  },
  health: {
    eyebrow: 'Health',
    title: 'Any injuries or medical conditions?',
    subtitle: () => 'Optional, but helps us keep your plan safe.',
    Body: HealthScreen,
  },
  injury: {
    eyebrow: 'Health',
    title: 'Tell us about the injury',
    subtitle: () => 'Optional detail — the more we know, the safer your plan.',
    Body: InjuryScreen,
  },
  review: {
    eyebrow: 'Review',
    title: 'Review your plan setup',
    subtitle: () => 'Tap any section to jump back and change it.',
    Body: ReviewScreen,
  },
};
