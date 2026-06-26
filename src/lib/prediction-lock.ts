export const PREDICTION_LOCK_MS = 60 * 60 * 1000; // 1h antes do jogo

export function isPredictionLocked(kickoffAt: Date, now: number = Date.now()): boolean {
  return kickoffAt.getTime() - PREDICTION_LOCK_MS <= now;
}
