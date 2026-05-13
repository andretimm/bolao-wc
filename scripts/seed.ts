import "dotenv/config";
import { db } from "../src/db";
import { teams, groups, groupTeams, matches } from "../src/db/schema";

type T = readonly [code: string, name: string, c1: string, c2: string, c3?: string];

const TEAMS_DATA: T[] = [
  ["USA", "Estados Unidos", "#3c3b6e", "#ffffff", "#b22234"],
  ["CAN", "Canadá", "#ff0000", "#ffffff", "#ff0000"],
  ["MEX", "México", "#006847", "#ffffff", "#ce1126"],
  ["ARG", "Argentina", "#74acdf", "#ffffff", "#74acdf"],
  ["BRA", "Brasil", "#009c3b", "#ffdf00", "#002776"],
  ["URU", "Uruguai", "#0038a8", "#ffffff", "#0038a8"],
  ["COL", "Colômbia", "#fcd116", "#003893", "#ce1126"],
  ["ECU", "Equador", "#ffdd00", "#0033a0", "#ce1126"],
  ["PAR", "Paraguai", "#d52b1e", "#ffffff", "#0038a8"],
  ["HAI", "Haiti", "#00209f", "#d21034", "#00209f"],
  ["CUW", "Curaçao", "#002b7f", "#f9e814", "#002b7f"],
  ["PAN", "Panamá", "#d21034", "#ffffff", "#005293"],
  ["CPV", "Cabo Verde", "#003893", "#ffffff", "#cf2027"],
  ["FRA", "França", "#0055a4", "#ffffff", "#ef4135"],
  ["ESP", "Espanha", "#aa151b", "#f1bf00", "#aa151b"],
  ["POR", "Portugal", "#006600", "#ff0000", "#006600"],
  ["ENG", "Inglaterra", "#ffffff", "#c8102e", "#ffffff"],
  ["GER", "Alemanha", "#000000", "#dd0000", "#ffce00"],
  ["NED", "Holanda", "#ae1c28", "#ffffff", "#21468b"],
  ["BEL", "Bélgica", "#000000", "#fdda24", "#ef3340"],
  ["CRO", "Croácia", "#ff0000", "#ffffff", "#171796"],
  ["SUI", "Suíça", "#ff0000", "#ffffff", "#ff0000"],
  ["AUT", "Áustria", "#ed2939", "#ffffff", "#ed2939"],
  ["NOR", "Noruega", "#ef2b2d", "#ffffff", "#002868"],
  ["TUR", "Turquia", "#e30a17", "#ffffff", "#e30a17"],
  ["SCO", "Escócia", "#0065bd", "#ffffff", "#0065bd"],
  ["CZE", "República Tcheca", "#11457e", "#ffffff", "#d7141a"],
  ["SWE", "Suécia", "#006aa7", "#fecc00", "#006aa7"],
  ["BIH", "Bósnia e Herzegovina", "#002395", "#fecb00", "#ffffff"],
  ["MAR", "Marrocos", "#c1272d", "#006233", "#c1272d"],
  ["SEN", "Senegal", "#00853f", "#fdef42", "#e31b23"],
  ["ALG", "Argélia", "#006233", "#ffffff", "#d21034"],
  ["EGY", "Egito", "#ce1126", "#ffffff", "#000000"],
  ["CIV", "Costa do Marfim", "#ff8200", "#ffffff", "#009e60"],
  ["GHA", "Gana", "#ce1126", "#fcd116", "#006b3f"],
  ["TUN", "Tunísia", "#e70013", "#ffffff", "#e70013"],
  ["RSA", "África do Sul", "#007a4d", "#ffb612", "#de3831"],
  ["COD", "RD Congo", "#007fff", "#f7d618", "#ce1021"],
  ["JPN", "Japão", "#ffffff", "#bc002d", "#ffffff"],
  ["KOR", "Coreia do Sul", "#cd2e3a", "#0047a0", "#ffffff"],
  ["IRN", "Irã", "#239f40", "#ffffff", "#da0000"],
  ["KSA", "Arábia Saudita", "#006c35", "#ffffff", "#006c35"],
  ["AUS", "Austrália", "#00008b", "#ffffff", "#ff0000"],
  ["QAT", "Catar", "#8a1538", "#ffffff", "#8a1538"],
  ["IRQ", "Iraque", "#ce1126", "#ffffff", "#000000"],
  ["UZB", "Uzbequistão", "#1eb53a", "#ffffff", "#0099b5"],
  ["JOR", "Jordânia", "#000000", "#ffffff", "#ce1126"],
  ["NZL", "Nova Zelândia", "#012169", "#ffffff", "#c8102e"],
];

