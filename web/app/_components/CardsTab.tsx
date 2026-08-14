'use client';

/**
 * Cards — the collection, replacing the old Progress tab.
 *
 * Progress showed four numbers nobody could act on. This shows the thing a
 * member accumulates by training.
 *
 * The first version listed cards as text rows, and nobody could tell they were
 * tappable or that anything good was behind them. So the grid shows actual
 * cards: unlocked ones as miniatures of the real thing, locked ones face down.
 * A face-down card is the clearest "there is something here you have not got
 * yet" in any collecting game, and it needs no label to say so.
 *
 * A SET is an exercise family. Its slots are the rungs that family offers, so
 * a one-card family shows one and the Squat family shows three (Sumo Squat ->
 * Squat -> Wall Balls). Completing a set is the small goal; 105 is the long one.
 *
 * WHAT UNLOCKS A CARD is performing the exercise. In the shipped app that is
 * DISTINCT exercise_id over the member's session logs; here it is derived from
 * their real history size so Lena and Marco have different collections.
 */
import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CARDS, TOTAL_CARDS, type CardLevel, type CardRarity, type ExerciseCard as Card } from '@/lib/stub/cards';
import type { PlanView } from '@/lib/stub/engine';
import ExerciseCard from './ExerciseCard';
import { Icon } from './icons';

/** The card's own metal, shrunk to a tile. */
const MINI: Record<CardRarity, { frame: string; inner: string; ink: string; label: string }> = {
  common: { frame: 'linear-gradient(150deg,#E8C877,#B8912F 40%,#F2DFA0 64%,#A9822A)', inner: '#FBFAF6', ink: '#6B7280', label: 'Common' },
  rare: { frame: 'linear-gradient(150deg,#E4E8EE,#A9B2BF 42%,#F4F7FA 64%,#98A2B1)', inner: '#FAFBFD', ink: '#2F7FBF', label: 'Rare' },
  legendary: { frame: 'linear-gradient(150deg,#F6DE9B,#C79A2C 38%,#FFF3C9 60%,#B0801E)', inner: '#FDFBF3', ink: '#9A7212', label: 'Legendary' },
};

const LEVEL_LABEL: Record<CardLevel, string> = {
  foundation: 'Foundation', progress: 'Progress', mastery: 'Mastery',
};

function unlockedCodes(sessionCount: number): Set<string> {
  const out = new Set<string>();
  const budget = { foundation: sessionCount / 4, progress: sessionCount / 11, mastery: sessionCount / 40 };
  const seen: Record<string, number> = { foundation: 0, progress: 0, mastery: 0 };
  for (const c of CARDS) {
    if (seen[c.level] < budget[c.level]) { out.add(c.code); seen[c.level] += 1; }
  }
  return out;
}

