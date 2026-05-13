"use client";

import { useState, useTransition } from "react";
import { Flag, type TeamLite } from "@/components/flag";
import { saveMatch } from "./actions";

export function ResultRow(props: {
  bolaoId: string;
  matchId: string;
  stage: string;
  round: string;
  kickoffAt: string;
  teamA: TeamLite | null;
  teamB: TeamLite | null;
  resultA: number | null;
  resultB: number | null;
  winner: "A" | "B" | null;
  teamOptions: { code: string; name: string }[];
  canEditTeams: boolean;
}) {
  const [a, setA] = useState<string>(props.resultA?.toString() ?? "");
  const [b, setB] = useState<string>(props.resultB?.toString() ?? "");
  const [teamA, setTeamA] = useState<string>(props.teamA?.code ?? "");
  const [teamB, setTeamB] = useState<string>(props.teamB?.code ?? "");
  const [winner, setWinner] = useState<"A" | "B" | "">(props.winner ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const date = new Date(props.kickoffAt);
  const dateStr =
    date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) +
    " · " +
    date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const aNum = a === "" ? null : Number(a);
  const bNum = b === "" ? null : Number(b);
  const hasBothScores = aNum !== null && bNum !== null && Number.isInteger(aNum) && Number.isInteger(bNum);
  const isDraw = hasBothScores && aNum === bNum;
  const needPenalty = props.canEditTeams && isDraw;

  const onSave = () => {
    setMsg(null);
    const fd = new FormData();
    fd.set("bolaoId", props.bolaoId);
    fd.set("matchId", props.matchId);
    fd.set("resultA", a);
    fd.set("resultB", b);
    if (props.canEditTeams) {
      fd.set("teamA", teamA);
      fd.set("teamB", teamB);
      if (winner) fd.set("winner", winner);
    }
    start(async () => {
      const r = await saveMatch(fd);
      if ("error" in r && r.error) setMsg({ kind: "err", text: r.error });
      else setMsg({ kind: "ok", text: "salvo" });
    });
  };

  return (
    <div className="admin-row">
      {/* Team A */}
      {props.canEditTeams ? (
        <select
          className="input"
          value={teamA}
          onChange={(e) => setTeamA(e.target.value)}
          style={{ padding: "8px 10px", fontSize: 13 }}
        >
          <option value="">— time A —</option>
          {props.teamOptions.map((t) => (
            <option key={t.code} value={t.code}>{t.name}</option>
          ))}
        </select>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <Flag team={props.teamA} />
          <span style={{ fontWeight: 600, fontSize: 14, color: props.teamA ? undefined : "var(--text-3)" }}>
            {props.teamA?.name ?? "—"}
          </span>
        </div>
      )}

      {/* Team B */}
      {props.canEditTeams ? (
        <select
          className="input"
          value={teamB}
          onChange={(e) => setTeamB(e.target.value)}
          style={{ padding: "8px 10px", fontSize: 13 }}
        >
          <option value="">— time B —</option>
          {props.teamOptions.map((t) => (
            <option key={t.code} value={t.code}>{t.name}</option>
          ))}
        </select>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <Flag team={props.teamB} />
          <span style={{ fontWeight: 600, fontSize: 14, color: props.teamB ? undefined : "var(--text-3)" }}>
            {props.teamB?.name ?? "—"}
          </span>
        </div>
      )}

      {/* Score */}
      <div className="ar-score-cell">
        <div className="score-pill">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={50}
            value={a}
            onChange={(e) => setA(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
            disabled={pending}
          />
          <span style={{ color: "var(--text-3)" }}>×</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={50}
            value={b}
            onChange={(e) => setB(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
            disabled={pending}
          />
        </div>
      </div>

      {/* Penalty winner (KO empate) */}
      <div className="ar-pen-cell" style={{ minWidth: needPenalty ? 110 : 0 }}>
        {needPenalty && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              className="mono"
              style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}
            >
              Pênaltis
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                onClick={() => setWinner("A")}
                className={`btn sm ${winner === "A" ? "primary" : ""}`}
                style={{ padding: "4px 8px", fontSize: 11, flex: 1, justifyContent: "center" }}
              >
                {props.teamA?.code ?? "A"}
              </button>
              <button
                type="button"
                onClick={() => setWinner("B")}
                className={`btn sm ${winner === "B" ? "primary" : ""}`}
                style={{ padding: "4px 8px", fontSize: 11, flex: 1, justifyContent: "center" }}
              >
                {props.teamB?.code ?? "B"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Date / round */}
      <div className="ar-meta">
        {props.round}
        <br />
        {dateStr}
      </div>

      {/* Save */}
      <div
        className="ar-save-cell"
        style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}
      >
        <button
          type="button"
          className="btn primary sm"
          onClick={onSave}
          disabled={pending}
          style={{ padding: "6px 12px" }}
        >
          {pending ? "..." : "Salvar"}
        </button>
        {msg && (
          <span
            className="mono"
            style={{ fontSize: 10, color: msg.kind === "ok" ? "var(--success)" : "var(--danger)" }}
          >
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
