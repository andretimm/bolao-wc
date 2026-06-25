# Auto Bracket Propagation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-fill KO match team slots in `bolao_match_state` whenever group or KO results are saved, using FIFA 2026 bracket rules.

**Architecture:** Two new lib files — `bracket-rules.ts` (static FIFA 2026 bracket + 3rd-place table) and `propagate-bracket.ts` (full propagation orchestrator). The existing `computeStandings` in `standings.ts` and `nextSlots` in `bracket.ts` are reused. Integration points: admin `saveMatch` action and the cron sync route.

**Tech Stack:** TypeScript, Drizzle ORM, Neon/Postgres. No schema changes.

## Global Constraints

- No schema migrations. Writes go to existing `bolao_match_state(bolaoId, matchId, teamA, teamB)`.
- Reuse `computeStandings()` from `src/lib/standings.ts` — do NOT reimplement standings logic.
- Reuse `nextSlots()` from `src/lib/bracket.ts` — do NOT reimplement KO-to-KO routing.
- `propagateBracket` must never throw. Catch all errors, log, and return without blocking the caller.
- Only write `teamA`/`teamB` — never touch `resultA`, `resultB`, `winner` in this feature.
- Idempotent: running twice with the same data must produce the same result.
- No test framework in project — verify with `npm run build` and `npm run lint`.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/bracket-rules.ts` | **Create** | FIFA 2026 bracket constants: r32 slot sources + 3rd-place distribution table |
| `src/lib/propagate-bracket.ts` | **Create** | Full propagation: group→r32 and KO→next-KO |
| `src/app/(app)/bolao/[id]/admin/actions.ts` | **Modify** | Replace local `propagateBracket` call with lib version |
| `src/app/api/cron/sync-results/route.ts` | **Modify** | Call `propagateBracket` for all bolões after batch upsert |

---

## Task 1: FIFA 2026 Bracket Constants (`src/lib/bracket-rules.ts`)

**Files:**
- Create: `src/lib/bracket-rules.ts`

**Interfaces:**
- Produces:
  - `SlotSource` type
  - `BracketSlot` type
  - `BRACKET: BracketSlot[]` — 16 r32 entries (group→r32 mapping)
  - `THIRD_PLACE_TABLE: Record<string, ThirdSlot[]>` — 3rd-place distribution

- [ ] **Step 1: Create the file with types and bracket constants**

> **IMPORTANT — FIFA 2026 Official Bracket Required:**
> The r32 slot-to-group-position mapping below is a PLACEHOLDER following the likely structure
> (groups paired A-B, C-D, etc.). Verify and replace with the official FIFA 2026 bracket
> published at https://www.fifa.com/fifaplus/en/articles/2026-fifa-world-cup-format
> and the draw results. The KO-to-KO routing (r32→r16, r16→qf, etc.) is already encoded
> in `src/lib/bracket.ts::nextSlots` and does NOT need to be repeated here.

```typescript
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
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors in `bracket-rules.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/bracket-rules.ts
git commit -m "feat: add FIFA 2026 bracket constants and 3rd-place table structure"
```

---

## Task 2: Propagation Orchestrator (`src/lib/propagate-bracket.ts`)

**Files:**
- Create: `src/lib/propagate-bracket.ts`

**Interfaces:**
- Consumes:
  - `computeStandings(teams: string[], gameSet: GroupMatch[]): GroupRow[]` from `src/lib/standings.ts`
  - `nextSlots(matchId: string): { winnerTo: Slot|null; loserTo: Slot|null }` from `src/lib/bracket.ts`
  - `getEffectiveMatches(bolaoId: string): Promise<EffectiveMatch[]>` from `src/lib/match-state.ts`
  - `R32_BRACKET`, `THIRD_PLACE_TABLE` from `src/lib/bracket-rules.ts`
  - `db`, `bolaoMatchState`, `groupTeams` from DB layer
- Produces:
  - `export async function propagateBracket(bolaoId: string): Promise<void>`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/propagate-bracket.ts
