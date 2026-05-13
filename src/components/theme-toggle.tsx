"use client";

import { useTransition } from "react";
import { setTheme } from "@/app/actions/theme";
import type { Theme } from "@/lib/theme";

export function ThemeToggle({ current }: { current: Theme }) {
  const [pending, start] = useTransition();

  const flip = () => {
    const next: Theme = current === "dark" ? "light" : "dark";
    // Apply immediately for instant feedback, then persist.
    document.documentElement.classList.toggle("theme-dark", next === "dark");
    document.documentElement.classList.toggle("theme-light", next === "light");
    start(() => setTheme(next));
  };

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={flip}
      aria-label={current === "dark" ? "Tema claro" : "Tema escuro"}
      title={current === "dark" ? "Tema claro" : "Tema escuro"}
      disabled={pending}
    >
      {current === "dark" ? (
        // sun
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9 6.3 6.3M17.7 17.7l1.4 1.4M4.9 19.1 6.3 17.7M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        // moon
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 14a8 8 0 1 1-9-10 7 7 0 0 0 9 10Z" />
        </svg>
      )}
    </button>
  );
}
