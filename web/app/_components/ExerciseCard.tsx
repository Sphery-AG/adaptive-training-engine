'use client';

/**
 * A collectible exercise card, built to Stephan's design (Aug 2026).
 *
 * ON THE DESIGN SYSTEM: the type sits on DESIGN.md's four steps below body
 * (caption 14, micro 12, label 10) — a card is dense, but density is not a
 * reason to invent half-steps. The COLOURS deliberately do not: brass, silver
 * and gold frames on a dotted paper ground are a printed object, and pulling
 * them onto the app's dark orbit palette would make it stop reading as a card.
 * That departure is intentional and worth recording in DESIGN.md rather than
 * leaving as drift. The one colour with no token to reach for is the paper
 * dot (#8A93A0): DESIGN.md carries no light-surface neutrals, because until
 * now nothing in the app was light.
 *
 * The card is a view of the catalogue, not a second copy of it: every element
 * on it already exists as data on the exercise.
 *
 *   ladder strip      FAMILY_LADDERS — the rungs this family actually offers,
 *                     with the card's own level highlighted. Thirteen families
 *                     hold a single rung, so the strip must render at length 1.
 *   rarity + points   a presentation of `level`. Foundation = Common (20),
 *                     Progress = Rare (30), Mastery = Legendary (50).
 *   category pills    the exercise's body regions, primary then secondary.
 *   intensity dots    1-5, from the sheet's intensity range.
 *   body / brain      the Body and Brain quality tags. These are THE vocabulary
 *                     the whole product reasons in, so they earn a band each.
 *
 * Artwork is the one thing that is not data yet. Until photography exists per
 * exercise the frame renders a placeholder that still carries the family
 * ribbon, so the card reads as a card rather than as a broken image.
 */
import type { CardLevel, CardRarity, ExerciseCard as Card } from '@/lib/stub/cards';
import { FAMILY_LADDERS } from '@/lib/stub/cards';
import { Icon, type IconName } from './icons';

const LADDER: CardLevel[] = ['foundation', 'progress', 'mastery'];

/** Frame, gem and title treatment per rarity — the three looks in the design. */
const SKIN: Record<CardRarity, {
  frame: string; inner: string; gem: string; rarity: string; title: string; label: string;
}> = {
  common: {
    frame: 'bg-[linear-gradient(150deg,#E8C877,#B8912F_38%,#F2DFA0_62%,#A9822A)]',
    inner: 'bg-[#FBFAF6]',
    gem: 'bg-[radial-gradient(circle_at_32%_28%,#FFFFFF,#C9CDD4_55%,#8B9099)]',
    rarity: 'text-[#6B7280]',
    title: 'text-[#14202C]',
    label: 'Common',
  },
  rare: {
    frame: 'bg-[linear-gradient(150deg,#E4E8EE,#A9B2BF_40%,#F4F7FA_62%,#98A2B1)]',
    inner: 'bg-[#FAFBFD]',
    gem: 'bg-[radial-gradient(circle_at_32%_28%,#FFFFFF,#5FB6E8_52%,#1E6FA8)]',
    rarity: 'text-[#2F7FBF]',
    title: 'text-[#14202C]',
    label: 'Rare',
  },
  legendary: {
    frame: 'bg-[linear-gradient(150deg,#F6DE9B,#C79A2C_36%,#FFF3C9_58%,#B0801E)]',
    inner: 'bg-[#FDFBF3]',
    gem: 'bg-[radial-gradient(circle_at_32%_28%,#FFFFFF,#F2CE62_52%,#B98D18)]',
    rarity: 'text-[#9A7212]',
    title: 'text-[#7A5A10]',
    label: 'Legendary',
  },
};