const NAME_TO_CODE: Record<string, string> = {
  "México": "MEX",
  "África do Sul": "RSA",
  "Coreia do Sul": "KOR",
  "República Tcheca": "CZE",
  "Canadá": "CAN",
  "Bósnia e Herzegovina": "BIH",
  "Catar": "QAT",
  "Suíça": "SUI",
  "Brasil": "BRA",
  "Marrocos": "MAR",
  "Haiti": "HAI",
  "Escócia": "SCO",
  "Estados Unidos": "USA",
  "Paraguai": "PAR",
  "Austrália": "AUS",
  "Turquia": "TUR",
  "Alemanha": "GER",
  "Curaçao": "CUW",
  "Costa do Marfim": "CIV",
  "Equador": "ECU",
  "Holanda": "NED",
  "Japão": "JPN",
  "Suécia": "SWE",
  "Tunísia": "TUN",
  "Bélgica": "BEL",
  "Egito": "EGY",
  "Irã": "IRN",
  "Nova Zelândia": "NZL",
  "Espanha": "ESP",
  "Cabo Verde": "CPV",
  "Arábia Saudita": "KSA",
  "Uruguai": "URU",
  "França": "FRA",
  "Senegal": "SEN",
  "Iraque": "IRQ",
  "Noruega": "NOR",
  "Argentina": "ARG",
  "Argélia": "ALG",
  "Áustria": "AUT",
  "Jordânia": "JOR",
  "Portugal": "POR",
  "RD Congo": "COD",
  "Uzbequistão": "UZB",
  "Colômbia": "COL",
  "Inglaterra": "ENG",
  "Croácia": "CRO",
  "Gana": "GHA",
  "Panamá": "PAN",
};

const GROUPS_DATA: { id: string; teams: string[] }[] = [
  { id: "A", teams: ["MEX", "RSA", "KOR", "CZE"] },
  { id: "B", teams: ["CAN", "BIH", "QAT", "SUI"] },
  { id: "C", teams: ["BRA", "MAR", "HAI", "SCO"] },
  { id: "D", teams: ["USA", "PAR", "AUS", "TUR"] },
  { id: "E", teams: ["GER", "CUW", "CIV", "ECU"] },
  { id: "F", teams: ["NED", "JPN", "SWE", "TUN"] },
  { id: "G", teams: ["BEL", "EGY", "IRN", "NZL"] },
  { id: "H", teams: ["ESP", "CPV", "KSA", "URU"] },
  { id: "I", teams: ["FRA", "SEN", "IRQ", "NOR"] },
  { id: "J", teams: ["ARG", "ALG", "AUT", "JOR"] },
  { id: "K", teams: ["POR", "COD", "UZB", "COL"] },
  { id: "L", teams: ["ENG", "CRO", "GHA", "PAN"] },
];

type GroupMatch = {
  data: string;
  grupo: string;
  mandante: string;
  visitante: string;
  rodada: number;
};

