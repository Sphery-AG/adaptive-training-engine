'use client';

/**
 * "Welcome to your gym" — the arrival screen, between the plan reveal and the
 * dashboard (Stephan, Aug 11). It answers three things in the order a member
 * asks them on walking in: where am I, how am I doing right now, and what am I
 * about to unlock. The add-a-plan action lives here too, because arriving is
 * when you decide what you are training for.
 *
 * Pure view of PlanView + engagement. No new data: every number here already
 * existed in MemberEngagement and was only reachable two tabs deep.
 */
import { useState } from 'react';
import type { PlanView } from '@/lib/stub/engine';
import { MONTHLY_TARGET, monthlyPointsFor } from '@/lib/stub/engine';
import type { Quest, Reward } from '@/lib/types/engagement';
import type { GymConcept } from '@/lib/types/gym';
import type { PlanSummary } from '@/lib/plan-summary';
import { Icon } from './icons';
import PlanSwitcher from './PlanSwitcher';

/**
 * The quest closest to done. Ratio rather than absolute remaining, so "2 of 3
 * sessions" beats "0 of 1 personal best" — the one you are actually near.
 */
function nearestQuest(quests: Quest[]): Quest | undefined {
  return quests
    .filter((q) => !q.completed && q.progress.target > 0)
    .sort((a, b) => b.progress.current / b.progress.target - a.progress.current / a.progress.target)[0];
}

/** The cheapest reward still out of reach, and how far off it is. */
function nearestReward(catalog: Reward[], balance: number): { reward: Reward; short: number } | undefined {
  const locked = catalog
    .filter((r) => r.status === 'locked' && r.pointsCost > balance)
    .sort((a, b) => a.pointsCost - b.pointsCost)[0];
  return locked ? { reward: locked, short: locked.pointsCost - balance } : undefined;
}

