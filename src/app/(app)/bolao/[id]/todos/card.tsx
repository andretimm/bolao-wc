import { TeamLabel, type TeamLite } from "@/components/flag";
import Image from "next/image";

export type MatchCardMember = {
  userId: string;
  name: string;
  init: string;
  color: string;
  avatarUrl: string | null;
  isMe: boolean;
  predLabel: string;
  hasPred: boolean;
  relativeLabel: string;
  total: number;
};

export type MatchCardItem = {
  matchId: string;
  round: string;
  kickoffLabel: string;
  teamA: TeamLite | null;
  teamB: TeamLite | null;
  resultA: number | null;
  resultB: number | null;
  hasResult: boolean;
  isFinal: boolean;
  members: MatchCardMember[];
};

export function MatchCard({
  round,
  kickoffLabel,
  teamA,
  teamB,
  resultA,
  resultB,
  hasResult,
  isFinal,
  members,
}: MatchCardItem) {
  return (
    <details className="card" open={!hasResult}>
      <summary>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr auto",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <TeamLabel team={teamA} />
          <div className="mono" style={{ fontSize: 14, fontWeight: 700, textAlign: "center" }}>
            {hasResult ? `${resultA} × ${resultB}` : "vs"}
          </div>
          <TeamLabel team={teamB} align="right" />
          <span className="details-chevron">▾</span>
        </div>
        <div
          className="mono"
          style={{
            fontSize: 10,
            color: "var(--text-3)",
            letterSpacing: "0.06em",
            padding: "6px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {round.toUpperCase()} · {kickoffLabel}
          {isFinal && <span style={{ color: "var(--accent)" }}> · CAMPEÃO +50</span>}
        </div>
      </summary>

      <div>
        {members.map((mem) => (
          <div
            key={mem.userId}
            style={{
              display: "grid",
              gridTemplateColumns: "32px 1fr auto auto",
              gap: 12,
              padding: "10px 16px",
              borderBottom: "1px solid var(--border)",
              alignItems: "center",
              background: mem.isMe ? "var(--accent-soft)" : undefined,
            }}
          >
            {mem.avatarUrl ? (
              <Image
                src={mem.avatarUrl}
                alt={mem.name}
                width={32}
                height={32}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <span
                className="avatar"
                style={{
                  background: mem.color,
                  color: "#0a0a0b",
                  borderColor: "transparent",
                }}
              >
                {mem.init}
              </span>
            )}
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              {mem.name}
              {mem.isMe && (
                <span
                  className="mono"
                  style={{
                    marginLeft: 8,
                    fontSize: 10,
                    color: "var(--accent)",
                    letterSpacing: "0.08em",
                  }}
                >
                  VOCÊ
                </span>
              )}
            </div>
            <div
              className="mono"
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: mem.hasPred ? "var(--text)" : "var(--text-3)",
                minWidth: 60,
                textAlign: "center",
              }}
            >
              {mem.predLabel}
            </div>
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: "var(--text-3)",
                letterSpacing: "0.04em",
                minWidth: 110,
                textAlign: "right",
              }}
            >
              {mem.relativeLabel}
              {hasResult && mem.hasPred && (
                <div
                  style={{
                    color: mem.total > 0 ? "var(--accent)" : "var(--text-3)",
                    fontWeight: 700,
                    marginTop: 2,
                  }}
                >
                  +{mem.total} pts
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
