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
 * FIFA 2026 official bracket — group-stage → r32 slots.
 * Groups A-L paired as (A,B), (C,D), (E,F), (G,H), (I,J), (K,L).
 * VERIFY against official FIFA 2026 bracket before using in production.
 * r32-N → r16-⌈N/2⌉ (winner slot A if N odd, B if N even) via nextSlots() in bracket.ts.
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
  // r32-13 through r32-16: ENTIRELY PLACEHOLDER — the 8 best 3rd-place teams fill
  // specific slots here, paired against specific group qualifiers (winner or runner-up).
  // BOTH slotA and slotB below are WRONG and must be replaced using the official FIFA
  // 2026 bracket. The actual opponents depend on which groups produce the best 3rds.
  // The propagate-bracket.ts code uses THIRD_PLACE_TABLE to OVERRIDE whichever slot
  // holds a 3rd-place team; the other slot is resolved from whichever group qualifier
  // the official bracket assigns. Replace all four entries in Task 5.
  { matchId: "r32-13", slotA: { kind: "group-3", group: "?" as string }, slotB: { kind: "group-3", group: "?" as string } },
  { matchId: "r32-14", slotA: { kind: "group-3", group: "?" as string }, slotB: { kind: "group-3", group: "?" as string } },
  { matchId: "r32-15", slotA: { kind: "group-3", group: "?" as string }, slotB: { kind: "group-3", group: "?" as string } },
  { matchId: "r32-16", slotA: { kind: "group-3", group: "?" as string }, slotB: { kind: "group-3", group: "?" as string } },
]

/**
 * FIFA 2026 official 3rd-place distribution table.
 * Key: sorted letters of the 8 groups that provided a 3rd-place qualifier, e.g. "ABCDEFGH".
 * Value: which r32 slot each 3rd gets.
 *
 * There are C(12,8) = 495 possible combinations.
 * REPLACE with the complete official FIFA 2026 table before production use.
 * Reference: FIFA World Cup 2026 regulations, Annex on third-place bracket allocation.
 *
 * Format for each entry: { matchId: "r32-N", slot: "A"|"B", group: "X" }
 * means the 3rd-place team from group X goes into slot A (or B) of match r32-N.
 */
export const THIRD_PLACE_TABLE: Record<string, ThirdSlot[]> = {
  // Placeholder — only a few example combinations shown.
  // The full table must be sourced from official FIFA 2026 regulations.
  "ABCDEFGH": [
    { matchId: "r32-13", slot: "A", group: "A" },
    { matchId: "r32-13", slot: "B", group: "B" }, // example — verify
    { matchId: "r32-14", slot: "A", group: "C" },
    { matchId: "r32-14", slot: "B", group: "D" },
    { matchId: "r32-15", slot: "A", group: "E" },
    { matchId: "r32-15", slot: "B", group: "F" },
    { matchId: "r32-16", slot: "A", group: "G" },
    { matchId: "r32-16", slot: "B", group: "H" },
  ],
  // Add remaining 494 combinations from official FIFA source...
}
