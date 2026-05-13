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
