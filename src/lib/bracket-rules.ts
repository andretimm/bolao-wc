// src/lib/bracket-rules.ts

export type SlotSource =
  | { kind: "group-1"; group: string }
  | { kind: "group-2"; group: string }
  | { kind: "group-3"; group: string }
  | { kind: "match-winner"; matchId: string }

export type BracketSlot = {
  matchId: string
  slotA: SlotSource
  slotB: SlotSource
}

export type ThirdSlot = {
  matchId: string
  slot: "A" | "B"
  group: string
}

/**
 * FIFA 2026 group→r32 bracket.
 * Groups A-L paired as (A,B),(C,D),(E,F),(G,H),(I,J),(K,L).
 * r32-13..16: both slots are 3rd-place teams — THIRD_PLACE_TABLE overrides both.
 * VERIFY r32-1..12 against official FIFA 2026 bracket before production.
 */
export const R32_BRACKET: BracketSlot[] = [
  { matchId: "r32-1",  slotA: { kind: "group-1", group: "A" }, slotB: { kind: "group-2", group: "B" } },
  { matchId: "r32-2",  slotA: { kind: "group-1", group: "C" }, slotB: { kind: "group-2", group: "D" } },
  { matchId: "r32-3",  slotA: { kind: "group-1", group: "E" }, slotB: { kind: "group-2", group: "F" } },
  { matchId: "r32-4",  slotA: { kind: "group-1", group: "G" }, slotB: { kind: "group-2", group: "H" } },
  { matchId: "r32-5",  slotA: { kind: "group-1", group: "I" }, slotB: { kind: "group-2", group: "J" } },
  { matchId: "r32-6",  slotA: { kind: "group-1", group: "K" }, slotB: { kind: "group-2", group: "L" } },
  { matchId: "r32-7",  slotA: { kind: "group-1", group: "B" }, slotB: { kind: "group-2", group: "A" } },
  { matchId: "r32-8",  slotA: { kind: "group-1", group: "D" }, slotB: { kind: "group-2", group: "C" } },
  { matchId: "r32-9",  slotA: { kind: "group-1", group: "F" }, slotB: { kind: "group-2", group: "E" } },
  { matchId: "r32-10", slotA: { kind: "group-1", group: "H" }, slotB: { kind: "group-2", group: "G" } },
  { matchId: "r32-11", slotA: { kind: "group-1", group: "J" }, slotB: { kind: "group-2", group: "I" } },
  { matchId: "r32-12", slotA: { kind: "group-1", group: "L" }, slotB: { kind: "group-2", group: "K" } },
  // r32-13..16: THIRD_PLACE_TABLE overrides both slots — placeholder sources never resolved
  { matchId: "r32-13", slotA: { kind: "group-3", group: "?" as string }, slotB: { kind: "group-3", group: "?" as string } },
  { matchId: "r32-14", slotA: { kind: "group-3", group: "?" as string }, slotB: { kind: "group-3", group: "?" as string } },
  { matchId: "r32-15", slotA: { kind: "group-3", group: "?" as string }, slotB: { kind: "group-3", group: "?" as string } },
  { matchId: "r32-16", slotA: { kind: "group-3", group: "?" as string }, slotB: { kind: "group-3", group: "?" as string } },
]

// Fixed slot order for 3rd-place distribution
const THIRD_SLOTS: Array<{ matchId: string; slot: "A" | "B" }> = [
  { matchId: "r32-13", slot: "A" },
  { matchId: "r32-13", slot: "B" },
  { matchId: "r32-14", slot: "A" },
  { matchId: "r32-14", slot: "B" },
  { matchId: "r32-15", slot: "A" },
  { matchId: "r32-15", slot: "B" },
  { matchId: "r32-16", slot: "A" },
  { matchId: "r32-16", slot: "B" },
]

function buildThirdPlaceTable(): Record<string, ThirdSlot[]> {
  const groups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"]
  const table: Record<string, ThirdSlot[]> = {}

  function combine(arr: string[], k: number, start = 0): string[][] {
    if (k === 0) return [[]]
    const result: string[][] = []
    for (let i = start; i <= arr.length - k; i++) {
      for (const rest of combine(arr, k - 1, i + 1)) {
        result.push([arr[i], ...rest])
      }
    }
    return result
  }

  // MOCK rule: sorted groups → sorted slots sequentially.
  // REPLACE with official FIFA 2026 distribution table before production.
  for (const combo of combine(groups, 8)) {
    const key = combo.join("") // already sorted by combine()
    table[key] = combo.map((group, i) => ({ ...THIRD_SLOTS[i], group }))
  }

  return table
}

/**
 * FIFA 2026 third-place bracket distribution table.
 * Key: sorted letters of the 8 groups that produced a qualifying 3rd-place team, e.g. "ABCDEFGH".
 * Value: which r32 slot each 3rd gets.
 *
 * MOCK: current rule assigns sorted groups → sorted slots sequentially (all 495 combinations).
 * REPLACE with official FIFA 2026 regulations annex before production.
 */
export const THIRD_PLACE_TABLE: Record<string, ThirdSlot[]> = buildThirdPlaceTable()
