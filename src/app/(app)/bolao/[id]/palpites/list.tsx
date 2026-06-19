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
  locked: boolean;
  hasResult: boolean;
  resultA: number | null;
  resultB: number | null;
  initialScoreA: number | null;
  initialScoreB: number | null;
  earned: number;
  isFinal: boolean;
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
  const filtered =
    selectedRound === "all" ? items : items.filter((i) => i.round === selectedRound);

  return (
    <>
      <RoundSelect rounds={rounds} value={selectedRound} onChange={setSelectedRound} />
      <div className="card">
        {filtered.length === 0 && <div className="empty">Nenhum jogo nessa rodada.</div>}
        {filtered.map((item) => (
          <PredictionRow key={item.matchId} bolaoId={bolaoId} {...item} />
        ))}
      </div>
    </>
  );
}
