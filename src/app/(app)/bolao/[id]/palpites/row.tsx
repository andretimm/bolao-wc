"use client";

import { useState, useTransition } from "react";
import { TeamLabel, type TeamLite } from "@/components/flag";
import { savePrediction } from "./actions";

export function PredictionRow(props: {
  bolaoId: string;
  matchId: string;
  teamA: TeamLite | null;
  teamB: TeamLite | null;
  kickoffAt: string;
  round: string;
  locked: boolean;
  hasResult: boolean;
  resultA: number | null;
  resultB: number | null;
  initialScoreA: number | null;
  initialScoreB: number | null;
  earned: number;
  isFinal: boolean;
}) {
  const [a, setA] = useState<string>(props.initialScoreA?.toString() ?? "");
  const [b, setB] = useState<string>(props.initialScoreB?.toString() ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dirty =
    a !== (props.initialScoreA?.toString() ?? "") ||
    b !== (props.initialScoreB?.toString() ?? "");

  const submit = () => {
    setError(null);
    if (props.isFinal && a !== "" && b !== "" && Number(a) === Number(b)) {
      setError("Sem empate na final.");
      return;
    }
    const fd = new FormData();
    fd.set("bolaoId", props.bolaoId);
    fd.set("matchId", props.matchId);
    fd.set("scoreA", a);
    fd.set("scoreB", b);
    start(async () => {
      const r = await savePrediction(fd);
      if ("error" in r && r.error) setError(r.error);
      else setSavedAt(Date.now());
    });
  };

  const date = new Date(props.kickoffAt);
  const dateStr =
    date.toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "short",
    }) +
    " · " +
    date.toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="palpite-row">
      <TeamLabel team={props.teamA} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div className={`score-pill ${pending ? "is-pending" : ""}`}>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            value={a}
            disabled={props.locked || pending}
            onChange={(e) => setA(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
            onBlur={() => dirty && a !== "" && b !== "" && submit()}
          />
          <span style={{ color: "var(--text-3)", fontSize: 12 }}>×</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            value={b}
            disabled={props.locked || pending}
            onChange={(e) => setB(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
            onBlur={() => dirty && a !== "" && b !== "" && submit()}
          />
        </div>
        {error && (
          <span style={{ color: "var(--danger)", fontSize: 10, fontFamily: "var(--font-mono)" }}>{error}</span>
        )}
        {!error && savedAt && (
          <span style={{ color: "var(--success)", fontSize: 10, fontFamily: "var(--font-mono)" }}>salvo</span>
        )}
      </div>
      <TeamLabel team={props.teamB} align="right" />
      <div className="pr-meta">
        {props.round}
        <br />
        {dateStr}
      </div>
      <div className="pr-status">
        {props.hasResult ? (
          <>
            <div
              className="mono"
              style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.08em" }}
            >
              OFICIAL
            </div>
            <div className="mono" style={{ fontSize: 14, fontWeight: 700 }}>
              {props.resultA} × {props.resultB}
            </div>
            <div
              className="mono"
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: props.earned > 0 ? "var(--accent)" : "var(--text-3)",
              }}
            >
              {props.earned > 0 ? `+${props.earned}` : "0"} pts
            </div>
          </>
        ) : props.locked ? (
          <span className="tag danger">FECHADO</span>
        ) : props.isFinal ? (
          <span className="tag accent">CAMPEÃO +50</span>
        ) : (
          <span className="tag accent">ABERTO</span>
        )}
      </div>
    </div>
  );
}