const GROUP_MATCHES: GroupMatch[] = [
  { data: "2026-06-11", grupo: "A", mandante: "México", visitante: "África do Sul", rodada: 1 },
  { data: "2026-06-11", grupo: "A", mandante: "Coreia do Sul", visitante: "República Tcheca", rodada: 1 },
  { data: "2026-06-12", grupo: "B", mandante: "Canadá", visitante: "Bósnia e Herzegovina", rodada: 1 },
  { data: "2026-06-12", grupo: "D", mandante: "Estados Unidos", visitante: "Paraguai", rodada: 1 },
  { data: "2026-06-13", grupo: "B", mandante: "Catar", visitante: "Suíça", rodada: 1 },
  { data: "2026-06-13", grupo: "C", mandante: "Brasil", visitante: "Marrocos", rodada: 1 },
  { data: "2026-06-13", grupo: "C", mandante: "Haiti", visitante: "Escócia", rodada: 1 },
  { data: "2026-06-14", grupo: "D", mandante: "Austrália", visitante: "Turquia", rodada: 1 },
  { data: "2026-06-14", grupo: "E", mandante: "Alemanha", visitante: "Curaçao", rodada: 1 },
  { data: "2026-06-14", grupo: "E", mandante: "Costa do Marfim", visitante: "Equador", rodada: 1 },
  { data: "2026-06-14", grupo: "F", mandante: "Holanda", visitante: "Japão", rodada: 1 },
  { data: "2026-06-14", grupo: "F", mandante: "Suécia", visitante: "Tunísia", rodada: 1 },
  { data: "2026-06-15", grupo: "G", mandante: "Bélgica", visitante: "Egito", rodada: 1 },
  { data: "2026-06-15", grupo: "G", mandante: "Irã", visitante: "Nova Zelândia", rodada: 1 },
  { data: "2026-06-15", grupo: "H", mandante: "Espanha", visitante: "Cabo Verde", rodada: 1 },
  { data: "2026-06-15", grupo: "H", mandante: "Arábia Saudita", visitante: "Uruguai", rodada: 1 },
  { data: "2026-06-16", grupo: "I", mandante: "França", visitante: "Senegal", rodada: 1 },
  { data: "2026-06-16", grupo: "I", mandante: "Iraque", visitante: "Noruega", rodada: 1 },
  { data: "2026-06-16", grupo: "J", mandante: "Argentina", visitante: "Argélia", rodada: 1 },
  { data: "2026-06-17", grupo: "J", mandante: "Áustria", visitante: "Jordânia", rodada: 1 },
  { data: "2026-06-17", grupo: "K", mandante: "Portugal", visitante: "RD Congo", rodada: 1 },
  { data: "2026-06-17", grupo: "K", mandante: "Uzbequistão", visitante: "Colômbia", rodada: 1 },
  { data: "2026-06-17", grupo: "L", mandante: "Inglaterra", visitante: "Croácia", rodada: 1 },
  { data: "2026-06-17", grupo: "L", mandante: "Gana", visitante: "Panamá", rodada: 1 },

  { data: "2026-06-18", grupo: "A", mandante: "República Tcheca", visitante: "África do Sul", rodada: 2 },
  { data: "2026-06-18", grupo: "A", mandante: "México", visitante: "Coreia do Sul", rodada: 2 },
  { data: "2026-06-18", grupo: "B", mandante: "Suíça", visitante: "Bósnia e Herzegovina", rodada: 2 },
  { data: "2026-06-18", grupo: "B", mandante: "Canadá", visitante: "Catar", rodada: 2 },
  { data: "2026-06-19", grupo: "C", mandante: "Escócia", visitante: "Marrocos", rodada: 2 },
  { data: "2026-06-19", grupo: "C", mandante: "Brasil", visitante: "Haiti", rodada: 2 },
  { data: "2026-06-19", grupo: "D", mandante: "Estados Unidos", visitante: "Austrália", rodada: 2 },
  { data: "2026-06-20", grupo: "D", mandante: "Turquia", visitante: "Paraguai", rodada: 2 },
  { data: "2026-06-20", grupo: "E", mandante: "Alemanha", visitante: "Costa do Marfim", rodada: 2 },
  { data: "2026-06-20", grupo: "E", mandante: "Equador", visitante: "Curaçao", rodada: 2 },
  { data: "2026-06-20", grupo: "F", mandante: "Holanda", visitante: "Suécia", rodada: 2 },
  { data: "2026-06-20", grupo: "F", mandante: "Tunísia", visitante: "Japão", rodada: 2 },
  { data: "2026-06-21", grupo: "G", mandante: "Nova Zelândia", visitante: "Egito", rodada: 2 },
  { data: "2026-06-21", grupo: "G", mandante: "Bélgica", visitante: "Irã", rodada: 2 },
  { data: "2026-06-21", grupo: "H", mandante: "Espanha", visitante: "Arábia Saudita", rodada: 2 },
  { data: "2026-06-21", grupo: "H", mandante: "Uruguai", visitante: "Cabo Verde", rodada: 2 },
  { data: "2026-06-22", grupo: "I", mandante: "França", visitante: "Iraque", rodada: 2 },
  { data: "2026-06-22", grupo: "I", mandante: "Noruega", visitante: "Senegal", rodada: 2 },
  { data: "2026-06-22", grupo: "J", mandante: "Argentina", visitante: "Áustria", rodada: 2 },
  { data: "2026-06-22", grupo: "J", mandante: "Jordânia", visitante: "Argélia", rodada: 2 },
  { data: "2026-06-23", grupo: "K", mandante: "Portugal", visitante: "Uzbequistão", rodada: 2 },
  { data: "2026-06-23", grupo: "K", mandante: "Colômbia", visitante: "RD Congo", rodada: 2 },
  { data: "2026-06-23", grupo: "L", mandante: "Inglaterra", visitante: "Gana", rodada: 2 },
  { data: "2026-06-23", grupo: "L", mandante: "Panamá", visitante: "Croácia", rodada: 2 },

  { data: "2026-06-24", grupo: "A", mandante: "República Tcheca", visitante: "México", rodada: 3 },
  { data: "2026-06-24", grupo: "A", mandante: "África do Sul", visitante: "Coreia do Sul", rodada: 3 },
  { data: "2026-06-24", grupo: "B", mandante: "Suíça", visitante: "Canadá", rodada: 3 },
  { data: "2026-06-24", grupo: "B", mandante: "Bósnia e Herzegovina", visitante: "Catar", rodada: 3 },
  { data: "2026-06-24", grupo: "C", mandante: "Escócia", visitante: "Brasil", rodada: 3 },
  { data: "2026-06-24", grupo: "C", mandante: "Marrocos", visitante: "Haiti", rodada: 3 },
  { data: "2026-06-25", grupo: "D", mandante: "Turquia", visitante: "Estados Unidos", rodada: 3 },
  { data: "2026-06-25", grupo: "D", mandante: "Paraguai", visitante: "Austrália", rodada: 3 },
  { data: "2026-06-25", grupo: "E", mandante: "Equador", visitante: "Alemanha", rodada: 3 },
  { data: "2026-06-25", grupo: "E", mandante: "Curaçao", visitante: "Costa do Marfim", rodada: 3 },
  { data: "2026-06-25", grupo: "F", mandante: "Tunísia", visitante: "Holanda", rodada: 3 },
  { data: "2026-06-25", grupo: "F", mandante: "Japão", visitante: "Suécia", rodada: 3 },
  { data: "2026-06-26", grupo: "G", mandante: "Egito", visitante: "Irã", rodada: 3 },
  { data: "2026-06-26", grupo: "G", mandante: "Nova Zelândia", visitante: "Bélgica", rodada: 3 },
  { data: "2026-06-26", grupo: "H", mandante: "Cabo Verde", visitante: "Arábia Saudita", rodada: 3 },
  { data: "2026-06-26", grupo: "H", mandante: "Uruguai", visitante: "Espanha", rodada: 3 },
  { data: "2026-06-26", grupo: "I", mandante: "Noruega", visitante: "França", rodada: 3 },
  { data: "2026-06-26", grupo: "I", mandante: "Senegal", visitante: "Iraque", rodada: 3 },
  { data: "2026-06-27", grupo: "J", mandante: "Jordânia", visitante: "Argentina", rodada: 3 },
  { data: "2026-06-27", grupo: "J", mandante: "Argélia", visitante: "Áustria", rodada: 3 },
  { data: "2026-06-27", grupo: "K", mandante: "Colômbia", visitante: "Portugal", rodada: 3 },
  { data: "2026-06-27", grupo: "K", mandante: "RD Congo", visitante: "Uzbequistão", rodada: 3 },
  { data: "2026-06-27", grupo: "L", mandante: "Panamá", visitante: "Inglaterra", rodada: 3 },
  { data: "2026-06-27", grupo: "L", mandante: "Croácia", visitante: "Gana", rodada: 3 },
];

