import { requireAuth } from "@/lib/auth";
import { requireBolaoAccess } from "@/lib/access";
import { db } from "@/db";
import { championPicks, predictions, teams } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getEffectiveMatches, pointsForPrediction } from "@/lib/match-state";
import { getChampionWindow } from "@/lib/champion";
import type { TeamLite } from "@/components/flag";
import { PalpitesList } from "./list";
import { ChampionPickModal } from "./champion-modal";
import { isPredictionLocked } from "@/lib/prediction-lock";
import { roundFilterKey } from "@/lib/round";

export const dynamic = "force-dynamic";

export default async function PalpitesPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await requireAuth();
  const { id: bolaoId } = await params;
  await requireBolaoAccess({ userId, bolaoId });

  const [effective, allTeams, myPreds, myChampionPick, championWindow] = await Promise.all([
    getEffectiveMatches(bolaoId),
    db.select().from(teams),
    db
      .select()
      .from(predictions)
      .where(and(eq(predictions.bolaoId, bolaoId), eq(predictions.userId, userId))),
    db.query.championPicks.findFirst({
      where: and(eq(championPicks.bolaoId, bolaoId), eq(championPicks.userId, userId)),
    }),
    getChampionWindow(bolaoId),
  ]);

  const teamMap = new Map<string, TeamLite>(allTeams.map((t) => [t.code, t]));
  const predMap = new Map(myPreds.map((p) => [p.matchId, p]));

  const ready = effective.filter((m) => m.teamA && m.teamB);

  const items = ready.map((m) => {
    const pred = predMap.get(m.id);
    const hasResult = m.resultA != null && m.resultB != null;
    const locked = hasResult || isPredictionLocked(m.kickoffAt, Date.now());
    const earned = pointsForPrediction(
      pred ? { scoreA: pred.scoreA, scoreB: pred.scoreB } : null,
      { resultA: m.resultA, resultB: m.resultB },
    );

    return {
      matchId: m.id,
      teamA: m.teamA ? teamMap.get(m.teamA) ?? null : null,
      teamB: m.teamB ? teamMap.get(m.teamB) ?? null : null,
      kickoffAt: m.kickoffAt.toISOString(),
      round: m.round,
      roundKey: roundFilterKey(m.round),
      locked,
      hasResult,
      resultA: m.resultA,
      resultB: m.resultB,
      initialScoreA: pred?.scoreA ?? null,
      initialScoreB: pred?.scoreB ?? null,
      earned,
      hasPrediction: pred != null,
    };
  });

  const rounds = Array.from(new Set(items.map((i) => i.roundKey)));
  const showPicker = championWindow.opened && !championWindow.locked && !myChampionPick;
  const champTeams = championWindow.teams
    .map((code) => teamMap.get(code))
    .filter((t): t is TeamLite => !!t);

  return (
    <div>
      <h2 style={{ margin: "0 0 14px", fontSize: 18, letterSpacing: "-0.015em" }}>Seus palpites</h2>
      <p className="page-sub" style={{ marginTop: 0, marginBottom: 18 }}>
        Placar exato = <b style={{ color: "var(--accent)" }}>+10 pts</b>. Só o vencedor ={" "}
        <b style={{ color: "var(--accent)" }}>+5 pts</b>. Palpite bloqueia 1h antes do jogo.
        <br />
        Quando o mata-mata abrir, escolha o campeão entre os 32 times — acertar vale{" "}
        <b style={{ color: "var(--accent)" }}>+50 pts extras</b>. Escolha única, sem troca.
      </p>

      {myChampionPick && (
        <div
          className="tag accent"
          style={{ marginBottom: 18, display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          Seu campeão: {teamMap.get(myChampionPick.teamCode)?.name ?? myChampionPick.teamCode}
        </div>
      )}
      {championWindow.opened && championWindow.locked && !myChampionPick && (
        <div className="tag danger" style={{ marginBottom: 18 }}>
          Você não escolheu a tempo — sem chance de bônus de campeão desta vez.
        </div>
      )}

      {items.length === 0 ? (
        <div className="card">
          <div className="empty">Nenhum jogo com times definidos ainda.</div>
        </div>
      ) : (
        <PalpitesList bolaoId={bolaoId} items={items} rounds={rounds} />
      )}

      {showPicker && <ChampionPickModal bolaoId={bolaoId} teams={champTeams} />}
    </div>
  );
}
