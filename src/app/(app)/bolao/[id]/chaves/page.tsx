import { requireAuth } from "@/lib/auth";
import { requireBolaoAccess } from "@/lib/access";
import { db } from "@/db";
import { groups, groupTeams, teams } from "@/db/schema";
import { asc } from "drizzle-orm";
import { computeStandings, type GroupMatch } from "@/lib/standings";
import { getEffectiveMatches } from "@/lib/match-state";
import { Flag, type TeamLite } from "@/components/flag";

export const dynamic = "force-dynamic";

export default async function ChavesPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await requireAuth();
  const { id } = await params;
  await requireBolaoAccess({ userId, bolaoId: id });

  const [allGroups, allGT, allTeams, effective] = await Promise.all([
    db.select().from(groups).orderBy(asc(groups.id)),
    db.select().from(groupTeams),
    db.select().from(teams),
    getEffectiveMatches(id),
  ]);

  const teamMap = new Map<string, TeamLite>(allTeams.map((t) => [t.code, t]));
  const groupMatches = effective.filter((m) => m.stage === "group");
  const koMatches = effective.filter((m) => m.stage !== "group");

  const groupTeamsByGroup = new Map<string, string[]>();
  for (const gt of allGT) {
    const arr = groupTeamsByGroup.get(gt.groupId) ?? [];
    arr.push(gt.teamCode);
    groupTeamsByGroup.set(gt.groupId, arr);
  }
  const matchesByGroup = new Map<string, GroupMatch[]>();
  for (const m of groupMatches) {
    if (!m.groupId) continue;
    const arr = matchesByGroup.get(m.groupId) ?? [];
    arr.push({ teamA: m.teamA, teamB: m.teamB, resultA: m.resultA, resultB: m.resultB });
    matchesByGroup.set(m.groupId, arr);
  }

  const stages: { key: "r32" | "r16" | "qf" | "sf" | "final"; label: string }[] = [
    { key: "r32", label: "R32" },
    { key: "r16", label: "Oitavas" },
    { key: "qf", label: "Quartas" },
    { key: "sf", label: "Semis" },
    { key: "final", label: "Final" },
  ];

  return (
    <div>
      <h2 style={{ margin: "0 0 14px", fontSize: 18, letterSpacing: "-0.015em" }}>Fase de Grupos</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginBottom: 36 }}>
        {allGroups.map((g) => {
          const tcodes = groupTeamsByGroup.get(g.id) ?? [];
          const standings = computeStandings(tcodes, matchesByGroup.get(g.id) ?? []);
          return (
            <div key={g.id} className="card">
              <div className="card-head">
                <h3>Grupo {g.id}</h3>
                <span className="mono" style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.12em" }}>
                  {(matchesByGroup.get(g.id) ?? []).filter((m) => m.resultA != null).length}/6
                </span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["", "TIME", "P", "V", "E", "D", "SG", "PTS"].map((h) => (
                      <th
                        key={h}
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 9,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "var(--text-3)",
                          fontWeight: 600,
                          textAlign: h === "TIME" ? "left" : "right",
                          padding: "8px 8px",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, idx) => {
                    const t = teamMap.get(row.team);
                    const qual = idx < 2;
                    return (
                      <tr key={row.team}>
                        <td
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            color: "var(--text-3)",
                            padding: "8px 4px 8px 12px",
                            width: 18,
                            boxShadow: qual ? "inset 3px 0 0 var(--accent)" : undefined,
                          }}
                        >
                          {idx + 1}
                        </td>
                        <td style={{ padding: "8px 8px", fontSize: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Flag team={t} size="sm" />
                            <span style={{ fontWeight: 500 }}>{t?.name ?? row.team}</span>
                          </div>
                        </td>
                        {[row.P, row.W, row.D, row.L, row.GD, row.Pts].map((v, i) => (
                          <td
                            key={i}
                            style={{
                              padding: "8px 8px",
                              textAlign: "right",
                              fontFamily: "var(--font-mono)",
                              fontSize: 12,
                              fontVariantNumeric: "tabular-nums",
                              fontWeight: i === 5 ? 700 : 400,
                              color: i === 5 ? "var(--accent)" : undefined,
                            }}
                          >
                            {v}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      <h2 style={{ margin: "0 0 14px", fontSize: 18, letterSpacing: "-0.015em" }}>Bracket</h2>
      <div
        style={{
          display: "flex",
          gap: 32,
          padding: 20,
          overflowX: "auto",
          background: "var(--bg-elev)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          minHeight: 400,
        }}
      >
        {stages.map((st) => {
          const stMatches = koMatches.filter((m) => m.stage === st.key);
          return (
            <div key={st.key} style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", minWidth: 220, gap: 8 }}>
              <div
                className="mono"
                style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}
              >
                {st.label}
              </div>
              {stMatches.map((m) => {
                const a = m.teamA ? teamMap.get(m.teamA) : null;
                const b = m.teamB ? teamMap.get(m.teamB) : null;
                const has = m.resultA != null && m.resultB != null;
                const isDraw = has && m.resultA === m.resultB;
                const winnerA = has && (m.resultA! > m.resultB! || (isDraw && m.winner === "A"));
                const winnerB = has && (m.resultB! > m.resultA! || (isDraw && m.winner === "B"));
                const onPens = has && isDraw && m.winner != null;
                return (
                  <div
                    key={m.id}
                    style={{
                      background: "var(--surface)",
                      border: `1px solid ${has ? "var(--accent-line)" : "var(--border)"}`,
                      borderRadius: "var(--radius-sm)",
                      overflow: "hidden",
                    }}
                  >
                    {[
                      { team: a, score: m.resultA, winner: winnerA, loser: has && !winnerA && !isDraw },
                      { team: b, score: m.resultB, winner: winnerB, loser: has && !winnerB && !isDraw },
                    ].map((side, i) => (
                      <div
                        key={i}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "24px 1fr auto",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 12px",
                          background: side.winner ? "var(--accent-soft)" : undefined,
                          borderBottom: i === 0 ? "1px solid var(--border)" : undefined,
                          fontSize: 13,
                        }}
                      >
                        <Flag team={side.team ?? null} size="sm" />
                        <span
                          style={{
                            fontWeight: side.winner ? 600 : 500,
                            color: side.winner ? "var(--accent)" : side.loser ? "var(--text-3)" : undefined,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {side.team?.name ?? "—"}
                        </span>
                        <span
                          className="mono"
                          style={{
                            fontWeight: 700,
                            color: side.loser ? "var(--text-3)" : "var(--text)",
                          }}
                        >
                          {side.score ?? ""}
                          {onPens && side.winner && (
                            <span style={{ marginLeft: 4, fontSize: 9, color: "var(--text-3)" }}>(pen)</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
