"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { requireBolaoAccess } from "@/lib/access";
import { db } from "@/db";
import { bolaoMatchState, matches, teams } from "@/db/schema";
import { eq } from "drizzle-orm";
import { propagateBracket } from "@/lib/propagate-bracket";

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

  // Propagate bracket (group standings → r32, KO results → next match)
  await propagateBracket(bolaoId);

  revalidatePath(`/bolao/${bolaoId}`, "layout");
  return { ok: true } as const;
}
