const API_BASE = "https://api.football-data.org/v4";

export type FdMatch = {
  id: number;
  utcDate: string;
  status: "SCHEDULED" | "TIMED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "POSTPONED" | "SUSPENDED" | "CANCELLED";
  stage: string;
  group: string | null;
  homeTeam: { id: number; name: string; tla: string | null };
  awayTeam: { id: number; name: string; tla: string | null };
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    duration: string;
    fullTime: { home: number | null; away: number | null };
    penalties?: { home: number | null; away: number | null } | null;
  };
};

export async function fetchWcMatches(token: string): Promise<FdMatch[]> {
  const res = await fetch(`${API_BASE}/competitions/WC/matches`, {
    headers: { "X-Auth-Token": token },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`football-data ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { matches: FdMatch[] };
  return data.matches ?? [];
}
