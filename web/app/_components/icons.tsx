/**
 * Inline SVG icon set — one crisp line-icon vocabulary for the whole intake,
 * replacing the concept's emoji. Icons inherit `currentColor` and size, are
 * `aria-hidden` by default (they're decorative next to a text label), and share
 * one 24×24 grid + 1.75 stroke so they read as a single family.
 */
import type { SVGProps } from 'react';

export type IconName =
  | 'flame'
  | 'dumbbell'
  | 'pulse'
  | 'mobility'
  | 'heart'
  | 'zap'
  | 'flag'
  | 'brain'
  | 'chevron-left'
  | 'check'
  | 'plus'
  | 'close'
  | 'info'
  | 'trend'
  | 'run';

const PATHS: Record<IconName, React.ReactNode> = {
  flame: <path d="M12 3c1.5 3 4.5 4.5 4.5 8.5A4.5 4.5 0 0 1 12 16a4.5 4.5 0 0 1-4.5-4.5C7.5 9 9 8 9.5 6.5 10.4 8 12 8 12 6c0-1 0-2 0-3Z" />,
  dumbbell: (
    <>
      <path d="M4 9v6M7 7v10M17 7v10M20 9v6" />
      <path d="M7 12h10" />
    </>
  ),
  pulse: <path d="M3 12h3l2.5-6 4 12 2.5-6H21" />,
  mobility: (
    <>
      <circle cx="12" cy="4.5" r="1.6" />
      <path d="M12 7v5m0 0 3.5 4.5M12 12l-3.5 4.5M7.5 9.5 12 11l4.5-1.5" />
    </>
  ),
  heart: <path d="M12 20s-7-4.3-7-9.2A3.8 3.8 0 0 1 12 7.6 3.8 3.8 0 0 1 19 10.8c0 4.9-7 9.2-7 9.2Z" />,
  zap: <path d="M13 3 5 13h5l-1 8 8-10h-5l1-8Z" />,
  flag: (
    <>
      <path d="M6 21V4" />
      <path d="M6 5h11l-2 3 2 3H6" />
    </>
  ),
  brain: (
    <>
      <path d="M9.5 5A2.5 2.5 0 0 0 7 7.5 2.5 2.5 0 0 0 5.5 12 2.5 2.5 0 0 0 7 16.5 2.5 2.5 0 0 0 9.5 19 2 2 0 0 0 12 17V6a2 2 0 0 0-2.5-1Z" />
      <path d="M14.5 5A2.5 2.5 0 0 1 17 7.5 2.5 2.5 0 0 1 18.5 12 2.5 2.5 0 0 1 17 16.5 2.5 2.5 0 0 1 14.5 19 2 2 0 0 1 12 17" />
    </>
  ),
  'chevron-left': <path d="M15 6l-6 6 6 6" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  trend: <path d="M4 16l5-5 3 3 7-7M15 7h5v5" />,
  run: (
    <>
      <circle cx="13.5" cy="5" r="1.6" />
      <path d="M8 21l3-5-2-3 4-2 2 3 3 1M11 13l-1-4 4-1 2 3" />
    </>
  ),
};

export function Icon({
  name,
  size = 24,
  ...props
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
