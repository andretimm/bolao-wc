import { db } from "@/db";
import { matches, bolaoMatchState } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
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

/** Carrega todos os jogos com estado per-bolão (team override + resultado).
   Para grupo: teamA/teamB vêm de matches; para KO: vêm de state (fallback null). */
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
      resA: bolaoMatchState.resultA,
      resB: bolaoMatchState.resultB,
      winner: bolaoMatchState.winner,
    })
    .from(matches)
    .leftJoin(
      bolaoMatchState,
      sql`${bolaoMatchState.matchId} = ${matches.id} and ${bolaoMatchState.bolaoId} = ${bolaoId}`,
    )
    .orderBy(asc(matches.kickoffAt));

  return rows.map((r) => ({
    id: r.id,
    stage: r.stage,
    round: r.round,
    groupId: r.groupId,
    kickoffAt: r.kickoffAt,
    venue: r.venue,
    teamA: r.stA ?? r.tplA,
    teamB: r.stB ?? r.tplB,
    resultA: r.resA,
    resultB: r.resB,
    winner: r.winner,
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
