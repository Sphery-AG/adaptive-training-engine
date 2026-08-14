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
import type { PlanView, ResolvedSession, CircuitStation, AdaptationResult } from '@/lib/stub/engine';
import { circuitFor, zoneBoundsFor, CIRCUIT_NAMES } from '@/lib/stub/engine';
import type { HrZone } from '@/lib/types/plan';
import type { PerceivedEffort } from '@/lib/types/engagement';
import { STIMULUS_LABELS } from '@/lib/labels';
import { RingGauge } from './RingGauge';
import { Icon } from './icons';

// Points: every training minute earns 1, minutes in the station's target
// zone earn 2 (1 base + 1 bonus). Reworked Aug 7 per Max's review: paying
// more for zones 4–5 punished members whose plan prescribes zone 2 and
// nudged everyone toward overtraining. Following the plan is the win.
const BASE_PT_PER_MIN = 1;
const TARGET_BONUS_PER_MIN = 1;

// `dot` is the empty-row stub: the row's own ramp color, dimmed. It used to be
// hardcoded mint for every zone, so an empty zone 5 row showed green.
const ZONE_BAR: Record<HrZone, { bg: string; glow: string; dot: string }> = {
  5: { bg: 'linear-gradient(90deg,#fb7185,#ec4899)', glow: '0 0 9px rgba(236,72,153,0.6)', dot: 'rgba(251,113,133,0.35)' },
  4: { bg: 'linear-gradient(90deg,#fb923c,#f97316)', glow: '0 0 9px rgba(249,115,22,0.55)', dot: 'rgba(251,146,60,0.35)' },
  3: { bg: 'linear-gradient(90deg,#fde047,#facc15)', glow: '0 0 9px rgba(250,204,21,0.55)', dot: 'rgba(253,224,71,0.35)' },
  2: { bg: 'linear-gradient(90deg,#4ade80,#34d399)', glow: '0 0 8px rgba(52,211,153,0.5)', dot: 'rgba(74,222,128,0.35)' },
  1: { bg: 'linear-gradient(90deg,#475569,#34d399)', glow: 'none', dot: 'rgba(71,85,105,0.55)' },
};

