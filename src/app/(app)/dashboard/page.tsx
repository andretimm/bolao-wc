import { requireCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { boloes, bolaoMatchState, matches, memberships, predictions } from "@/db/schema";
import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import { DashboardActions } from "./ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const firstName = user.firstName || user.username || "você";

  const myRows = await db
    .select({
      id: boloes.id,
      name: boloes.name,
      code: boloes.code,
      adminId: boloes.adminId,
      stake: boloes.stake,
    })
    .from(memberships)
    .innerJoin(boloes, eq(memberships.bolaoId, boloes.id))
    .where(eq(memberships.userId, user.id))
    .orderBy(asc(boloes.createdAt));

  const bolaoIds = myRows.map((b) => b.id);

  const counts = bolaoIds.length
    ? await db
        .select({ bolaoId: memberships.bolaoId, count: sql<number>`count(*)::int` })
        .from(memberships)
        .where(inArray(memberships.bolaoId, bolaoIds))
        .groupBy(memberships.bolaoId)
    : [];
  const countMap = new Map(counts.map((c) => [c.bolaoId, c.count]));

  const pointsRow = await db
    .select({
      total: sql<number>`
        coalesce(sum(case
          when ${bolaoMatchState.resultA} is not null and ${bolaoMatchState.resultB} is not null then
            case
              when ${predictions.scoreA} = ${bolaoMatchState.resultA} and ${predictions.scoreB} = ${bolaoMatchState.resultB} then 10
              when sign(${predictions.scoreA} - ${predictions.scoreB}) = sign(${bolaoMatchState.resultA} - ${bolaoMatchState.resultB}) then 5
              else 0
            end
          else 0
        end), 0)::int`,
      preds: sql<number>`count(*)::int`,
    })
    .from(predictions)
    .leftJoin(
      bolaoMatchState,
      and(eq(bolaoMatchState.bolaoId, predictions.bolaoId), eq(bolaoMatchState.matchId, predictions.matchId)),
    )
    .where(eq(predictions.userId, user.id));

  const totalPoints = pointsRow[0]?.total ?? 0;
  const predsCount = pointsRow[0]?.preds ?? 0;

  const upcoming = await db
    .select({
      id: matches.id,
      teamA: matches.teamA,
      teamB: matches.teamB,
      kickoffAt: matches.kickoffAt,
      stage: matches.stage,
    })
    .from(matches)
    .where(gt(matches.kickoffAt, new Date()))
    .orderBy(asc(matches.kickoffAt))
    .limit(5);

  const adminCount = myRows.filter((b) => b.adminId === user.id).length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Painel</div>
          <h1 className="page-title">Olá,</h1>
          <p className="page-sub">Faça palpites, dispute o ranking, leve o bolão.</p>
        </div>
        <DashboardActions />
      </div>

      <div className="stat-grid" style={{ marginBottom: 28 }}>
        <div className="stat">
          <div className="s-label">Pontos totais</div>
          <div className="s-value tabular">{totalPoints}</div>
          <div className="s-sub">somando todos os bolões</div>
        </div>
        <div className="stat">
          <div className="s-label">Bolões ativos</div>
          <div className="s-value tabular">{myRows.length}</div>
          <div className="s-sub">{adminCount > 0 ? `você admin de ${adminCount}` : "—"}</div>
        </div>
        <div className="stat">
          <div className="s-label">Palpites feitos</div>
          <div className="s-value tabular">{predsCount}</div>
          <div className="s-sub">acumulado</div>
        </div>
        <div className="stat accent">
          <div className="s-label">Copa 2026</div>
          <div className="s-value tabular">48</div>
          <div className="s-sub">seleções · 12 grupos</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 18, letterSpacing: "-0.015em" }}>Seus bolões</h2>
        <div className="mono" style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.1em" }}>
          {myRows.length} ATIVO{myRows.length === 1 ? "" : "S"}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 14,
          marginBottom: 36,
        }}
      >
        {myRows.map((b, i) => {
          const isAdmin = b.adminId === user.id;
          return (
            <a key={b.id} href={`/bolao/${b.id}`} className={`bolao-card ${i === 0 ? "featured" : ""}`}>
              <div className="bc-head">
                <div>
                  <div className="bc-name">{b.name}</div>
                  <div className="bc-code">CÓDIGO: {b.code}</div>
                </div>
                {isAdmin && <span className={`tag ${i === 0 ? "" : "accent"}`}>ADMIN</span>}
              </div>
              <div className="bc-stats">
                <div>
                  <b>{countMap.get(b.id) ?? 1}</b>
                  membros
                </div>
                <div>
                  <b>{b.stake ?? "—"}</b>
                  aposta
                </div>
              </div>
              <div className="bc-foot">
                <div className="mono" style={{ fontSize: 11, color: "var(--text-3)" }}>
                  abrir →
                </div>
              </div>
            </a>
          );
        })}
        {myRows.length === 0 && (
          <div className="empty" style={{ gridColumn: "1 / -1" }}>
            Nenhum bolão ainda. Crie um ou entre com código de convite.
          </div>
        )}
      </div>

      <h2 style={{ margin: "0 0 14px", fontSize: 18, letterSpacing: "-0.015em" }}>Próximos jogos</h2>
      <div className="card">
        {upcoming.length === 0 && <div className="empty">Sem jogos próximos. Configure o banco com `pnpm db:seed`.</div>}
        {upcoming.map((m) => (
          <div
            key={m.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              gap: 16,
              padding: "14px 18px",
              borderBottom: "1px solid var(--border)",
              alignItems: "center",
            }}
          >
            <div style={{ fontWeight: 600 }}>{m.teamA ?? "—"}</div>
            <div className="mono" style={{ fontSize: 12, color: "var(--text-3)" }}>
              {new Date(m.kickoffAt).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div style={{ fontWeight: 600, textAlign: "right" }}>{m.teamB ?? "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
