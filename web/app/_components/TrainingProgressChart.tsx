'use client';

/**
 * "Your training progress" — the member's own history, read like a stock chart.
 *
 * Four zoom levels (Stephan, Aug 14): every session, then days, weeks, months.
 * Seven metrics, each one tappable on and off, so a member can ask "did my heart
 * rate come down as my minutes went up" instead of being handed one answer.
 *
 * Real numbers when the engine is reachable: GET /progress-series/{id} reads the
 * member's actual workouts. On the deployed demo there is no engine, so it falls
 * back to the sample series and badges itself as such — the badge is bound to
 * where the data came from, not hardcoded.
 *
 * ## Two rules this chart has to obey
 *
 * **Null is a gap, never a zero.** Heart rate is recorded on about a tenth of
 * workouts. Plotting an unrecorded month at 0 bpm would draw a cliff that never
 * happened, so the line breaks and resumes instead.
 *
 * **Colour follows meaning (DESIGN.md, Fixed Orbit Rule).** Body is cyan because
 * it is physical, brain violet because it is cognitive. The three heart-rate
 * metrics use the zone ramp under the Zone Ramp Exception, since athletes read
 * that ramp everywhere. Minutes and calories have no meaning in the orbit list,
 * so by the same rule they stay neutral and separate by line style instead —
 * which is also what keeps seven series from becoming seven competing accents.
 */
import { useEffect, useId, useState } from 'react';
import type { DemoMember } from '@/lib/stub/data';
import { progressSeries } from '@/lib/stub/progress-series';
import {
  fetchProgressSeries,
  type ProgressSeries,
  type SeriesPoint,
  type SeriesRange,
} from '@/lib/engine/client';
import { Icon } from './icons';

type MetricKey = 'body' | 'brain' | 'avg_hr' | 'max_hr' | 'hr_recovery' | 'minutes' | 'calories';

const METRICS: {
  key: MetricKey;
  label: string;
  color: string;
  dashed?: boolean;
  unit: string;
  /** Round to whole numbers in the readout; minutes and scores read better flat. */
  digits: number;
}[] = [
  { key: 'body', label: 'Body', color: 'var(--orbit-cyan)', unit: '', digits: 0 },
  { key: 'brain', label: 'Brain', color: 'var(--orbit-violet)', unit: '', digits: 0 },
  { key: 'avg_hr', label: 'HR avg', color: '#fde047', unit: ' bpm', digits: 0 },
  { key: 'max_hr', label: 'HR max', color: '#fb7185', unit: ' bpm', digits: 0 },
  { key: 'hr_recovery', label: 'HR recovery', color: '#4ade80', unit: ' bpm', digits: 0 },
  { key: 'minutes', label: 'Minutes', color: 'rgba(255,255,255,0.85)', unit: ' min', digits: 0 },
  { key: 'calories', label: 'Calories', color: 'rgba(255,255,255,0.85)', dashed: true, unit: ' kcal', digits: 0 },
];

