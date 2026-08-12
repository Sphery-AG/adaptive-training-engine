'use client';

/**
 * The list of plans a member is running, with the active one marked. Shared by
 * the arrival screen (where you pick what you are here to do) and the Plan tab
 * (where you would think to look for it), so both stay in step.
 *
 * Renders nothing at one plan: a switcher with a single option is noise.
 */
import type { PlanSummary } from '@/lib/plan-summary';
import { GOAL_LABELS } from '@/lib/labels';
import { Icon } from './icons';

export default function PlanSwitcher({
  plans,
  activeId,
  busy,
  onSwitch,
}: {
  plans: PlanSummary[];
  activeId: string;
  busy?: boolean;
  onSwitch: (id: string) => void;
}) {
  if (plans.length < 2) return null;

  return (
    <ul className="space-y-2">
      {plans.map((p) => {
        const isActive = p.id === activeId;
        const pct = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;
        return (
          <li key={p.id}>
            <button
              type="button"
              disabled={isActive || busy}
              onClick={() => onSwitch(p.id)}
              aria-current={isActive}
              className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                isActive
                  ? 'border-[var(--accent-soft2)] bg-[var(--accent-soft)]'
                  : 'border-border bg-card hover:border-[var(--border-strong)]'
              }`}
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                  isActive ? 'bg-[var(--accent-soft2)] text-accent' : 'bg-white/[0.06] text-faint'
                }`}
              >
                <Icon name={isActive ? 'check' : 'orbit'} size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{GOAL_LABELS[p.goal]}</p>
                <p className="mt-0.5 truncate text-xs text-faint">
                  {p.weeks} weeks · {p.completed}/{p.total} sessions · {p.gymName}
                </p>
              </div>
              <span className={`shrink-0 text-xs tabular ${isActive ? 'text-accent' : 'text-faint'}`}>
                {pct}%
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
