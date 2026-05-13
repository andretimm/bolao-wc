export type GroupRow = {
  team: string;
  P: number;
  W: number;
  D: number;
  L: number;
  GF: number;
  GA: number;
  GD: number;
  Pts: number;
};

export type GroupMatch = {
  teamA: string | null;
  teamB: string | null;
  resultA: number | null;
  resultB: number | null;
};

/** Standard FIFA-ish standings: pts → GD → GF. */
export function computeStandings(teams: string[], gameSet: GroupMatch[]): GroupRow[] {
  const rows = new Map<string, GroupRow>(
    teams.map((t) => [t, { team: t, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 }]),
  );

  for (const m of gameSet) {
    if (m.resultA == null || m.resultB == null || !m.teamA || !m.teamB) continue;
    const a = rows.get(m.teamA);
    const b = rows.get(m.teamB);
    if (!a || !b) continue;
    a.P++; b.P++;
    a.GF += m.resultA; a.GA += m.resultB;
    b.GF += m.resultB; b.GA += m.resultA;
    if (m.resultA > m.resultB) { a.W++; b.L++; a.Pts += 3; }
    else if (m.resultA < m.resultB) { b.W++; a.L++; b.Pts += 3; }
    else { a.D++; b.D++; a.Pts++; b.Pts++; }
    a.GD = a.GF - a.GA;
    b.GD = b.GF - b.GA;
  }

  return [...rows.values()].sort((x, y) => y.Pts - x.Pts || y.GD - x.GD || y.GF - x.GF);
}