const RANGES: { id: SeriesRange; label: string }[] = [
  { id: 'session', label: 'Sessions' },
  { id: 'day', label: 'Daily' },
  { id: 'week', label: 'Weekly' },
  { id: 'month', label: 'Monthly' },
];

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
  const [range, setRange] = useState<SeriesRange>('session');
  const [on, setOn] = useState<Set<MetricKey>>(new Set(['body', 'brain']));
  const [active, setActive] = useState<number | null>(null);
  const [live, setLive] = useState<ProgressSeries | null>(null);
  const [loading, setLoading] = useState(false);
  const gid = useId();

  useEffect(() => {
    const id = member.spheryUserId;
    if (!id) {
      setLive(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchProgressSeries(id, range)
      .then((s) => {
        if (!cancelled) {
          setLive(s);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [member.spheryUserId, range]);

  const points: SeriesPoint[] = live?.points ?? sampleAs(member, bodyScore, brainScore);
  const isSample = !live;

  // Nothing selected would leave an empty plot with no way back, so the last
  // metric standing cannot be switched off.
  const toggle = (k: MetricKey) =>
    setOn((prev) => {
      const next = new Set(prev);
      if (next.has(k)) {
        if (next.size === 1) return prev;
        next.delete(k);
      } else next.add(k);
      return next;
    });

  const shownMetrics = METRICS.filter((m) => on.has(m.key));
  const x = (i: number) =>
    PAD.left + (points.length <= 1 ? 0 : (i / (points.length - 1)) * (W - PAD.left - PAD.right));

  /**
   * Each metric is scaled to its own range, the way a stock chart compares two
   * tickers. Body sits at 0-100 and calories in the hundreds; on one shared axis
   * the calories line would flatten everything else into a straight edge. The
   * readout under the plot carries the real numbers, so nothing is lost.
   */
  const scaleOf = (key: MetricKey) => {
    const vals = points.map((p) => p[key]).filter((v): v is number => v !== null);
    if (!vals.length) return null;
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = (hi - lo || Math.abs(hi) || 1) * 0.15;
    return { lo: lo - pad, hi: hi + pad };
  };

  const y = (key: MetricKey, v: number) => {
    const s = scaleOf(key);
    if (!s) return H - PAD.bottom;
    return PAD.top + (1 - (v - s.lo) / (s.hi - s.lo || 1)) * (H - PAD.top - PAD.bottom);
  };

  /** Segments, not one path: a null breaks the line rather than bridging it. */
  const segments = (key: MetricKey) => {
    const out: string[] = [];
    let cur: string[] = [];
    points.forEach((p, i) => {
      const v = p[key];
      if (v === null) {
        if (cur.length > 1) out.push(cur.join(' '));
        cur = [];
        return;
      }
      cur.push(`${cur.length === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(key, v).toFixed(1)}`);
    });
    if (cur.length > 1) out.push(cur.join(' '));
    return out;
  };

  /** A metric with a single reading has no line, so mark the point itself. */
  const lonePoints = (key: MetricKey) =>
    points
      .map((p, i) => ({ p, i }))
      .filter(
        ({ p, i }) =>
          p[key] !== null && (points[i - 1]?.[key] ?? null) === null && (points[i + 1]?.[key] ?? null) === null,
      );

  const shown = active !== null ? points[active] : null;
  const empties = shownMetrics.filter((m) => scaleOf(m.key) === null);

  return (
    <div className="rounded-[26px] border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-accent">Your training progress</p>
          <p className="mt-1 text-xs text-faint">
            {loading
              ? 'Loading your history…'
              : live?.anchor
                ? `Up to your last session, ${fmtAnchor(live.anchor)}`
                : `${points.filter((p) => p.sessions).length} of ${points.length} periods trained`}
          </p>
        </div>
        {isSample && (
          <span className="shrink-0 rounded-full border border-amber/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber">
            Sample
          </span>
        )}
      </div>

      {/* Metric chips. Tappable so any combination can be read on a phone. */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {METRICS.map((m) => {
          const isOn = on.has(m.key);
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => toggle(m.key)}
              aria-pressed={isOn}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-opacity ${
                isOn ? 'border-[var(--border-strong)]' : 'border-border text-faint opacity-55'
              }`}
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{ background: isOn ? m.color : 'currentColor' }}
              />
              {m.label}
            </button>
          );
        })}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full touch-none"
        role="img"
        aria-label={`${shownMetrics.map((m) => m.label).join(', ')} over ${range}.${isSample ? ' Sample data.' : ''}`}
        onPointerLeave={() => setActive(null)}
        onPointerDown={(e) => trackPointer(e, points.length, setActive)}
        onPointerMove={(e) => e.buttons && trackPointer(e, points.length, setActive)}
      >
        <defs>
          <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={shownMetrics[0]?.color ?? 'transparent'} stopOpacity="0.18" />
            <stop offset="100%" stopColor={shownMetrics[0]?.color ?? 'transparent'} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Recessive grid, no numbers: with each metric on its own scale a shared
          * axis label would be true for at most one of them. */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + f * (H - PAD.top - PAD.bottom)}
            y2={PAD.top + f * (H - PAD.top - PAD.bottom)}
            stroke="currentColor"
            className="text-white/[0.06]"
            strokeWidth="1"
          />
        ))}

        {/* Periods with no training, marked on the axis so a gap in the line is
          * explained rather than mysterious. */}
        {points.map((p, i) =>
          p.sessions === 0 ? (
            <circle key={`e${i}`} cx={x(i)} cy={H - PAD.bottom + 6} r="1.6" fill="currentColor" className="text-white/20" />
          ) : null,
        )}

        {shownMetrics.map((m) => (
          <g key={m.key}>
            {segments(m.key).map((d, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={m.color}
                strokeWidth="2"
                strokeDasharray={m.dashed ? '4 3' : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {lonePoints(m.key).map(({ p, i }) => (
              <circle key={`l${i}`} cx={x(i)} cy={y(m.key, p[m.key] as number)} r="2.5" fill={m.color} />
            ))}
          </g>
        ))}

        {active !== null && (
          <g>
            <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={H - PAD.bottom} stroke="white" strokeWidth="1" opacity="0.25" />
            {shownMetrics.map((m) => {
              const v = points[active][m.key];
              return v === null ? null : (
                <circle
                  key={m.key}
                  cx={x(active)}
                  cy={y(m.key, v)}
                  r="4"
                  fill={m.color}
                  stroke="var(--background)"
                  strokeWidth="2"
                />
              );
            })}
          </g>
        )}
      </svg>

      <div className="min-h-[2.4rem] px-1 text-[10px] text-faint">
        {shown ? (
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span className="font-semibold text-white">{shown.label}</span>
            {shownMetrics.map((m) => (
              <span key={m.key} className="tabular">
                <span style={{ color: m.color }}>{m.label}</span>{' '}
                {shown[m.key] === null ? '—' : `${fmtVal(shown[m.key] as number, m.digits)}${m.unit}`}
              </span>
            ))}
          </div>
        ) : (
          <div className="flex items-baseline justify-between">
            <span>{points[0]?.label}</span>
            <span>Drag across for detail</span>
            <span>{points[points.length - 1]?.label}</span>
          </div>
        )}
      </div>

      <div className="mt-2 flex gap-1.5">
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

      {/* Say which selected metrics have nothing behind them, rather than
        * letting a chip look broken. HR is recorded on about a tenth of
        * sessions, so this is the common case, not an edge one. */}
      {empties.length > 0 && (
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-faint">
          <Icon name="info" size={13} className="mt-0.5 shrink-0" />
          <span>
            No {empties.map((m) => m.label.toLowerCase()).join(' or ')} recorded in this period. Heart rate
            is only saved when a chest strap was worn.
          </span>
        </p>
      )}
    </div>
  );
}

/** The sample series, reshaped as SeriesPoints so the chart has one shape. */
function sampleAs(member: DemoMember, bodyScore: number, brainScore: number): SeriesPoint[] {
  return progressSeries(member, 'plan', bodyScore, brainScore).map((p, i) => ({
    label: p.label,
    key: `s${i}`,
    sessions: p.missed ? 0 : 1,
    minutes: null,
    body: p.body,
    brain: p.brain,
    calories: null,
    avg_hr: null,
    max_hr: null,
    hr_recovery: null,
    score: null,
    distance_m: null,
    hr_sessions: 0,
  }));
}

function fmtVal(v: number, digits: number): string {
  return digits === 0 ? String(Math.round(v)) : v.toFixed(digits);
}

function fmtAnchor(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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
