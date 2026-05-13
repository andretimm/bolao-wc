import { requireAuth } from "@/lib/auth";
import { requireBolaoAccess } from "@/lib/access";
import { db } from "@/db";
import { memberships } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUsers } from "@/lib/clerk-users";
import { SettingsForms, LeaveForm } from "./forms";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await requireAuth();
  const { id: bolaoId } = await params;
  const { bolao, isAdmin } = await requireBolaoAccess({ userId, bolaoId });

  if (!isAdmin) {
    return (
      <div>
        <h2 style={{ margin: "0 0 14px", fontSize: 18, letterSpacing: "-0.015em" }}>Configurações</h2>
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, color: "var(--text-2)", fontSize: 14 }}>
            Somente o administrador edita o bolão. Você pode sair quando quiser.
          </p>
        </div>
        <LeaveForm bolaoId={bolaoId} />
      </div>
    );
  }

  const memberRows = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(eq(memberships.bolaoId, bolaoId));

  const userMap = await getUsers(memberRows.map((r) => r.userId));
  const members = memberRows
    .map((m) => {
      const u = userMap.get(m.userId);
      return { id: m.userId, name: u?.name ?? m.userId.slice(0, 6) };
    })
    .filter((m) => m.id !== userId);

  return (
    <div>
      <h2 style={{ margin: "0 0 14px", fontSize: 18, letterSpacing: "-0.015em" }}>Configurações</h2>
      <SettingsForms
        bolaoId={bolaoId}
        currentName={bolao.name}
        currentStake={bolao.stake ?? ""}
        currentCode={bolao.code}
        members={members}
      />
    </div>
  );
}
