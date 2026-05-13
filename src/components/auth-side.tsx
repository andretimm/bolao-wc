export function AuthSide({ eyebrow = "Auth" }: { eyebrow?: string }) {
  const ranking: [string, string, number, "" | "me"][] = [
    ["01", "Camila Rocha", 95, ""],
    ["02", "Você", 80, "me"],
    ["03", "Pedro Mendes", 75, ""],
    ["04", "Júlia Andrade", 60, ""],
  ];

  return (
    <div className="auth-side">
      <div className="brand">
        <div className="brand-mark">⚽</div>
        <div className="brand-text">
          BOLÃO
          <small>copa · 2026</small>
        </div>
      </div>
      <div className="auth-quote">
        Quem acerta o <span className="mono-frame">PLACAR EXATO</span> ganha{" "}
        <span className="mono-frame">+10</span>. Quem só acerta o vencedor,{" "}
        <span className="mono-frame">+5</span>. Mais nada. Mais nenhuma desculpa.
      </div>
      <div className="auth-illu">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: "var(--text-3)",
            fontSize: 10,
            letterSpacing: "0.12em",
          }}
        >
          <span>RANKING · BOLÃO DOS MANOS</span>
          <span>RODADA 02</span>
        </div>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {ranking.map(([pos, name, pts, hl]) => (
            <div
              key={pos}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 8px",
                borderRadius: 6,
                background: hl === "me" ? "var(--accent-soft)" : "transparent",
                color: hl === "me" ? "var(--accent)" : "var(--text)",
              }}
            >
              <span>
                <b style={{ color: "var(--text-3)", marginRight: 8 }}>{pos}</b>
                {name}
              </span>
              <b className="mono">{pts} pts</b>
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--text-3)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        v2.4 · {eyebrow}
      </div>
    </div>
  );
}
