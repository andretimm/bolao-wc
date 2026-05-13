import { db } from "@/db";
import { matches, bolaoMatchState, matchOfficialResult } from "@/db/schema";
import { asc } from "drizzle-orm";
import { sql } from "drizzle-orm";

export type EffectiveMatch = {
  id: string;
  stage: "group" | "r32" | "r16" | "qf" | "sf" | "tp" | "final";
  round: string;
  groupId: string | null;
  kickoffAt: Date;
  venue: string | null;
  teamA: string | null;
  teamB: string | null;
  resultA: number | null;
  resultB: number | null;
  winner: "A" | "B" | null;
};

/** Carrega todos jogos com estado efetivo.
   Prioridade times: bolaoMatchState → matchOfficialResult → matches (template).
   Prioridade resultado: bolaoMatchState → matchOfficialResult. */
export async function getEffectiveMatches(bolaoId: string): Promise<EffectiveMatch[]> {
  const rows = await db
    .select({
      id: matches.id,
      stage: matches.stage,
      round: matches.round,
      groupId: matches.groupId,
      kickoffAt: matches.kickoffAt,
      venue: matches.venue,
      tplA: matches.teamA,
      tplB: matches.teamB,
      stA: bolaoMatchState.teamA,
      stB: bolaoMatchState.teamB,
      stResA: bolaoMatchState.resultA,
      stResB: bolaoMatchState.resultB,
      stWinner: bolaoMatchState.winner,
      offA: matchOfficialResult.teamA,
      offB: matchOfficialResult.teamB,
      offResA: matchOfficialResult.resultA,
      offResB: matchOfficialResult.resultB,
      offWinner: matchOfficialResult.winner,
    })
    .from(matches)
    .leftJoin(
      bolaoMatchState,
      sql`${bolaoMatchState.matchId} = ${matches.id} and ${bolaoMatchState.bolaoId} = ${bolaoId}`,
    )
    .leftJoin(matchOfficialResult, sql`${matchOfficialResult.matchId} = ${matches.id}`)
    .orderBy(asc(matches.kickoffAt));

  return rows.map((r) => ({
    id: r.id,
    stage: r.stage,
    round: r.round,
    groupId: r.groupId,
    kickoffAt: r.kickoffAt,
    venue: r.venue,
    teamA: r.stA ?? r.offA ?? r.tplA,
    teamB: r.stB ?? r.offB ?? r.tplB,
    resultA: r.stResA ?? r.offResA,
    resultB: r.stResB ?? r.offResB,
    winner: r.stWinner ?? r.offWinner,
  }));
}

export function pointsForPrediction(
  pred: { scoreA: number; scoreB: number } | null,
  res: { resultA: number | null; resultB: number | null },
): number {
  if (!pred || res.resultA == null || res.resultB == null) return 0;
  if (pred.scoreA === res.resultA && pred.scoreB === res.resultB) return 10;
  if (Math.sign(pred.scoreA - pred.scoreB) === Math.sign(res.resultA - res.resultB)) return 5;
  return 0;
}
