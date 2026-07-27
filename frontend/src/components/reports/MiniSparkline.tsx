interface MiniSparklineProps {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}

/** Tiny inline trend line built from real series data — no charting library needed. */
export function MiniSparkline({ values, color, width = 72, height = 28 }: MiniSparklineProps) {
  if (values.length < 2) return <svg width={width} height={height} aria-hidden="true" />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);

  const points = values.map((v, i) => `${round(i * step)},${round(height - ((v - min) / range) * height)}`).join(" ");

  function round(n: number): number {
    return Math.round(n * 10) / 10;
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