import { db } from "@/db";
import { bolaoMatchState, groupTeams } from "@/db/schema";
import { sql } from "drizzle-orm";
import { getEffectiveMatches } from "@/lib/match-state";
import { computeStandings } from "@/lib/standings";
import { nextSlots } from "@/lib/bracket";
import { R32_BRACKET, THIRD_PLACE_TABLE, type SlotSource } from "@/lib/bracket-rules";

type TeamSlot = { matchId: string; teamA: string | null; teamB: string | null }

async function upsertTeamSlot(bolaoId: string, matchId: string, teamA: string | null, teamB: string | null) {
  if (teamA == null && teamB == null) return;
  const patch: Record<string, unknown> = {};
  if (teamA != null) patch.teamA = teamA;
  if (teamB != null) patch.teamB = teamB;
  await db
    .insert(bolaoMatchState)
    .values({ bolaoId, matchId, ...patch })
    .onConflictDoUpdate({
      target: [bolaoMatchState.bolaoId, bolaoMatchState.matchId],
      set: { ...patch, updatedAt: new Date() },
    });
}

export async function propagateBracket(bolaoId: string): Promise<void> {
  try {
    // 1. Load effective match data and group compositions
    const [effective, allGroupTeams] = await Promise.all([
      getEffectiveMatches(bolaoId),
      db.select().from(groupTeams),
    ]);

    const matchById = new Map(effective.map((m) => [m.id, m]));

    // Group teams: groupId → [teamCode]
    const groupMap = new Map<string, string[]>();
    for (const gt of allGroupTeams) {
      const arr = groupMap.get(gt.groupId) ?? [];
      arr.push(gt.teamCode);
      groupMap.set(gt.groupId, arr);
    }

    // 2. Compute standings for each group
    // GroupRow has: team, Pts, GD, GF
    const groupStandings = new Map<string, string[]>(); // groupId → [1st, 2nd, 3rd, 4th] team codes
    for (const [groupId, teams] of groupMap) {
      const groupMatches = effective.filter(
        (m) => m.stage === "group" && m.groupId === groupId,
      );
      const standings = computeStandings(teams, groupMatches);
      groupStandings.set(groupId, standings.map((s) => s.team));
    }

    // 3. Select 8 best 3rd-place teams
    type Third = { group: string; team: string; pts: number; gd: number; gf: number }
    const thirds: Third[] = [];
    for (const [groupId, ranked] of groupStandings) {
      if (ranked.length < 3) continue;
      const third = ranked[2];
      const groupMatches = effective.filter(
        (m) => m.stage === "group" && m.groupId === groupId,
      );
      const standings = computeStandings(groupMap.get(groupId)!, groupMatches);
      const row = standings.find((s) => s.team === third);
      if (!row) continue;
      thirds.push({ group: groupId, team: third, pts: row.Pts, gd: row.GD, gf: row.GF });
    }
    // Sort by pts → gd → gf → group (deterministic tiebreaker)
    thirds.sort(
      (a, b) =>
        b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.group.localeCompare(b.group),
    );
    const best8 = thirds.slice(0, 8);
    const best8Groups = best8.map((t) => t.group).sort().join("");
    const best3rdByGroup = new Map(best8.map((t) => [t.group, t.team]));

    // 4. Resolve 3rd-place slots from table
    const thirdSlots = THIRD_PLACE_TABLE[best8Groups];
    if (!thirdSlots && best8.length === 8) {
      console.warn(`[propagateBracket] No THIRD_PLACE_TABLE entry for "${best8Groups}". Skipping 3rd-place slots.`);
    }
    const thirdSlotMap = new Map<string, Map<"A" | "B", string>>(); // matchId → slot → team
    if (thirdSlots) {
      for (const ts of thirdSlots) {
        const team = best3rdByGroup.get(ts.group);
        if (!team) continue;
        let slotMap = thirdSlotMap.get(ts.matchId);
        if (!slotMap) { slotMap = new Map(); thirdSlotMap.set(ts.matchId, slotMap); }
        slotMap.set(ts.slot, team);
      }
    }

    // Helper: resolve a SlotSource to a team code (or null if not yet determined)
    function resolve(src: SlotSource): string | null {
      if (src.kind === "group-1") return groupStandings.get(src.group)?.[0] ?? null;
      if (src.kind === "group-2") return groupStandings.get(src.group)?.[1] ?? null;
      if (src.kind === "group-3") return groupStandings.get(src.group)?.[2] ?? null;
      if (src.kind === "match-winner") {
        const m = matchById.get(src.matchId);
        if (!m || m.resultA == null || m.resultB == null) return null;
        const winner = m.winner ?? (m.resultA > m.resultB ? "A" : m.resultB > m.resultA ? "B" : null);
        if (!winner) return null;
        return winner === "A" ? m.teamA : m.teamB;
      }
      return null;
    }

    // 5. Walk R32_BRACKET: resolve each slot, upsert if resolved
    for (const slot of R32_BRACKET) {
      const thirdOverrides = thirdSlotMap.get(slot.matchId);
      const teamA = thirdOverrides?.get("A") ?? resolve(slot.slotA);
      const teamB = thirdOverrides?.get("B") ?? resolve(slot.slotB);
      if (teamA != null || teamB != null) {
        await upsertTeamSlot(bolaoId, slot.matchId, teamA, teamB);
      }
    }

    // 6. KO-to-KO propagation: for each KO match with a result, fill the next slot
    const koMatches = effective.filter((m) => m.stage !== "group");
    for (const m of koMatches) {
      if (m.resultA == null || m.resultB == null) continue;
      const winner = m.winner ?? (m.resultA > m.resultB ? "A" : m.resultB > m.resultA ? "B" : null);
      if (!winner) continue;
      const winnerTeam = winner === "A" ? m.teamA : m.teamB;
      const loserTeam = winner === "A" ? m.teamB : m.teamA;
      if (!winnerTeam || !loserTeam) continue;

      const { winnerTo, loserTo } = nextSlots(m.id);
      if (winnerTo) {
        await upsertTeamSlot(
          bolaoId,
          winnerTo.matchId,
          winnerTo.slot === "A" ? winnerTeam : null,
          winnerTo.slot === "B" ? winnerTeam : null,
        );
      }
      if (loserTo) {
        await upsertTeamSlot(
          bolaoId,
          loserTo.matchId,
          loserTo.slot === "A" ? loserTeam : null,
          loserTo.slot === "B" ? loserTeam : null,
        );
      }
    }
  } catch (err) {
    console.error("[propagateBracket] Error:", err);
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: zero TypeScript errors in `propagate-bracket.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/propagate-bracket.ts
git commit -m "feat: implement full bracket propagation (group→r32 + KO chain)"
```

---

## Task 3: Admin Integration (`src/app/(app)/bolao/[id]/admin/actions.ts`)

**Files:**
- Modify: `src/app/(app)/bolao/[id]/admin/actions.ts:48-64` (remove local `propagateBracket`), `:117-127` (update call site)

**Interfaces:**
- Consumes: `propagateBracket(bolaoId: string): Promise<void>` from `src/lib/propagate-bracket.ts`

- [ ] **Step 1: Replace local propagateBracket with lib import**

At the top of `src/app/(app)/bolao/[id]/admin/actions.ts`, add the import:

```typescript
import { propagateBracket } from "@/lib/propagate-bracket";
```

Remove the local `propagateBracket` function (lines 48–64, the one that calls `nextSlots` directly).

Also remove the unused `nextSlots` import line:
```typescript
import { nextSlots } from "@/lib/bracket";
```
(only if no other code in the file uses `nextSlots` after this change — check first).

- [ ] **Step 2: Update the call site in `saveMatch`**

Find the block at the end of `saveMatch` that currently reads:
```typescript
  // Propagation (KO only, requires both teams known)
  if (isKO && winner) {
    const eff = await effectiveTeams(bolaoId, matchId);
    if (eff?.teamA && eff?.teamB) {
      const winnerTeam = winner === "A" ? eff.teamA : eff.teamB;
      const loserTeam = winner === "A" ? eff.teamB : eff.teamA;
      await propagateBracket(bolaoId, matchId, winnerTeam, loserTeam);
    }
  }
```

Replace it with:
```typescript
  // Propagate bracket (group standings → r32, KO results → next match)
  await propagateBracket(bolaoId);
```

Also remove the now-unused `effectiveTeams` helper function if nothing else calls it.

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/bolao/\[id\]/admin/actions.ts
git commit -m "feat: call lib propagateBracket from admin saveMatch action"
```

---

## Task 4: Cron Sync Integration (`src/app/api/cron/sync-results/route.ts`)

**Files:**
- Modify: `src/app/api/cron/sync-results/route.ts`

**Interfaces:**
- Consumes: `propagateBracket(bolaoId: string): Promise<void>` from `src/lib/propagate-bracket.ts`
- Consumes: `boloes` table from `src/db/schema`

- [ ] **Step 1: Add import and load all bolão IDs at start of `handle`**

Add at the top of `route.ts`:
```typescript
import { propagateBracket } from "@/lib/propagate-bracket";
import { boloes } from "@/db/schema";
```

Inside `handle`, after the existing `const localMatches = await db.select().from(matches);` line, add:
```typescript
  const allBoloes = await db.select({ id: boloes.id }).from(boloes);
```

- [ ] **Step 2: Call propagateBracket after the sync loop**

After the closing `}` of the `for (const fd of fdMatches)` loop and before the `return NextResponse.json(...)`, add:

```typescript
  // Propagate bracket for every bolão now that official results are updated
  await Promise.all(allBoloes.map((b) => propagateBracket(b.id)));
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/sync-results/route.ts
git commit -m "feat: propagate bracket for all bolões after cron sync"
```

---

## Task 5: Populate Official FIFA 2026 Bracket Data

This task is data entry, not code. It must be done before the feature is useful in production.

- [ ] **Step 1: Look up the official FIFA 2026 R32 bracket**

Source: https://www.fifa.com/fifaplus/en/articles/2026-fifa-world-cup-format (or FIFA official press release for the R32 bracket draw).

Find which group position goes into which r32 slot. Each of the 16 r32 matches has a specific pair (e.g., `r32-1: 1A vs 2B`). Update `R32_BRACKET` in `src/lib/bracket-rules.ts` accordingly.

- [ ] **Step 2: Look up and encode the THIRD_PLACE_TABLE**

Source: FIFA 2026 World Cup Regulations, the annex that defines 3rd-place bracket allocation.

This table has C(12,8) = 495 entries. Each entry maps a sorted string of 8 group letters (e.g., `"ABCDEFGH"`) to a list of `{ matchId, slot, group }` assignments.

Replace the placeholder entries in `THIRD_PLACE_TABLE` with the complete official table.

- [ ] **Step 3: Verify bracket sanity**

After updating, run a manual check via the app: enter group stage results for all 12 groups in the admin panel, then check the r32 page to confirm the correct teams appear.

- [ ] **Step 4: Commit**

```bash
git add src/lib/bracket-rules.ts
git commit -m "feat: populate official FIFA 2026 bracket and 3rd-place table"
```

---

## Verification Checklist

After all tasks:

1. `npm run build` passes with zero errors
2. In the test bolão, enter all 48 group stage results → r32 teams auto-fill
3. Enter all 16 r32 results → r16 teams auto-fill
4. Enter r16 results → qf auto-fills, and so on through to final
5. Running admin save twice (same data) produces no diff in `bolao_match_state`
6. Cron sync endpoint (`POST /api/cron/sync-results`) with a valid `CRON_SECRET` triggers propagation without errors
