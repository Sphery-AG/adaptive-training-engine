'use client';

/**
 * Live circle trainings read from the NEXUS kiosk API.
 *
 * Everything on this card came off devapp.sphery.ch a moment ago: real
 * sessions, on real kiosks, with the heart rate the kiosk actually recorded.
 * It is the one surface in the app that is not running on seeded data, so it
 * says so plainly rather than blending in with the rest.
 *
 * Where the kiosk recorded no heart rate the card says so instead of printing a
 * zero. A member who sees "0 bpm" next to their session stops believing the
 * other numbers too, and some trainings genuinely run without a strap.
 */

import { useEffect, useState } from 'react';
import type { KioskTraining, KioskTrainingsResponse } from '@/lib/kiosk/types';

/** "2026-07-17T12:55:10.000Z" -> "17 Jul". */
function shortDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Seconds -> "24:16". The kiosk stores fractional seconds. */
function clock(seconds: number | null): string | null {
  if (seconds === null) return null;
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function TrainingRow({ training: t }: { training: KioskTraining }) {
  const duration = clock(t.totalTime);
  return (
    <li className="flex items-baseline justify-between gap-3 border-t border-border/60 py-2.5 first:border-t-0">
      <div className="min-w-0">
        <p className="truncate text-sm text-white">{t.name}</p>
        <p className="mt-0.5 truncate text-xs text-faint">
          {t.kioskId} · {t.exercises.length} stations
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm tabular-nums text-dim">
          {t.hrAverage !== null ? (
            <>
              {t.hrAverage}
              <span className="text-xs text-faint"> bpm</span>
            </>
          ) : (
            <span className="text-xs text-faint">no HR recorded</span>
          )}
        </p>
        <p className="mt-0.5 text-xs tabular-nums text-faint">
          {shortDate(t.completedAt)}
          {duration ? ` · ${duration}` : ''}
        </p>
      </div>
    </li>
  );
}

export default function KioskActivity() {
  const [data, setData] = useState<KioskTrainingsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/kiosk/trainings')
      .then((r) => (r.ok ? r.json() : null))
      .then((json: KioskTrainingsResponse | null) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(() => {
        // The kiosk being unreachable hides the card. It is a live extra, not
        // something the rest of the screen depends on.
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && (!data || data.trainings.length === 0)) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="eyebrow text-mint">Live from the kiosk</p>
        {loading ? (
          <span className="text-xs text-faint">Loading…</span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-faint">
            <span className="h-1.5 w-1.5 rounded-full bg-mint" aria-hidden="true" />
            devapp.sphery.ch
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-3 space-y-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm leading-relaxed text-dim">
            Real circle trainings recorded on Sphery kiosks, read live from the NEXUS API.
          </p>
          <ul className="mt-3">
            {data!.trainings.map((t) => (
              <TrainingRow key={t.id} training={t} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
