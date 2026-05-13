export type Slot = { matchId: string; slot: "A" | "B" };

/** Para um jogo eliminatório resolvido (com vencedor), devolve o slot do próximo
    jogo a preencher com o vencedor e (opcionalmente) com o perdedor.
    Retorna null se o jogo é o último (final, terceiro lugar). */
export function nextSlots(matchId: string): { winnerTo: Slot | null; loserTo: Slot | null } {
  // r32-N → r16-ceil(N/2). Slot determinado pela paridade.
  let m = matchId.match(/^r32-(\d+)$/);
  if (m) {
    const n = Number(m[1]);
    return {
      winnerTo: { matchId: `r16-${Math.ceil(n / 2)}`, slot: n % 2 === 1 ? "A" : "B" },
      loserTo: null,
    };
  }
  m = matchId.match(/^r16-(\d+)$/);
  if (m) {
    const n = Number(m[1]);
    return {
      winnerTo: { matchId: `qf-${Math.ceil(n / 2)}`, slot: n % 2 === 1 ? "A" : "B" },
      loserTo: null,
    };
  }
  m = matchId.match(/^qf-(\d+)$/);
  if (m) {
    const n = Number(m[1]);
    return {
      winnerTo: { matchId: `sf-${Math.ceil(n / 2)}`, slot: n % 2 === 1 ? "A" : "B" },
      loserTo: null,
    };
  }
  m = matchId.match(/^sf-(\d+)$/);
  if (m) {
    const n = Number(m[1]);
    return {
      winnerTo: { matchId: "final-1", slot: n === 1 ? "A" : "B" },
      loserTo: { matchId: "tp-1", slot: n === 1 ? "A" : "B" },
    };
  }
  return { winnerTo: null, loserTo: null };
}
