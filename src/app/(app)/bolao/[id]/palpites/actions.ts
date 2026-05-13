"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { requireBolaoAccess } from "@/lib/access";
import { db } from "@/db";
import { bolaoMatchState, matches, predictions } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
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
    })
    .from(matches)
    .leftJoin(
      bolaoMatchState,
      sql`${bolaoMatchState.matchId} = ${matches.id} and ${bolaoMatchState.bolaoId} = ${bolaoId}`,
    )
    .where(eq(matches.id, matchId));

  if (!row) return { error: "Jogo não encontrado." } as const;

  const teamA = row.stA ?? row.tplA;
  const teamB = row.stB ?? row.tplB;
  if (!teamA || !teamB) return { error: "Times do jogo ainda não definidos." } as const;
  if (row.resultA != null && row.resultB != null) {
    return { error: "Resultado já publicado pelo admin." } as const;
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
