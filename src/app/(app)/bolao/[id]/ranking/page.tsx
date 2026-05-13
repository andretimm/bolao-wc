import { requireAuth } from "@/lib/auth";
import { requireBolaoAccess } from "@/lib/access";
import { db } from "@/db";
import { bolaoMatchState, matchOfficialResult, memberships, predictions } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getUsers } from "@/lib/clerk-users";
import { colorFor } from "@/lib/colors";

export const dynamic = "force-dynamic";

export default async function RankingPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await requireAuth();
  const { id: bolaoId } = await params;
  await requireBolaoAccess({ userId, bolaoId });

  // Resultado efetivo = coalesce(bolaoMatchState, matchOfficialResult).
  const rA = sql<number | null>`coalesce(${bolaoMatchState.resultA}, ${matchOfficialResult.resultA})`;
  const rB = sql<number | null>`coalesce(${bolaoMatchState.resultB}, ${matchOfficialResult.resultB})`;

  const agg = await db
    .select({
      userId: memberships.userId,
      exact: sql<number>`
        coalesce(sum(case
          when ${rA} is not null
           and ${predictions.scoreA} = ${rA}
           and ${predictions.scoreB} = ${rB} then 1 else 0 end), 0)::int`,
      winners: sql<number>`
        coalesce(sum(case
          when ${rA} is not null
           and not (${predictions.scoreA} = ${rA} and ${predictions.scoreB} = ${rB})
           and sign(${predictions.scoreA} - ${predictions.scoreB}) = sign(${rA} - ${rB})
          then 1 else 0 end), 0)::int`,
      misses: sql<number>`
        coalesce(sum(case
          when ${rA} is not null
           and not (${predictions.scoreA} = ${rA} and ${predictions.scoreB} = ${rB})
           and sign(${predictions.scoreA} - ${predictions.scoreB}) <> sign(${rA} - ${rB})
          then 1 else 0 end), 0)::int`,
      points: sql<number>`
        coalesce(sum(case
          when ${rA} is not null then
            case
              when ${predictions.scoreA} = ${rA} and ${predictions.scoreB} = ${rB} then 10
              when sign(${predictions.scoreA} - ${predictions.scoreB}) = sign(${rA} - ${rB}) then 5
              else 0
            end
          else 0 end), 0)::int`,
    })
    .from(memberships)
    .leftJoin(
      predictions,
      and(eq(predictions.bolaoId, memberships.bolaoId), eq(predictions.userId, memberships.userId)),
    )
    .leftJoin(
      bolaoMatchState,
      and(eq(bolaoMatchState.bolaoId, memberships.bolaoId), eq(bolaoMatchState.matchId, predictions.matchId)),
    )
    .leftJoin(matchOfficialResult, eq(matchOfficialResult.matchId, predictions.matchId))
    .where(eq(memberships.bolaoId, bolaoId))
    .groupBy(memberships.userId);

  const sorted = [...agg].sort((a, b) => b.points - a.points || b.exact - a.exact);
  const userMap = await getUsers(sorted.map((r) => r.userId));

  return (
    <div>
      <h2 style={{ margin: "0 0 14px", fontSize: 18, letterSpacing: "-0.015em" }}>Ranking</h2>

      {sorted.length >= 3 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 24 }}>
          {[1, 0, 2].map((idx, col) => {
            const r = sorted[idx];
            if (!r) return <div key={col} />;
            const u = userMap.get(r.userId);
            const name = u?.name ?? r.userId.slice(0, 6);
            const color = u?.color ?? colorFor(r.userId);
            const init = name.split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase();
            const place = idx + 1;
            return (
              <div
                key={col}
                className="card card-pad"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  borderColor: place === 1 ? "var(--accent-line)" : "var(--border)",
                  transform: place === 1 ? "translateY(-8px)" : undefined,
                  background: place === 1 ? "var(--accent-soft)" : undefined,
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: 12,
                    color: place === 1 ? "var(--accent)" : "var(--text-3)",
                    letterSpacing: "0.1em",
                  }}
                >
                  #{place}
                </span>
                <span
                  className="avatar lg"
                  style={{ background: color, color: "#0a0a0b", borderColor: "transparent" }}
                >
                  {init}
                </span>
                <div style={{ fontWeight: 600, fontSize: 14, textAlign: "center" }}>{name}</div>
                <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>
                  {r.points}
                </div>
                <div className="mono" style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.06em" }}>
                  {r.exact} EX · {r.winners} VENC
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card">
        {sorted.map((r, idx) => {
          const u = userMap.get(r.userId);
          const name = u?.name ?? r.userId.slice(0, 6);
          const color = u?.color ?? colorFor(r.userId);
          const init = name.split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase();
          const isMe = r.userId === userId;
          const pos = idx + 1;

          return (
            <div
              key={r.userId}
              style={{
                display: "grid",
                gridTemplateColumns: "56px 1fr auto auto",
                gap: 16,
                padding: "14px 20px",
                borderBottom: "1px solid var(--border)",
                alignItems: "center",
                background: isMe ? "var(--accent-soft)" : undefined,
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: pos === 1 ? "var(--accent)" : pos <= 3 ? "var(--text)" : "var(--text-3)",
                  letterSpacing: "-0.02em",
                }}
              >
                {pos.toString().padStart(2, "0")}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <span
                  className="avatar"
                  style={{ background: color, color: "#0a0a0b", borderColor: "transparent" }}
                >
                  {init}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {name}
                    {isMe && (
                      <span className="mono" style={{ marginLeft: 8, fontSize: 10, color: "var(--accent)", letterSpacing: "0.08em" }}>
                        VOCÊ
                      </span>
                    )}
                  </div>
                  {u?.handle && (
                    <div className="mono" style={{ fontSize: 11, color: "var(--text-3)" }}>
                      @{u.handle}
                    </div>
                  )}
                </div>
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.04em" }}>
                <b style={{ color: "var(--text)" }}>{r.exact}</b> ex ·{" "}
                <b style={{ color: "var(--text)" }}>{r.winners}</b> venc ·{" "}
                <b style={{ color: "var(--text)" }}>{r.misses}</b> err
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  fontVariantNumeric: "tabular-nums",
                  minWidth: 60,
                  textAlign: "right",
                }}
              >
                {r.points}
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && <div className="empty">Sem participantes ainda.</div>}
      </div>
    </div>
  );
}
