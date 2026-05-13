"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { boloes, memberships } from "@/db/schema";
import { generateInviteCode } from "@/lib/codes";
import { and, eq } from "drizzle-orm";

const NAME_RE = /^[\p{L}\p{N} '\-_.]{2,40}$/u;

export async function createBolao(formData: FormData) {
  const { userId } = await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  const stake = String(formData.get("stake") ?? "").trim() || null;

  if (!NAME_RE.test(name)) return { error: "Nome inválido (2-40 caracteres)." } as const;
  if (stake && stake.length > 60) return { error: "Aposta muito longa." } as const;

  let bolaoId: string | null = null;
  for (let attempt = 0; attempt < 5 && !bolaoId; attempt++) {
    const code = generateInviteCode(8);
    try {
      const [row] = await db
        .insert(boloes)
        .values({ name, code, stake, adminId: userId })
        .returning({ id: boloes.id });
      bolaoId = row.id;
      await db.insert(memberships).values({ bolaoId, userId, role: "admin" });
    } catch {
      // unique-code collision; retry
    }
  }

  if (!bolaoId) return { error: "Falha ao gerar código único. Tente novamente." } as const;

  revalidatePath("/dashboard");
  redirect(`/bolao/${bolaoId}`);
}

export async function joinBolao(formData: FormData) {
  const { userId } = await requireAuth();
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");
  if (code.length < 4 || code.length > 16) return { error: "Código inválido." } as const;

  const bolao = await db.query.boloes.findFirst({ where: eq(boloes.code, code) });
  if (!bolao) return { error: "Código não encontrado." } as const;

  const existing = await db.query.memberships.findFirst({
    where: and(eq(memberships.bolaoId, bolao.id), eq(memberships.userId, userId)),
  });
  if (!existing) {
    await db.insert(memberships).values({ bolaoId: bolao.id, userId, role: "member" });
  }

  revalidatePath("/dashboard");
  redirect(`/bolao/${bolao.id}`);
}
