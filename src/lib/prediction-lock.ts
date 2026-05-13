export const PREDICTION_LOCK_MS = 24 * 60 * 60 * 1000;

export function isPredictionLocked(kickoffAt: Date, now: number = Date.now()): boolean {
  return kickoffAt.getTime() - PREDICTION_LOCK_MS <= now;
}
