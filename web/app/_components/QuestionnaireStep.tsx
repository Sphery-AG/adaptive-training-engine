'use client';

import { useState, type ReactNode } from 'react';
import { TRAINING_GOALS, ACTIVITY_LEVELS, type TrainingGoal, type ActivityLevel, type QuestionnaireAnswers } from '@/lib/types/plan';
import { GOAL_LABELS, GOAL_BLURBS, GOAL_EMOJI } from '@/lib/labels';
import type { DemoMember } from '@/lib/stub/data';
import type { GymConcept } from '@/lib/types/gym';

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Barely active',
  light: 'Light',
  moderate: 'Moderate',
  active: 'Active',
  very_active: 'Very active',
};

export default function QuestionnaireStep({
  member,
  gym,
  onSubmit,
  onBack,
}: {
  member: DemoMember;
  gym: GymConcept;
  onSubmit: (a: QuestionnaireAnswers) => void;
  onBack: () => void;
}) {
  const [goal, setGoal] = useState<TrainingGoal | null>(null);
  const [age, setAge] = useState(member.baseline?.actualAge ?? 35);
  const [weightKg, setWeightKg] = useState(75);
  const [heightCm, setHeightCm] = useState(175);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [sessionLengthMinutes, setSessionLengthMinutes] = useState<20 | 30 | 45 | 60>(30);
  const [hasMedicalFlags, setHasMedicalFlags] = useState(false);

  const prefilled = member.baseline !== null;

  function submit() {
    if (!goal) return;
    onSubmit({ age, weightKg, heightCm, goal, activityLevel, sessionsPerWeek, sessionLengthMinutes, hasMedicalFlags });
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10">
      <button onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-300">← back</button>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Let&rsquo;s build {member.name === 'Guest' ? 'your' : `${member.name}'s`} plan</h1>
      <p className="mt-2 text-zinc-400">
        {prefilled ? 'Profile prefilled from history — just confirm your goal.' : 'A few quick questions. No heart-rate stuff — we estimate that from your training.'}
      </p>

      {/* Goal */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">What do you want to achieve?</h2>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {TRAINING_GOALS.map((g) => (
            <button
              key={g}
              onClick={() => setGoal(g)}
              className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
                goal === g ? 'border-accent bg-accent/10' : 'border-white/10 bg-white/[0.02] hover:border-white/25'
              }`}
            >
              <span className="text-2xl leading-none">{GOAL_EMOJI[g]}</span>
              <span>
                <span className="block text-sm font-semibold">{GOAL_LABELS[g]}</span>
                <span className="mt-0.5 block text-xs text-zinc-400">{GOAL_BLURBS[g]}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Profile */}
      <section className="mt-8 grid grid-cols-3 gap-3">
        {([['Age', age, setAge, 'yrs'], ['Weight', weightKg, setWeightKg, 'kg'], ['Height', heightCm, setHeightCm, 'cm']] as const).map(
          ([label, val, set, unit]) => (
            <label key={label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
              <span className="text-xs text-zinc-500">{label}</span>
              <div className="mt-1 flex items-baseline gap-1">
                <input
                  type="number"
                  value={val}
                  onChange={(e) => set(Number(e.target.value))}
                  className="w-full bg-transparent text-xl font-semibold outline-none"
                />
                <span className="text-xs text-zinc-500">{unit}</span>
              </div>
            </label>
          ),
        )}
      </section>

      {/* Activity */}
      <Section title="How active are you right now?">
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_LEVELS.map((a) => (
            <Chip key={a} active={activityLevel === a} onClick={() => setActivityLevel(a)}>
              {ACTIVITY_LABELS[a]}
            </Chip>
          ))}
        </div>
      </Section>

      {/* Frequency + length */}
      <Section title="How often, and how long?">
        <div className="flex flex-wrap gap-2">
          {[2, 3, 4, 5].map((n) => (
            <Chip key={n} active={sessionsPerWeek === n} onClick={() => setSessionsPerWeek(n)}>
              {n}× / week
            </Chip>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {([20, 30, 45, 60] as const).map((n) => (
            <Chip key={n} active={sessionLengthMinutes === n} onClick={() => setSessionLengthMinutes(n)}>
              {n} min
            </Chip>
          ))}
        </div>
      </Section>

      {/* Safety gate */}
      <label className="mt-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <input type="checkbox" checked={hasMedicalFlags} onChange={(e) => setHasMedicalFlags(e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
        <span className="text-sm text-zinc-300">I have a medical condition or recent injury <span className="text-zinc-500">(plan is held for trainer sign-off)</span></span>
      </label>

      <button
        disabled={!goal}
        onClick={submit}
        className="mt-8 w-full rounded-full bg-accent px-6 py-4 text-base font-semibold text-black transition enabled:hover:brightness-110 disabled:opacity-30"
      >
        Generate my plan →
      </button>
      <p className="mt-3 text-center text-xs text-zinc-600">Plan generated at {gym.name}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm transition ${
        active ? 'border-accent bg-accent/10 text-white' : 'border-white/10 text-zinc-300 hover:border-white/25'
      }`}
    >
      {children}
    </button>
  );
}
