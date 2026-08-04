/**
 * Tiny decorative trend line for a metric card. We don't have per-metric time
 * series in v1, so the shape is derived from the trend *direction* — it reads
 * "directionally true" (rising when the metric improved), matching the honest
 * framing of the motivational metrics. Swap for real series when the engine
 * emits history.
 */
const SHAPES: Record<'up' | 'down' | 'flat', number[]> = {
  up: [0.25, 0.32, 0.28, 0.46, 0.52, 0.68, 0.82],
  down: [0.8, 0.62, 0.68, 0.5, 0.44, 0.34, 0.2],
  flat: [0.5, 0.56, 0.47, 0.53, 0.49, 0.54, 0.5],
};

export function Sparkline({
  direction = 'up',
  color = 'var(--orbit-cyan)',
  width = 92,
  height = 28,
  strokeWidth = 2,
}: {
  direction?: 'up' | 'down' | 'flat';
  color?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
}) {
  const ys = SHAPES[direction];
  const d = ys
    .map((y, i) => {
      const x = (i / (ys.length - 1)) * width;
      const py = (1 - y) * height;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${py.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
