/** Mapa TLA football-data.org → código interno.
 * Maioria coincide (BRA, ARG, FRA). Lista cobre divergências conhecidas
 * + reforça as iguais para facilitar manutenção. */
export const TLA_TO_CODE: Record<string, string> = {
  USA: "USA",
  CAN: "CAN",
  MEX: "MEX",
  ARG: "ARG",
  BRA: "BRA",
  URU: "URU",
  COL: "COL",
  ECU: "ECU",
  PAR: "PAR",
  HAI: "HAI",
  CUW: "CUW",
  PAN: "PAN",
  CPV: "CPV",
  FRA: "FRA",
  ESP: "ESP",
  POR: "POR",
  ENG: "ENG",
  GER: "GER",
  NED: "NED",
  BEL: "BEL",
  CRO: "CRO",
  SUI: "SUI",
  AUT: "AUT",
  NOR: "NOR",
  TUR: "TUR",
  SCO: "SCO",
  CZE: "CZE",
  SWE: "SWE",
  BIH: "BIH",
  MAR: "MAR",
  SEN: "SEN",
  ALG: "ALG",
  EGY: "EGY",
  CIV: "CIV",
  GHA: "GHA",
  TUN: "TUN",
  RSA: "RSA",
  COD: "COD",
  JPN: "JPN",
  KOR: "KOR",
  IRN: "IRN",
  KSA: "KSA",
  AUS: "AUS",
  QAT: "QAT",
  IRQ: "IRQ",
  UZB: "UZB",
  JOR: "JOR",
  NZL: "NZL",
  // Divergências conhecidas football-data.org → nosso código:
  ALG_ALT: "ALG", // alguns endpoints usam "ALG", outros "ALG"
  // (placeholders — adicionar quando descobrir divergência real durante sync)
};

export function codeFromTla(tla: string | null | undefined): string | null {
  if (!tla) return null;
  return TLA_TO_CODE[tla] ?? null;
}
