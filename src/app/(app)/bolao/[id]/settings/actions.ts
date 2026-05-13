"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { requireBolaoAccess } from "@/lib/access";
import { db } from "@/db";
import { boloes, memberships } from "@/db/schema";
import { generateInviteCode } from "@/lib/codes";
import { and, eq } from "drizzle-orm";

const NAME_RE = /^[\p{L}\p{N} '\-_.]{2,40}$/u;

export async function updateBolao(formData: FormData) {
  const { userId } = await requireAuth();
  const bolaoId = String(formData.get("bolaoId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const stakeRaw = String(formData.get("stake") ?? "").trim();
  const stake = stakeRaw === "" ? null : stakeRaw;

  if (!NAME_RE.test(name)) return { error: "Nome inválido (2-40 caracteres)." } as const;
  if (stake && stake.length > 60) return { error: "Aposta muito longa." } as const;

  await requireBolaoAccess({ userId, bolaoId, adminOnly: true });

  await db.update(boloes).set({ name, stake }).where(eq(boloes.id, bolaoId));
  revalidatePath(`/bolao/${bolaoId}`, "layout");
  revalidatePath("/dashboard");
  return { ok: true } as const;
}

export async function regenerateCode(formData: FormData) {
  const { userId } = await requireAuth();
  const bolaoId = String(formData.get("bolaoId") ?? "");
  await requireBolaoAccess({ userId, bolaoId, adminOnly: true });

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode(8);
    try {
      const r = await db.update(boloes).set({ code }).where(eq(boloes.id, bolaoId)).returning({ code: boloes.code });
      if (r[0]) {
        revalidatePath(`/bolao/${bolaoId}`, "layout");
        return { ok: true, code: r[0].code } as const;
      }
    } catch {
      // unique collision, retry
    }
  }
  return { error: "Falha ao gerar código. Tente novamente." } as const;
}

export async function transferAdmin(formData: FormData) {
  const { userId } = await requireAuth();
  const bolaoId = String(formData.get("bolaoId") ?? "");
  const newAdminId = String(formData.get("newAdminId") ?? "");

  if (!newAdminId) return { error: "Selecione um membro." } as const;
  if (newAdminId === userId) return { error: "Você já é o admin." } as const;

  await requireBolaoAccess({ userId, bolaoId, adminOnly: true });

  const target = await db.query.memberships.findFirst({
    where: and(eq(memberships.bolaoId, bolaoId), eq(memberships.userId, newAdminId)),
  });
  if (!target) return { error: "Usuário não é membro deste bolão." } as const;

  await db.transaction(async (tx) => {
    await tx.update(boloes).set({ adminId: newAdminId }).where(eq(boloes.id, bolaoId));
    await tx
      .update(memberships)
      .set({ role: "admin" })
      .where(and(eq(memberships.bolaoId, bolaoId), eq(memberships.userId, newAdminId)));
    await tx
      .update(memberships)
      .set({ role: "member" })
      .where(and(eq(memberships.bolaoId, bolaoId), eq(memberships.userId, userId)));
  });

  revalidatePath(`/bolao/${bolaoId}`, "layout");
  redirect(`/bolao/${bolaoId}/chaves`);
}

export async function deleteBolao(formData: FormData) {
  const { userId } = await requireAuth();
  const bolaoId = String(formData.get("bolaoId") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  await requireBolaoAccess({ userId, bolaoId, adminOnly: true });

  const bolao = await db.query.boloes.findFirst({ where: eq(boloes.id, bolaoId) });
  if (!bolao) return { error: "Bolão não encontrado." } as const;
  if (confirm !== bolao.name) {
    return { error: "Digite o nome exato do bolão para confirmar." } as const;
  }

  await db.delete(boloes).where(eq(boloes.id, bolaoId));
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function leaveBolao(formData: FormData) {
  const { userId } = await requireAuth();
  const bolaoId = String(formData.get("bolaoId") ?? "");

  const { isAdmin } = await requireBolaoAccess({ userId, bolaoId });
  if (isAdmin) {
    return {
      error: "Você é o admin. Transfira a administração antes de sair, ou exclua o bolão.",
    } as const;
  }

  await db
    .delete(memberships)
    .where(and(eq(memberships.bolaoId, bolaoId), eq(memberships.userId, userId)));

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
