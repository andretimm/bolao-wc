import { randomInt } from "crypto";

// Excludes 0/O/1/I/L to avoid ambiguity
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateInviteCode(len = 8): string {
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHA[randomInt(0, ALPHA.length)];
  return s;
}
