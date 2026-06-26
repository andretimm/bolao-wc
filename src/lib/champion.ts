import { getEffectiveMatches } from "@/lib/match-state";

export type ChampionWindow = {
  /** Os 32 codes de time disponíveis para escolha. Vazio se `opened` for false. */
  teams: string[];
  /** true quando os 16 jogos do r32 já têm os dois times definidos (fase de grupos concluída). */
  opened: boolean;
  /** true quando o primeiro jogo do r32 já começou — janela de escolha fechada. */
  locked: boolean;
};

export async function getChampionWindow(bolaoId: string): Promise<ChampionWindow> {
  const effective = await getEffectiveMatches(bolaoId);
  const r32 = effective.filter((m) => m.stage === "r32");

  if (r32.length < 16 || r32.some((m) => !m.teamA || !m.teamB)) {
    return { teams: [], opened: false, locked: false };
  }

  const teams = Array.from(new Set(r32.flatMap((m) => [m.teamA as string, m.teamB as string])));
  const earliestKickoff = Math.min(...r32.map((m) => m.kickoffAt.getTime()));
  const locked = Date.now() >= earliestKickoff;

  return { teams, opened: true, locked };
}

/** Time campeão real, com base no resultado efetivo da final. null se a final ainda não terminou. */
export async function getChampionTeam(bolaoId: string): Promise<string | null> {
  const effective = await getEffectiveMatches(bolaoId);
  const final = effective.find((m) => m.stage === "final");
  if (!final || final.resultA == null || final.resultB == null) return null;

  if (final.resultA !== final.resultB) {
    return final.resultA > final.resultB ? final.teamA : final.teamB;
  }
  if (final.winner === "A") return final.teamA;
  if (final.winner === "B") return final.teamB;
  return null;
}
