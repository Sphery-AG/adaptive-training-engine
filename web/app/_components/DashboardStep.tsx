'use client';

import { useEffect, useState } from 'react';
import type { PlanView, ResolvedSession } from '@/lib/stub/engine';
import { toCreateTrainingRequest } from '@/lib/stub/engine';
import type { AdaptiveUpdate, MetricSnapshot } from '@/lib/types/engagement';
import type { StimulusType } from '@/lib/types/plan';
import { STIMULUS_LABELS, GOAL_LABELS, GOAL_EMOJI } from '@/lib/labels';
import type { DemoMember } from '@/lib/stub/data';

const STIMULUS_DOT: Record<StimulusType, string> = {
  cardio_endurance: 'bg-sky-400',
  cardio_intensity: 'bg-orange-400',
  cognitive_motor: 'bg-violet-400',
  recovery: 'bg-emerald-400',
  strength: 'bg-rose-400',
  mobility_stability: 'bg-teal-400',
  power_speed: 'bg-amber-400',
};

function deltaIsGood(m: MetricSnapshot): boolean {
  if (m.delta === undefined || m.delta === 0) return true;
  return m.polarity === 'higher_is_better' ? m.delta > 0 : m.delta < 0;
}

export default function DashboardStep({
  member,
  view,
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
  const { plan, gym, resolved, engagement: e } = view;
  const [showJson, setShowJson] = useState(false);
  // Toast is derived from the latest update (not mirrored into state), then
  // dismissed after a delay — avoids a synchronous setState in an effect.
  const [dismissed, setDismissed] = useState<AdaptiveUpdate | null>(null);
  const toast = lastUpdate && lastUpdate !== dismissed ? lastUpdate : null;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setDismissed(toast), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{member.emoji}</span>
          <div>
            <div className="text-lg font-bold">{member.name}</div>
            <div className="text-xs text-zinc-500">{gym.name} · {gym.location}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/5 px-3 py-1.5 text-sm">
            {GOAL_EMOJI[plan.goal]} {GOAL_LABELS[plan.goal]}
          </span>
          <button onClick={onRestart} className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-zinc-400 hover:text-white">
            Start over
          </button>
        </div>
      </div>

      {plan.fitnessEstimate.source === 'questionnaire_only' && (
        <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-2.5 text-sm text-amber-200/90">
          Cold start — this plan is built from your questionnaire alone. It sharpens with every session you log.
        </p>
      )}

      {/* Metrics */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {e.metrics.map((m) => (
          <div key={m.key} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="text-xs text-zinc-500">{m.label}</div>
            <div key={m.value} className="animate-pop mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-bold">{m.value}</span>
              <span className="text-xs text-zinc-500">{m.unit}</span>
              {m.delta !== undefined && m.delta !== 0 && (
                <span className={`ml-1 text-xs font-semibold ${deltaIsGood(m) ? 'text-accent' : 'text-rose-400'}`}>
                  {m.delta > 0 ? '↑' : '↓'}{Math.abs(m.delta)}
                </span>
              )}
            </div>
            <div className="mt-1 text-[11px] leading-tight text-zinc-500">{m.caption}</div>
          </div>
        ))}
      </section>

      {/* Streak + League + CTA */}
      <section className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Streak</div>
          <div className="mt-1 text-3xl font-bold">🔥 {e.streak.currentWeeks}<span className="text-base font-normal text-zinc-500"> wks</span></div>
          <div className="mt-2 text-xs text-zinc-400">
            This week: {e.streak.weekProgress.completed}/{e.streak.weekProgress.target} sessions
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(e.streak.weekProgress.completed / e.streak.weekProgress.target) * 100}%` }} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">League</div>
          <div className="mt-1 text-2xl font-bold capitalize">{e.league.tier}</div>
          <div className="mt-2 text-xs text-zinc-400">
            {e.league.rank}{ordinal(e.league.rank)} of {e.league.cohortSize}
            {e.league.inPromotionZone && <span className="text-accent"> · promoting! ↑</span>}
            {e.league.inRelegationZone && <span className="text-rose-400"> · in relegation ↓</span>}
          </div>
          {e.league.pointsToPromotion !== undefined && e.league.pointsToPromotion > 0 && (
            <div className="mt-1 text-xs text-zinc-500">{e.league.pointsToPromotion} pts to promotion</div>
          )}
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-accent/30 bg-accent/5 p-4">
          <div>
            <div className="text-xs text-zinc-400 uppercase tracking-wide">Next up</div>
            <div className="mt-1 text-sm font-medium">Log your next session to see the plan adapt.</div>
          </div>
          <button onClick={onComplete} className="mt-3 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110">
            ✓ Complete next session
          </button>
        </div>
      </section>

      {/* Quests + Rewards */}
      <section className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Quests</div>
          <ul className="mt-3 space-y-2.5">
            {e.quests.map((q) => (
              <li key={q.id} className={`flex items-center gap-3 ${q.completed ? 'opacity-60' : ''}`}>
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs ${q.completed ? 'bg-accent text-black' : 'bg-white/10'}`}>
                  {q.completed ? '✓' : ''}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium">{q.title}</span>
                  <span className="block text-xs text-zinc-500">{q.description} · +{q.rewardPoints} pts</span>
                </span>
                <span className="text-xs text-zinc-500">{q.progress.current}/{q.progress.target}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 uppercase tracking-wide">Rewards</span>
            <span className="text-sm font-semibold text-accent">{e.wallet.pointsBalance} pts</span>
          </div>
          <ul className="mt-3 space-y-2">
            {e.wallet.catalog.map((r) => {
              const unlocked = r.status !== 'locked';
              return (
                <li key={r.id} className="flex items-center justify-between gap-3">
                  <span className={`text-sm ${unlocked ? '' : 'text-zinc-500'}`}>{unlocked ? '🎁' : '🔒'} {r.label}</span>
                  <span className={`text-xs ${unlocked ? 'text-accent' : 'text-zinc-600'}`}>{unlocked ? 'Unlocked' : `${r.pointsCost} pts`}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] leading-tight text-zinc-600">Perks are chosen and fulfilled by the gym. Shown &amp; tracked here — redemption is out of scope for v1.</p>
        </div>
      </section>

      {/* Plan */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Your 4-week plan</h2>
        <p className="mt-2 text-sm text-zinc-400">{plan.rationale}</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {resolved.map((wk) => (
            <div key={wk.weekNumber} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Week {wk.weekNumber}</span>
                <span className="text-xs text-zinc-500">{wk.focus}</span>
              </div>
              <ul className="mt-3 space-y-2">
                {wk.sessions.map((rs) => (
                  <SessionRow key={rs.session.id} rs={rs} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Integration proof */}
      <section className="mt-6">
        <button onClick={() => setShowJson((v) => !v)} className="text-sm text-zinc-400 hover:text-white">
          {showJson ? '▾' : '▸'} Integration-ready output (kiosk <code className="text-accent">CreateTrainingRequest</code>)
        </button>
        {showJson && (
          <pre className="mt-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs leading-relaxed text-zinc-300">
{JSON.stringify(toCreateTrainingRequest(view, 1), null, 2)}
          </pre>
        )}
      </section>

      {/* Toast */}
      {toast && (
        <div className="fixed inset-x-0 bottom-4 z-50 mx-auto w-[92%] max-w-md animate-pop rounded-2xl border border-accent/40 bg-zinc-900/95 p-4 shadow-xl backdrop-blur">
          <div className="text-sm font-semibold text-accent">{toast.summary}</div>
          {toast.planChanges.map((c, i) => (
            <div key={i} className="mt-1 text-xs text-zinc-300">↻ {c}</div>
          ))}
          {toast.newlyUnlocked.map((r) => (
            <div key={r.id} className="mt-1 text-xs text-zinc-300">🎁 Unlocked: {r.label}</div>
          ))}
          <div className="mt-1.5 flex flex-wrap gap-2">
            {toast.metricChanges.filter((m) => m.delta).map((m) => (
              <span key={m.key} className="text-[11px] text-zinc-400">
                {m.label} {m.delta! > 0 ? '↑' : '↓'}{Math.abs(m.delta!)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SessionRow({ rs }: { rs: ResolvedSession }) {
  const s = rs.session;
  return (
    <li className="flex items-start gap-2.5">
      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${STIMULUS_DOT[s.stimulusType]}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-medium">{STIMULUS_LABELS[s.stimulusType]}</span>
          <span className="text-zinc-500">on {rs.stationName}</span>
          {rs.stationIsSphery && <span className="rounded bg-accent/15 px-1.5 text-[10px] text-accent">Sphery</span>}
          {rs.substituted && <span className="rounded bg-amber-400/15 px-1.5 text-[10px] text-amber-300">substituted</span>}
        </div>
        <div className="mt-0.5 text-xs text-zinc-500">
          {s.durationMinutes} min · zone {s.hrTarget.zone} ({s.hrTarget.bpm?.min}–{s.hrTarget.bpm?.max} bpm) · difficulty {s.difficulty}/10
        </div>
        <div className="mt-0.5 text-[11px] leading-tight text-zinc-600">{s.rationale}</div>
      </div>
    </li>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}
