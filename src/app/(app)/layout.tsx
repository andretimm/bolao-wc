import { requireCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { boloes, memberships } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Sidebar } from "@/components/sidebar";
import { MobileTopBar, MobileBottomNav } from "@/components/mobile-chrome";
import { colorFor } from "@/lib/colors";
import { readTheme } from "@/lib/theme";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, theme] = await Promise.all([requireCurrentUser(), readTheme()]);
  const myBoloes = await db
    .select({ id: boloes.id, name: boloes.name, code: boloes.code, adminId: boloes.adminId })
    .from(memberships)
    .innerJoin(boloes, eq(memberships.bolaoId, boloes.id))
    .where(eq(memberships.userId, user.id));

  const primary =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId) ?? user.emailAddresses[0];
  const email = primary?.emailAddress ?? "";
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.username ||
    email.split("@")[0];

  return (
    <div className="app-shell">
      <Sidebar
        me={{ id: user.id, name, handle: user.username, color: colorFor(user.id) }}
        boloes={myBoloes}
        theme={theme}
      />
      <MobileTopBar theme={theme} />
      <div className="main">{children}</div>
      <MobileBottomNav firstBolao={myBoloes[0] ? { id: myBoloes[0].id, name: myBoloes[0].name } : null} />
    </div>
  );
}
