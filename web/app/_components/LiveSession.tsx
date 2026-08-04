'use client';

/**
 * The live training flow (J8): preview → live → summary, with the station
 * timeline as the spine. Design settled Aug 4: vertical timeline (option B)
 * plus the Sphery app's time-in-zones language — glowing bars per zone with
 * real bpm ranges from the member's estimated max HR.
 *
 * Demo-grade: heart rate is simulated and "Complete station" credits the
 * station's planned time, so a full 45-minute session walks in under a minute
 * while the numbers stay plausible.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlanView, ResolvedSession, CircuitStation } from '@/lib/stub/engine';
import { circuitFor, zoneBoundsFor } from '@/lib/stub/engine';
import type { HrZone } from '@/lib/types/plan';
import { STIMULUS_LABELS } from '@/lib/labels';
import { Icon } from './icons';

/** Points per planned minute by zone — the effort-not-ability rule. */
const ZONE_PTS: Record<HrZone, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 4 };

const ZONE_BAR: Record<HrZone, { bg: string; glow: string }> = {
  5: { bg: 'linear-gradient(90deg,#fb7185,#ec4899)', glow: '0 0 9px rgba(236,72,153,0.6)' },
  4: { bg: 'linear-gradient(90deg,#fb923c,#f97316)', glow: '0 0 9px rgba(249,115,22,0.55)' },
  3: { bg: 'linear-gradient(90deg,#fde047,#facc15)', glow: '0 0 9px rgba(250,204,21,0.55)' },
  2: { bg: 'linear-gradient(90deg,#4ade80,#34d399)', glow: '0 0 8px rgba(52,211,153,0.5)' },
  1: { bg: 'linear-gradient(90deg,#475569,#34d399)', glow: 'none' },
};