function codeOf(name: string): string {
  const c = NAME_TO_CODE[name];
  if (!c) throw new Error(`No code mapped for team: ${name}`);
  return c;
}

async function main() {
  console.log("Seeding teams...");
  for (const [code, name, c1, c2, c3] of TEAMS_DATA) {
    await db
      .insert(teams)
      .values({ code, name, color1: c1, color2: c2, color3: c3 ?? c1 })
      .onConflictDoUpdate({ target: teams.code, set: { name, color1: c1, color2: c2, color3: c3 ?? c1 } });
  }

  console.log("Seeding groups...");
  for (const g of GROUPS_DATA) {
    await db.insert(groups).values({ id: g.id }).onConflictDoNothing();
    for (const t of g.teams) {
      await db
        .insert(groupTeams)
        .values({ groupId: g.id, teamCode: t })
        .onConflictDoNothing();
    }
  }

  console.log("Seeding group matches...");
  const perDateCounter = new Map<string, number>();
  let mId = 1;
  for (const gm of GROUP_MATCHES) {
    const slotIdx = perDateCounter.get(gm.data) ?? 0;
    perDateCounter.set(gm.data, slotIdx + 1);
    const hour = 13 + slotIdx * 2;
    const kickoffAt = new Date(`${gm.data}T${String(hour).padStart(2, "0")}:00:00-03:00`);
    const id = `g${String(mId++).padStart(3, "0")}`;
    const teamA = codeOf(gm.mandante);
    const teamB = codeOf(gm.visitante);
    await db
      .insert(matches)
      .values({
        id,
        stage: "group",
        round: `Grupo ${gm.grupo} · R${gm.rodada}`,
        groupId: gm.grupo,
        teamA,
        teamB,
        kickoffAt,
      })
      .onConflictDoUpdate({
        target: matches.id,
        set: {
          stage: "group",
          round: `Grupo ${gm.grupo} · R${gm.rodada}`,
          groupId: gm.grupo,
          teamA,
          teamB,
          kickoffAt,
        },
      });
  }

  console.log("Seeding knockout placeholders...");
  const koStages: { stage: "r32" | "r16" | "qf" | "sf" | "tp" | "final"; round: string; n: number; from: string }[] = [
    { stage: "r32", round: "16-avos", n: 16, from: "2026-06-28T15:00:00-03:00" },
    { stage: "r16", round: "Oitavas", n: 8, from: "2026-07-04T15:00:00-03:00" },
    { stage: "qf", round: "Quartas", n: 4, from: "2026-07-09T15:00:00-03:00" },
    { stage: "sf", round: "Semifinais", n: 2, from: "2026-07-14T15:00:00-03:00" },
    { stage: "tp", round: "Terceiro lugar", n: 1, from: "2026-07-18T15:00:00-03:00" },
    { stage: "final", round: "Final", n: 1, from: "2026-07-19T15:00:00-03:00" },
  ];
  for (const ks of koStages) {
    for (let i = 0; i < ks.n; i++) {
      const d = new Date(ks.from);
      d.setDate(d.getDate() + Math.floor(i / 2));
      d.setHours(d.getHours() + (i % 2) * 3);
      await db
        .insert(matches)
        .values({
          id: `${ks.stage}-${i + 1}`,
          stage: ks.stage,
          round: ks.round,
          kickoffAt: d,
          venue: ks.stage === "final" ? "MetLife Stadium" : "Sede TBD",
        })
        .onConflictDoNothing();
    }
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then(() => process.exit(0));
