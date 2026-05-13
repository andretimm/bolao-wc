import { requireAuth } from "@/lib/auth";
import { requireBolaoAccess } from "@/lib/access";
import { db } from "@/db";
import { predictions, teams } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getEffectiveMatches, pointsForPrediction } from "@/lib/match-state";
import type { TeamLite } from "@/components/flag";
import { PredictionRow } from "./row";
import { isPredictionLocked } from "@/lib/prediction-lock";

export const dynamic = "force-dynamic";

export default async function PalpitesPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await requireAuth();
  const { id: bolaoId } = await params;
  await requireBolaoAccess({ userId, bolaoId });

  const [effective, allTeams, myPreds] = await Promise.all([
    getEffectiveMatches(bolaoId),
    db.select().from(teams),
    db
      .select()
      .from(predictions)
      .where(and(eq(predictions.bolaoId, bolaoId), eq(predictions.userId, userId))),
  ]);

  const teamMap = new Map<string, TeamLite>(allTeams.map((t) => [t.code, t]));
  const predMap = new Map(myPreds.map((p) => [p.matchId, p]));
  const now = Date.now();

  const ready = effective.filter((m) => m.teamA && m.teamB);

  return (
    <div>
      <h2 style={{ margin: "0 0 14px", fontSize: 18, letterSpacing: "-0.015em" }}>Seus palpites</h2>
      <p className="page-sub" style={{ marginTop: 0, marginBottom: 18 }}>
        Placar exato = <b style={{ color: "var(--accent)" }}>+10 pts</b>. Só o vencedor ={" "}
        <b style={{ color: "var(--accent)" }}>+5 pts</b>. Palpite bloqueia 24h antes do jogo.
      </p>

      <div className="card">
        {ready.length === 0 && <div className="empty">Nenhum jogo com times definidos ainda.</div>}
        {ready.map((m) => {
          const pred = predMap.get(m.id);
          const hasResult = m.resultA != null && m.resultB != null;
          const locked = hasResult || isPredictionLocked(m.kickoffAt, now);
          const earned = pointsForPrediction(
            pred ? { scoreA: pred.scoreA, scoreB: pred.scoreB } : null,
            { resultA: m.resultA, resultB: m.resultB },
          );

          return (
            <PredictionRow
              key={m.id}
              bolaoId={bolaoId}
              matchId={m.id}
              teamA={m.teamA ? teamMap.get(m.teamA) ?? null : null}
              teamB={m.teamB ? teamMap.get(m.teamB) ?? null : null}
              kickoffAt={m.kickoffAt.toISOString()}
              round={m.round}
              locked={locked}
              hasResult={hasResult}
              resultA={m.resultA}
              resultB={m.resultB}
              initialScoreA={pred?.scoreA ?? null}
              initialScoreB={pred?.scoreB ?? null}
              earned={earned}
            />
          );
        })}
      </div>
    </div>
  );
}