function fmt(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function LiveSession({
  view,
  rs,
  weekNumber,
  sessionInWeek,
  onFinish,
  onClose,
}: {
  view: PlanView;
  rs: ResolvedSession;
  weekNumber: number;
  sessionInWeek: number;
  /** Log the session (parent adaptation flow) and leave the live view. */
  onFinish: () => void;
  /** Leave without logging (preview only). */
  onClose: () => void;
}) {
  const circuit = useMemo(() => circuitFor(view, rs), [view, rs]);
  const bounds = useMemo(() => zoneBoundsFor(view.plan.fitnessEstimate), [view]);
  const totalMinutes = circuit.reduce((n, leg) => n + leg.minutes, 0);

  const [stage, setStage] = useState<'preview' | 'live' | 'summary'>('preview');
  const [idx, setIdx] = useState(0);
  const [stationSec, setStationSec] = useState(0);
  const [doneSec, setDoneSec] = useState(0);
  const [zoneSec, setZoneSec] = useState<number[]>([0, 0, 0, 0, 0]);
  const [points, setPoints] = useState(0);
  const [hr, setHr] = useState(0);
  const hrRef = useRef(0);
  const hrStats = useRef({ sum: 0, n: 0, max: 0 });

  const zoneOf = (bpm: number): HrZone =>
    bpm < bounds[0] ? 1 : bpm < bounds[1] ? 2 : bpm < bounds[2] ? 3 : bpm < bounds[3] ? 4 : 5;
  const zoneMid = (z: HrZone): number =>
    z === 1 ? bounds[0] - 12 : z === 5 ? bounds[3] + 6 : Math.round((bounds[z - 2] + bounds[z - 1]) / 2);

  function start() {
    const first = zoneMid(circuit[0].targetZone) - 14;
    hrRef.current = first;
    setHr(first);
    setStage('live');
  }

  // Simulated live tick: HR drifts toward the current station's target zone,
  // and each second lands in the zone bucket the simulated HR is actually in.
  useEffect(() => {
    if (stage !== 'live') return;
    const t = setInterval(() => {
      const target = zoneMid(circuit[idx].targetZone);
      const drift = Math.max(-2, Math.min(2, Math.round((target - hrRef.current) / 6)));
      const next = hrRef.current + drift + Math.round(Math.random() * 4 - 2);
      hrRef.current = next;
      hrStats.current.sum += next;
      hrStats.current.n += 1;
      hrStats.current.max = Math.max(hrStats.current.max, next);
      setHr(next);
      setZoneSec((prev) => {
        const c = prev.slice();
        c[zoneOf(next) - 1] += 1;
        return c;
      });
      setStationSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, idx]);

  function completeStation() {
    const leg = circuit[idx];
    const plannedSec = leg.minutes * 60;
    const remaining = Math.max(0, plannedSec - stationSec);
    // Credit the untrained remainder plausibly: mostly the target zone,
    // the rest to its neighbors.
    setZoneSec((prev) => {
      const c = prev.slice();
      const z = leg.targetZone;
      const below = Math.max(1, z - 1);
      const above = Math.min(5, z + 1);
      const hit = Math.round(remaining * 0.7);
      const easy = Math.round(remaining * 0.2);
      c[z - 1] += hit;
      c[below - 1] += easy;
      c[above - 1] += remaining - hit - easy;
      return c;
    });
    setPoints((p) => p + leg.minutes * ZONE_PTS[leg.targetZone]);
    setDoneSec((s) => s + plannedSec);
    setStationSec(0);
    if (idx + 1 < circuit.length) setIdx(idx + 1);
    else setStage('summary');
  }

  const inTarget = stage === 'live' && zoneOf(hr) === circuit[idx].targetZone;
  const elapsed = doneSec + stationSec;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--background)]">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-5 pt-8 pb-8">
        {stage === 'preview' && (
          <Preview
            rs={rs}
            circuit={circuit}
            weekNumber={weekNumber}
            sessionInWeek={sessionInWeek}
            totalMinutes={totalMinutes}
            onStart={start}
            onClose={onClose}
          />
        )}

        {stage === 'live' && (
          <>
            {/* HR + clock */}
            <div className="flex items-start justify-between">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold ${
                  inTarget ? 'border-mint/50 bg-mint/10 text-mint' : 'border-amber/40 bg-amber/10 text-amber'
                }`}
              >
                <Icon name="heart" size={15} />
                <span className="text-lg tabular">{hr}</span>· Zone {zoneOf(hr)}
              </span>
              <span className="text-right">
                <span className="block text-2xl tabular">{fmt(elapsed)}</span>
                <span className="eyebrow text-faint">elapsed · {totalMinutes} min total</span>
              </span>
            </div>

            <div className="mt-4">
              <p className="eyebrow text-accent">Live session · Week {weekNumber} · S{String(sessionInWeek).padStart(2, '0')}</p>
              <h2 className="mt-1 text-3xl leading-none">{STIMULUS_LABELS[rs.session.stimulusType]}</h2>
            </div>

            {/* Station timeline */}
            <div className="relative mt-4 flex-1">
              <span className="absolute bottom-2 left-[13px] top-2 w-px bg-white/10" aria-hidden="true" />
              {circuit.map((leg, i) =>
                i === idx ? (
                  <div
                    key={i}
                    className="relative z-10 my-1.5 rounded-[20px] border border-accent/40 p-4"
                    style={{ background: 'radial-gradient(120% 140% at 12% 0%, var(--accent-soft), transparent 60%), var(--card, rgba(255,255,255,0.03))' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{leg.station.name}</span>
                      <span className="text-3xl tabular text-accent" style={{ textShadow: '0 0 22px var(--accent-soft2)' }}>
                        {fmt(Math.max(0, leg.minutes * 60 - stationSec))}
                      </span>
                    </div>
                    <p className="eyebrow mt-1 text-faint">Target zone {leg.targetZone} · {leg.minutes} min</p>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-accent transition-[width] duration-500"
                        style={{ width: `${Math.min(100, (stationSec / (leg.minutes * 60)) * 100)}%`, boxShadow: '0 0 8px var(--orbit-cyan)' }}
                      />
                    </div>
                    <p className={`mt-2 text-xs font-semibold ${inTarget ? 'text-mint' : 'text-amber'}`}>
                      {inTarget ? 'In target zone' : `Get to zone ${leg.targetZone}`} ·{' '}
                      <span className="text-fuchsia">+{leg.minutes * ZONE_PTS[leg.targetZone]} pts</span> this station
                    </p>
                  </div>
                ) : (
                  <div key={i} className={`flex items-center gap-3 py-2.5 ${i < idx ? 'opacity-60' : ''}`}>
                    <span
                      className={`relative z-10 grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border text-[11px] font-semibold ${
                        i < idx ? 'border-mint/40 bg-mint/15 text-mint' : 'border-border bg-white/[0.04] text-faint'
                      }`}
                    >
                      {i < idx ? <Icon name="check" size={12} /> : i + 1}
                    </span>
                    <span className="flex flex-1 items-baseline justify-between">
                      <span className="text-sm font-semibold">{leg.station.name}</span>
                      <span className={`text-xs ${i < idx ? 'text-mint' : 'text-faint'}`}>
                        {i < idx ? `${leg.minutes}:00 · zone ${leg.targetZone} hit` : `${leg.minutes} min · zone ${leg.targetZone}`}
                      </span>
                    </span>
                  </div>
                ),
              )}
            </div>

            <ZonesBlock zoneSec={zoneSec} bounds={bounds} hrStats={hrStats.current} />

            <button
              type="button"
              onClick={completeStation}
              className="mt-3 w-full rounded-full py-4 text-base font-bold text-black"
              style={{ background: 'linear-gradient(90deg,#7dd3fc,#e879f9)', boxShadow: '0 0 30px -6px var(--orbit-cyan)' }}
            >
              {idx + 1 < circuit.length ? 'Complete station' : 'Finish session'}
            </button>
          </>
        )}

        {stage === 'summary' && (
          <>
            <p className="eyebrow text-mint">Session complete</p>
            <h2 className="mt-1 text-4xl leading-[0.95]">{STIMULUS_LABELS[rs.session.stimulusType]}</h2>
            <p className="mt-2 text-sm text-dim">
              Week {weekNumber} · Session {String(sessionInWeek).padStart(2, '0')} · {view.gym.name}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="eyebrow text-dim">Time</p>
                <p className="mt-1 text-3xl text-accent tabular">{totalMinutes} <span className="text-sm text-faint">min</span></p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="eyebrow text-dim">Points earned</p>
                <p className="mt-1 text-3xl text-fuchsia tabular">+{points}</p>
              </div>
            </div>

            <div className="mt-4">
              <ZonesBlock zoneSec={zoneSec} bounds={bounds} hrStats={hrStats.current} />
            </div>

            {/* Per-station results */}
            <div className="mt-4 rounded-2xl border border-border bg-card p-4">
              <p className="eyebrow text-dim">Stations</p>
              <ul className="mt-2.5 space-y-2">
                {circuit.map((leg, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    <Icon name="check" size={13} className="shrink-0 text-mint" />
                    <span className="flex-1 font-medium">{leg.station.name}</span>
                    <span className="text-xs text-faint">{leg.minutes} min · zone {leg.targetZone}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex-1" />
            <button
              type="button"
              onClick={onFinish}
              className="mt-5 w-full rounded-full py-4 text-base font-bold text-black"
              style={{ background: 'linear-gradient(90deg,#7dd3fc,#e879f9)', boxShadow: '0 0 30px -6px var(--orbit-cyan)' }}
            >
              Log session · update my plan
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Preview({
  rs,
  circuit,
  weekNumber,
  sessionInWeek,
  totalMinutes,
  onStart,
  onClose,
}: {
  rs: ResolvedSession;
  circuit: CircuitStation[];
  weekNumber: number;
  sessionInWeek: number;
  totalMinutes: number;
  onStart: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="grid h-10 w-10 place-items-center rounded-full border border-border text-dim transition-colors hover:text-white"
        >
          <Icon name="chevron-left" size={18} />
        </button>
        <span className="eyebrow text-faint">Week {weekNumber} · Session {String(sessionInWeek).padStart(2, '0')}</span>
        <span className="w-10" />
      </div>

      <div className="mt-6">
        <p className="eyebrow text-accent">Up next</p>
        <h2 className="mt-1 text-4xl leading-[0.95]">{STIMULUS_LABELS[rs.session.stimulusType]}</h2>
        <p className="mt-2 text-sm text-faint">
          {totalMinutes} min · {circuit.length} stations · target zone {rs.session.hrTarget.zone}
        </p>
        <p className="mt-3 max-w-[19rem] text-sm leading-relaxed text-dim">{rs.session.rationale}</p>
      </div>

      <div className="mt-6 rounded-[22px] border border-border bg-card p-4">
        <p className="eyebrow text-dim">The circuit</p>
        <ul className="mt-3 space-y-3">
          {circuit.map((leg, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border border-border bg-white/[0.04] text-[11px] font-semibold text-faint">
                {i + 1}
              </span>
              <span className="flex flex-1 items-baseline justify-between gap-2">
                <span className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">{leg.station.name}</span>
                  {leg.station.isSpheryEquipment && (
                    <span className="rounded bg-[var(--accent-soft2)] px-1.5 text-[10px] font-semibold text-accent">Sphery</span>
                  )}
                </span>
                <span className="text-xs text-faint">{leg.minutes} min · zone {leg.targetZone}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1" />
      <button
        type="button"
        onClick={onStart}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full py-4 text-base font-bold text-black"
        style={{ background: 'linear-gradient(90deg,#7dd3fc,#e879f9)', boxShadow: '0 0 30px -6px var(--orbit-cyan)' }}
      >
        <Icon name="play" size={18} /> Start session
      </button>
    </>
  );
}

/** The Sphery-app time-in-zones block: glowing bars, real bpm ranges. */
function ZonesBlock({
  zoneSec,
  bounds,
  hrStats,
}: {
  zoneSec: number[];
  bounds: [number, number, number, number];
  hrStats: { sum: number; n: number; max: number };
}) {
  const total = Math.max(1, zoneSec.reduce((a, b) => a + b, 0));
  const max = Math.max(1, ...zoneSec);
  const rows: { z: HrZone; label: string }[] = [
    { z: 5, label: `>${bounds[3]} bpm` },
    { z: 4, label: `${bounds[2]}–${bounds[3]}` },
    { z: 3, label: `${bounds[1]}–${bounds[2]}` },
    { z: 2, label: `${bounds[0]}–${bounds[1]}` },
    { z: 1, label: `<${bounds[0]} bpm` },
  ];
  const avg = hrStats.n ? Math.round(hrStats.sum / hrStats.n) : 0;

  return (
    <div className="rounded-[18px] border border-border bg-card px-4 py-3.5">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow text-dim">Time in zones · session</p>
        {avg > 0 && (
          <p className="text-[10px] text-faint">
            Avg <span className="font-semibold text-dim tabular">{avg}</span> · Max{' '}
            <span className="font-semibold text-dim tabular">{hrStats.max}</span>
          </p>
        )}
      </div>
      <div className="mt-2 space-y-1.5">
        {rows.map(({ z, label }) => {
          const sec = zoneSec[z - 1];
          const pct = Math.round((sec / total) * 100);
          return (
            <div key={z} className="flex items-center gap-2.5">
              <span className="w-[58px] shrink-0 text-right text-[10px] text-faint tabular">{label}</span>
              <span className="flex h-[7px] flex-1 items-center">
                <span
                  className="h-[7px] rounded-full"
                  style={
                    sec > 0
                      ? { width: `${Math.max(5, (sec / max) * 100)}%`, background: ZONE_BAR[z].bg, boxShadow: ZONE_BAR[z].glow }
                      : { width: 7, background: 'rgba(52,211,153,0.35)' }
                  }
                />
              </span>
              <span className="w-[72px] shrink-0 text-right text-[10px] tabular">
                {fmt(sec)} <span className="text-faint">{pct}%</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
