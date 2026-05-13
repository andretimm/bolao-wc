export const WC_WINDOW_START = new Date("2026-06-10T00:00:00Z");
export const WC_WINDOW_END = new Date("2026-07-20T00:00:00Z");

export function isInsideWcWindow(now: Date = new Date()): boolean {
  return now >= WC_WINDOW_START && now <= WC_WINDOW_END;
}
