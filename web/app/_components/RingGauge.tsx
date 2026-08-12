/**
 * Circular progress gauge — the Sphere Loop signature (fitness ring, league
 * ring). Fill sweeps clockwise from top; center holds any content. Color is a
 * CSS color/token string so the caller picks the orbit accent.
 */
import type { ReactNode } from 'react';

export function RingGauge({
  fraction,
  size = 208,
  stroke = 10,
  color = 'var(--orbit-cyan)',
  trackColor = 'var(--hair)',
  glow = true,
  label,
  valueText,
  children,
}: {
  fraction: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  glow?: boolean;
  /** Accessible name, e.g. "Body Score". Without it the ring stays decorative. */
  label?: string;
  /** Spoken value, e.g. "74 out of 100". Falls back to a percentage. */
  valueText?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
  const dash = circumference * clamped;
  const pct = Math.round(clamped * 100);

  // The visual is built from an SVG plus composed children, so neither carries a
  // value a screen reader can read. When the caller names the ring we expose it
  // as a real progressbar; unnamed rings stay decorative rather than announcing
  // a bare number with no subject.
  const semantics = label
    ? ({
        role: 'progressbar' as const,
        'aria-label': label,
        'aria-valuemin': 0,
        'aria-valuemax': 100,
        'aria-valuenow': pct,
        'aria-valuetext': valueText ?? `${pct}%`,
      })
    : {};

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} {...semantics}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          style={{
            filter: glow ? `drop-shadow(0 0 9px ${color})` : undefined,
            transition: 'stroke-dasharray 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </svg>
      {/* When the ring is a labeled progressbar its value is already spoken, so
       * the composed center must not announce the same number a second time. */}
      <div className="absolute inset-0 grid place-items-center px-6 text-center" aria-hidden={label ? true : undefined}>
        {children}
      </div>
    </div>
  );
}
