import { requireAuth } from "@/lib/auth";
import { requireBolaoAccess } from "@/lib/access";
import { db } from "@/db";
import { memberships, predictions, teams } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getEffectiveMatches, pointsForPrediction } from "@/lib/match-state";
import { getUsers } from "@/lib/clerk-users";
import { colorFor } from "@/lib/colors";
import { TeamLabel, type TeamLite } from "@/components/flag";
import { championBonus } from "@/lib/scoring";

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

  return (
    <div>
      <h2 style={{ margin: "0 0 14px", fontSize: 18, letterSpacing: "-0.015em" }}>
        Palpites de todos
      </h2>
      <p className="page-sub" style={{ marginTop: 0, marginBottom: 18 }}>
        Veja o palpite de cada membro e quando foi feito. Sempre visível.
      </p>

      {ready.length === 0 && <div className="empty">Nenhum jogo com times definidos ainda.</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {ready.map((m) => {
          const hasResult = m.resultA != null && m.resultB != null;
          const predsForMatch = predByMatch.get(m.id) ?? new Map();
          const isFinal = m.stage === "final";

          return (
            <div key={m.id} className="card">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto 1fr",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <TeamLabel team={m.teamA ? teamMap.get(m.teamA) ?? null : null} />
                <div className="mono" style={{ fontSize: 14, fontWeight: 700, textAlign: "center" }}>
                  {hasResult ? `${m.resultA} × ${m.resultB}` : "vs"}
                </div>
                <TeamLabel team={m.teamB ? teamMap.get(m.teamB) ?? null : null} align="right" />
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  color: "var(--text-3)",
                  letterSpacing: "0.06em",
                  padding: "6px 16px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {m.round.toUpperCase()} · {m.kickoffAt.toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {isFinal && <span style={{ color: "var(--accent)" }}> · CAMPEÃO +50</span>}
              </div>

              <div>
                {members.map((mem) => {
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

                  return (
                    <div
                      key={mem.userId}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "32px 1fr auto auto",
                        gap: 12,
                        padding: "10px 16px",
                        borderBottom: "1px solid var(--border)",
                        alignItems: "center",
                        background: isMe ? "var(--accent-soft)" : undefined,
                      }}
                    >
                      {u?.avatarUrl ? (
                        <img
                          src={u.avatarUrl}
                          alt={name}
                          width={32}
                          height={32}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <span
                          className="avatar"
                          style={{
                            background: color,
                            color: "#0a0a0b",
                            borderColor: "transparent",
                          }}
                        >
                          {init}
                        </span>
                      )}
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        {name}
                        {isMe && (
                          <span
                            className="mono"
                            style={{
                              marginLeft: 8,
                              fontSize: 10,
                              color: "var(--accent)",
                              letterSpacing: "0.08em",
                            }}
                          >
                            VOCÊ
                          </span>
                        )}
                      </div>
                      <div
                        className="mono"
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: pred ? "var(--text)" : "var(--text-3)",
                          minWidth: 60,
                          textAlign: "center",
                        }}
                      >
                        {pred ? `${pred.scoreA} × ${pred.scoreB}` : "— × —"}
                      </div>
                      <div
                        className="mono"
                        style={{
                          fontSize: 10,
                          color: "var(--text-3)",
                          letterSpacing: "0.04em",
                          minWidth: 110,
                          textAlign: "right",
                        }}
                      >
                        {pred ? relativeTime(pred.updatedAt, now) : "—"}
                        {hasResult && pred && (
                          <div
                            style={{
                              color: total > 0 ? "var(--accent)" : "var(--text-3)",
                              fontWeight: 700,
                              marginTop: 2,
                            }}
                          >
                            +{total} pts
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
