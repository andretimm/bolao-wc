// src/lib/propagate-bracket.ts
import { db } from "@/db";
import { bolaoMatchState, groupTeams } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getEffectiveMatches } from "@/lib/match-state";
import { computeStandings } from "@/lib/standings";
import { nextSlots } from "@/lib/bracket";
import { R32_BRACKET, THIRD_PLACE_TABLE, type SlotSource } from "@/lib/bracket-rules";

export async function propagateBracket(bolaoId: string): Promise<void> {
  try {
    // 1. Load effective match data and group compositions
    const [effective, allGroupTeams] = await Promise.all([
      getEffectiveMatches(bolaoId),
      db.select().from(groupTeams),
    ]);

    const matchById = new Map(effective.map((m) => [m.id, m]));

    // Load current KO slot values — needed to detect manual overrides vs stale auto-fills
    const koMatchIds = effective.filter((m) => m.stage !== "group").map((m) => m.id);
    const currentSlots = new Map<string, { teamA: string | null; teamB: string | null }>();
    if (koMatchIds.length > 0) {
      const rows = await db
        .select({ matchId: bolaoMatchState.matchId, teamA: bolaoMatchState.teamA, teamB: bolaoMatchState.teamB })
        .from(bolaoMatchState)
        .where(and(eq(bolaoMatchState.bolaoId, bolaoId), inArray(bolaoMatchState.matchId, koMatchIds)));
      for (const r of rows) currentSlots.set(r.matchId, { teamA: r.teamA, teamB: r.teamB });
    }

    // Group teams: groupId → [teamCode]
    const groupMap = new Map<string, string[]>();
    for (const gt of allGroupTeams) {
      const arr = groupMap.get(gt.groupId) ?? [];
      arr.push(gt.teamCode);
      groupMap.set(gt.groupId, arr);
    }

    // Returns true if `team` could have been auto-derived from `src`.
    // Used to distinguish stale auto-fill (safe to overwrite) from manual admin override (preserve).
    function isAutoFillCandidate(team: string, src: SlotSource): boolean {
      if (src.kind === "group-1" || src.kind === "group-2" || src.kind === "group-3") {
        return (groupMap.get(src.group) ?? []).includes(team);
      }
      if (src.kind === "match-winner") {
        const m = matchById.get(src.matchId);
        return m?.teamA === team || m?.teamB === team;
      }
      return false;
    }

    // Write `newTeam` into `slot` of `matchId` only when safe:
    //   - current value is null (empty → write)
    //   - current value equals newTeam (idempotent → skip DB write)
    //   - current value was auto-filled from this source (stale → overwrite)
    // Skips when current value is a manual admin override (not a candidate from `src`).
    async function conditionalUpsert(
      matchId: string,
      slot: "A" | "B",
      newTeam: string | null,
      src: SlotSource,
    ) {
      const current = currentSlots.get(matchId);
      const currentTeam = slot === "A" ? (current?.teamA ?? null) : (current?.teamB ?? null);
      if (currentTeam === newTeam) return; // already correct (or both null)
      if (currentTeam != null && !isAutoFillCandidate(currentTeam, src)) return; // manual override — preserve
      if (newTeam == null && currentTeam == null) return; // nothing to do
      const patch: Record<string, unknown> = slot === "A" ? { teamA: newTeam } : { teamB: newTeam };
      await db
        .insert(bolaoMatchState)
        .values({ bolaoId, matchId, ...patch })
        .onConflictDoUpdate({
          target: [bolaoMatchState.bolaoId, bolaoMatchState.matchId],
          set: { ...patch, updatedAt: new Date() },
        });
    }

    // 2. Compute standings — only for groups with all matches played (avoids phantom propagation)
    type GroupRows = ReturnType<typeof computeStandings>;
    const groupRows = new Map<string, GroupRows>();
    const groupStandings = new Map<string, string[]>();
    for (const [groupId, teams] of groupMap) {
      const groupMatches = effective.filter((m) => m.stage === "group" && m.groupId === groupId);
      const totalMatches = (teams.length * (teams.length - 1)) / 2; // round-robin
      const completed = groupMatches.filter((m) => m.resultA != null && m.resultB != null);
      if (completed.length < totalMatches) continue; // incomplete group — skip
      const standings = computeStandings(teams, groupMatches);
      groupRows.set(groupId, standings);
      groupStandings.set(groupId, standings.map((s) => s.team));
    }

    // 3. Select 8 best 3rd-place teams from complete groups
    type Third = { group: string; team: string; pts: number; gd: number; gf: number }
    const thirds: Third[] = [];
    for (const [groupId] of groupStandings) {
      const row = groupRows.get(groupId)?.[2];
      if (!row) continue;
      thirds.push({ group: groupId, team: row.team, pts: row.Pts, gd: row.GD, gf: row.GF });
    }
    thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.group.localeCompare(b.group));
    const best8 = thirds.slice(0, 8);
    const best8Groups = best8.map((t) => t.group).sort().join("");
    const best3rdByGroup = new Map(best8.map((t) => [t.group, t.team]));

    // 4. Resolve 3rd-place slots from official table
    const thirdSlots = THIRD_PLACE_TABLE[best8Groups];
    if (!thirdSlots && best8.length === 8) {
      console.warn(`[propagateBracket] No THIRD_PLACE_TABLE entry for "${best8Groups}". Skipping 3rd-place slots.`);
    }
    const thirdSlotMap = new Map<string, Map<"A" | "B", string>>();
    if (thirdSlots) {
      for (const ts of thirdSlots) {
        const team = best3rdByGroup.get(ts.group);
        if (!team) continue;
        let slotMap = thirdSlotMap.get(ts.matchId);
        if (!slotMap) { slotMap = new Map(); thirdSlotMap.set(ts.matchId, slotMap); }
        slotMap.set(ts.slot, team);
      }
    }

    // Helper: resolve a SlotSource to a team code (null if not yet determined)
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

    // 5. Walk R32_BRACKET: conditionally update each group→r32 slot
    for (const slot of R32_BRACKET) {
      const thirdOverrides = thirdSlotMap.get(slot.matchId);
      const teamA = thirdOverrides?.get("A") ?? resolve(slot.slotA);
      const teamB = thirdOverrides?.get("B") ?? resolve(slot.slotB);
      await conditionalUpsert(slot.matchId, "A", teamA, slot.slotA);
      await conditionalUpsert(slot.matchId, "B", teamB, slot.slotB);
    }

    // 6. KO-to-KO propagation: winners/losers fill the next round's slots
    const koMatches = effective.filter((m) => m.stage !== "group");
    for (const m of koMatches) {
      if (m.resultA == null || m.resultB == null) continue;
      const winner = m.winner ?? (m.resultA > m.resultB ? "A" : m.resultB > m.resultA ? "B" : null);
      if (!winner) continue;
      const winnerTeam = winner === "A" ? m.teamA : m.teamB;
      const loserTeam = winner === "A" ? m.teamB : m.teamA;
      if (!winnerTeam || !loserTeam) continue;

      const { winnerTo, loserTo } = nextSlots(m.id);
      const src: SlotSource = { kind: "match-winner", matchId: m.id };
      if (winnerTo) await conditionalUpsert(winnerTo.matchId, winnerTo.slot, winnerTeam, src);
      if (loserTo) await conditionalUpsert(loserTo.matchId, loserTo.slot, loserTeam, src);
    }
  } catch (err) {
    console.error("[propagateBracket] Error:", err);
  }
}