/** Body and Brain tag glyphs, by the sheet's own wording. */
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

  return (
    <div className={`rounded-[20px] p-[6px] shadow-[0_18px_50px_-14px_rgba(0,0,0,.75)] ${skin.frame}`}>
      <div className={`relative overflow-hidden rounded-[15px] ${skin.inner} ${locked ? 'grayscale' : ''}`}>
        {/* dotted ground, straight from the design */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[.18]"
          style={{ backgroundImage: 'radial-gradient(#8A93A0 1px, transparent 1px)', backgroundSize: '13px 13px' }}
        />

        <div className="relative px-4 pb-3.5 pt-3.5">
          {/* ---- the family ladder ---- */}
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            {rungs.map((r, i) => (
              <span key={r} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden className="text-[12px] text-[#9AA2AE]">&rarr;</span>}
                <span
                  className={`rounded-full px-2 py-[3px] text-[10px] font-bold uppercase tracking-[.14em] ${
                    r === card.level
                      ? card.rarity === 'legendary'
                        ? 'bg-[#E8C766] text-[#4A3608]'
                        : 'bg-[#1A2430] text-white'
                      : 'text-[#9AA2AE]'
                  }`}
                >
                  {r}
                </span>
              </span>
            ))}
          </div>

          {/* ---- name + rarity ---- */}
          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className={`font-display text-[1.5rem] leading-[1.05] tracking-tight ${skin.title}`}>
                {card.name.toUpperCase()}
              </h3>
              <div className="mt-1.5 h-[3px] w-14 rounded-full bg-[linear-gradient(90deg,var(--orbit-cyan),var(--orbit-fuchsia))]" />
            </div>
            <div className="flex flex-none items-center gap-2">
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#8A93A0]">Rarity</p>
                <p className={`text-[14px] font-bold uppercase leading-tight ${skin.rarity}`}>{skin.label}</p>
                <p className="text-[14px] font-bold leading-tight text-[#D6249F]">{card.points} PTS</p>
              </div>
              <span className={`h-8 w-8 flex-none rounded-full ring-1 ring-black/10 ${skin.gem}`} />
            </div>
          </div>

          {/* ---- category + intensity ---- */}
          <dl className="mt-2.5 space-y-1.5">
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
                  <span key={i} className={`h-[9px] w-[9px] rounded-full ${i <= card.intensity ? 'bg-[#E625A6]' : 'border border-[#C3C9D2]'}`} />
                ))}
              </dd>
            </div>
          </dl>

          {/* ---- artwork ---- */}
          <div className="relative mt-2.5 aspect-[4/3] overflow-hidden rounded-[11px] bg-[linear-gradient(155deg,#28323F,#0E141C)] ring-1 ring-black/15">
            <div className="absolute inset-0 grid place-items-center">
              <Icon name="dumbbell" size={42} className="text-white/12" />
            </div>
            <p className="absolute bottom-2.5 left-0 right-0 text-center text-[10px] font-semibold uppercase tracking-[.16em] text-white/45">
              {card.equipment}
            </p>
            {/* family ribbon */}
            <div className="absolute -left-[54px] top-[30px] w-[200px] -rotate-45 overflow-hidden bg-[linear-gradient(90deg,#D9B84E,#F0DA9A)] py-[5px] text-center shadow">
              <span className="block truncate px-6 text-[10px] font-bold uppercase tracking-[.1em] text-[#4A3608]">
                {card.family.length > 15 ? card.family : `${card.family} Family`}
              </span>
            </div>
            {locked && (
              <div className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-[2px]">
                <Icon name="lock" size={26} className="text-white/80" />
              </div>
            )}
          </div>

          {/* ---- body + brain ---- */}
          {card.body.length > 0 && <TagBand kind="body" tags={card.body} />}
          {card.brain.length > 0 && <TagBand kind="brain" tags={card.brain} />}

          {/* Stephan's cards carry a written line here. Until that copy exists
            * for all 105, state what is true from the sheet instead of
            * inventing a quote per card. */}
          <p className="mt-2.5 text-center text-[12px] italic leading-snug text-[#6B7280]">
            {card.movement} &middot; {card.modality} &middot; {card.impact} impact
          </p>

          {/* ---- footer ---- */}
          <div className="mt-3 flex items-center justify-between border-t border-dashed border-[#D3D9E1] pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-[#9AA2AE]">
              Movement Series · No. {String(card.no).padStart(3, '0')}/{total}
            </p>
            <Icon
              name="sparkle"
              size={12}
              className={card.rarity === 'legendary' ? 'text-[#C79A2C]' : card.rarity === 'rare' ? 'text-[#2F7FBF]' : 'text-[#B8912F]'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TagBand({ kind, tags }: { kind: 'body' | 'brain'; tags: string[] }) {
  const body = kind === 'body';
  return (
    <div className={`relative mt-2.5 rounded-[11px] px-2.5 pb-2 pt-3.5 ${body ? 'bg-[#FDEEF0] ring-1 ring-[#F3C9CF]' : 'bg-[#F1EDFE] ring-1 ring-[#D8CDF7]'}`}>
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
