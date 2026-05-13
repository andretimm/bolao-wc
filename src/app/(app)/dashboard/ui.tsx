"use client";

import { useState, useTransition } from "react";
import { createBolao, joinBolao } from "./actions";

export function DashboardActions() {
  const [mode, setMode] = useState<null | "create" | "join">(null);
  return (
    <>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" onClick={() => setMode("join")}>
          Entrar com código
        </button>
        <button className="btn primary" onClick={() => setMode("create")}>
          + Criar bolão
        </button>
      </div>
      {mode === "create" && <CreateModal onClose={() => setMode(null)} />}
      {mode === "join" && <JoinModal onClose={() => setMode(null)} />}
    </>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        zIndex: 100,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(440px, 100%)",
          background: "var(--bg-elev)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "22px 24px 6px" }}>
          <h2 style={{ margin: 0, fontSize: 20, letterSpacing: "-0.02em" }}>{title}</h2>
          {subtitle && <p style={{ margin: "6px 0 0", color: "var(--text-2)", fontSize: 14 }}>{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

function CreateModal({ onClose }: { onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <ModalShell
      title="Criar bolão"
      subtitle="Você será o administrador e poderá registrar resultados oficiais."
      onClose={onClose}
    >
      <form
        action={(fd) =>
          start(async () => {
            setError(null);
            const r = await createBolao(fd);
            if (r && "error" in r) setError(r.error);
          })
        }
      >
        <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="field">
            <label className="field-label">Nome do bolão</label>
            <input name="name" className="input" placeholder="Ex.: Bolão dos Manos" required maxLength={40} />
          </div>
          <div className="field">
            <label className="field-label">Aposta (opcional)</label>
            <input name="stake" className="input" placeholder="Ex.: R$ 50" maxLength={60} />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: 14,
              background: "var(--surface)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)" }}>
              Regras de pontuação
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span>Placar exato</span><b className="mono">+10 pts</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span>Só o vencedor</span><b className="mono">+5 pts</b>
            </div>
          </div>
          {error && (
            <div
              style={{
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
        </div>
        <div style={{ padding: "16px 24px 22px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Criando..." : "Criar bolão"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function JoinModal({ onClose }: { onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <ModalShell
      title="Entrar com código"
      subtitle="Peça o código de convite ao administrador do bolão."
      onClose={onClose}
    >
      <form
        action={(fd) =>
          start(async () => {
            setError(null);
            const r = await joinBolao(fd);
            if (r && "error" in r) setError(r.error);
          })
        }
      >
        <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="field">
            <label className="field-label">Código</label>
            <input
              name="code"
              className="input mono-input lg"
              placeholder="EX: A1B2C3D4"
              required
              maxLength={16}
              autoComplete="off"
              autoCapitalize="characters"
            />
          </div>
          {error && (
            <div
              style={{
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
        </div>
        <div style={{ padding: "16px 24px 22px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Verificando..." : "Entrar"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
