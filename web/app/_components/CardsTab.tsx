'use client';

/**
 * Cards — the collection, replacing the old Progress tab.
 *
 * Progress showed four numbers nobody could act on (Body Score, Brain Score,
 * Body Age, Brain Age). This shows the thing a member actually accumulates:
 * the exercise cards they have unlocked by training.
 *
 * A SET is an exercise family. Its slots are the rungs that family actually
 * offers, so a one-card family shows one slot and the Squat family shows three
 * (Sumo Squat -> Squat -> Wall Balls). Completing a set is the small goal;
 * 105 cards is the long one.
 *
 * WHAT UNLOCKS A CARD is performing the exercise. In the shipped app that is
 * `DISTINCT exercise_id` from the member's session logs. Here it is derived
 * from the member's real history size so Lena and Marco have visibly different
 * collections, and it is stable across renders.
 */
import { useMemo, useState } from 'react';
import { CARDS, TOTAL_CARDS, type CardLevel, type CardRarity, type ExerciseCard as Card } from '@/lib/stub/cards';
import type { PlanView } from '@/lib/stub/engine';
import ExerciseCard from './ExerciseCard';
import { Icon } from './icons';

const RARITY_TONE: Record<CardRarity, { dot: string; text: string; ring: string }> = {
  common: { dot: 'bg-[#B8912F]', text: 'text-[#C9A24A]', ring: 'ring-[#B8912F]/40' },
  rare: { dot: 'bg-[#7FC4EE]', text: 'text-[#7FC4EE]', ring: 'ring-[#7FC4EE]/40' },
  legendary: { dot: 'bg-[#E8C766]', text: 'text-[#E8C766]', ring: 'ring-[#E8C766]/50' },
};

const LEVEL_LABEL: Record<CardLevel, string> = {
  foundation: 'Foundation', progress: 'Progress', mastery: 'Mastery',
};

/** Deterministic stand-in for "which exercises has this member performed".
 *  Real rule: DISTINCT exercise_id over their session logs. */
function unlockedCodes(sessionCount: number): Set<string> {
  const out = new Set<string>();
  // Foundation cards come first and fastest; mastery is genuinely rare.
  const budget = { foundation: sessionCount / 4, progress: sessionCount / 11, mastery: sessionCount / 40 };
  const seen: Record<string, number> = { foundation: 0, progress: 0, mastery: 0 };
  for (const c of CARDS) {
    if (seen[c.level] < budget[c.level]) { out.add(c.code); seen[c.level] += 1; }
  }
  return out;
}

export default function CardsTab({ view, completedCount }: { view: PlanView; completedCount: number }) {
  const [open, setOpen] = useState<Card | null>(null);

  const sessions = view.engagement.streak.longestWeeks * 3 + completedCount * 4;
  const unlocked = useMemo(() => unlockedCodes(sessions), [sessions]);

  const families = useMemo(() => {
    const by = new Map<string, Card[]>();
    for (const c of CARDS) {
      if (!by.has(c.family)) by.set(c.family, []);
      by.get(c.family)!.push(c);
    }
    // Sets you are furthest through come first: the collection should reward
    // looking at it, not open on fifty locked rows.
    return [...by.entries()]
      .map(([family, cards]) => ({
        family,
        cards,
        have: cards.filter((c) => unlocked.has(c.code)).length,
      }))
      .sort((a, b) => b.have / b.cards.length - a.have / a.cards.length || a.family.localeCompare(b.family));
  }, [unlocked]);

  const have = CARDS.filter((c) => unlocked.has(c.code)).length;
  const points = CARDS.filter((c) => unlocked.has(c.code)).reduce((s, c) => s + c.points, 0);
  const byRarity = (r: CardRarity) => ({
    have: CARDS.filter((c) => c.rarity === r && unlocked.has(c.code)).length,
    all: CARDS.filter((c) => c.rarity === r).length,
  });
  const setsDone = families.filter((f) => f.have === f.cards.length).length;

  return (
    <div className="space-y-5">
      {/* ---- what you have ---- */}
      <section className="rounded-[26px] border border-border bg-card p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow text-dim">Collection</p>
            <p className="mt-1 font-display text-4xl leading-none text-accent tabular">
              {have}
              <span className="text-2xl text-faint"> / {TOTAL_CARDS}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="eyebrow text-dim">Card points</p>
            <p className="mt-1 font-display text-3xl leading-none text-fuchsia tabular">{points}</p>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-void">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,var(--orbit-cyan),var(--orbit-fuchsia))]"
            style={{ width: `${(have / TOTAL_CARDS) * 100}%` }}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {(['common', 'rare', 'legendary'] as CardRarity[]).map((r) => {
            const t = byRarity(r);
            return (
              <div key={r} className="rounded-2xl border border-border bg-void px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${RARITY_TONE[r].dot}`} />
                  <span className="text-[11px] font-semibold capitalize text-dim">{r}</span>
                </div>
                <p className={`mt-1 text-lg leading-none tabular ${RARITY_TONE[r].text}`}>
                  {t.have}<span className="text-xs text-faint"> / {t.all}</span>
                </p>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-faint">
          {setsDone} of {families.length} sets complete. A card unlocks the first time you perform the exercise.
        </p>
      </section>

      {/* ---- the sets ---- */}
      <section className="space-y-3">
        <h2 className="eyebrow px-1 text-dim">Sets · by exercise family</h2>
        {families.map(({ family, cards, have: h }) => (
          <div key={family} className="rounded-2xl border border-border bg-card p-3.5">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold">{family}</p>
              <span className={`flex-none text-xs tabular ${h === cards.length ? 'text-mint' : 'text-faint'}`}>
                {h === cards.length && <Icon name="check" size={11} className="mr-0.5 inline" />}
                {h}/{cards.length}
              </span>
            </div>
            <ul className="mt-2.5 flex gap-2">
              {cards.map((c) => {
                const got = unlocked.has(c.code);
                return (
                  <li key={c.code} className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setOpen(c)}
                      className={`flex w-full flex-col gap-1 rounded-xl px-2.5 py-2 text-left ring-1 transition-colors ${
                        got ? `bg-void ${RARITY_TONE[c.rarity].ring}` : 'bg-void/40 ring-border'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 flex-none rounded-full ${got ? RARITY_TONE[c.rarity].dot : 'bg-white/15'}`} />
                        <span className={`truncate text-[10px] font-semibold uppercase tracking-wide ${got ? 'text-dim' : 'text-faint'}`}>
                          {LEVEL_LABEL[c.level]}
                        </span>
                        {!got && <Icon name="lock" size={9} className="ml-auto flex-none text-faint" />}
                      </span>
                      <span className={`truncate text-xs ${got ? 'text-hi' : 'text-faint'}`}>{c.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      {/* ---- the card itself ---- */}
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${open.name} card`}
          onClick={() => setOpen(null)}
        >
          <div className="w-full max-w-[340px]" onClick={(e) => e.stopPropagation()}>
            <ExerciseCard card={open} total={TOTAL_CARDS} locked={!unlocked.has(open.code)} />
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="mt-4 w-full rounded-full border border-border bg-card py-3 text-sm font-semibold"
            >
              {unlocked.has(open.code) ? 'Close' : 'Locked · train this to unlock'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
