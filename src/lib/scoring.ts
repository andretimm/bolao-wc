export type Score = { a: number; b: number };

/**
 * Scoring rules:
 *  +10 placar exato
 *  +5  só vencedor (ou empate certo)
 *  0   errou
 */
export function scorePrediction(pred: Score, result: Score | null): number {
  if (!result) return 0;
  if (pred.a === result.a && pred.b === result.b) return 10;
  const predWinner = Math.sign(pred.a - pred.b);
  const realWinner = Math.sign(result.a - result.b);
  return predWinner === realWinner ? 5 : 0;
}

/** Pontos extras por acertar o campeão (vencedor da final). */
export const CHAMPION_BONUS = 50;

/**
 * Retorna CHAMPION_BONUS se:
 *  - há resultado da final
 *  - palpite não é empate
 *  - resultado não é empate
 *  - sinal(palpite.a - palpite.b) === sinal(resultado.a - resultado.b)
 * Caso contrário retorna 0.
 *
 * Chamado apenas para o jogo cujo stage === "final".
 */
export function championBonus(
  pred: { scoreA: number; scoreB: number } | null,
  res: { resultA: number | null; resultB: number | null },
): number {
  if (!pred) return 0;
  if (res.resultA == null || res.resultB == null) return 0;
  if (pred.scoreA === pred.scoreB) return 0;
  if (res.resultA === res.resultB) return 0;
  return Math.sign(pred.scoreA - pred.scoreB) === Math.sign(res.resultA - res.resultB)
    ? CHAMPION_BONUS
    : 0;
}
