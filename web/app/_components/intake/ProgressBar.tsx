/**
 * Three-segment section progress bar (concept: Goals · Setup · Health).
 * Each segment is a track that fills 0→100% as its section's screens complete,
 * with a soft cyan glow on partial fill. Presentational + accessible: the whole
 * bar is one `progressbar` reporting the overall fraction.
 */
interface ProgressBarProps {
  /** Fill fraction (0–1) per section, same length/order as labels. */
  fractions: number[];
  labels: string[];
}

export function ProgressBar({ fractions, labels }: ProgressBarProps) {
  const overall = fractions.reduce((a, b) => a + b, 0) / fractions.length;
  return (
    <div
      className="flex flex-1 items-center gap-2"
      role="progressbar"
      aria-label="Setup progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(overall * 100)}
    >
      {fractions.map((f, i) => (
        <div key={labels[i]} className="flex flex-1 flex-col gap-1.5">
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out"
              style={{
                width: `${Math.round(f * 100)}%`,
                background: 'var(--gradient-accent)',
                boxShadow: f > 0 && f < 1 ? '0 0 12px var(--accent-soft2)' : undefined,
              }}
            />
          </div>
          <span
            className={`text-[10px] font-medium uppercase tracking-wider transition-colors ${
              f > 0 ? 'text-dim' : 'text-faint/60'
            }`}
          >
            {labels[i]}
          </span>
        </div>
      ))}
    </div>
  );
}
