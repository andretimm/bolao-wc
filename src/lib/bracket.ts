export type Slot = { matchId: string; slot: "A" | "B" };

/**
 * r32→r16 mapping is non-sequential (FIFA 2026 draw schedule).
 * r16→qf and qf→sf remain sequential (ceil(N/2), parity for slot).
 *
 * FIFA match refs (for traceability):
 *   r32-1(M73)→r16-1/A, r32-4(M75)→r16-1/B
 *   r32-3(M74)→r16-2/A, r32-6(M77)→r16-2/B
 *   r32-2(M76)→r16-3/A, r32-5(M78)→r16-3/B
 *   r32-7(M79)→r16-4/A, r32-8(M80)→r16-4/B
 *   r32-9(M81)→r16-5/A, r32-10(M82)→r16-5/B
 *   r32-12(M83)→r16-6/A, r32-11(M84)→r16-6/B
 *   r32-15(M86)→r16-7/A, r32-14(M88)→r16-7/B
 *   r32-13(M85)→r16-8/A, r32-16(M87)→r16-8/B
 */
const R32_TO_R16: Record<string, Slot> = {
  "r32-1":  { matchId: "r16-1", slot: "A" },
  "r32-4":  { matchId: "r16-1", slot: "B" },
  "r32-3":  { matchId: "r16-2", slot: "A" },
  "r32-6":  { matchId: "r16-2", slot: "B" },
  "r32-2":  { matchId: "r16-3", slot: "A" },
  "r32-5":  { matchId: "r16-3", slot: "B" },
  "r32-7":  { matchId: "r16-4", slot: "A" },
  "r32-8":  { matchId: "r16-4", slot: "B" },
  "r32-9":  { matchId: "r16-5", slot: "A" },
  "r32-10": { matchId: "r16-5", slot: "B" },
  "r32-12": { matchId: "r16-6", slot: "A" },
  "r32-11": { matchId: "r16-6", slot: "B" },
  "r32-15": { matchId: "r16-7", slot: "A" },
  "r32-14": { matchId: "r16-7", slot: "B" },
  "r32-13": { matchId: "r16-8", slot: "A" },
  "r32-16": { matchId: "r16-8", slot: "B" },
}

export function nextSlots(matchId: string): { winnerTo: Slot | null; loserTo: Slot | null } {
  if (R32_TO_R16[matchId]) {
    return { winnerTo: R32_TO_R16[matchId], loserTo: null };
  }
  let m = matchId.match(/^r16-(\d+)$/);
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
