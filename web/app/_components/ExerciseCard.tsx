'use client';

/**
 * A collectible exercise card. Stephan's design, with the physics of a real one.
 *
 * This is deliberately a different material from the rest of the app. Sphere
 * Loop is a near-black orbital interface; a trading card is a printed object
 * you hold, tilt to the light, and want to show someone. Making the card obey
 * the app's dark palette made it correct and killed the reason it exists, so
 * the card keeps its own world: metal frame, paper ground, foil ribbon. The app
 * chrome around it stays Sphere Loop. That boundary is the design.
 *
 * The frame carries rarity the way card games do, because that is the language
 * the member already reads: brass for Common, silver for Rare, gold for
 * Legendary, each with its own gem.
 *
 * Motion earns its place three ways and stops there:
 *   - tilt follows the pointer, so the card behaves like a thing in your hand
 *   - a foil sheen tracks the tilt on Rare and Legendary only, so rarity is
 *     something you SEE move rather than a word you read
 *   - the card springs in from the tile you tapped
 * All of it collapses to nothing under prefers-reduced-motion.
 */
import { useRef } from 'react';
import {
  motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform,
} from 'motion/react';
import type { CardRarity, ExerciseCard as Card } from '@/lib/stub/cards';
import { FAMILY_LADDERS } from '@/lib/stub/cards';
import { Icon, type IconName } from './icons';

const SKIN: Record<CardRarity, {
  label: string; frame: string; inner: string; gem: string; ink: string; title: string; foil: boolean;
}> = {
  common: {
    label: 'Common',
    frame: 'linear-gradient(150deg,#E8C877,#B8912F 38%,#F2DFA0 62%,#A9822A)',
    inner: '#FBFAF6',
    gem: 'radial-gradient(circle at 32% 28%,#FFFFFF,#C9CDD4 55%,#8B9099)',
    ink: '#6B7280',
    title: '#14202C',
    foil: false,
  },
  rare: {
    label: 'Rare',
    frame: 'linear-gradient(150deg,#E4E8EE,#A9B2BF 40%,#F4F7FA 62%,#98A2B1)',
    inner: '#FAFBFD',
    gem: 'radial-gradient(circle at 32% 28%,#FFFFFF,#5FB6E8 52%,#1E6FA8)',
    ink: '#2F7FBF',
    title: '#14202C',
    foil: true,
  },
  legendary: {
    label: 'Legendary',
    frame: 'linear-gradient(150deg,#F6DE9B,#C79A2C 36%,#FFF3C9 58%,#B0801E)',
    inner: '#FDFBF3',
    gem: 'radial-gradient(circle at 32% 28%,#FFFFFF,#F2CE62 52%,#B98D18)',
    ink: '#9A7212',
    title: '#7A5A10',
    foil: true,
  },
};

const TAG_ICON: Record<string, IconName> = {
  Strength: 'dumbbell', Endurance: 'pulse', Coordination: 'target',
  Speed: 'zap', Mobility: 'mobility',
  Memory: 'brain', Focus: 'target', Reaction: 'zap',
  'Cognitive Flexibility': 'sparkle', 'Perception/Orientation': 'orbit',
};

