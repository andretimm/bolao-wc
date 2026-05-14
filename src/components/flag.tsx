import { FLAG_CODES } from "@/lib/flag-codes";

export type TeamLite = {
  code: string;
  name: string;
  color1: string;
  color2: string;
  color3: string;
};

export function Flag({ team, size = "md" }: { team: TeamLite | null | undefined; size?: "sm" | "md" }) {
  const w = size === "sm" ? 20 : 28;
  const h = size === "sm" ? 14 : 20;
  const fs = size === "sm" ? 7 : 9;

  if (!team) {
    return (
      <span className="flag" style={{ width: w, height: h, fontSize: fs }}>
        ?
      </span>
    );
  }

  if (FLAG_CODES.has(team.code)) {
    return (
      <span className="flag" style={{ width: w, height: h }} title={team.name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/flags/${team.code}.svg`}
          alt={team.code}
          width={w}
          height={h}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </span>
    );
  }

  return (
    <span className="flag" style={{ width: w, height: h, fontSize: fs }} title={team.name}>
      <span className="stripes v">
        <span className="s" style={{ background: team.color1 }} />
        <span className="s" style={{ background: team.color2 }} />
        <span className="s" style={{ background: team.color3 }} />
      </span>
      <span className="label">{team.code}</span>
    </span>
  );
}

export function TeamLabel({
  team,
  align = "left",
  placeholder = "—",
}: {
  team: TeamLite | null | undefined;
  align?: "left" | "right";
  placeholder?: string;
}) {
  const dim = !team;
  const name = team?.name ?? placeholder;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: 0,
        justifyContent: align === "right" ? "flex-end" : "flex-start",
      }}
    >
      {align === "right" && (
        <span
          style={{
            fontWeight: 600,
            fontSize: 14,
            color: dim ? "var(--text-3)" : undefined,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {name}
        </span>
      )}
      <Flag team={team} />
      {align !== "right" && (
        <span
          style={{
            fontWeight: 600,
            fontSize: 14,
            color: dim ? "var(--text-3)" : undefined,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {name}
        </span>
      )}
    </div>
  );
}
