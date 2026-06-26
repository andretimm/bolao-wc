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

/** Pontos extras por escolher corretamente o campeão na abertura das oitavas (r16). */
export const CHAMPION_BONUS = 50;

/**
 * +50 se o time escolhido pelo usuário (championPicks.teamCode) é o time que
 * de fato venceu a final. 0 caso contrário, ou se a final ainda não terminou,
 * ou se o usuário nunca escolheu.
 */
export function championPickBonus(pickTeam: string | null, championTeam: string | null): number {
  if (!pickTeam || !championTeam) return 0;
  return pickTeam === championTeam ? CHAMPION_BONUS : 0;
}
