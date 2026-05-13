import { requireCurrentUser } from "@/lib/auth";
import { SignOutButton } from "@clerk/nextjs";
import { colorFor } from "@/lib/colors";

export default async function ProfilePage() {
  const user = await requireCurrentUser();
  const primary =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId) ?? user.emailAddresses[0];
  const email = primary?.emailAddress ?? "";
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.username ||
    email.split("@")[0];
  const initials = name.split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  const color = colorFor(user.id);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Conta · Perfil</div>
          <h1 className="page-title">Perfil</h1>
        </div>
        <SignOutButton redirectUrl="/">
          <button className="btn ghost">Sair</button>
        </SignOutButton>
      </div>

      <div className="card" style={{ padding: 28, display: "flex", alignItems: "center", gap: 22 }}>
        <span
          className="avatar xl"
          style={{ background: color, color: "#0a0a0b", borderColor: "transparent" }}
        >
          {initials}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.015em" }}>{name}</div>
          <div className="mono" style={{ fontSize: 12, color: "var(--text-3)", letterSpacing: "0.08em" }}>
            {user.username ? `@${user.username} · ` : ""}{email}
          </div>
        </div>
      </div>

      <p style={{ marginTop: 16, fontSize: 12, color: "var(--text-3)" }}>
        Nome, e-mail e avatar são gerenciados via Clerk. Para editar, use o painel do Clerk no menu da conta.
      </p>
    </div>
  );
}
