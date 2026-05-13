import { notFound } from "next/navigation";
import { db } from "@/db";
import { boloes, memberships } from "@/db/schema";
import { and, eq } from "drizzle-orm";

/** Require: signed-in user is a member of bolão `id`. Returns bolão + role. */
export async function requireBolaoAccess(opts: { userId: string; bolaoId: string; adminOnly?: boolean }) {
  const m = await db.query.memberships.findFirst({
    where: and(eq(memberships.bolaoId, opts.bolaoId), eq(memberships.userId, opts.userId)),
  });
  if (!m) notFound();

  const bolao = await db.query.boloes.findFirst({ where: eq(boloes.id, opts.bolaoId) });
  if (!bolao) notFound();

  const isAdmin = bolao.adminId === opts.userId;
  if (opts.adminOnly && !isAdmin) notFound();

  return { bolao, isAdmin, role: m.role };
}
