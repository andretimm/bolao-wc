"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "./theme-toggle";
import type { Theme } from "@/lib/theme";

type BolaoLite = { id: string; name: string; code: string; adminId: string };
type Me = { id: string; name: string; handle: string | null; color: string };

export function Sidebar({ me, boloes, theme }: { me: Me; boloes: BolaoLite[]; theme: Theme }) {
  const path = usePathname();
  const isActive = (p: string) => path === p || path?.startsWith(p + "/");

  return (
    <aside className="sidebar">
      <Link href="/dashboard" className="brand">
        <div className="brand-mark">⚽</div>
        <div className="brand-text">
          BOLÃO
          <small>copa · 2026</small>
        </div>
      </Link>

      <div className="nav-section">PRINCIPAL</div>
      <Link href="/dashboard" className={`nav-item ${isActive("/dashboard") ? "active" : ""}`}>
        <span className="ni-icon">⌂</span> Painel
      </Link>
      <Link href="/profile" className={`nav-item ${isActive("/profile") ? "active" : ""}`}>
        <span className="ni-icon">◉</span> Perfil
      </Link>

      <div className="nav-section">SEUS BOLÕES</div>
      {boloes.length === 0 && (
        <div style={{ padding: "8px 10px", fontSize: 12, color: "var(--text-3)" }}>
          Você ainda não está em nenhum bolão.
        </div>
      )}
      {boloes.map((b) => {
        const adm = b.adminId === me.id;
        const active = isActive(`/bolao/${b.id}`);
        return (
          <Link
            key={b.id}
            href={`/bolao/${b.id}`}
            className={`nav-item ${active ? "active" : ""}`}
            style={{ paddingTop: 7, paddingBottom: 7 }}
          >
            <span className="ni-icon">
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 5,
                  background: adm ? "var(--accent)" : "var(--surface-3)",
                  color: adm ? "var(--accent-ink)" : "var(--text-2)",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                {b.name[0]}
              </span>
            </span>
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {b.name}
            </span>
            {adm && (
              <span
                className="mono"
                style={{ marginLeft: "auto", fontSize: 9, color: "var(--accent)", letterSpacing: "0.1em" }}
              >
                ADM
              </span>
            )}
          </Link>
        );
      })}

      <div className="sidebar-footer">
        <div className="user-chip">
          <UserButton
            appearance={{ elements: { userButtonAvatarBox: { width: 32, height: 32 } } }}
          />
          <div className="uc-meta">
            <div className="uc-name">{me.name}</div>
            <div className="uc-handle">{me.handle ? `@${me.handle}` : ""}</div>
          </div>
          <ThemeToggle current={theme} />
        </div>
      </div>
    </aside>
  );
}
