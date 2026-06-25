# Auto Bracket Propagation — Design Spec

**Date:** 2026-06-25  
**Status:** Approved

## Context

12 groups (A–L), 4 teams each, 48 teams total. KO stages: r32 (16 matches) → r16 (8) → qf (4) → sf (2) → tp (1) → final (1). KO team slots currently filled manually by admin via `bolao_match_state`. Goal: auto-fill slots when results are saved.

## Requirements

- Reactive: trigger on every result save (admin panel) and on API sync
- Full FIFA 2026 compliance: group winners, runners-up, and 8 best 3rd-place teams
- 3rd-place distribution follows the official FIFA 2026 lookup table
- KO-to-KO propagation: when r32 result is set, auto-fill r16 slot, etc.
- Idempotent: safe to run repeatedly; only writes teamA/teamB, never touches results
- Per-bolão: writes to `bolao_match_state`, not `matchOfficialResult`

## Architecture

### New files

**`src/lib/bracket-rules.ts`** — pure constants, no DB access

```typescript
type SlotSource =
  | { kind: "group-1"; group: string }
  | { kind: "group-2"; group: string }
  | { kind: "group-3"; group: string }   // candidate for best-3rd pool
  | { kind: "match-winner"; matchId: string }

type BracketSlot = { matchId: string; slotA: SlotSource; slotB: SlotSource }

export const BRACKET: BracketSlot[]
// 16 r32 slots + 8 r16 + 4 qf + 2 sf + 1 tp + 1 final
// Encoded from official FIFA 2026 bracket

export const THIRD_PLACE_TABLE: Record<
  string,  // sorted group letters that contributed a 3rd-placer, e.g. "ABCDEFGH"
  Array<{ matchId: string; slot: "A" | "B"; group: string }>
>
// FIFA 2026 official 3rd-place distribution table
// Maps 8-of-12 group combination → which r32 slot each 3rd gets
```

**`src/lib/standings.ts`** — pure computation, no DB access

```typescript
type TeamStanding = {
  teamCode: string
  pts: number
  gd: number   // goal difference
  gf: number   // goals for
}

export function computeGroupStandings(
  teamCodes: string[],
  matches: EffectiveMatch[]   // only matches for this group with results
): TeamStanding[]
// Sort: pts desc → gd desc → gf desc → teamCode asc (tiebreaker)
```

**`src/lib/propagate-bracket.ts`** — main orchestrator

```typescript
export async function propagateBracket(bolaoId: string): Promise<void>
```

Internal flow:
1. Load all `EffectiveMatch` for the bolão + group composition from DB
2. For each group A–L: `computeGroupStandings` → record 1st, 2nd, 3rd
3. Collect all 12 3rd-place finishers → rank by pts/gd/gf → take top 8
4. Sort top-8 group letters alphabetically → look up `THIRD_PLACE_TABLE` → assign to r32 slots
5. Walk `BRACKET` array slot by slot:
   - Resolve each `SlotSource` to a `teamCode | null`
   - `group-1/2/3`: from step 2/4 above
   - `match-winner`: find match in effective data, check winner field
   - If source not yet resolved (no result) → leave slot untouched
6. Upsert resolved slots into `bolao_match_state` (teamA/teamB only)
   - Skip slots where both A and B are still null
   - Never overwrite if admin already set a team manually (only write when slot was null OR matches computed value)

### Integration points

**Admin save** (`src/app/(app)/bolao/[id]/admin/actions.ts`):
```typescript
// after existing upsert into bolao_match_state:
await propagateBracket(bolaoId)
```

**API sync** (wherever `matchOfficialResult` is written — cron/route):
```typescript
// after batch upsert of official results:
for (const bolaoId of allBolaoIds) {
  await propagateBracket(bolaoId)
}
```

## Data model

No schema changes. All writes go to existing `bolao_match_state(bolaoId, matchId, teamA, teamB)`.

## Group standings tiebreakers

Per FIFA rules (simplified for this bolão):
1. Points (win=3, draw=1, loss=0)
2. Goal difference
3. Goals for
4. Team code (alphabetical) — final deterministic tiebreaker

Head-to-head tiebreakers (full FIFA rules) are intentionally omitted for simplicity.

## Error handling

- If `THIRD_PLACE_TABLE` has no entry for the current combination: log warning, skip 3rd-place slots (leave null)
- If a match referenced by `match-winner` has no result yet: skip that slot silently
- `propagateBracket` never throws — wraps in try/catch, logs errors, does not block the result save

## Out of scope

- Head-to-head tiebreaker within groups
- Admin UI to manually override auto-filled KO teams (already possible via existing admin panel)
- Retroactive propagation for existing bolões (can be triggered manually by calling `propagateBracket`)