export default function ExerciseCard({
  card, locked = false, total,
}: { card: Card; locked?: boolean; total: number }) {
  const skin = SKIN[card.rarity];
  const rungs = FAMILY_LADDERS[card.family] ?? [card.level];
  const still = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // Pointer position across the card, -0.5 to 0.5 on each axis.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spring = { stiffness: 200, damping: 18, mass: 0.6 };
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-13, 13]), spring);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [11, -11]), spring);

  // The foil follows the same pointer, so the sheen reads as light moving over
  // the surface rather than as an animation playing on top of it.
  const sheenX = useTransform(px, [-0.5, 0.5], ['16%', '84%']);
  const sheenY = useTransform(py, [-0.5, 0.5], ['12%', '88%']);
  const sheen = useMotionTemplate`radial-gradient(115% 85% at ${sheenX} ${sheenY}, rgba(255,255,255,.85), rgba(255,255,255,.14) 40%, transparent 66%)`;
  // Legendary gets the rainbow break a real foil throws, angled off the tilt.
  const holoAngle = useTransform(px, [-0.5, 0.5], [72, 108]);
  const holo = useMotionTemplate`linear-gradient(${holoAngle}deg, rgba(255,0,128,.34), rgba(255,214,0,.30) 22%, rgba(0,255,196,.32) 44%, rgba(0,168,255,.34) 66%, rgba(196,0,255,.32) 88%)`;

  function track(e: React.PointerEvent) {
    if (still || !ref.current) return;
    const b = ref.current.getBoundingClientRect();
    px.set((e.clientX - b.left) / b.width - 0.5);
    py.set((e.clientY - b.top) / b.height - 0.5);
  }
  function release() {
    px.set(0);
    py.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={track}
      onPointerLeave={release}
      initial={still ? false : { scale: 0.82, opacity: 0, rotateX: -14 }}
      animate={{ scale: 1, opacity: 1, rotateX: 0 }}
      transition={still ? { duration: 0 } : { type: 'spring', stiffness: 210, damping: 22 }}
      style={{ perspective: 1000 }}
      className="select-none"
    >
      <motion.article
        style={{
          rotateX: still ? 0 : rotateX,
          rotateY: still ? 0 : rotateY,
          transformStyle: 'preserve-3d',
          background: skin.frame,
        }}
        className={`relative rounded-[22px] p-[7px] shadow-[0_30px_60px_-20px_rgba(0,0,0,.9)] ${
          locked ? 'saturate-[.15]' : ''
        }`}
      >
        <div
          className="relative overflow-hidden rounded-[16px]"
          style={{ background: skin.inner }}
        >
          {/* paper ground */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[.16]"
            style={{ backgroundImage: 'radial-gradient(#8A93A0 1px, transparent 1px)', backgroundSize: '13px 13px' }}
          />

          {/* Foil — Rare and Legendary only, so rarity is something you see
            * move rather than a word you read. Legendary also breaks rainbow,
            * which is what makes it the card worth showing someone. */}
          {skin.foil && !locked && !still && (
            <>
              {card.rarity === 'legendary' && (
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-20 opacity-40 mix-blend-overlay"
                  style={{ background: holo }}
                />
              )}
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-20 mix-blend-soft-light"
                style={{ background: sheen }}
              />
            </>
          )}

          <div className="relative z-10 px-4 pb-4 pt-4">
            {/* ladder */}
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              {rungs.map((rung, i) => (
                <span key={rung} className="flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden className="text-[10px] text-[#9AA2AE]">&rarr;</span>}
                  <span
                    className={`rounded-full px-2 py-[3px] text-[10px] font-bold uppercase tracking-[.14em] ${
                      rung === card.level ? 'text-white' : 'text-[#9AA2AE]'
                    }`}
                    style={rung === card.level
                      ? { background: card.rarity === 'legendary' ? '#B0801E' : '#1A2430' }
                      : undefined}
                  >
                    {rung}
                  </span>
                </span>
              ))}
            </div>

            {/* name + rarity */}
            <div className="mt-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-[1.5rem] leading-[1.05]" style={{ color: skin.title }}>
                  {card.name.toUpperCase()}
                </h3>
                <div className="mt-1.5 h-[3px] w-14 rounded-full bg-[linear-gradient(90deg,var(--orbit-cyan),var(--orbit-fuchsia))]" />
              </div>
              <div className="flex flex-none items-center gap-2">
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8A93A0]">Rarity</p>
                  <p className="text-[14px] font-bold uppercase leading-tight" style={{ color: skin.ink }}>
                    {skin.label}
                  </p>
                  <p className="text-[12px] font-bold leading-tight text-[#D6249F]">{card.points} PTS</p>
                </div>
                <motion.span
                  className="h-9 w-9 flex-none rounded-full ring-1 ring-black/10"
                  style={{ background: skin.gem, transform: 'translateZ(26px)' }}
                  animate={still || locked ? undefined : { scale: [1, 1.06, 1] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </div>

            {/* spec */}
            <dl className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <dt className="w-[68px] flex-none text-[10px] font-bold uppercase tracking-[.14em] text-[#8A93A0]">Category</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {card.regions.map((r) => (
                    <span key={r} className="rounded-full bg-[#EDF1F6] px-2.5 py-[3px] text-[12px] font-semibold text-[#26313D]">{r}</span>
                  ))}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="w-[68px] flex-none text-[10px] font-bold uppercase tracking-[.14em] text-[#8A93A0]">Intensity</dt>
                <dd className="flex gap-1.5" aria-label={`Intensity ${card.intensity} of 5`}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className={`h-[10px] w-[10px] rounded-full ${i <= card.intensity ? 'bg-[#E625A6]' : 'border border-[#C3C9D2]'}`} />
                  ))}
                </dd>
              </div>
            </dl>

            {/* artwork */}
            <div
              className="relative mt-3 aspect-[4/3] overflow-hidden rounded-[12px] ring-1 ring-black/15"
              style={{ background: 'linear-gradient(155deg,#28323F,#0E141C)', transform: 'translateZ(18px)' }}
            >
              <div className="absolute inset-0 grid place-items-center">
                <Icon name="dumbbell" size={44} className="text-white opacity-10" />
              </div>
              <p className="absolute inset-x-0 bottom-2.5 text-center text-[10px] font-semibold uppercase tracking-[.16em] text-white opacity-45">
                {card.equipment}
              </p>
              <div className="absolute -left-[54px] top-[30px] w-[200px] -rotate-45 overflow-hidden bg-[linear-gradient(90deg,#D9B84E,#F0DA9A)] py-[5px] text-center shadow">
                <span className="block truncate px-6 text-[10px] font-bold uppercase tracking-[.1em] text-[#4A3608]">
                  {card.family.length > 15 ? card.family : `${card.family} Family`}
                </span>
              </div>
              {locked && (
                <div className="absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-[2px]">
                  <Icon name="lock" size={26} className="text-white opacity-80" />
                </div>
              )}
            </div>

            {card.body.length > 0 && <Band kind="body" tags={card.body} />}
            {card.brain.length > 0 && <Band kind="brain" tags={card.brain} />}

            <p className="mt-2.5 text-center text-[12px] italic leading-snug text-[#6B7280]">
              {card.movement} &middot; {card.modality} &middot; {card.impact} impact
            </p>

            <div className="mt-2.5 flex items-center justify-between border-t border-dashed border-[#D3D9E1] pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-[#9AA2AE]">
                Movement Series &middot; No. {String(card.no).padStart(3, '0')}/{total}
              </p>
              <Icon name="sparkle" size={12} style={{ color: skin.ink }} />
            </div>
          </div>
        </div>
      </motion.article>
    </motion.div>
  );
}

function Band({ kind, tags }: { kind: 'body' | 'brain'; tags: string[] }) {
  const body = kind === 'body';
  return (
    <div className={`relative mt-3 rounded-[12px] px-2.5 pb-2 pt-3.5 ${body ? 'bg-[#FDEEF0] ring-1 ring-[#F3C9CF]' : 'bg-[#F1EDFE] ring-1 ring-[#D8CDF7]'}`}>
      <span className={`absolute -top-[9px] left-2.5 rounded-full px-2 py-[2px] text-[10px] font-bold uppercase tracking-[.14em] text-white ${body ? 'bg-[#E1273E]' : 'bg-[#7B3FE4]'}`}>
        {kind}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-[3px] text-[12px] font-semibold text-[#26313D] shadow-sm">
            <Icon name={TAG_ICON[t] ?? 'sparkle'} size={11} className={body ? 'text-[#E1273E]' : 'text-[#7B3FE4]'} />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
