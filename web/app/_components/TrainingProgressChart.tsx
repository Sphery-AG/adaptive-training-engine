'use client';

/**
 * "Your training progress" — body and brain over time, with the sessions you
 * missed marked on the axis. From Max's sketch (Aug 11).
 *
 * The chart's argument is consistency: the lines climb while you keep showing
 * up and sag where sessions get skipped, so the miss markers and the dip are
 * the same story told twice.
 *
 * DRAWN FROM MOCK DATA. The engine has no series endpoint yet, so this is a
 * shape to review, not a measurement. The badge says so on screen; see
 * lib/stub/progress-series.ts.
 *
 * Colors: Body keeps the cyan and Brain the violet they already wear on the
 * Progress tab, because color follows the entity. That pair separates at
 * ΔE 24 under deutan/protan/tritan simulation and clears 3:1 on this surface.
 * Misses use the amber caution token and carry a glyph as well as a color, so
 * the state never rests on hue alone.
 */
import { useId, useState } from 'react';
import type { DemoMember } from '@/lib/stub/data';
import { progressSeries, RANGES, type ProgressPoint, type ProgressRange } from '@/lib/stub/progress-series';
import { Icon } from './icons';

const BODY = 'var(--orbit-cyan)';
const BRAIN = 'var(--orbit-violet)';
const MISS = 'var(--orbit-amber)';

const W = 320;
const H = 132;
const PAD = { top: 10, right: 10, bottom: 16, left: 10 };

