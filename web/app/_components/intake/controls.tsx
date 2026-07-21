'use client';

/**
 * Intake form primitives.
 *
 * Built on native <input type="radio|checkbox">, visually hidden and styled via
 * Tailwind `peer-*` states. This buys correct keyboard + screen-reader behavior
 * for free (arrow keys within a radio group, space to toggle, proper roles)
 * without hand-rolling roving tabindex — the styled surface is the sibling.
 */
import type { ReactNode } from 'react';
import { Icon } from '../icons';

const CARD_BASE =
  'relative rounded-2xl border bg-card transition-colors border-border hover:border-[var(--border-strong)] ' +
  'peer-checked:border-accent peer-checked:bg-[var(--accent-soft)] ' +
  'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)] ' +
  'peer-disabled:opacity-40';

/** A selectable row (checkbox), used for focus, days-as-list, conditions. */
export function CheckRow({
  name,
  checked,
  disabled,
  onChange,
  children,
}: {
  name: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label className="block cursor-pointer">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        disabled={disabled && !checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <div className={`${CARD_BASE} flex items-center justify-between gap-3 px-4 py-3.5`}>
        <span className="text-[15px] font-medium">{children}</span>
        <span
          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
            checked ? 'border-accent bg-accent text-[var(--accent-contrast)]' : 'border-[var(--border-strong)]'
          }`}
        >
          {checked && <Icon name="check" size={13} />}
        </span>
      </div>
    </label>
  );
}

/** A single-select row with a title + description (recovery stage). */
export function RadioRow({
  name,
  value,
  checked,
  onChange,
  title,
  desc,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  desc: string;
}) {
  return (
    <label className="block cursor-pointer">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="peer sr-only" />
      <div className={`${CARD_BASE} px-4 py-3.5`}>
        <div className="font-semibold">{title}</div>
        <div className="mt-0.5 text-[13px] leading-snug text-dim">{desc}</div>
      </div>
    </label>
  );
}

/** Segmented single-select (fitness level: Low / Medium / High). */
export function Segmented<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { id: T; label: string }[];
  value: T | null;
  onChange: (id: T) => void;
}) {
  return (
    <div role="radiogroup" className="grid grid-flow-col rounded-2xl border border-border bg-card p-1">
      {options.map((o) => (
        <label key={o.id} className="cursor-pointer text-center">
          <input
            type="radio"
            name={name}
            value={o.id}
            checked={value === o.id}
            onChange={() => onChange(o.id)}
            className="peer sr-only"
          />
          <span className="block rounded-xl py-3 text-[15px] font-medium text-dim transition-colors peer-checked:bg-[var(--accent-soft2)] peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)]">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}

/** 1–5 scale selector (current intensity). */
export function Scale5({
  name,
  value,
  onChange,
}: {
  name: string;
  value: number;
  onChange: (n: 1 | 2 | 3 | 4 | 5) => void;
}) {
  return (
    <div role="radiogroup" className="grid grid-cols-5 gap-2.5">
      {([1, 2, 3, 4, 5] as const).map((n) => (
        <label key={n} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={n}
            checked={value === n}
            onChange={() => onChange(n)}
            className="peer sr-only"
          />
          <span className="grid h-14 place-items-center rounded-2xl border border-border bg-card text-lg font-semibold text-dim transition-colors peer-checked:border-accent peer-checked:bg-[var(--accent-soft)] peer-checked:text-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)]">
            {n}
          </span>
        </label>
      ))}
    </div>
  );
}

/** Accent-filled range slider with live value + endpoint captions. */
export function MinutesSlider({
  value,
  onChange,
  min = 0,
  max = 720,
  step = 30,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-faint">Current weekly training</span>
        <span className="text-lg font-semibold">
          {value} <span className="text-sm font-normal text-faint">min / week</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Current weekly training minutes"
        className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full outline-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-[0_0_10px_var(--accent-soft2)] [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent"
        style={{ background: `linear-gradient(90deg, var(--accent) ${pct}%, rgba(255,255,255,0.1) ${pct}%)` }}
      />
      <div className="mt-2 flex justify-between text-xs text-faint">
        <span>0 · Not training yet</span>
        <span>720 · Almost daily</span>
      </div>
    </div>
  );
}

/** Small info callout (health disclaimer). */
export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3.5 text-[13px] leading-relaxed text-dim">
      <span className="mt-0.5 shrink-0 text-faint">
        <Icon name="info" size={17} />
      </span>
      <p>{children}</p>
    </div>
  );
}

/** Section label above a group of controls. */
export function FieldLabel({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-sm font-semibold">{children}</h2>;
}
