'use client';

import { useState } from 'react';
import { DEMO_MEMBERS, GYMS, type DemoMember } from '@/lib/stub/data';
import type { GymConcept } from '@/lib/types/gym';

/** First-letter monogram for a member — a clean, designed avatar (no emoji). */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function WelcomeStep({
  onStart,
}: {
  onStart: (member: DemoMember, gym: GymConcept) => void;
}) {
  const [memberId, setMemberId] = useState<string | null>(null);
  const [gymId, setGymId] = useState<string>('sphere-darmstadt');

  const member = DEMO_MEMBERS.find((m) => m.id === memberId);
  const gym = GYMS.find((g) => g.id === gymId);
  const ready = member && gym;

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:py-16">
      <p className="text-accent text-sm font-semibold tracking-wide uppercase">Sphery · Adaptive Training</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
        A plan that adapts to you — <span className="text-accent">at any gym</span>.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-zinc-400">
        Personalized training built from your data, wrapped in a habit loop that keeps you coming back.
        Pick who&rsquo;s training and where.
      </p>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Who&rsquo;s training?</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {DEMO_MEMBERS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMemberId(m.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                memberId === m.id
                  ? 'border-accent bg-accent/10'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/25'
              }`}
            >
              <div
                aria-hidden
                className="font-display grid h-12 w-12 place-items-center rounded-2xl border border-[var(--accent-soft2)] bg-[var(--accent-soft)] text-xl leading-none text-accent"
              >
                {initials(m.name)}
              </div>
              <div className="mt-3 font-semibold">{m.name}</div>
              <div className="mt-1 text-xs text-zinc-400">{m.tagline}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Which gym?</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {GYMS.map((g) => (
            <button
              key={g.id}
              onClick={() => setGymId(g.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                gymId === g.id
                  ? 'border-accent bg-accent/10'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/25'
              }`}
            >
              <div className="font-semibold">{g.name}</div>
              <div className="mt-1 text-xs text-zinc-400">{g.tagline}</div>
              <div className="mt-3 flex flex-wrap gap-1">
                {g.stations.slice(0, 4).map((s) => (
                  <span key={s.id} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">
                    {s.name}
                  </span>
                ))}
                {g.stations.length > 4 && (
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-500">
                    +{g.stations.length - 4}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Same engine, any equipment — the plan is written in training stimulus, then matched to whatever this gym has.
        </p>
      </section>

      <button
        disabled={!ready}
        onClick={() => ready && onStart(member!, gym!)}
        className="mt-10 w-full rounded-full bg-accent px-6 py-4 text-center text-base font-semibold text-black transition enabled:hover:brightness-110 disabled:opacity-30 sm:w-auto sm:px-10"
      >
        {member?.baseline === null ? 'Continue as guest →' : 'Continue →'}
      </button>
    </div>
  );
}
