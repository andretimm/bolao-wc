"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BolaoTabs({ id, isAdmin }: { id: string; isAdmin: boolean }) {
  const path = usePathname();
  const base = `/bolao/${id}`;
  const tabs: { href: string; label: string }[] = [
    { href: `${base}/chaves`, label: "Chaves" },
    { href: `${base}/palpites`, label: "Palpites" },
    ...(isAdmin ? [{ href: `${base}/admin`, label: "Admin" }] : []),
    { href: `${base}/ranking`, label: "Ranking" },
    { href: `${base}/atividade`, label: "Atividade" },
    { href: `${base}/settings`, label: isAdmin ? "Settings" : "Sair" },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: 4,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        width: "fit-content",
      }}
    >
      {tabs.map((t) => {
        const active = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              padding: "8px 14px",
              borderRadius: "var(--radius-xs)",
              fontSize: 12,
              fontWeight: active ? 600 : 500,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              background: active ? "var(--accent)" : "transparent",
              color: active ? "var(--accent-ink)" : "var(--text-2)",
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
