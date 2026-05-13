"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "./theme-toggle";
import type { Theme } from "@/lib/theme";

type BolaoLite = { id: string; name: string };

export function MobileTopBar({ theme }: { theme: Theme }) {
  return (
    <div className="mobile-bar">
      <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div className="brand-mark" style={{ width: 24, height: 24, fontSize: 12 }}>
          ⚽
        </div>
        <div style={{ fontWeight: 700, letterSpacing: "-0.01em", fontSize: 15 }}>Bolão Copa 2026</div>
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ThemeToggle current={theme} />
        <UserButton />
      </div>
    </div>
  );
}

export function MobileBottomNav({ firstBolao }: { firstBolao: BolaoLite | null }) {
  const path = usePathname();
  const items: { href: string; label: string; icon: React.ReactNode; matches: (p: string) => boolean }[] = [
    {
      href: "/dashboard",
      label: "Painel",
      matches: (p) => p === "/dashboard",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10 12 3l9 7v10a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2Z" />
        </svg>
      ),
    },
    {
      href: firstBolao ? `/bolao/${firstBolao.id}/chaves` : "/dashboard",
      label: "Chaves",
      matches: (p) => p.startsWith("/bolao/") && p.endsWith("/chaves"),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 4v6h6" /><path d="M3 14v6h6" /><path d="M9 7h4v10h4" /><path d="M17 12h4" />
        </svg>
      ),
    },
    {
      href: firstBolao ? `/bolao/${firstBolao.id}/palpites` : "/dashboard",
      label: "Palpites",
      matches: (p) => p.startsWith("/bolao/") && p.endsWith("/palpites"),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="m13 2-9 12h7l-1 8 9-12h-7Z" />
        </svg>
      ),
    },
    {
      href: firstBolao ? `/bolao/${firstBolao.id}/ranking` : "/dashboard",
      label: "Ranking",
      matches: (p) => p.startsWith("/bolao/") && p.endsWith("/ranking"),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 4h12v3a6 6 0 0 1-12 0Z" /><path d="M6 4H3v2a3 3 0 0 0 3 3" /><path d="M18 4h3v2a3 3 0 0 1-3 3" /><path d="M12 13v4" /><path d="M9 20h6" />
        </svg>
      ),
    },
    {
      href: "/profile",
      label: "Perfil",
      matches: (p) => p === "/profile",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0 1 16 0" />
        </svg>
      ),
    },
  ];

  return (
    <div className="mobile-nav">
      {items.map((it) => {
        const active = it.matches(path ?? "");
        return (
          <Link
            key={it.label}
            href={it.href}
            className={`mobile-nav-item ${active ? "active" : ""}`}
          >
            {it.icon}
            <span>{it.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
