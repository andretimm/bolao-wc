import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { boloes, memberships } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { BolaoTabs } from "./tabs";

export default async function BolaoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { userId } = await requireAuth();
  const { id } = await params;

  const m = await db.query.memberships.findFirst({
    where: and(eq(memberships.bolaoId, id), eq(memberships.userId, userId)),
  });
  if (!m) notFound();

  const bolao = await db.query.boloes.findFirst({ where: eq(boloes.id, id) });
  if (!bolao) notFound();

  const isAdmin = bolao.adminId === userId;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">
            BOLÃO · CÓDIGO {bolao.code}
            {isAdmin && <span className="tag accent" style={{ marginLeft: 10 }}>ADMIN</span>}
          </div>
          <h1 className="page-title">{bolao.name}</h1>
          {bolao.stake && <p className="page-sub">Aposta: {bolao.stake}</p>}
        </div>
        <Link href="/dashboard" className="btn ghost">← Voltar</Link>
      </div>

      <BolaoTabs id={id} isAdmin={isAdmin} />

      <div style={{ marginTop: 22 }}>{children}</div>
    </div>
  );
}