export default function TrainingProgressChart({
  member,
  bodyScore,
  brainScore,
}: {
  member: DemoMember;
  bodyScore: number;
  brainScore: number;
}) {
  const [range, setRange] = useState<ProgressRange>('plan');
  const [hidden, setHidden] = useState<{ body: boolean; brain: boolean }>({ body: false, brain: false });
  const [active, setActive] = useState<number | null>(null);
  const gid = useId();

  const points = progressSeries(member, range, bodyScore, brainScore);
  const misses = points.filter((p) => p.missed).length;

  const x = (i: number) =>
    PAD.left + (points.length === 1 ? 0 : (i / (points.length - 1)) * (W - PAD.left - PAD.right));

  // Domain fitted to the data with a fixed 8-point margin, not to zero. A
  // 0-100 axis pins a 25-point climb into a quarter of the plot and flattens
  // the dip after a missed session, which is the one thing this chart exists
  // to show. The margin is what stops it going the other way: the range is set
  // by the trend, so per-point noise can never fill the plot on its own.
  const vals = points.flatMap((p) => [...(hidden.body ? [] : [p.body]), ...(hidden.brain ? [] : [p.brain])]);
  const lo = Math.max(0, Math.min(...vals) - 8);
  const hi = Math.min(100, Math.max(...vals) + 8);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD.top - PAD.bottom);

  const path = (key: 'body' | 'brain') =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');

  const shown = active !== null ? points[active] : null;

  return (
    <div className="rounded-[26px] border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-accent">Your training progress</p>
          <p className="mt-1 text-xs text-faint">
            {misses > 0
              ? `${misses} missed session${misses === 1 ? '' : 's'} in this window`
              : 'Every scheduled session done in this window'}
          </p>
        </div>
        {/* Sample data must announce itself. Without this the chart is a claim
          * about the member's body that nothing in the export backs up yet. */}
        <span className="shrink-0 rounded-full border border-amber/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber">
          Sample
        </span>
      </div>

      {/* Legend. Present whenever there are two series, and tappable so either
        * line can be read on its own on a phone-width plot. */}
      <div className="mt-3 flex gap-2">
        {(
          [
            { key: 'body', label: 'Body', color: BODY },
            { key: 'brain', label: 'Brain', color: BRAIN },
          ] as const
        ).map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setHidden((h) => ({ ...h, [s.key]: !h[s.key] }))}
            aria-pressed={!hidden[s.key]}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-opacity ${
              hidden[s.key] ? 'border-border text-faint opacity-60' : 'border-[var(--border-strong)]'
            }`}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: hidden[s.key] ? 'currentColor' : s.color }} />
            {s.label}
          </button>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full touch-none"
        role="img"
        aria-label={`Body and brain trend over ${range}. Sample data.`}
        onPointerLeave={() => setActive(null)}
        onPointerDown={(e) => trackPointer(e, points.length, setActive)}
        onPointerMove={(e) => e.buttons && trackPointer(e, points.length, setActive)}
      >
        <defs>
          <linearGradient id={`${gid}-body`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BODY} stopOpacity="0.20" />
            <stop offset="100%" stopColor={BODY} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Recessive grid: three rules across the fitted range, no numbers. The
          * underlying scores are real 0-100 metrics but this series is
          * invented, so putting values on the axis would dress a mock up as a
          * measurement. */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(lo + (hi - lo) * f)}
            y2={y(lo + (hi - lo) * f)}
            stroke="currentColor"
            className="text-white/[0.06]"
            strokeWidth="1"
          />
        ))}

        {/* Missed sessions: a dashed rule and a marker on the axis. */}
        {points.map((p, i) =>
          p.missed ? (
            <g key={`m${i}`}>
              <line x1={x(i)} x2={x(i)} y1={PAD.top} y2={H - PAD.bottom} stroke={MISS} strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
              <circle cx={x(i)} cy={H - PAD.bottom + 6} r="4.5" fill="none" stroke={MISS} strokeWidth="1.5" />
              <line x1={x(i) - 2.2} x2={x(i) + 2.2} y1={H - PAD.bottom + 6} y2={H - PAD.bottom + 6} stroke={MISS} strokeWidth="1.5" />
            </g>
          ) : null,
        )}

        {!hidden.body && (
          <path
            d={`${path('body')} L${x(points.length - 1)},${H - PAD.bottom} L${x(0)},${H - PAD.bottom} Z`}
            fill={`url(#${gid}-body)`}
            stroke="none"
          />
        )}
        {!hidden.brain && <path d={path('brain')} fill="none" stroke={BRAIN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
        {!hidden.body && <path d={path('body')} fill="none" stroke={BODY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}

        {/* Crosshair. A 2px surface ring keeps the dots legible where the two
          * lines cross each other. */}
        {active !== null && (
          <g>
            <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={H - PAD.bottom} stroke="white" strokeWidth="1" opacity="0.25" />
            {!hidden.body && <circle cx={x(active)} cy={y(points[active].body)} r="4" fill={BODY} stroke="var(--background)" strokeWidth="2" />}
            {!hidden.brain && <circle cx={x(active)} cy={y(points[active].brain)} r="4" fill={BRAIN} stroke="var(--background)" strokeWidth="2" />}
          </g>
        )}

        {/* Direct labels at the live end, so identity never rests on the legend. */}
        {!hidden.body && <circle cx={x(points.length - 1)} cy={y(points[points.length - 1].body)} r="3" fill={BODY} />}
        {!hidden.brain && <circle cx={x(points.length - 1)} cy={y(points[points.length - 1].brain)} r="3" fill={BRAIN} />}
      </svg>

      <div className="flex items-baseline justify-between px-1 text-[10px] text-faint">
        <span>{points[0].label}</span>
        <span className="tabular">
          {shown
            ? `${shown.label} · body ${Math.round(shown.body)} · brain ${Math.round(shown.brain)}`
            : 'Drag across for detail'}
        </span>
        <span>{points[points.length - 1].label}</span>
      </div>

      {/* Range selector */}
      <div className="mt-3 flex gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => {
              setRange(r.id);
              setActive(null);
            }}
            aria-pressed={range === r.id}
            className={`flex-1 rounded-lg px-1 py-1.5 text-xs font-medium transition-colors ${
              range === r.id ? 'bg-[var(--accent-soft)] text-accent' : 'bg-white/[0.04] text-faint hover:text-white'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-faint">
        <Icon name="info" size={13} className="mt-0.5 shrink-0" />
        <span>
          Training compounds while you keep showing up. Missed sessions show as{' '}
          <span className="text-amber">amber marks</span>, and the dip after one is the effect you had
          already built starting to fade. Brain gains trail body gains, then catch up.
        </span>
      </p>
    </div>
  );
}

/** Nearest index under the pointer, in the SVG's own coordinate space. */
function trackPointer(
  e: React.PointerEvent<SVGSVGElement>,
  n: number,
  set: (i: number | null) => void,
) {
  const r = e.currentTarget.getBoundingClientRect();
  const px = ((e.clientX - r.left) / r.width) * W;
  const t = (px - PAD.left) / (W - PAD.left - PAD.right);
  set(Math.max(0, Math.min(n - 1, Math.round(t * (n - 1)))));
}

export type { ProgressPoint };
