import { requireAuth } from "@/lib/auth";
import { requireBolaoAccess } from "@/lib/access";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { asc } from "drizzle-orm";
import { getEffectiveMatches } from "@/lib/match-state";
import type { TeamLite } from "@/components/flag";
import { ResultRow } from "./row";

export const dynamic = "force-dynamic";

export default async function AdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await requireAuth();
  const { id: bolaoId } = await params;
  await requireBolaoAccess({ userId, bolaoId, adminOnly: true });

  const [effective, allTeams] = await Promise.all([
    getEffectiveMatches(bolaoId),
    db.select().from(teams).orderBy(asc(teams.name)),
  ]);

  const teamMap = new Map<string, TeamLite>(allTeams.map((t) => [t.code, t]));
  const teamOptions = allTeams.map((t) => ({ code: t.code, name: t.name }));

  const groupMatches = effective.filter((m) => m.stage === "group");
  const koMatches = effective.filter((m) => m.stage !== "group");

  return (
    <div>
      <h2 style={{ margin: "0 0 6px", fontSize: 18, letterSpacing: "-0.015em" }}>Admin · Resultados</h2>
      <p className="page-sub" style={{ marginTop: 0, marginBottom: 18 }}>
        Lance o placar oficial. Em fase eliminatória, defina os times antes do placar.
      </p>

      <h3 style={{ margin: "20px 0 10px", fontSize: 14, letterSpacing: "-0.005em" }}>Fase de Grupos</h3>
      <div className="card" style={{ marginBottom: 28 }}>
        {groupMatches.map((m) => (
          <ResultRow
            key={m.id}
            bolaoId={bolaoId}
            matchId={m.id}
            stage={m.stage}
            round={m.round}
            kickoffAt={m.kickoffAt.toISOString()}
            teamA={m.teamA ? teamMap.get(m.teamA) ?? null : null}
            teamB={m.teamB ? teamMap.get(m.teamB) ?? null : null}
            resultA={m.resultA}
            resultB={m.resultB}
            winner={m.winner}
            teamOptions={teamOptions}
            canEditTeams={false}
          />
        ))}
      </div>

      <h3 style={{ margin: "20px 0 10px", fontSize: 14, letterSpacing: "-0.005em" }}>Mata-mata</h3>
      <div className="card">
        {koMatches.map((m) => (
          <ResultRow
            key={m.id}
            bolaoId={bolaoId}
            matchId={m.id}
            stage={m.stage}
            round={m.round}
            kickoffAt={m.kickoffAt.toISOString()}
            teamA={m.teamA ? teamMap.get(m.teamA) ?? null : null}
            teamB={m.teamB ? teamMap.get(m.teamB) ?? null : null}
            resultA={m.resultA}
            resultB={m.resultB}
            winner={m.winner}
            teamOptions={teamOptions}
            canEditTeams
          />
        ))}
      </div>
    </div>
  );
}
