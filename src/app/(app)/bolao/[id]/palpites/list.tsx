"use client";

import { useState } from "react";
import { RoundSelect } from "@/components/round-select";
import { PredictionRow } from "./row";
import type { TeamLite } from "@/components/flag";

export type PalpitesItem = {
  matchId: string;
  teamA: TeamLite | null;
  teamB: TeamLite | null;
  kickoffAt: string;
  round: string;
  roundKey: string;
  locked: boolean;
  hasResult: boolean;
  resultA: number | null;
  resultB: number | null;
  initialScoreA: number | null;
  initialScoreB: number | null;
  earned: number;
  hasPrediction: boolean;
};

export function PalpitesList({
  bolaoId,
  items,
  rounds,
}: {
  bolaoId: string;
  items: PalpitesItem[];
  rounds: string[];
}) {
  const [selectedRound, setSelectedRound] = useState("all");
  const [onlyMissing, setOnlyMissing] = useState(false);

  const missingCount = items.filter((i) => !i.hasPrediction && !i.locked && !i.hasResult).length;

  const byRound = selectedRound === "all" ? items : items.filter((i) => i.roundKey === selectedRound);
  const filtered = onlyMissing ? byRound.filter((i) => !i.hasPrediction && !i.locked && !i.hasResult) : byRound;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <RoundSelect rounds={rounds} value={selectedRound} onChange={(r) => { setSelectedRound(r); setOnlyMissing(false); }} />
        {missingCount > 0 && (
          <button
            type="button"
            className={`btn${onlyMissing ? " primary" : ""}`}
            style={{ fontSize: 12, padding: "4px 10px" }}
            onClick={() => setOnlyMissing((v) => !v)}
          >
            {missingCount} sem palpite
          </button>
        )}
      </div>
      <div className="card">
        {filtered.length === 0 && <div className="empty">Nenhum jogo nessa rodada.</div>}
        {filtered.map((item) => (
          <PredictionRow key={item.matchId} bolaoId={bolaoId} {...item} />
        ))}
      </div>
    </>
  );
}
