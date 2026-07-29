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

// Plain-language explanation for every focus point, so a member who doesn't
// know the term can tap the "i" and get it in one sentence. Keyed by label.
const FOCUS_INFO: Record<string, string> = {
  Acceleration: 'How quickly you get up to top speed from a standstill.',
  Agility: 'Changing direction fast while staying balanced and in control.',
  Balance: 'Staying steady and controlled on one or both feet.',
  'Better Posture': 'Strengthening the muscles that hold you upright, so you stand and sit taller.',
  'Better Sleep': 'Training that lowers stress and helps you fall and stay asleep.',
  'Bone Health': 'Loading your bones so they stay dense and strong as you age.',
  'Brain Health': 'Keeping your mind sharp through movement that challenges focus and memory.',
  'Cardiovascular Fitness': 'How well your heart and lungs deliver oxygen during sustained effort.',
  'Change of Direction': 'Cutting and pivoting quickly without losing speed or balance.',
  'Cognitive Endurance': "Holding focus and good decisions even when you're tired.",
  Coordination: 'Getting your limbs and senses to work together smoothly.',
  'Core Strength': 'Strength through your midsection that stabilizes every movement.',
  Cycling: 'Conditioning geared toward riding, on the road or indoors.',
  'Decision Making': 'Choosing the right response quickly under pressure.',
  'Dual Task Performance': 'Doing a physical and a thinking task at once, the core of ExerCube training.',
  'Energy & Vitality': 'Training that leaves you with more everyday energy, not less.',
  'Executive Function': 'The brain skills of planning, focus, and self-control.',
  'Explosive Strength': 'Producing force fast, like in jumps, throws, and sprints.',
  Focus: 'Sustained attention on the task in front of you.',
  'Football Season': 'Getting match-ready for football: sprints, cuts, and repeat efforts.',
  'Full Body Strength': 'Building strength evenly across your whole body.',
  'Functional Fitness': 'Strength and mobility for real-life movement, not just the gym.',
  'Functional Strength': 'Strength you can actually use in everyday and sport movements.',
  'General Conditioning': 'All-round fitness that keeps you capable across the board.',
  'Half Marathon': 'Building the endurance to race 21 km.',
  'Healthy Aging': 'Staying strong, mobile, and sharp as the years add up.',
  'Heart Health': 'Training that keeps your heart strong and lowers cardiac risk.',
  Hiking: 'Endurance and leg strength for long days on the trail.',
  'Hip Mobility': 'Freer, stronger movement through your hips.',
  HYROX: 'Prep for HYROX: mixed running and functional strength stations.',
  'Improve Body Composition': 'Shifting your ratio of muscle to fat, not just the number on the scale.',
  'Improve Metabolism': 'Training that helps your body burn energy more efficiently.',
  'Increase Daily Activity': 'Simply moving more across your day.',
  'Injury Prevention': 'Strengthening weak links so you get hurt less often.',
  'Interval Fitness': 'Fitness built from short bursts of hard effort with recovery.',
  'Joint Mobility': 'Moving your joints freely through their full range.',
  'Jump Performance': 'How high and how powerfully you can jump.',
  'Knee Stability': 'Control and strength around the knee to protect it.',
  'Lower Back': 'Strength and care for a resilient lower back.',
  'Lower Body': 'Strength and power through your legs and hips.',
  Marathon: 'Building the endurance to race 42 km.',
  'Maximum Fat Loss': 'The highest-burn approach to dropping body fat.',
  'Maximum Strength': 'The most force your muscles can produce in a single effort.',
  'Metabolic Health': 'Keeping blood sugar, blood pressure, and energy systems in good shape.',
  Mobility: 'Moving freely and comfortably through a full range of motion.',
  'Muscle Growth (Hypertrophy)': 'Training that increases the size of your muscles.',
  'Muscular Endurance': 'How long your muscles can keep working before they fatigue.',
  'Neck & Shoulders': 'Relieving tension and building support around the neck and shoulders.',
  'OCR / Spartan Race': 'Prep for obstacle course racing: running, climbing, carrying.',
  Power: 'Strength times speed: force produced quickly.',
  'Processing Speed': 'How fast your brain takes in and reacts to information.',
  'Reaction Speed': 'How fast you respond to a cue.',
  'Reaction Time': 'The gap between a cue and your response. Lower is better.',
  'Return to Sport': 'Rebuilding safely toward full training after a layoff or injury.',
  'Ski Season': 'Leg strength and endurance to ski strong and avoid injury.',
  Speed: 'How fast you can move at top pace.',
  'Sport-Specific Conditioning': 'Fitness tailored to the demands of your sport.',
  Stamina: 'Sustaining effort over a long duration.',
  'Stress Reduction': 'Using movement to lower stress and calm your system.',
  'Sustainable Weight Loss': 'Losing weight at a pace you can actually keep off.',
  'Tennis Season': 'Court-ready fitness: quick feet, rotation, and repeat sprints.',
  'Tone & Shape Body': 'Building lean muscle definition and shape.',
  Triathlon: 'Endurance across swim, bike, and run.',
  'Upper Body': 'Strength through your chest, back, shoulders, and arms.',
  'VO₂max': "Your body's top rate of using oxygen, the ceiling on your aerobic fitness.",
  'Working Memory': 'Holding and using information in your mind for a few seconds.',
};

