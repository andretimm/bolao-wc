import { requireAuth } from "@/lib/auth";
import { requireBolaoAccess } from "@/lib/access";
import { db } from "@/db";
import { bolaoMatchState, matches, matchOfficialResult, memberships, teams } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { getUsers } from "@/lib/clerk-users";
import { colorFor } from "@/lib/colors";
import { Flag, type TeamLite } from "@/components/flag";
import Image from "next/image";

export const dynamic = "force-dynamic";

type FeedItem =
  | {
    kind: "result";
    at: Date;
    matchId: string;
    teamA: string | null;
    teamB: string | null;
    resultA: number;
    resultB: number;
    round: string;
  }
  | {
    kind: "join";
    at: Date;
    userId: string;
  };

export default async function AtividadePage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await requireAuth();
  const { id: bolaoId } = await params;
  await requireBolaoAccess({ userId, bolaoId });

  const [recentResults, recentJoins, allTeams] = await Promise.all([
    db
      .select({
        matchId: matches.id,
        round: matches.round,
        tplA: matches.teamA,
        tplB: matches.teamB,
        stA: bolaoMatchState.teamA,
        stB: bolaoMatchState.teamB,
        stResA: bolaoMatchState.resultA,
        stResB: bolaoMatchState.resultB,
        stUpdatedAt: bolaoMatchState.updatedAt,
        offA: matchOfficialResult.teamA,
        offB: matchOfficialResult.teamB,
        offResA: matchOfficialResult.resultA,
        offResB: matchOfficialResult.resultB,
        offFetchedAt: matchOfficialResult.fetchedAt,
        at: sql`greatest(coalesce(${bolaoMatchState.updatedAt}, 'epoch'::timestamptz), coalesce(${matchOfficialResult.fetchedAt}, 'epoch'::timestamptz))`.mapWith((v: string) => new Date(v)),
      })
      .from(matches)
      .leftJoin(
        bolaoMatchState,
        sql`${bolaoMatchState.matchId} = ${matches.id} and ${bolaoMatchState.bolaoId} = ${bolaoId}`,
      )
      .leftJoin(matchOfficialResult, eq(matchOfficialResult.matchId, matches.id))
      .where(
        sql`(${bolaoMatchState.resultA} is not null and ${bolaoMatchState.resultB} is not null)
            or (${matchOfficialResult.resultA} is not null and ${matchOfficialResult.resultB} is not null)`,
      )
      .orderBy(
        desc(
          sql`greatest(coalesce(${bolaoMatchState.updatedAt}, 'epoch'::timestamptz), coalesce(${matchOfficialResult.fetchedAt}, 'epoch'::timestamptz))`,
        ),
      )
      .limit(30),
    db
      .select({ userId: memberships.userId, joinedAt: memberships.joinedAt })
      .from(memberships)
      .where(eq(memberships.bolaoId, bolaoId))
      .orderBy(desc(memberships.joinedAt))
      .limit(20),
    db.select().from(teams),
  ]);

  const teamMap = new Map<string, TeamLite>(allTeams.map((t) => [t.code, t]));

  const items: FeedItem[] = [];
  for (const r of recentResults) {
    const resA = r.stResA ?? r.offResA;
    const resB = r.stResB ?? r.offResB;
    if (resA == null || resB == null) continue;
    items.push({
      kind: "result",
      at: r.at,
      matchId: r.matchId,
      teamA: r.stA ?? r.offA ?? r.tplA,
      teamB: r.stB ?? r.offB ?? r.tplB,
      resultA: resA,
      resultB: resB,
      round: r.round,
    });
  }
  for (const j of recentJoins) {
    items.push({ kind: "join", at: j.joinedAt, userId: j.userId });
  }
  items.sort((a, b) => b.at.getTime() - a.at.getTime());
  const top = items.slice(0, 40);

  const joinUserIds = top.filter((i): i is Extract<FeedItem, { kind: "join" }> => i.kind === "join").map((i) => i.userId);
  const userMap = await getUsers(joinUserIds);

  const fmt = (d: Date) => {
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "agora";
    if (diff < 3600) return `${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 14px", fontSize: 18, letterSpacing: "-0.015em" }}>Atividade</h2>

      <div className="card">
        {top.length === 0 && <div className="empty">Nada por aqui ainda.</div>}
        {top.map((it, i) => {
          if (it.kind === "result") {
            const a = it.teamA ? teamMap.get(it.teamA) : null;
            const b = it.teamB ? teamMap.get(it.teamB) : null;
            return (
              <div
                key={`r-${it.matchId}-${i}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px 1fr auto",
                  gap: 12,
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--border)",
                  alignItems: "center",
                }}
              >
                <div
                  className="f-ic accent"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "var(--accent-soft)",
                    border: "1px solid var(--accent-line)",
                    color: "var(--accent)",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                  }}
                >
                  ⚽
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 13 }}>
                  <span className="mono" style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.06em" }}>
                    {it.round}
                  </span>
                  <Flag team={a ?? null} size="sm" />
                  <b>{a?.name ?? "—"}</b>
                  <span className="mono" style={{ fontWeight: 700 }}>
                    {it.resultA} × {it.resultB}
                  </span>
                  <b>{b?.name ?? "—"}</b>
                  <Flag team={b ?? null} size="sm" />
                </div>
                <span className="mono" style={{ fontSize: 10, color: "var(--text-3)" }}>
                  {fmt(it.at)}
                </span>
              </div>
            );
          }

          const u = userMap.get(it.userId);
          const name = u?.name ?? it.userId.slice(0, 6);
          const color = u?.color ?? colorFor(it.userId);
          const init = name.split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase();
          return (
            <div
              key={`j-${it.userId}-${i}`}
              style={{
                display: "grid",
                gridTemplateColumns: "36px 1fr auto",
                gap: 12,
                padding: "14px 18px",
                borderBottom: "1px solid var(--border)",
                alignItems: "center",
              }}
            >
              {u?.avatarUrl ? (
                <Image
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
              <div style={{ fontSize: 13 }}>
                <b>{name}</b> entrou no bolão.
              </div>
              <span className="mono" style={{ fontSize: 10, color: "var(--text-3)" }}>
                {fmt(it.at)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
