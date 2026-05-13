"use client";

import { useState, useTransition } from "react";
import {
  updateBolao,
  regenerateCode,
  transferAdmin,
  deleteBolao,
  leaveBolao,
} from "./actions";

function Msg({ msg }: { msg: { kind: "ok" | "err"; text: string } | null }) {
  if (!msg) return null;
  return (
    <span
      className="mono"
      style={{
        fontSize: 11,
        color: msg.kind === "ok" ? "var(--success)" : "var(--danger)",
      }}
    >
      {msg.text}
    </span>
  );
}

export function SettingsForms(props: {
  bolaoId: string;
  currentName: string;
  currentStake: string;
  currentCode: string;
  members: { id: string; name: string }[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <RenameForm bolaoId={props.bolaoId} initialName={props.currentName} initialStake={props.currentStake} />
      <CodeForm bolaoId={props.bolaoId} initialCode={props.currentCode} />
      <TransferForm bolaoId={props.bolaoId} members={props.members} />
      <DeleteForm bolaoId={props.bolaoId} name={props.currentName} />
    </div>
  );
}

export function LeaveForm({ bolaoId }: { bolaoId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [confirm, setConfirm] = useState(false);

  const submit = () => {
    setMsg(null);
    const fd = new FormData();
    fd.set("bolaoId", bolaoId);
    start(async () => {
      const r = await leaveBolao(fd);
      if (r && "error" in r && r.error) setMsg({ kind: "err", text: r.error });
    });
  };

  return (
    <div className="card card-pad">
      <div className="card-eyebrow mono" style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--text-3)", marginBottom: 4 }}>
        ZONA DE PERIGO
      </div>
      <h3 style={{ margin: "0 0 6px", fontSize: 14 }}>Sair do bolão</h3>
      <p style={{ margin: "0 0 14px", color: "var(--text-2)", fontSize: 13 }}>
        Seus palpites continuam registrados mas você deixa de aparecer no ranking. Pode entrar de novo com o código.
      </p>
      {!confirm ? (
        <button className="btn danger" onClick={() => setConfirm(true)}>
          Sair do bolão
        </button>
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn ghost" onClick={() => setConfirm(false)} disabled={pending}>
            Cancelar
          </button>
          <button className="btn danger" onClick={submit} disabled={pending}>
            {pending ? "Saindo..." : "Confirmar saída"}
          </button>
          <Msg msg={msg} />
        </div>
      )}
    </div>
  );
}

function RenameForm({ bolaoId, initialName, initialStake }: { bolaoId: string; initialName: string; initialStake: string }) {
  const [name, setName] = useState(initialName);
  const [stake, setStake] = useState(initialStake);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const submit = () => {
    setMsg(null);
    const fd = new FormData();
    fd.set("bolaoId", bolaoId);
    fd.set("name", name);
    fd.set("stake", stake);
    start(async () => {
      const r = await updateBolao(fd);
      if ("error" in r && r.error) setMsg({ kind: "err", text: r.error });
      else setMsg({ kind: "ok", text: "salvo" });
    });
  };

  return (
    <div className="card card-pad">
      <h3 style={{ margin: "0 0 14px", fontSize: 14 }}>Informações</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="field">
          <label className="field-label">Nome do bolão</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        </div>
        <div className="field">
          <label className="field-label">Aposta (opcional)</label>
          <input className="input" value={stake} onChange={(e) => setStake(e.target.value)} maxLength={60} />
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn primary" onClick={submit} disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </button>
          <Msg msg={msg} />
        </div>
      </div>
    </div>
  );
}

function CodeForm({ bolaoId, initialCode }: { bolaoId: string; initialCode: string }) {
  const [code, setCode] = useState(initialCode);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [confirm, setConfirm] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setMsg({ kind: "ok", text: "código copiado" });
    } catch {
      setMsg({ kind: "err", text: "falha ao copiar" });
    }
  };

  const regen = () => {
    setMsg(null);
    const fd = new FormData();
    fd.set("bolaoId", bolaoId);
    start(async () => {
      const r = await regenerateCode(fd);
      if ("error" in r && r.error) setMsg({ kind: "err", text: r.error });
      else {
        setCode(r.code);
        setMsg({ kind: "ok", text: "novo código gerado" });
        setConfirm(false);
      }
    });
  };

  return (
    <div className="card card-pad">
      <h3 style={{ margin: "0 0 14px", fontSize: 14 }}>Código de convite</h3>
      <div
        style={{
          padding: 16,
          border: "1px dashed var(--accent-line)",
          background: "var(--accent-soft)",
          borderRadius: "var(--radius-sm)",
          textAlign: "center",
          marginBottom: 12,
        }}
      >
        <div className="mono" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "0.18em", color: "var(--accent)" }}>
          {code}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn" onClick={copy}>Copiar</button>
        {!confirm ? (
          <button className="btn danger" onClick={() => setConfirm(true)} disabled={pending}>
            Gerar novo código
          </button>
        ) : (
          <>
            <button className="btn ghost" onClick={() => setConfirm(false)} disabled={pending}>
              Cancelar
            </button>
            <button className="btn danger" onClick={regen} disabled={pending}>
              {pending ? "..." : "Confirmar (invalida o atual)"}
            </button>
          </>
        )}
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
          <Msg msg={msg} />
        </span>
      </div>
      <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--text-3)" }}>
        Gerar novo código invalida o atual. Membros já dentro permanecem; convites antigos param de funcionar.
      </p>
    </div>
  );
}

