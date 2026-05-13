"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { requireBolaoAccess } from "@/lib/access";
import { db } from "@/db";
import { bolaoMatchState, matches, teams } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { nextSlots } from "@/lib/bracket";

type StatePatch = Partial<{
  teamA: string | null;
  teamB: string | null;
  resultA: number | null;
  resultB: number | null;
  winner: "A" | "B" | null;
}>;

async function upsertState(bolaoId: string, matchId: string, patch: StatePatch) {
  await db
    .insert(bolaoMatchState)
    .values({ bolaoId, matchId, ...patch })
    .onConflictDoUpdate({
      target: [bolaoMatchState.bolaoId, bolaoMatchState.matchId],
      set: { ...patch, updatedAt: new Date() },
    });
}

/** Get effective teamA/teamB for a match in this bolão (state override → template). */
async function effectiveTeams(bolaoId: string, matchId: string) {
  const [row] = await db
    .select({
      tplA: matches.teamA,
      tplB: matches.teamB,
      stA: bolaoMatchState.teamA,
      stB: bolaoMatchState.teamB,
    })
    .from(matches)
    .leftJoin(
      bolaoMatchState,
      sql`${bolaoMatchState.matchId} = ${matches.id} and ${bolaoMatchState.bolaoId} = ${bolaoId}`,
    )
    .where(eq(matches.id, matchId));
  if (!row) return null;
  return { teamA: row.stA ?? row.tplA, teamB: row.stB ?? row.tplB };
}

async function propagateBracket(
  bolaoId: string,
  matchId: string,
  winnerTeam: string,
  loserTeam: string,
) {
  const { winnerTo, loserTo } = nextSlots(matchId);

  if (winnerTo) {
    const patch: StatePatch = winnerTo.slot === "A" ? { teamA: winnerTeam } : { teamB: winnerTeam };
    await upsertState(bolaoId, winnerTo.matchId, patch);
  }
  if (loserTo) {
    const patch: StatePatch = loserTo.slot === "A" ? { teamA: loserTeam } : { teamB: loserTeam };
    await upsertState(bolaoId, loserTo.matchId, patch);
  }
}

export async function saveMatch(formData: FormData) {
  const { userId } = await requireAuth();
  const bolaoId = String(formData.get("bolaoId") ?? "");
  const matchId = String(formData.get("matchId") ?? "");
  const rawA = formData.get("resultA");
  const rawB = formData.get("resultB");
  const rawWinner = String(formData.get("winner") ?? "").toUpperCase();
  const rawTeamA = String(formData.get("teamA") ?? "");
  const rawTeamB = String(formData.get("teamB") ?? "");

  await requireBolaoAccess({ userId, bolaoId, adminOnly: true });

  const match = await db.query.matches.findFirst({ where: eq(matches.id, matchId) });
  if (!match) return { error: "Jogo não encontrado." } as const;

  const isKO = match.stage !== "group";

  // Update team slots (KO only — group teams come from template)
  const teamPatch: StatePatch = {};
  if (isKO) {
    const valid = new Set((await db.select({ code: teams.code }).from(teams)).map((t) => t.code));
    teamPatch.teamA = rawTeamA && valid.has(rawTeamA) ? rawTeamA : null;
    teamPatch.teamB = rawTeamB && valid.has(rawTeamB) ? rawTeamB : null;
  }

  // Clear result
  if (rawA === "" || rawA == null || rawB === "" || rawB == null) {
    await upsertState(bolaoId, matchId, { ...teamPatch, resultA: null, resultB: null, winner: null });
    revalidatePath(`/bolao/${bolaoId}`, "layout");
    return { ok: true } as const;
  }

  const a = Number(rawA);
  const b = Number(rawB);
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a > 50 || b > 50) {
    return { error: "Placar inválido (0-50)." } as const;
  }

  let winner: "A" | "B" | null = null;
  if (isKO) {
    if (a > b) winner = "A";
    else if (b > a) winner = "B";
    else {
      // Empate em KO → decidido nos pênaltis. Admin precisa marcar vencedor.
      if (rawWinner !== "A" && rawWinner !== "B") {
        return { error: "Empate em mata-mata: indique o vencedor dos pênaltis." } as const;
      }
      winner = rawWinner;
    }
  }

  await upsertState(bolaoId, matchId, { ...teamPatch, resultA: a, resultB: b, winner });

  // Propagation (KO only, requires both teams known)
  if (isKO && winner) {
    const eff = await effectiveTeams(bolaoId, matchId);
    if (eff?.teamA && eff?.teamB) {
      const winnerTeam = winner === "A" ? eff.teamA : eff.teamB;
      const loserTeam = winner === "A" ? eff.teamB : eff.teamA;
      await propagateBracket(bolaoId, matchId, winnerTeam, loserTeam);
    }
  }

  revalidatePath(`/bolao/${bolaoId}`, "layout");
  return { ok: true } as const;
}
