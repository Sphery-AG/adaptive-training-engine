'use client';

/**
 * The chrome around every intake screen: back control, section progress,
 * eyebrow/title/subtitle header, a scroll body that animates in per screen, and
 * a sticky footer with the primary CTA (+ optional Skip).
 *
 * Accessibility is handled here so screens don't each reinvent it:
 *  - focus moves to the screen heading on every step change (screenKey),
 *  - a visually-hidden aria-live region announces "Step N of M: <title>",
 *  - the CTA is a real disabled button when the step is incomplete.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '../icons';
import { ProgressBar } from './ProgressBar';

interface IntakeShellProps {
  /** Stable per-screen id — drives the enter animation and focus/announce. */
  screenKey: string;
  stepNumber: number;
  stepCount: number;
  progressFractions: number[];
  progressLabels: string[];

  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Renders the pink REQUIRED tag beside the eyebrow. */
  required?: boolean;

  onBack: () => void;
  ctaLabel: string;
  ctaEnabled: boolean;
  onCta: () => void;
  onSkip?: () => void;

  children: ReactNode;
}

export function IntakeShell({
  screenKey,
  stepNumber,
  stepCount,
  progressFractions,
  progressLabels,
  eyebrow,
  title,
  subtitle,
  required,
  onBack,
  ctaLabel,
  ctaEnabled,
  onCta,
  onSkip,
  children,
}: IntakeShellProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the heading whenever the screen changes, so keyboard and
  // screen-reader users land at the top of the new step (not stranded on the
  // previous CTA). Skips the very first mount to avoid stealing initial focus.
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) headingRef.current?.focus();
    else mounted.current = true;
  }, [screenKey]);

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-5 pt-6 pb-5 sm:pt-10">
      {/* Header: back + progress */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border text-dim transition-colors hover:border-[var(--border-strong)] hover:text-white"
        >
          <Icon name="chevron-left" size={20} />
        </button>
        <ProgressBar fractions={progressFractions} labels={progressLabels} />
      </div>

      {/* Live announcement for assistive tech */}
      <p className="sr-only" aria-live="polite">
        Step {stepNumber} of {stepCount}: {title}
      </p>

      {/* Body — re-keyed per screen so the enter animation replays */}
      <div key={screenKey} className="animate-screen-in flex flex-1 flex-col pt-9">
        <header>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">
              {eyebrow}
            </span>
            {required && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ background: 'var(--required-soft)', color: 'var(--required)' }}
              >
                Required
              </span>
            )}
          </div>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="mt-2 text-[28px] leading-tight outline-none sm:text-[32px]"
          >
            {title}
          </h1>
          {subtitle && <p className="mt-2 max-w-md text-base leading-relaxed text-dim">{subtitle}</p>}
        </header>

        <div className="mt-7 flex-1">{children}</div>
      </div>

      {/* Sticky footer CTA */}
      <div className="sticky bottom-0 mt-6 flex flex-col gap-2.5 bg-gradient-to-t from-background via-background to-transparent pt-4">
        <button
          type="button"
          disabled={!ctaEnabled}
          onClick={onCta}
          className="h-14 w-full rounded-full text-base font-semibold text-[var(--accent-contrast)] transition disabled:cursor-not-allowed disabled:opacity-25"
          style={{
            background: 'var(--gradient-accent)',
            boxShadow: ctaEnabled ? 'var(--shadow-glow)' : undefined,
          }}
        >
          {ctaLabel}
        </button>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="h-11 w-full rounded-full text-sm font-medium text-dim transition-colors hover:text-white"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
