// src/lib/propagate-bracket.ts
import { db } from "@/db";
import { bolaoMatchState, groupTeams } from "@/db/schema";
import { getEffectiveMatches } from "@/lib/match-state";
import { computeStandings } from "@/lib/standings";
import { nextSlots } from "@/lib/bracket";
import { R32_BRACKET, THIRD_PLACE_TABLE, type SlotSource } from "@/lib/bracket-rules";

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
