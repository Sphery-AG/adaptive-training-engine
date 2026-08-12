'use client';

/**
 * A collectible exercise card, on the Sphere Loop system.
 *
 * Stephan's design set the information architecture and it is kept whole: the
 * family ladder, rarity and points, category, intensity, the Body and Brain
 * bands, the series number. What changed is the world it lives in. His comp is
 * a printed object — paper ground, brass and silver frames, a red Body band —
 * and dropping that into a near-black orbital app made the card read as an
 * asset pasted onto the screen rather than part of it.
 *
 * Three rules from DESIGN.md decided the translation:
 *
 *   The Fixed Orbit Rule. Each accent owns one meaning, so Body is cyan
 *   (physical) and Brain is violet (cognitive) — the same colors those two
 *   qualities carry everywhere else in the app. Points are fuchsia because the
 *   habit loop owns points. Nothing here picks a color for variety.
 *
 *   Rarity is not in that list, so it cannot own a hue. It is an EARNED state,
 *   and glow is reserved for live, earned or selected — so rarity escalates as
 *   light rather than as metal: Common is hairline only, Rare takes a cyan
 *   edge, Legendary blooms fuchsia. The rarest card is the only one that glows
 *   hard, which is also what makes it worth screenshotting.
 *
 *   Depth comes from light, never shadow. No drop shadow, no metal gradient.
 *
 * The catalogue does all the work: every element here is a column on the
 * exercise. Artwork is the one thing that is not data yet.
 */
import type { CardRarity, ExerciseCard as Card } from '@/lib/stub/cards';
import { FAMILY_LADDERS } from '@/lib/stub/cards';
import { Icon, type IconName } from './icons';

/** Rarity as earned light: ring, glow, and the one accent it may use. */
const RARITY: Record<CardRarity, { label: string; ring: string; glow: string; ink: string }> = {
  common: { label: 'Common', ring: 'ring-1 ring-border', glow: '', ink: 'text-faint' },
  rare: {
    label: 'Rare',
    ring: 'ring-1 ring-cyan/45',
    glow: 'shadow-[0_0_28px_-6px_var(--orbit-cyan)]',
    ink: 'text-cyan',
  },
  legendary: {
    label: 'Legendary',
    ring: 'ring-1 ring-fuchsia/60',
    glow: 'shadow-[0_0_44px_-8px_var(--orbit-fuchsia)]',
    ink: 'text-fuchsia',
  },
};

/** Body and Brain glyphs, keyed by the catalogue's own wording. */
const TAG_ICON: Record<string, IconName> = {
  Strength: 'dumbbell', Endurance: 'pulse', Coordination: 'target',
  Speed: 'zap', Mobility: 'mobility',
  Memory: 'brain', Focus: 'target', Reaction: 'zap',
  'Cognitive Flexibility': 'sparkle', 'Perception/Orientation': 'orbit',
};

export default function ExerciseCard({
  card, locked = false, total,
}: { card: Card; locked?: boolean; total: number }) {
  const r = RARITY[card.rarity];
  const rungs = FAMILY_LADDERS[card.family] ?? [card.level];

  return (
    <article
      className={`relative overflow-hidden rounded-[26px] bg-card p-5 ${r.ring} ${
        locked ? 'opacity-55 saturate-0' : r.glow
      }`}
    >
      {/* ---- where this card sits in its family ---- */}
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {rungs.map((rung, i) => (
          <li key={rung} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden className="text-[10px] text-faint">/</span>}
            <span
              className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${
                rung === card.level ? r.ink : 'text-faint'
              }`}
            >
              {rung}
            </span>
          </li>
        ))}
      </ol>

      {/* ---- name, and what it is worth ---- */}
      <div className="mt-3 flex items-start justify-between gap-4">
        <h3 className="font-display text-[1.5rem] leading-none tracking-[0.015em]">
          {card.name.toUpperCase()}
        </h3>
        {/* Rarity is subordinate to the name: two display-size items side by
          * side is not a hierarchy. It reads as a spec value, in its accent. */}
        <div className="flex-none text-right">
          <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${r.ink}`}>{r.label}</p>
          <p className="mt-1.5 font-mono text-[14px] tabular-nums text-fuchsia">{card.points} pts</p>
        </div>
      </div>

      {/* ---- the spec ---- */}
      <dl className="mt-4 space-y-2.5">
        <div className="flex items-baseline gap-3">
          <dt className="w-[72px] flex-none text-[10px] font-semibold uppercase tracking-[0.2em] text-faint">
            Category
          </dt>
          <dd className="flex flex-wrap gap-1.5">
            {card.regions.map((region) => (
              <span key={region} className="rounded-full border border-border px-2.5 py-0.5 text-[12px] text-dim">
                {region}
              </span>
            ))}
          </dd>
        </div>
        <div className="flex items-center gap-3">
          <dt className="w-[72px] flex-none text-[10px] font-semibold uppercase tracking-[0.2em] text-faint">
            Intensity
          </dt>
          <dd className="flex gap-1.5" aria-label={`Intensity ${card.intensity} of 5`}>
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className={`h-1.5 w-6 rounded-full ${i <= card.intensity ? 'bg-cyan' : 'bg-border'}`} />
            ))}
          </dd>
        </div>
      </dl>

      {/* ---- artwork ---- */}
      <figure className="relative mt-4 aspect-[4/3] overflow-hidden rounded-[18px] border border-border bg-background">
        <div className="absolute inset-0 grid place-items-center">
          <Icon name="dumbbell" size={40} className="text-faint opacity-25" />
        </div>
        <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-3 py-2.5">
          <span className="truncate rounded-full border border-border bg-card px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-dim">
            {card.family}
          </span>
          <span className="flex-none text-[12px] text-faint">{card.equipment}</span>
        </figcaption>
        {locked && (
          <div className="absolute inset-0 grid place-items-center bg-background/70">
            <Icon name="lock" size={24} className="text-faint" />
          </div>
        )}
      </figure>

      {/* ---- what it trains. Cyan is physical, violet is cognitive. ---- */}
      <div className="mt-4 space-y-2.5">
        {card.body.length > 0 && <Qualities kind="body" tags={card.body} />}
        {card.brain.length > 0 && <Qualities kind="brain" tags={card.brain} />}
      </div>

      {/* ---- provenance ---- */}
      <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-border pt-3">
        <p className="text-[12px] text-faint">
          {card.movement} · {card.modality} · {card.impact} impact
        </p>
        <p className="flex-none font-mono text-[10px] tabular-nums uppercase tracking-[0.2em] text-faint">
          {String(card.no).padStart(3, '0')}/{total}
        </p>
      </div>
    </article>
  );
}

function Qualities({ kind, tags }: { kind: 'body' | 'brain'; tags: string[] }) {
  const ink = kind === 'body' ? 'text-cyan' : 'text-violet';
  return (
    <div className="flex items-baseline gap-3">
      <p className={`w-[72px] flex-none text-[10px] font-semibold uppercase tracking-[0.2em] ${ink}`}>{kind}</p>
      <ul className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <li
            key={t}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-[12px] text-dim"
          >
            <Icon name={TAG_ICON[t] ?? 'sparkle'} size={11} className={ink} />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
