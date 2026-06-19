import { requireAuth } from "@/lib/auth";
import { requireBolaoAccess } from "@/lib/access";
import { db } from "@/db";
import { memberships, predictions, teams } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getEffectiveMatches, pointsForPrediction } from "@/lib/match-state";
import { getUsers } from "@/lib/clerk-users";
import { colorFor } from "@/lib/colors";
import type { TeamLite } from "@/components/flag";
import { championBonus } from "@/lib/scoring";
import { MatchCard, type MatchCardItem } from "./card";

export const dynamic = "force-dynamic";

function relativeTime(from: Date, now: number): string {
  const diffMs = from.getTime() - now;
  const abs = Math.abs(diffMs);
  const minutes = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  if (minutes < 1) return "agora";
  if (minutes < 60) return rtf.format(Math.sign(diffMs) * minutes, "minute");
  if (hours < 24) return rtf.format(Math.sign(diffMs) * hours, "hour");
  return rtf.format(Math.sign(diffMs) * days, "day");
}

export default async function TodosPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await requireAuth();
  const { id: bolaoId } = await params;
  await requireBolaoAccess({ userId, bolaoId });

  const [effective, allTeams, members, allPreds] = await Promise.all([
    getEffectiveMatches(bolaoId),
    db.select().from(teams),
    db.select().from(memberships).where(eq(memberships.bolaoId, bolaoId)),
    db.select().from(predictions).where(eq(predictions.bolaoId, bolaoId)),
  ]);

  const teamMap = new Map<string, TeamLite>(allTeams.map((t) => [t.code, t]));
  const userMap = await getUsers(members.map((m) => m.userId));
  const now = Date.now();

  const predByMatch = new Map<
    string,
    Map<string, { scoreA: number; scoreB: number; updatedAt: Date }>
  >();
  for (const p of allPreds) {
    let inner = predByMatch.get(p.matchId);
    if (!inner) {
      inner = new Map();
      predByMatch.set(p.matchId, inner);
    }
    inner.set(p.userId, { scoreA: p.scoreA, scoreB: p.scoreB, updatedAt: p.updatedAt });
  }

  const ready = effective.filter((m) => m.teamA && m.teamB);

  const items: MatchCardItem[] = ready.map((m) => {
    const hasResult = m.resultA != null && m.resultB != null;
    const predsForMatch = predByMatch.get(m.id) ?? new Map();
    const isFinal = m.stage === "final";

    return {
      matchId: m.id,
      round: m.round,
      kickoffLabel: m.kickoffAt.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
      teamA: m.teamA ? teamMap.get(m.teamA) ?? null : null,
      teamB: m.teamB ? teamMap.get(m.teamB) ?? null : null,
      resultA: m.resultA,
      resultB: m.resultB,
      hasResult,
      isFinal,
      members: members.map((mem) => {
        const u = userMap.get(mem.userId);
        const name = u?.name ?? mem.userId.slice(0, 6);
        const color = u?.color ?? colorFor(mem.userId);
        const init = name
          .split(" ")
          .slice(0, 2)
          .map((s) => s[0])
          .join("")
          .toUpperCase();
        const pred = predsForMatch.get(mem.userId);
        const isMe = mem.userId === userId;

        const earned = pred
          ? pointsForPrediction(
              { scoreA: pred.scoreA, scoreB: pred.scoreB },
              { resultA: m.resultA, resultB: m.resultB },
            )
          : 0;
        const champ = pred
          ? championBonus(pred, { resultA: m.resultA, resultB: m.resultB })
          : 0;
        const total = earned + (isFinal ? champ : 0);

        return {
          userId: mem.userId,
          name,
          init,
          color,
          avatarUrl: u?.avatarUrl ?? null,
          isMe,
          predLabel: pred ? `${pred.scoreA} × ${pred.scoreB}` : "— × —",
          hasPred: !!pred,
          relativeLabel: pred ? relativeTime(pred.updatedAt, now) : "—",
          total,
        };
      }),
    };
  });

  return (
    <div>
      <h2 style={{ margin: "0 0 14px", fontSize: 18, letterSpacing: "-0.015em" }}>
        Palpites de todos
      </h2>
      <p className="page-sub" style={{ marginTop: 0, marginBottom: 18 }}>
        Veja o palpite de cada membro e quando foi feito. Jogos com resultado vêm recolhidos — clique para expandir.
      </p>

      {items.length === 0 && <div className="empty">Nenhum jogo com times definidos ainda.</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {items.map((item) => (
          <MatchCard key={item.matchId} {...item} />
        ))}
      </div>
    </div>
  );
}