function TransferForm({ bolaoId, members }: { bolaoId: string; members: { id: string; name: string }[] }) {
  const [target, setTarget] = useState<string>("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [confirm, setConfirm] = useState(false);

  const submit = () => {
    setMsg(null);
    const fd = new FormData();
    fd.set("bolaoId", bolaoId);
    fd.set("newAdminId", target);
    start(async () => {
      const r = await transferAdmin(fd);
      if (r && "error" in r && r.error) setMsg({ kind: "err", text: r.error });
    });
  };

  return (
    <div className="card card-pad">
      <h3 style={{ margin: "0 0 14px", fontSize: 14 }}>Transferir administração</h3>
      {members.length === 0 ? (
        <p style={{ margin: 0, color: "var(--text-3)", fontSize: 13 }}>
          Nenhum outro membro no bolão ainda.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">— selecionar membro —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          {!confirm ? (
            <button
              className="btn"
              disabled={!target || pending}
              onClick={() => setConfirm(true)}
            >
              Transferir
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="btn ghost" onClick={() => setConfirm(false)} disabled={pending}>
                Cancelar
              </button>
              <button className="btn danger" onClick={submit} disabled={pending}>
                {pending ? "..." : "Confirmar (você vira membro)"}
              </button>
              <Msg msg={msg} />
            </div>
          )}
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-3)" }}>
            Após transferir, você vira membro comum e perde permissão de lançar resultados.
          </p>
        </div>
      )}
    </div>
  );
}

function DeleteForm({ bolaoId, name }: { bolaoId: string; name: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [step, setStep] = useState<0 | 1>(0);
  const [confirmText, setConfirmText] = useState("");

  const submit = () => {
    setMsg(null);
    const fd = new FormData();
    fd.set("bolaoId", bolaoId);
    fd.set("confirm", confirmText);
    start(async () => {
      const r = await deleteBolao(fd);
      if (r && "error" in r && r.error) setMsg({ kind: "err", text: r.error });
    });
  };

  return (
    <div className="card card-pad" style={{ borderColor: "rgba(248,113,113,0.4)" }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--danger)", marginBottom: 4 }}>
        ZONA DE PERIGO
      </div>
      <h3 style={{ margin: "0 0 6px", fontSize: 14 }}>Excluir bolão</h3>
      <p style={{ margin: "0 0 14px", color: "var(--text-2)", fontSize: 13 }}>
        Apaga membros, palpites e resultados deste bolão. Esta ação é <b>irreversível</b>.
      </p>
      {step === 0 ? (
        <button className="btn danger" onClick={() => setStep(1)}>
          Excluir bolão
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="field">
            <label className="field-label">Digite o nome do bolão para confirmar</label>
            <input
              className="input"
              placeholder={name}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn ghost" onClick={() => setStep(0)} disabled={pending}>
              Cancelar
            </button>
            <button
              className="btn danger"
              disabled={pending || confirmText !== name}
              onClick={submit}
            >
              {pending ? "Excluindo..." : "Excluir permanentemente"}
            </button>
            <Msg msg={msg} />
          </div>
        </div>
      )}
    </div>
  );
}
