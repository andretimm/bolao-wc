"use client";

export function RoundSelect({
  rounds,
  value,
  onChange,
}: {
  rounds: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: "auto", marginBottom: 16 }}
    >
      <option value="all">Todas as rodadas</option>
      {rounds.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  );
}
