"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag, type TeamLite } from "@/components/flag";
import { pickChampion } from "./actions";

export function ChampionPickModal({ bolaoId, teams }: { bolaoId: string; teams: TeamLite[] }) {
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [selected, setSelected] = useState<TeamLite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const confirm = () => {
    if (!selected) return;
    setError(null);
    const fd = new FormData();
    fd.set("bolaoId", bolaoId);
    fd.set("teamCode", selected.code);
    start(async () => {
      const r = await pickChampion(fd);
      if ("error" in r && r.error) {
        setError(r.error);
        setStep("select");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        zIndex: 200,
        padding: 20,
      }}
    >
      <div
        style={{
          width: "min(760px, 100%)",
          background: "var(--bg-elev)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}
      >
        {step === "select" ? (
          <>
            <div style={{ padding: "22px 24px 6px" }}>
              <h2 style={{ margin: 0, fontSize: 20, letterSpacing: "-0.02em" }}>
                Escolha seu campeão
              </h2>
              <p style={{ margin: "6px 0 0", color: "var(--text-2)", fontSize: 14 }}>
                O mata-mata começou. Escolha entre os 32 times quem você acha que vai ser
                campeão. Acertar vale +50 pts extras. Só dá pra escolher uma vez.
              </p>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 8,
                padding: "16px 24px",
                maxHeight: 520,
                overflowY: "auto",
              }}
            >
              {teams.map((t) => (
                <button
                  key={t.code}
                  type="button"
                  onClick={() => setSelected(t)}
                  className="btn"
                  style={{
                    justifyContent: "flex-start",
                    gap: 10,
                    borderColor: selected?.code === t.code ? "var(--accent)" : undefined,
                    background: selected?.code === t.code ? "var(--accent-soft)" : undefined,
                  }}
                >
                  <Flag team={t} size="sm" />
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
            {error && (
              <div
                style={{
                  margin: "0 24px 16px",
                  padding: 12,
                  background: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.3)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 12,
                  color: "var(--danger)",
                }}
              >
                {error}
              </div>
            )}
            <div style={{ padding: "0 24px 22px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn primary"
                disabled={!selected}
                onClick={() => setStep("confirm")}
              >
                Continuar
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: "22px 24px 6px" }}>
              <h2 style={{ margin: 0, fontSize: 20, letterSpacing: "-0.02em" }}>
                Confirmar campeão
              </h2>
              <p style={{ margin: "6px 0 0", color: "var(--text-2)", fontSize: 14 }}>
                Escolheu <b>{selected?.name}</b> como campeão. Essa escolha não pode ser
                trocada depois. Confirmar?
              </p>
            </div>
            <div style={{ padding: "16px 24px 22px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setStep("select")}
                disabled={pending}
              >
                Voltar
              </button>
              <button type="button" className="btn primary" onClick={confirm} disabled={pending}>
                {pending ? "Confirmando..." : "Confirmar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
