"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { requireBolaoAccess } from "@/lib/access";
import { db } from "@/db";
import { bolaoMatchState, matches, matchOfficialResult, predictions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { isPredictionLocked } from "@/lib/prediction-lock";

export async function savePrediction(formData: FormData) {
  const { userId } = await requireAuth();

  const bolaoId = String(formData.get("bolaoId") ?? "");
  const matchId = String(formData.get("matchId") ?? "");
  const scoreA = Number(formData.get("scoreA"));
  const scoreB = Number(formData.get("scoreB"));

  if (!bolaoId || !matchId) return { error: "Dados inválidos." } as const;
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB)) {
    return { error: "Placar deve ser inteiro." } as const;
  }
  if (scoreA < 0 || scoreB < 0 || scoreA > 20 || scoreB > 20) {
    return { error: "Placar fora do intervalo 0-20." } as const;
  }

  await requireBolaoAccess({ userId, bolaoId });

  const [row] = await db
    .select({
      kickoffAt: matches.kickoffAt,
      tplA: matches.teamA,
      tplB: matches.teamB,
      stA: bolaoMatchState.teamA,
      stB: bolaoMatchState.teamB,
      resultA: bolaoMatchState.resultA,
      resultB: bolaoMatchState.resultB,
      offA: matchOfficialResult.teamA,
      offB: matchOfficialResult.teamB,
      offResA: matchOfficialResult.resultA,
      offResB: matchOfficialResult.resultB,
    })
    .from(matches)
    .leftJoin(
      bolaoMatchState,
      sql`${bolaoMatchState.matchId} = ${matches.id} and ${bolaoMatchState.bolaoId} = ${bolaoId}`,
    )
    .leftJoin(matchOfficialResult, eq(matchOfficialResult.matchId, matches.id))
    .where(eq(matches.id, matchId));

  if (!row) return { error: "Jogo não encontrado." } as const;

  const teamA = row.stA ?? row.offA ?? row.tplA;
  const teamB = row.stB ?? row.offB ?? row.tplB;
  if (!teamA || !teamB) return { error: "Times do jogo ainda não definidos." } as const;
  const effResA = row.resultA ?? row.offResA;
  const effResB = row.resultB ?? row.offResB;
  if (effResA != null && effResB != null) {
    return { error: "Resultado já publicado." } as const;
  }
  if (isPredictionLocked(row.kickoffAt)) {
    return { error: "Palpites bloqueados 24h antes do jogo." } as const;
  }

  await db
    .insert(predictions)
    .values({ bolaoId, userId, matchId, scoreA, scoreB })
    .onConflictDoUpdate({
      target: [predictions.bolaoId, predictions.userId, predictions.matchId],
      set: { scoreA, scoreB, updatedAt: new Date() },
    });

  revalidatePath(`/bolao/${bolaoId}/palpites`);
  return { ok: true } as const;
}
