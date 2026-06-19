"use client";

import { useState } from "react";
import { RoundSelect } from "@/components/round-select";
import { MatchCard, type MatchCardItem } from "./card";

export function TodosList({
  items,
  rounds,
}: {
  items: MatchCardItem[];
  rounds: string[];
}) {
  const [selectedRound, setSelectedRound] = useState("all");
  const filtered =
    selectedRound === "all" ? items : items.filter((i) => i.round === selectedRound);

  return (
    <>
      <RoundSelect rounds={rounds} value={selectedRound} onChange={setSelectedRound} />
      {filtered.length === 0 && <div className="empty">Nenhum jogo nessa rodada.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filtered.map((item) => (
          <MatchCard key={item.matchId} {...item} />
        ))}
      </div>
    </>
  );
}
