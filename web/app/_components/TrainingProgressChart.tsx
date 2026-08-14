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
 *
 * **A gap gets explained, not just drawn.** Most members will open this on a
 * chart that is mostly empty, and the two reasons are different: heart rate is
 * on a tenth of workouts because a strap has to be paired, while the calendar
 * zooms are thin because people train twice a month, not thirty times. So the
 * card says which of the two it is looking at and what would change it — see
 * `guidance()`. Never by inventing a number: a missing reading stays missing.
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
import { Icon, type IconName } from './icons';

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

const RANGES: { id: SeriesRange; label: string; many: string; trend: string }[] = [
  { id: 'session', label: 'Sessions', many: 'sessions', trend: 'trend' },
  { id: 'day', label: 'Daily', many: 'days', trend: 'daily trend' },
  { id: 'week', label: 'Weekly', many: 'weeks', trend: 'weekly trend' },
  { id: 'month', label: 'Monthly', many: 'months', trend: 'monthly trend' },
];

/** The three metrics that need hardware rather than just showing up. */
const HR_KEYS: MetricKey[] = ['avg_hr', 'max_hr', 'hr_recovery'];

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
  // The last settled fetch, carrying who and which zoom it was for. Both travel
  // with it so a stale answer can be recognised rather than trusted, and so the
  // effect never has to set state synchronously to say "asking now".
  const [fetched, setFetched] = useState<{
    userId: number;
    range: SeriesRange;
    series: ProgressSeries | null;
  } | null>(null);
  // How many points the Sessions zoom holds, remembered from whichever fetch
  // returned it. The chart opens on Sessions, so this is known before a member
  // can reach a thinner zoom — and it is what lets the sparse-calendar hint
  // promise a real number of sessions instead of guessing one.
  const [sessions, setSessions] = useState<{ userId: number; n: number } | null>(null);
  const gid = useId();

  useEffect(() => {
    const id = member.spheryUserId;
    if (!id) return;
    let cancelled = false;
    fetchProgressSeries(id, range)
      .then((s) => {
        if (cancelled) return;
        setFetched({ userId: id, range, series: s });
        if (s?.range === 'session') setSessions({ userId: id, n: s.points.length });
      })
      .catch(() => {
        // Engine unreachable. Settle anyway so the card stops saying "loading"
        // and falls back to the sample series, badge and all.
        if (!cancelled) setFetched({ userId: id, range, series: null });
      });
    return () => {
      cancelled = true;
    };
  }, [member.spheryUserId, range]);

  const mine = fetched?.userId === member.spheryUserId ? fetched : null;
  const loading = !!member.spheryUserId && mine?.range !== range;
  // While a new zoom is in flight the previous one stays on screen: blanking
  // the chart for a round trip is worse than showing a moment of old truth.
  const liveForMember = mine?.series ?? null;
  const sessionCount = sessions && sessions.userId === member.spheryUserId ? sessions.n : null;
  const points: SeriesPoint[] = liveForMember?.points ?? sampleAs(member, bodyScore, brainScore);
  const isSample = !liveForMember;

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

  /** Readings actually present for a metric in this window. 0 draws nothing,
    * 1 draws a dot but no line, and both need saying out loud. */
  const filled = (key: MetricKey) => points.reduce((n, p) => n + (p[key] === null ? 0 : 1), 0);

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
  // Describe the points on screen, not the tab. During a zoom change those are
  // briefly different, and "2 of these 12 days" over a weekly series is a lie.
  const plotted = liveForMember?.range ?? range;
  const hints = guidance({ range: plotted, points, shownMetrics, filled });
  // Sessions plots the member's last workouts whatever the dates, so it always
  // holds at least as many points as a calendar window. Offering it is only
  // worth a tap when we know it is denser than what they are looking at.
  const denserZoom =
    !isSample &&
    plotted !== 'session' &&
    sessionCount !== null &&
    sessionCount > points.filter((p) => p.sessions > 0).length;

  return (
    <div className="rounded-[26px] border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-accent">Your training progress</p>
          <p className="mt-1 text-xs text-faint">
            {loading
              ? 'Loading your history…'
              : liveForMember?.anchor
                ? `Up to your last session, ${fmtAnchor(liveForMember.anchor)}`
                : `${points.filter((p) => p.sessions).length} of ${points.length} periods trained`}
          </p>
        </div>
        {isSample && (
          <span className="shrink-0 rounded-full border border-amber/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber">
            Sample
          </span>
        )}
      </div>

      {/* Metric chips. Tappable so any combination can be read on a phone.
        * A metric with nothing behind it in this window carries a hollow dot,
        * so a member can see which chips will do nothing before spending a tap
        * on them — the rest of the story is in the hints under the card. */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {METRICS.map((m) => {
          const isOn = on.has(m.key);
          const isEmpty = filled(m.key) === 0;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => toggle(m.key)}
              aria-pressed={isOn}
              aria-label={isEmpty ? `${m.label}, nothing recorded in this period` : m.label}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-opacity ${
                isOn ? 'border-[var(--border-strong)]' : 'border-border text-faint opacity-55'
              }`}
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={
                  isEmpty
                    ? { border: `1.5px solid ${isOn ? m.color : 'currentColor'}` }
                    : { background: isOn ? m.color : 'currentColor' }
                }
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

      {/* Why the chart looks the way it does, and what would fill it in. Empty
        * and thin are the ordinary cases here, not edge cases, so they get a
        * sentence rather than being left to look broken. */}
      {hints.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {hints.map((h) => (
            <p key={h.id} className="flex items-start gap-2 text-xs leading-relaxed text-faint">
              <Icon name={h.icon} size={13} className="mt-0.5 shrink-0" />
              <span>{h.text}</span>
            </p>
          ))}
          {denserZoom && (
            <button
              type="button"
              onClick={() => {
                setRange('session');
                setActive(null);
              }}
              className="ml-[21px] rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-accent"
            >
              Plot my last {sessionCount} sessions instead
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * What the card says when a line is missing or too short to mean anything.
 *
 * Two causes, and they need different answers. A heart-rate metric is empty
 * because no strap was paired — hardware the member controls, so the hint names
 * it. Body, brain, minutes and calories are on ~99% of workouts, so when they
 * are empty or single the cause is the window, not the metric: the member
 * trained twice this month and a thirty-day view has 28 blanks in it. Saying
 * "no data" to both would be true and useless.
 *
 * Capped at two lines. A card that answers with a paragraph has replaced one
 * bad state with another.
 */
function guidance({
  range,
  points,
  shownMetrics,
  filled,
}: {
  range: SeriesRange;
  points: SeriesPoint[];
  shownMetrics: typeof METRICS;
  filled: (key: MetricKey) => number;
}): { id: string; icon: IconName; text: string }[] {
  const out: { id: string; icon: IconName; text: string }[] = [];
  const noun = RANGES.find((r) => r.id === range)!;
  const trained = points.filter((p) => p.sessions > 0).length;
  // Two points make a line, three make a direction. Below that there is a
  // reading but not a trend, and the card should not imply otherwise.
  const thin = range === 'session' ? points.length < 4 : trained < 3;

  const missingHr = shownMetrics.filter((m) => HR_KEYS.includes(m.key) && filled(m.key) === 0);
  if (missingHr.length) {
    out.push({
      id: 'hr',
      icon: 'pulse',
      // Recovery is the rarest line in the export at 5.3%, because it needs the
      // strap *and* a session with pauses to read the drop against. Saying so
      // is kinder than letting a member chase a number they can't get today.
      text:
        missingHr.length === 1 && missingHr[0].key === 'hr_recovery'
          ? 'HR recovery needs a chest strap and the pauses between rounds, which about one session in twenty records.'
          : `${names(missingHr)} ${missingHr.length > 1 ? 'need' : 'needs'} a chest strap paired before the session` +
            (missingHr.some((m) => m.key === 'hr_recovery')
              ? ' — recovery also reads the pauses between rounds.'
              : '.'),
    });
  }

  if (thin) {
    out.push(
      range === 'session'
        ? {
            id: 'window',
            icon: 'sparkle',
            text: `${points.length} ${points.length === 1 ? 'session' : 'sessions'} so far. Every one you finish adds a point here, and the shape starts to read at around four.`,
          }
        : {
            id: 'window',
            icon: 'info',
            text: `Only ${trained} of these ${points.length} ${noun.many} ${trained === 1 ? 'has' : 'have'} training in ${trained === 1 ? 'it' : 'them'}, so there is no ${noun.trend} to read yet.`,
          },
    );
  } else {
    // The window is dense enough, so anything still missing is about the
    // measurement rather than about how often they turn up.
    const missing = shownMetrics.filter((m) => !HR_KEYS.includes(m.key) && filled(m.key) === 0);
    const single = shownMetrics.filter((m) => filled(m.key) === 1);
    const span = `these ${points.length} ${noun.many}`;
    if (missing.length) {
      out.push({
        id: 'missing',
        icon: 'info',
        text: `${names(missing)} ${missing.length > 1 ? 'were' : 'was'} not recorded in ${span}.`,
      });
    } else if (single.length) {
      out.push({
        id: 'single',
        icon: 'info',
        text: `${names(single)} ${single.length > 1 ? 'have' : 'has'} one reading in ${span}. It takes two to draw a line.`,
      });
    }
  }

  return out.slice(0, 2);
}

/** "HR avg and HR max", "Body, Brain and Minutes". */
function names(metrics: typeof METRICS): string {
  const labels = metrics.map((m) => m.label);
  return labels.length < 2
    ? labels.join('')
    : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
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