export default function GymWelcomeStep({
  view,
  gyms,
  plans,
  activeId,
  busy,
  onEnter,
  onAddPlan,
  onSwitchPlan,
  onChangeGym,
}: {
  view: PlanView;
  gyms: GymConcept[];
  plans: PlanSummary[];
  activeId: string;
  busy: boolean;
  onEnter: () => void;
  onAddPlan: () => void;
  onSwitchPlan: (id: string) => void;
  onChangeGym: (gym: GymConcept) => void;
}) {
  const { gym, plan, engagement: e } = view;
  const week = e.streak.weekProgress;
  const monthly = monthlyPointsFor(e);
  const quest = nearestQuest(e.quests);
  const reward = nearestReward(e.wallet.catalog, e.wallet.pointsBalance);
  const [picking, setPicking] = useState(false);

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-5 pt-6 pb-5 sm:pt-10">
      {/* Where am I */}
      <div
        className="relative overflow-hidden rounded-[28px] border border-[var(--accent-soft2)] px-6 py-9 text-center"
        style={{ background: 'var(--gradient-hero)' }}
      >
        <div
          className="mx-auto grid h-16 w-16 place-items-center rounded-2xl text-[var(--accent-contrast)]"
          style={{ background: 'var(--gradient-accent)', boxShadow: 'var(--shadow-glow)' }}
        >
          <Icon name="sparkle" size={30} />
        </div>
        <p className="eyebrow mt-5 text-accent">Welcome to</p>
        <h1 className="mt-1 text-4xl leading-[0.95]">{gym.name}</h1>
        <p className="mt-3 text-sm leading-relaxed text-dim">
          {gym.stations.length} stations ready for you
        </p>
      </div>

      {/* Where you are, and how to be somewhere else. Changing gyms rebuilds
        * the plan against the new floor, so this is a real switch rather than
        * a change of label. */}
      <div className="mt-4 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--accent-soft2)] text-accent">
            <Icon name="pin" size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-faint">Current location</p>
            <p className="mt-0.5 truncate text-sm font-semibold">{gym.location}</p>
          </div>
          <button
            type="button"
            onClick={() => setPicking((p) => !p)}
            aria-expanded={picking}
            disabled={busy}
            className="shrink-0 rounded-full border border-border px-3.5 py-2 text-xs font-medium text-dim transition-colors hover:border-[var(--border-strong)] hover:text-white disabled:opacity-50"
          >
            {picking ? 'Cancel' : 'Change'}
          </button>
        </div>
        {picking && (
          <ul className="border-t border-border px-2 pb-2 pt-1.5">
            {gyms.map((g) => {
              const here = g.id === gym.id;
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    disabled={here || busy}
                    onClick={() => {
                      setPicking(false);
                      onChangeGym(g);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-white/[0.03] disabled:hover:bg-transparent"
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm ${here ? 'text-faint' : 'font-semibold'}`}>{g.name}</p>
                      <p className="mt-0.5 truncate text-xs text-faint">
                        {g.location} · {g.stations.length} stations
                      </p>
                    </div>
                    {here ? (
                      <span className="shrink-0 text-xs text-faint">You are here</span>
                    ) : (
                      <Icon name="chevron-left" size={15} className="shrink-0 rotate-180 text-faint" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* How am I doing: this week, this month, the streak */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat
          label="This week"
          value={`${week.completed}/${week.target}`}
          caption="sessions"
          fraction={week.target > 0 ? week.completed / week.target : 0}
          color="var(--orbit-cyan)"
        />
        <Stat
          label="This month"
          value={`${Math.round((monthly / MONTHLY_TARGET) * 100)}%`}
          caption="to next rank"
          fraction={monthly / MONTHLY_TARGET}
          color="var(--orbit-fuchsia)"
        />
        <Stat
          label="Streak"
          value={`${e.streak.currentWeeks}`}
          caption={e.streak.currentWeeks === 1 ? 'week' : 'weeks'}
          fraction={e.streak.longestWeeks > 0 ? e.streak.currentWeeks / e.streak.longestWeeks : 0}
          color="var(--orbit-violet)"
        />
      </div>

      {/* What am I about to unlock */}
      {(quest || reward) && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <p className="eyebrow text-mint">Closest to unlocking</p>
          {quest && (
            <div className="mt-3 flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mint/15 text-mint">
                <Icon name="target" size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{quest.title}</p>
                <p className="mt-0.5 text-xs text-faint">
                  {quest.progress.target - quest.progress.current} to go · +{quest.rewardPoints} pts
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-mint tabular">
                {quest.progress.current}/{quest.progress.target}
              </span>
            </div>
          )}
          {reward && (
            <div className="mt-3 flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-fuchsia/15 text-fuchsia">
                <Icon name="gift" size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{reward.reward.label}</p>
                <p className="mt-0.5 text-xs text-faint">
                  {reward.short} pts away · {e.wallet.pointsBalance} of {reward.reward.pointsCost}
                </p>
              </div>
              <Icon name="lock" size={15} className="shrink-0 text-faint" />
            </div>
          )}
        </div>
      )}

      {/* Which plan you are here for. Silent until there is a second one. */}
      {plans.length > 1 && (
        <div className="mt-4">
          <p className="eyebrow mb-2 text-faint">Your plans</p>
          <PlanSwitcher plans={plans} activeId={activeId} busy={busy} onSwitch={onSwitchPlan} />
        </div>
      )}

      {/* Add a plan. Sits below the numbers because it is the rarer choice. */}
      <button
        type="button"
        onClick={onAddPlan}
        className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-colors hover:border-[var(--border-strong)]"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--accent-soft2)] text-accent">
          <Icon name="plus" size={16} />
        </span>
        <div className="flex-1">
          <div className="font-semibold">Add another training plan</div>
          <div className="text-sm text-dim">Training for something else too? Build a second plan.</div>
        </div>
        <Icon name="chevron-left" size={18} className="rotate-180 text-faint" />
      </button>

      <div className="sticky bottom-0 mt-5 flex flex-col gap-2.5 bg-gradient-to-t from-background via-background to-transparent pt-4">
        <button
          type="button"
          onClick={onEnter}
          className="h-14 w-full rounded-full text-base font-semibold text-[var(--accent-contrast)]"
          style={{ background: 'var(--gradient-accent)', boxShadow: 'var(--shadow-glow)' }}
        >
          Let&rsquo;s go
        </button>
        <p className="mt-1 text-center text-xs text-faint">
          {plan.weeks.length}-week plan · {gym.name}
        </p>
      </div>
    </div>
  );
}

/** One number with the bar that gives it a sense of scale. */
function Stat({
  label,
  value,
  caption,
  fraction,
  color,
}: {
  label: string;
  value: string;
  caption: string;
  fraction: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3.5">
      <p className="eyebrow text-faint">{label}</p>
      <p className="mt-1.5 text-2xl leading-none tabular" style={{ color }}>
        {value}
      </p>
      <p className="mt-1 text-xs text-faint">{caption}</p>
      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}
