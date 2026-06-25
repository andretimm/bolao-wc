import { NextResponse } from "next/server";
import { db } from "@/db";
import { matches, matchOfficialResult, boloes } from "@/db/schema";
import { propagateBracket } from "@/lib/propagate-bracket";
import { eq } from "drizzle-orm";
import { fetchWcMatches, type FdMatch } from "@/lib/football-data";
import { codeFromTla } from "@/lib/external-teams";
import { isInsideWcWindow } from "@/lib/wc-window";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unauthorized() {
  return new NextResponse("forbidden", { status: 403 });
}

async function handle(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) return unauthorized();

  if (!isInsideWcWindow()) {
    return NextResponse.json({ skipped: "outside-wc-window" });
  }

  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "FOOTBALL_DATA_TOKEN missing" }, { status: 500 });
  }

  let fdMatches: FdMatch[];
  try {
    fdMatches = await fetchWcMatches(token);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  const allBoloes = await db.select({ id: boloes.id }).from(boloes);

  // Pré-carrega matches locais p/ mapeamento (id externo OU data+times).
  const localMatches = await db.select().from(matches);
  const localById = new Map(localMatches.map((m) => [m.id, m]));
  const byExternal = new Map<string, string>();
  const byDateTla = new Map<string, string>();
  for (const m of localMatches) {
    if (m.externalId) byExternal.set(m.externalId, m.id);
    if (m.teamA && m.teamB) {
      const key = `${m.kickoffAt.toISOString().slice(0, 10)}|${m.teamA}|${m.teamB}`;
      byDateTla.set(key, m.id);
    }
  }

  let mapped = 0;
  let upserts = 0;
  let unmapped = 0;

  for (const fd of fdMatches) {
    const fdId = String(fd.id);
    let localId = byExternal.get(fdId);

    const homeCode = codeFromTla(fd.homeTeam.tla);
    const awayCode = codeFromTla(fd.awayTeam.tla);

    if (!localId && homeCode && awayCode) {
      const d = new Date(fd.utcDate);
      const candidates = [-1, 0, 1].map((off) => {
        const x = new Date(d.getTime() + off * 86400000);
        return x.toISOString().slice(0, 10);
      });
      for (const dateKey of candidates) {
        localId =
          byDateTla.get(`${dateKey}|${homeCode}|${awayCode}`) ??
          byDateTla.get(`${dateKey}|${awayCode}|${homeCode}`);
        if (localId) break;
      }
      if (localId) {
        await db.update(matches).set({ externalId: fdId }).where(eq(matches.id, localId));
        byExternal.set(fdId, localId);
        mapped++;
      }
    }

    if (!localId) {
      unmapped++;
      continue;
    }

    const finished = fd.status === "FINISHED";
    const home = fd.score.fullTime.home;
    const away = fd.score.fullTime.away;

    let winner: "A" | "B" | null = null;
    if (finished) {
      if (fd.score.winner === "HOME_TEAM") winner = "A";
      else if (fd.score.winner === "AWAY_TEAM") winner = "B";
      else if (fd.score.penalties) {
        const ph = fd.score.penalties.home ?? 0;
        const pa = fd.score.penalties.away ?? 0;
        if (ph > pa) winner = "A";
        else if (pa > ph) winner = "B";
      }
    }

    // Palpites usam a orientação teamA/teamB do match local; football-data
    // pode listar o mesmo jogo com mandante invertido. Reorienta antes de gravar.
    const local = localById.get(localId);
    const swapped =
      !!local?.teamA &&
      !!local?.teamB &&
      local.teamA === awayCode &&
      local.teamB === homeCode;

    const values = {
      matchId: localId,
      teamA: swapped ? awayCode : homeCode,
      teamB: swapped ? homeCode : awayCode,
      resultA: finished ? (swapped ? away : home) : null,
      resultB: finished ? (swapped ? home : away) : null,
      winner: swapped && winner ? (winner === "A" ? "B" : "A") : winner,
      status: fd.status,
      source: "football-data",
      fetchedAt: new Date(),
    };

    await db
      .insert(matchOfficialResult)
      .values(values)
      .onConflictDoUpdate({
        target: matchOfficialResult.matchId,
        set: {
          teamA: values.teamA,
          teamB: values.teamB,
          resultA: values.resultA,
          resultB: values.resultB,
          winner: values.winner,
          status: values.status,
          source: values.source,
          fetchedAt: values.fetchedAt,
        },
      });
    upserts++;
  }

  // Propagate bracket for every bolão now that official results are updated
  await Promise.all(allBoloes.map((b) => propagateBracket(b.id)));

  return NextResponse.json({
    ok: true,
    total: fdMatches.length,
    mapped,
    upserts,
    unmapped,
  });
}

export const POST = handle;
export const GET = handle;