export default function CardsTab({ view, completedCount }: { view: PlanView; completedCount: number }) {
  const [open, setOpen] = useState<Card | null>(null);
  // Which family folder is open. Null is the folder grid, which is the default:
  // the tab opens on the collection, not on one set inside it.
  const [openFamily, setOpenFamily] = useState<string | null>(null);
  const still = useReducedMotion();

  const sessions = view.engagement.streak.longestWeeks * 3 + completedCount * 4;
  const unlocked = useMemo(() => unlockedCodes(sessions), [sessions]);

  const families = useMemo(() => {
    const by = new Map<string, Card[]>();
    for (const c of CARDS) {
      if (!by.has(c.family)) by.set(c.family, []);
      by.get(c.family)!.push(c);
    }
    return [...by.entries()]
      .map(([family, cards]) => ({ family, cards, have: cards.filter((c) => unlocked.has(c.code)).length }))
      .sort((a, b) => b.have / b.cards.length - a.have / a.cards.length || a.family.localeCompare(b.family));
  }, [unlocked]);

  const openFamilyCards = useMemo(
    () => (openFamily ? CARDS.filter((c) => c.family === openFamily) : []),
    [openFamily],
  );

  const have = CARDS.filter((c) => unlocked.has(c.code)).length;
  const points = CARDS.filter((c) => unlocked.has(c.code)).reduce((s, c) => s + c.points, 0);
  const setsDone = families.filter((f) => f.have === f.cards.length).length;

  return (
    <div className="space-y-6">
      {/* ---- what you have ---- */}
      <section>
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow text-dim">Collection</p>
            <p className="mt-1 font-display text-4xl leading-none text-accent tabular">
              {have}<span className="text-2xl text-faint"> / {TOTAL_CARDS}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="eyebrow text-dim">Card points</p>
            <p className="mt-1 font-display text-3xl leading-none text-fuchsia tabular">{points}</p>
          </div>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-border">
          <motion.div
            className="h-full rounded-full bg-[linear-gradient(90deg,var(--orbit-cyan),var(--orbit-fuchsia))]"
            initial={still ? false : { width: 0 }}
            animate={{ width: `${(have / TOTAL_CARDS) * 100}%` }}
            transition={still ? { duration: 0 } : { duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <p className="mt-3 text-[12px] text-faint">{setsDone} of {families.length} sets complete</p>
      </section>

      {/* ---- how this works, in three lines ---- */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-[14px] font-semibold">How cards work</h2>
        <ol className="mt-2.5 space-y-1.5 text-[13px] leading-relaxed text-dim">
          <li><span className="text-accent">1.</span> Train an exercise and its card is yours.</li>
          <li><span className="text-accent">2.</span> Every family is a set. Work up Foundation, Progress, Mastery to finish it.</li>
          <li><span className="text-accent">3.</span> Rarer cards are worth more. Mastery cards are Legendary.</li>
        </ol>
        <p className="mt-2.5 text-[12px] text-faint">Tap a set to see its cards.</p>
      </section>

      {/* ---- the sets, as folders ----
        * Max, Aug 13: "eventually there will be a lot of cards and you would
        * need to scroll forever. Maybe we could arrange family groups that can
        * be clicked and open up like the apps on a phone." Every family used to
        * render every card inline, so 105 cards meant 105 tiles on one screen.
        * Now a family is one tile showing what is inside, and opens on tap. */}
      <section>
        <ul className="grid grid-cols-3 gap-3">
          {families.map(({ family, cards, have: h }, fi) => (
            <FolderTile
              key={family}
              family={family}
              cards={cards}
              have={h}
              unlocked={unlocked}
              delay={still ? 0 : Math.min(fi * 0.03, 0.3)}
              onOpen={() => setOpenFamily(family)}
            />
          ))}
        </ul>
      </section>

      {/* ---- inside a folder ---- */}
      <AnimatePresence>
        {openFamily && (
          <motion.div
            className="fixed inset-0 z-40 overflow-y-auto bg-black/85 p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={`${openFamily} cards`}
            onClick={() => setOpenFamily(null)}
          >
            <div className="mx-auto w-full max-w-[340px] py-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="truncate font-display text-2xl">{openFamily}</h3>
                <span
                  className={`flex-none font-mono text-[12px] tabular-nums ${
                    openFamilyCards.every((c) => unlocked.has(c.code)) ? 'text-mint' : 'text-faint'
                  }`}
                >
                  {openFamilyCards.filter((c) => unlocked.has(c.code)).length}/{openFamilyCards.length}
                </span>
              </div>
              <ul className="mt-4 grid grid-cols-3 gap-2.5">
                {openFamilyCards.map((c, i) => (
                  <MiniCard
                    key={c.code}
                    card={c}
                    got={unlocked.has(c.code)}
                    delay={still ? 0 : i * 0.04}
                    onOpen={() => setOpen(c)}
                  />
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setOpenFamily(null)}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3.5 text-sm font-semibold"
              >
                <Icon name="close" size={15} />
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- the card ---- */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={`${open.name} card`}
            onClick={() => setOpen(null)}
          >
            <div className="mx-auto grid min-h-full max-w-[340px] place-items-center py-4">
              <div className="w-full" onClick={(e) => e.stopPropagation()}>
                <ExerciseCard card={open} total={TOTAL_CARDS} locked={!unlocked.has(open.code)} />
                {!unlocked.has(open.code) && (
                  <p className="mt-4 text-center text-[13px] leading-relaxed text-dim">
                    Locked. Train <span className="text-accent">{open.name}</span> to add it to your collection.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3.5 text-sm font-semibold"
                >
                  <Icon name="close" size={15} />
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * A family, as a folder: the phone-homescreen pattern Max sketched.
 *
 * The four thumbnails are the first four cards in the set, in their real metal
 * when owned and face-down when not, so the tile itself shows how far along the
 * set is before the count is read. Families with fewer than four cards leave
 * the remaining slots empty rather than padding, which keeps every tile the
 * same size on the grid.
 */
function FolderTile({
  family, cards, have, unlocked, delay, onOpen,
}: {
  family: string;
  cards: Card[];
  have: number;
  unlocked: Set<string>;
  delay: number;
  onOpen: () => void;
}) {
  const still = useReducedMotion();
  const complete = have === cards.length;

  return (
    <motion.li
      initial={still ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={still ? { duration: 0 } : { delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.button
        type="button"
        onClick={onOpen}
        whileHover={still ? undefined : { y: -4 }}
        whileTap={still ? undefined : { scale: 0.95 }}
        aria-label={`${family} set, ${have} of ${cards.length} collected`}
        className="block w-full text-left"
      >
        <span
          className={`grid aspect-square grid-cols-2 grid-rows-2 gap-1 rounded-[16px] border p-1.5 ${
            complete ? 'border-mint/40 bg-mint/[0.07]' : 'border-border bg-white/[0.04]'
          }`}
        >
          {Array.from({ length: 4 }, (_, i) => {
            const c = cards[i];
            if (!c) return <span key={i} className="rounded-[5px] bg-white/[0.02]" />;
            const got = unlocked.has(c.code);
            return (
              <span
                key={c.code}
                className="rounded-[5px]"
                style={{
                  background: got
                    ? MINI[c.rarity].frame
                    : 'repeating-linear-gradient(45deg,#141B24,#141B24 4px,#1B2530 4px,#1B2530 8px)',
                }}
              />
            );
          })}
        </span>
        <span className="mt-1.5 block truncate text-[12px] font-semibold leading-tight">{family}</span>
        <span
          className={`block font-mono text-[11px] tabular-nums ${complete ? 'text-mint' : 'text-faint'}`}
        >
          {complete && <Icon name="check" size={10} className="mr-0.5 inline" />}
          {have}/{cards.length}
        </span>
      </motion.button>
    </motion.li>
  );
}

/** A miniature of the real card: same metal, same rarity, obviously a card. */
function MiniCard({
  card, got, delay, onOpen,
}: { card: Card; got: boolean; delay: number; onOpen: () => void }) {
  const m = MINI[card.rarity];
  const still = useReducedMotion();

  return (
    <motion.li
      initial={still ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={still ? { duration: 0 } : { delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.button
        type="button"
        onClick={onOpen}
        whileHover={still ? undefined : { y: -5, rotate: -1.5 }}
        whileTap={still ? undefined : { scale: 0.95 }}
        aria-label={got ? `${card.name}, ${m.label} card` : `Locked card in the ${card.family} family`}
        className="block w-full rounded-[11px] p-[3px] text-left shadow-[0_8px_18px_-8px_rgba(0,0,0,.85)]"
        style={{ background: got ? m.frame : 'linear-gradient(150deg,#39424E,#232B35 45%,#404A57)' }}
      >
        {/* Both faces share one aspect so a half-collected set stays on a line. */}
        {got ? (
          <span
            className="flex aspect-[3/4.35] flex-col rounded-[8px] px-2 pb-2 pt-1.5"
            style={{ background: m.inner }}
          >
            <span className="block truncate text-[10px] font-bold uppercase tracking-[.1em]" style={{ color: m.ink }}>
              {LEVEL_LABEL[card.level]}
            </span>
            <span className="mt-1 block flex-1 rounded-[5px] bg-[linear-gradient(155deg,#28323F,#0E141C)]" />
            <span className="mt-1.5 block truncate font-display text-[13px] leading-tight text-[#14202C]">
              {card.name.toUpperCase()}
            </span>
            <span className="block font-mono text-[10px] tabular-nums text-[#D6249F]">{card.points} pts</span>
          </span>
        ) : (
          /* face down: the universal "not yours yet" */
          <span
            className="grid aspect-[3/4.35] place-items-center rounded-[8px]"
            style={{ background: 'repeating-linear-gradient(45deg,#141B24,#141B24 6px,#1B2530 6px,#1B2530 12px)' }}
          >
            <Icon name="orbit" size={22} className="text-faint opacity-50" />
          </span>
        )}
      </motion.button>
    </motion.li>
  );
}