// --- Ebene 1: Goal ----------------------------------------------------------

const GoalScreen: FC<ScreenProps> = ({ state, dispatch }) => {
  const [flipped, setFlipped] = useState<string | null>(null);
  return (
    <div role="radiogroup" aria-label="Training goal" className="grid grid-cols-2 gap-2.5">
      {GOALS.map((g) => {
        const selected = state.goal === g.slug;
        const isFlipped = flipped === g.slug;
        return (
          <div key={g.slug} className="[perspective:1000px]">
            <div
              className="relative h-[132px] transition-transform duration-500"
              style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'none' }}
            >
              {/* Front: the selectable goal card */}
              <label className="absolute inset-0 block cursor-pointer [backface-visibility:hidden]">
                <input
                  type="radio"
                  name="goal"
                  value={g.slug}
                  checked={selected}
                  onChange={() => dispatch({ type: 'setGoal', goal: g.slug })}
                  className="peer sr-only"
                />
                <div className="relative flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-[var(--border-strong)] peer-checked:border-accent peer-checked:bg-[var(--accent-soft)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setFlipped(g.slug);
                    }}
                    aria-label={`What is ${g.title}?`}
                    className="absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full text-faint transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <Icon name="info" size={15} />
                  </button>
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
              {/* Back: the explanation */}
              <div
                className="absolute inset-0 flex h-full flex-col rounded-2xl border border-border bg-card p-4 [backface-visibility:hidden]"
                style={{ transform: 'rotateY(180deg)' }}
              >
                <button
                  type="button"
                  onClick={() => setFlipped(null)}
                  aria-label="Close"
                  className="absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full text-faint transition-colors hover:bg-white/5 hover:text-white"
                >
                  <Icon name="close" size={15} />
                </button>
                <span className="eyebrow pr-7 text-accent">{g.title}</span>
                <p className="mt-1.5 overflow-y-auto text-[12.5px] leading-snug text-dim">{g.blurb}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

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
          info={FOCUS_INFO[f.label]}
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

    <div>
      <FieldLabel>Weekly training time</FieldLabel>
      <MinutesSlider
        value={state.trainingMinutesPerWeek}
        onChange={(minutesPerWeek) => dispatch({ type: 'setTraining', patch: { trainingMinutesPerWeek: minutesPerWeek } })}
      />
    </div>

    {state.trainingMinutesPerWeek > 0 && (
      <>
        <div>
          <FieldLabel>Typical intensity</FieldLabel>
          <Scale5
            name="trainingIntensity"
            value={state.trainingIntensity}
            onChange={(trainingIntensity) => dispatch({ type: 'setTraining', patch: { trainingIntensity } })}
          />
        </div>

        <div>
          <FieldLabel>Break it into sports (optional)</FieldLabel>
          <p className="mb-3 text-[13px] text-dim">
            Tell us what those {state.trainingMinutesPerWeek} minutes are spent on. This is optional and helps us balance your recovery.
          </p>
          <ActivitiesScreen state={state} dispatch={dispatch} />
        </div>
      </>
    )}

    <div>
      <FieldLabel>Intended training days</FieldLabel>
      <div role="group" aria-label="Intended training days" className="grid grid-cols-7 gap-2">
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

    <InfoNote>
      The more you tell us, the sharper your first plan. Everything here is optional, so add
      what you know and skip the rest.
    </InfoNote>
  </div>
);

// --- Ebene 2: Other activities ---------------------------------------------

const QUICK_SPORTS = ['Gym', 'Running', 'Cycling', 'Swimming', 'Football', 'Tennis', 'Yoga', 'Walking', 'Other'];

const ActivitiesScreen: FC<ScreenProps> = ({ state, dispatch }) => {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState(QUICK_SPORTS[0]);
  const [customName, setCustomName] = useState('');
  const [minutes, setMinutes] = useState(60);
  const [intensity, setIntensity] = useState<1 | 2 | 3 | 4 | 5>(3);

  function confirm() {
    const finalName = name === 'Other' ? customName.trim() : name;
    if (!finalName) return;
    dispatch({ type: 'addActivity', activity: { name: finalName, minutesPerWeek: minutes, intensity } });
    setAdding(false);
    setName(QUICK_SPORTS[0]);
    setCustomName('');
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
          {name === 'Other' && (
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Which sport or activity?"
              aria-label="Custom sport or activity name"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base outline-none placeholder:text-faint focus:border-[var(--border-strong)]"
            />
          )}
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
      This helps us tailor your plan safely. It does not replace professional medical advice.
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
  const activityMinutes = state.otherActivities.reduce((sum, a) => sum + a.minutesPerWeek, 0);
  const trainingMinutes = state.trainingMinutesPerWeek || activityMinutes;
  const INTENSITY_LABEL = ['', 'very light', 'light', 'moderate', 'hard', 'maximal'];
  const goTo = (screen: ScreenId) => dispatch({ type: 'goto', screen });

  return (
    <div className="grid gap-4">
      <ReviewGroup icon="flag" title="Goal & Focus" onEdit={() => goTo('goal')}>
        <ReviewRow label={goal?.title ?? '—'} value={focusLabels || 'No focus set'} />
      </ReviewGroup>

      <ReviewGroup icon="pulse" title="Training Setup" onEdit={() => goTo('status')}>
        <ReviewRow label="Fitness level" value={state.fitnessLevel ? state.fitnessLevel : '—'} />
        <ReviewRow label="Available days" value={days} />
        <ReviewRow label="Sessions / week" value={`${derivedSessionsPerWeek(state)}×`} />
      </ReviewGroup>

      <ReviewGroup icon="run" title="Current training" onEdit={() => goTo('status')}>
        {trainingMinutes > 0 ? (
          <>
            <ReviewRow label="Weekly total" value={`${trainingMinutes} min/week`} />
            {state.trainingMinutesPerWeek > 0 && (
              <ReviewRow label="Typical intensity" value={INTENSITY_LABEL[state.trainingIntensity]} />
            )}
            {state.otherActivities.map((a, i) => (
              <ReviewRow key={`${a.name}-${i}`} label={a.name} value={`${a.minutesPerWeek} min/week`} />
            ))}
          </>
        ) : (
          <ReviewRow label="Nothing added yet" value="—" />
        )}
      </ReviewGroup>

      <ReviewGroup icon="heart" title="Health" onEdit={() => goTo('health')}>
        <ReviewRow
          label="Injuries / conditions"
          value={
            state.hasInjury === null
              ? '—'
              : state.hasInjury
                ? state.injury.bodyPart || 'Flagged'
                : "None, you're good"
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
    subtitle: () => 'Choose your main goal. Your plan will be shaped around it.',
    required: () => true,
    Body: GoalScreen,
  },
  focus: {
    eyebrow: `Focus · up to ${MAX_FOCUS}`,
    title: "What's your focus?",
    subtitle: (s) => {
      const goal = s.goal ? goalBySlug(s.goal) : null;
      return `Pick up to ${MAX_FOCUS} focus points within ${goal?.title ?? 'your goal'}. This determines your exact plan. (${s.focus.length}/${MAX_FOCUS} selected)`;
    },
    required: (s) => (s.goal ? goalBySlug(s.goal).requiresFocus : false),
    Body: FocusScreen,
  },
  status: {
    eyebrow: 'Training Setup',
    title: 'About you & availability',
    subtitle: () => "The basics we build your plan around.",
    Body: StatusScreen,
  },
  health: {
    eyebrow: 'Health',
    title: 'Any injuries or medical conditions?',
    subtitle: () => 'Help us keep your plan safe.',
    Body: HealthScreen,
  },
  injury: {
    eyebrow: 'Health',
    title: 'Tell us about the injury',
    subtitle: () => 'The more we know, the safer your plan.',
    Body: InjuryScreen,
  },
  review: {
    eyebrow: 'Review',
    title: 'Review your plan setup',
    subtitle: () => 'Tap any section to jump back and change it.',
    Body: ReviewScreen,
  },
};
