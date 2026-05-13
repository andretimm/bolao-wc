import { cookies } from "next/headers";

export type Theme = "dark" | "light";
export const THEME_COOKIE = "bolao_theme";

export async function readTheme(): Promise<Theme> {
  const c = await cookies();
  const v = c.get(THEME_COOKIE)?.value;
  return v === "light" ? "light" : "dark";
}
