/** Read-only star rating (0–5, halves rounded). */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const full = Math.round(value * 2) / 2;
  return (
    <span className="stars" role="img" aria-label={`${value.toFixed(1)} out of 5 stars`} style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= full ? "on" : i - 0.5 === full ? "half" : undefined} aria-hidden="true">★</span>)}
    </span>
  );
}
