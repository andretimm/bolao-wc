const PALETTE = [
  "#d8ff3e", "#fb923c", "#60a5fa", "#f472b6",
  "#a78bfa", "#34d399", "#fbbf24", "#22d3ee",
  "#f87171", "#94a3b8", "#84cc16", "#e879f9",
];

/** Deterministic accent color per id. */
export function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
