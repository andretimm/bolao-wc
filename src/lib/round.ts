export function roundFilterKey(round: string): string {
  const sepIndex = round.indexOf(" · ");
  return sepIndex === -1 ? round : round.slice(sepIndex + 3);
}