function fmt(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * preview → live → summary → effort → adapting → adapted.
 *
 * The last three are the payoff the whole product is for, so they get screens
 * rather than a notification: the member answers how it felt, watches the plan
 * recalculate, and reads what changed and why before leaving.
 */
type Stage = 'preview' | 'live' | 'summary' | 'effort' | 'adapting' | 'adapted';

/** How long the recalculating beat holds, even if the engine answers sooner. */
const ADAPTING_MS = 1200;

/**
 * 1 = too easy, 5 = too hard, matching the engine's scale exactly.
 *
 * Colour-coded on Max's note (Aug 13), reusing the ZONE_BAR ramp above rather
 * than inventing a second palette. The member has just spent the session
 * watching those exact colours climb from green to pink, so the same ramp on
 * the same 1-5 scale needs no learning: "Tough" is orange here because zone 4
 * was orange a minute ago.
 */
const EFFORT_CHOICES: { id: PerceivedEffort; label: string; hint: string; tone: string }[] = [
  { id: 1, label: 'Too easy', hint: 'I had plenty left', tone: '#64748b' },
  { id: 2, label: 'Comfortable', hint: 'I could have pushed harder', tone: '#34d399' },
  { id: 3, label: 'Right', hint: 'Hard, but I held it', tone: '#facc15' },
  { id: 4, label: 'Tough', hint: 'I was close to my limit', tone: '#f97316' },
  { id: 5, label: 'Too hard', hint: 'I was hanging on', tone: '#ec4899' },
];

export default function LiveSession({
  view,
  rs,
  weekNumber,
  sessionInWeek,
  onFinish,
  onClose,
  onDone,
}: {
  view: PlanView;
  rs: ResolvedSession;
  weekNumber: number;
  sessionInWeek: number;
  /** Log the session and run the adaptive update; resolves with what changed. */
  onFinish: (pointsEarned: number, effort?: PerceivedEffort) => Promise<AdaptationResult>;
  /** Leave without logging (preview only). */
  onClose: () => void;
  /** Leave after the plan has already been updated. */
  onDone: () => void;
}) {
  const circuit = useMemo(() => circuitFor(view, rs), [view, rs]);
  const bounds = useMemo(() => zoneBoundsFor(view.plan.fitnessEstimate), [view]);
  const totalMinutes = circuit.reduce((n, leg) => n + leg.minutes, 0);

  const [stage, setStage] = useState<Stage>('preview');
  const [effort, setEffort] = useState<PerceivedEffort | null>(null);

  // A full-screen overlay has to be dismissible from the keyboard. Escape is
  // deliberately inert once the session is running: a stray keypress mid-circuit
  // would throw away the work, and the running stages have their own controls.
  useEffect(() => {
    if (stage !== 'preview') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [stage, onClose]);

  const [result, setResult] = useState<AdaptationResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [idx, setIdx] = useState(0);
  const [stationSec, setStationSec] = useState(0);
  const [doneSec, setDoneSec] = useState(0);
  const [zoneSec, setZoneSec] = useState<number[]>([0, 0, 0, 0, 0]);
  const [points, setPoints] = useState(0);
  const [hr, setHr] = useState(0);
  const hrRef = useRef(0);
  const hrStats = useRef({ sum: 0, n: 0, max: 0 });
  const stationTargetSec = useRef(0);

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
      if (zoneOf(next) === circuit[idx].targetZone) stationTargetSec.current += 1;
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
    // The credited remainder counts toward the target-zone bonus at the same
    // 70% rate the zone buckets get.
    const targetSec = stationTargetSec.current + Math.round(remaining * 0.7);
    setPoints((p) => p + leg.minutes * BASE_PT_PER_MIN + Math.round(targetSec / 60) * TARGET_BONUS_PER_MIN);
    stationTargetSec.current = 0;
    setDoneSec((s) => s + plannedSec);
    setStationSec(0);
    if (idx + 1 < circuit.length) setIdx(idx + 1);
    else setStage('summary');
  }

  /**
   * The payoff. Hold the recalculating beat for a minimum so the moment reads
   * as work actually happening, and never drop the member without an answer:
   * if the update throws, say so on the same screen rather than closing.
   */
  async function submitEffort(choice?: PerceivedEffort) {
    setEffort(choice ?? null);
    setStage('adapting');
    const beat = new Promise((r) => setTimeout(r, ADAPTING_MS));
    try {
      const [res] = await Promise.all([onFinish(points, choice), beat]);
      setResult(res);
    } catch {
      await beat;
      setFailed(true);
    }
    setStage('adapted');
  }

  const inTarget = stage === 'live' && zoneOf(hr) === circuit[idx].targetZone;
  const elapsed = doneSec + stationSec;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--background)]" role="dialog" aria-modal="true" aria-label="Live session">
      {/* The session is otherwise silent: heart rate, zone and the countdown all
       * update visually every second with nothing announced, and the target-zone
       * signal is a border color. This text changes only when the station or the
       * in-target state changes, so it announces the two things that matter
       * without narrating every tick. */}
      <p className="sr-only" aria-live="polite">
        {stage === 'live'
          ? `Station ${idx + 1} of ${circuit.length}, ${circuit[idx].station.name}. ${
              inTarget ? 'In target zone' : `Outside target zone ${circuit[idx].targetZone}`
            }.`
          : ''}
      </p>
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-5 pt-8 pb-8">
        {stage === 'preview' && (
          <Preview
            rs={rs}
            circuitName={CIRCUIT_NAMES[view.plan.goal]}
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
                <span className="eyebrow text-faint">duration {totalMinutes} min</span>
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
                      {inTarget ? 'In target zone · earning double' : `Get to zone ${leg.targetZone}`} ·{' '}
                      <span className="text-fuchsia">up to +{leg.minutes * (BASE_PT_PER_MIN + TARGET_BONUS_PER_MIN)} pts</span> this station
                    </p>
                  </div>
                ) : (
                  <div key={i} className={`flex items-center gap-3 py-2.5 ${i < idx ? 'opacity-60' : ''}`}>
                    <span
                      className={`relative z-10 grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border text-xs font-semibold ${
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
              className="mt-3 w-full rounded-full py-4 text-base font-semibold"
              style={{ background: 'var(--gradient-accent)', color: 'var(--accent-contrast)', boxShadow: 'var(--shadow-glow)' }}
            >
              {idx + 1 < circuit.length ? 'Complete station' : 'Finish session'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-2.5 w-full py-1.5 text-center text-xs font-semibold text-faint transition-colors hover:text-dim"
            >
              End session without logging
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
              onClick={() => setStage('effort')}
              className="mt-5 w-full rounded-full py-4 text-base font-semibold"
              style={{
                background: 'var(--gradient-accent)',
                color: 'var(--accent-contrast)',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              Log session · update my plan
            </button>
          </>
        )}

        {stage === 'effort' && (
          <EffortStep points={points} onChoose={submitEffort} />
        )}

        {stage === 'adapting' && <AdaptingStep />}

        {stage === 'adapted' && (
          <AdaptedStep result={result} failed={failed} effort={effort} points={points} onDone={onDone} />
        )}
      </div>
    </div>
  );
}

/**
 * "How did that feel?" — one tap on a 1-5 scale, asked once while the session
 * is still in the member's body. This is the only member-supplied evidence the
 * adaptive loop gets, so it comes before the recalculation, not after it.
 */
function EffortStep({ points, onChoose }: { points: number; onChoose: (e?: PerceivedEffort) => void }) {
  return (
    <>
      <div className="flex-1" />
      <p className="eyebrow text-mint">Session logged · +{points} pts</p>
      <h2 className="mt-1 text-4xl leading-[0.95]">How did that feel?</h2>
      <p className="mt-3 text-sm leading-relaxed text-dim">
        Your answer is what tunes the next sessions. There is no wrong one.
      </p>

      <div className="mt-6 space-y-2.5">
        {EFFORT_CHOICES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onChoose(c.id)}
            style={{ borderColor: `color-mix(in oklab, ${c.tone} 45%, transparent)` }}
            className="flex w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border bg-card py-4 pl-0 pr-5 text-left transition-colors hover:border-[var(--border-strong)]"
          >
            {/* The ramp itself, as a spine down the row. Reads as a scale at a
              * glance without tinting the label text, which has to stay legible. */}
            <span aria-hidden="true" className="h-11 w-1 shrink-0 rounded-r" style={{ background: c.tone }} />
            <span className="min-w-0 flex-1 pl-4">
              <span className="block text-lg font-semibold">{c.label}</span>
              <span className="mt-0.5 block text-sm leading-snug text-dim">{c.hint}</span>
            </span>
            <Icon name="chevron-left" size={18} className="shrink-0 rotate-180 text-faint" />
          </button>
        ))}
      </div>

      <div className="flex-1" />
      <button
        type="button"
        onClick={() => onChoose(undefined)}
        className="mt-4 h-11 w-full rounded-full text-sm font-medium text-dim transition-colors hover:text-white"
      >
        Skip · update my plan anyway
      </button>
    </>
  );
}

/** The recalculating beat: the signature ring doing the one thing it means. */
function AdaptingStep() {
  const [sweep, setSweep] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setSweep(1), 40);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <div className="flex-1" />
      <div className="grid place-items-center" role="status" aria-live="polite">
        <RingGauge fraction={sweep} size={168} stroke={9} color="var(--orbit-violet)">
          <Icon name="refresh" size={26} className="text-violet" />
        </RingGauge>
        <p className="mt-6 text-2xl">Recalculating your plan</p>
        <p className="mt-2 max-w-[17rem] text-center text-sm leading-relaxed text-dim">
          Reading this session against the rest of your plan.
        </p>
      </div>
      <div className="flex-1" />
    </>
  );
}

/**
 * What changed and why. Reads entirely from the update the engine returned:
 * its reason, its plan changes, the metrics that moved, and the difficulty
 * numbers diffed off the plan itself.
 */
function AdaptedStep({
  result,
  failed,
  effort,
  points,
  onDone,
}: {
  result: AdaptationResult | null;
  failed: boolean;
  effort: PerceivedEffort | null;
  points: number;
  onDone: () => void;
}) {
  if (failed || !result) {
    return (
      <>
        <div className="flex-1" />
        <p className="eyebrow text-amber">Not saved</p>
        <h2 className="mt-1 text-4xl leading-[0.95]">We couldn&apos;t update your plan</h2>
        <p className="mt-3 text-sm leading-relaxed text-dim">
          Your session and its {points} points are safe. The plan will re-tune from it the next
          time the app reaches the engine.
        </p>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onDone}
          className="mt-5 h-14 w-full rounded-full text-base font-semibold"
          style={{ background: 'var(--gradient-accent)', color: 'var(--accent-contrast)', boxShadow: 'var(--shadow-glow)' }}
        >
          Back to today
        </button>
      </>
    );
  }

  const { update, shift } = result;
  const changed = update.planChanges.length > 0;
  const moved = update.metricChanges.filter((m) => m.delta !== undefined && m.delta !== 0);

  return (
    <>
      <p className="eyebrow text-violet">{changed ? 'Plan updated' : 'Plan holds'}</p>
      <h2 className="mt-1 text-4xl leading-[0.95]">
        {changed ? 'Your next sessions changed' : 'Your plan is holding'}
      </h2>
      <p className="mt-3 text-base leading-relaxed text-dim">{update.summary}</p>

      {shift && (
        <div className="mt-6 rounded-[26px] border border-violet/30 bg-card p-5">
          <p className="eyebrow text-dim">Difficulty</p>
          <p className="mt-2 flex items-baseline gap-3">
            <span className="text-3xl text-faint line-through tabular">{shift.from}</span>
            <Icon name="chevron-left" size={18} className="rotate-180 text-faint" />
            <span className="animate-pop text-5xl leading-none text-violet tabular">{shift.to}</span>
            <span className="text-sm text-faint">/ 10</span>
          </p>
          <p className="mt-3 text-sm leading-relaxed text-dim">
            Across {shift.sessions} upcoming session{shift.sessions === 1 ? '' : 's'}.
          </p>
        </div>
      )}

      {changed && (
        <ul className="mt-4 space-y-2">
          {update.planChanges.map((c, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed">
              <Icon name="refresh" size={14} className="mt-1 shrink-0 text-violet" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      )}

      {moved.length > 0 && (
        <div className="mt-5 rounded-2xl border border-border bg-card p-4">
          <p className="eyebrow text-dim">What moved</p>
          <ul className="mt-3 space-y-2.5">
            {moved.map((m) => {
              const d = m.delta as number;
              const better = m.polarity === 'higher_is_better' ? d > 0 : d < 0;
              return (
                <li key={m.key} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="flex-1">
                    <span className="font-medium">{m.label}</span>
                    {m.caption && <span className="mt-0.5 block text-xs leading-snug text-faint">{m.caption}</span>}
                  </span>
                  <span className={`shrink-0 font-semibold tabular ${better ? 'text-mint' : 'text-amber'}`}>
                    {d > 0 ? '+' : ''}
                    {Math.round(d * 10) / 10}
                    {m.unit ? ` ${m.unit}` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {update.newlyUnlocked.map((r) => (
        <p key={r.id} className="mt-4 flex items-center gap-2 text-sm font-semibold text-mint">
          <Icon name="gift" size={15} /> Unlocked: {r.label}
        </p>
      ))}

      {effort && (
        <p className="mt-5 text-xs leading-relaxed text-faint">
          Based on your effort rating. Feedback earns +10 pts.
        </p>
      )}

      <div className="flex-1" />
      <button
        type="button"
        onClick={onDone}
        className="mt-6 h-14 w-full rounded-full text-base font-semibold"
        style={{ background: 'var(--gradient-accent)', color: 'var(--accent-contrast)', boxShadow: 'var(--shadow-glow)' }}
      >
        Back to today
      </button>
    </>
  );
}

function Preview({
  rs,
  circuitName,
  circuit,
  weekNumber,
  sessionInWeek,
  totalMinutes,
  onStart,
  onClose,
}: {
  rs: ResolvedSession;
  circuitName: string;
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
        <p className="eyebrow text-dim">{circuitName}</p>
        <ul className="mt-3 space-y-3">
          {circuit.map((leg, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border border-border bg-white/[0.04] text-xs font-semibold text-faint">
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
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full py-4 text-base font-semibold"
        style={{ background: 'var(--gradient-accent)', color: 'var(--accent-contrast)', boxShadow: 'var(--shadow-glow)' }}
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
                      : { width: 7, background: ZONE_BAR[z].dot }
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
