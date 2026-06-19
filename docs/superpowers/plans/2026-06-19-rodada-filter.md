# Filtro de rodada (palpites + todos) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a round (`rodada`) select filter to the `palpites` and `todos` screens of `/bolao/[id]/`, defaulting to "Todas as rodadas", filtering client-side with no page reload.

**Architecture:** Pages keep doing their server-side fetch/calc exactly as today, but build a plain-object `items` array (everything a row/card needs) plus a deduped `rounds: string[]` list. A new "use client" list component owns `selectedRound` state, filters `items` by `round`, and renders the existing row/card components. `todos` additionally gets its per-match `<details>` markup extracted into its own presentational component first (pure refactor, no behavior change) so the new list component has something to map over.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, no test runner in this repo (verify via `npm run lint` + `npm run build` + manual check in dev server).

## Global Constraints

- No automated test framework exists in this repo — verification is `npm run lint`, `npm run build` (typechecks via `tsc`), and manual check via `npm run dev`.
- Filter is client-side only, no URL/localStorage persistence (resets to "Todas" on page load) — per spec `docs/superpowers/specs/2026-06-19-rodada-filter-design.md`.
- Default select value is `"all"` → shows everything, must be the state on initial render.
- Round option values/labels = raw `m.round` string (e.g. `"Grupo A · R1"`, `"16-avos"`, `"Final"`), deduped in order of first appearance (lists are already ordered by `kickoffAt` ascending).
- Follow existing styling conventions: `.input` CSS class for selects (see `src/app/(app)/bolao/[id]/admin/row.tsx:64-69`), inline `style` objects for layout (no CSS modules/Tailwind component classes in this tree).

---

### Task 1: Shared `RoundSelect` component

**Files:**
- Create: `src/components/round-select.tsx`

**Interfaces:**
- Produces: `RoundSelect({ rounds, value, onChange }: { rounds: string[]; value: string; onChange: (value: string) => void })` — a `"use client"` component. Tasks 2 and 4 import and render this.

- [ ] **Step 1: Create the component**

```tsx
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
```

- [ ] **Step 2: Typecheck**

Run: `npm run build`
Expected: build succeeds (no other code references this file yet, so this just confirms the new file itself is valid TypeScript/JSX).

- [ ] **Step 3: Commit**

```bash
git add src/components/round-select.tsx
git commit -m "feat(palpites): adicionar componente RoundSelect"
```

---

### Task 2: Palpites — round filter

**Files:**
- Create: `src/app/(app)/bolao/[id]/palpites/list.tsx`
- Modify: `src/app/(app)/bolao/[id]/palpites/page.tsx`

**Interfaces:**
- Consumes: `RoundSelect` from Task 1 (`src/components/round-select.tsx`). `PredictionRow` from `src/app/(app)/bolao/[id]/palpites/row.tsx` (existing, props: `bolaoId, matchId, teamA, teamB, kickoffAt, round, locked, hasResult, resultA, resultB, initialScoreA, initialScoreB, earned, isFinal`).
- Produces: `PalpitesList({ bolaoId, items, rounds }: { bolaoId: string; items: PalpitesItem[]; rounds: string[] })` where `PalpitesItem` is the object shape built in `page.tsx` (see Step 2 below) — no other task consumes this.

- [ ] **Step 1: Create `list.tsx`**

```tsx
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
```

- [ ] **Step 2: Rewrite `page.tsx` to build `items`/`rounds` and render `PalpitesList`**

Replace the full file content of `src/app/(app)/bolao/[id]/palpites/page.tsx` with:

```tsx
import { requireAuth } from "@/lib/auth";
import { requireBolaoAccess } from "@/lib/access";
import { db } from "@/db";
import { predictions, teams } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getEffectiveMatches, pointsForPrediction } from "@/lib/match-state";
import type { TeamLite } from "@/components/flag";
import { PalpitesList } from "./list";
import { isPredictionLocked } from "@/lib/prediction-lock";

export const dynamic = "force-dynamic";

export default async function PalpitesPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await requireAuth();
  const { id: bolaoId } = await params;
  await requireBolaoAccess({ userId, bolaoId });

  const [effective, allTeams, myPreds] = await Promise.all([
    getEffectiveMatches(bolaoId),
    db.select().from(teams),
    db
      .select()
      .from(predictions)
      .where(and(eq(predictions.bolaoId, bolaoId), eq(predictions.userId, userId))),
  ]);

  const teamMap = new Map<string, TeamLite>(allTeams.map((t) => [t.code, t]));
  const predMap = new Map(myPreds.map((p) => [p.matchId, p]));
  const now = Date.now();

  const ready = effective.filter((m) => m.teamA && m.teamB);

  const items = ready.map((m) => {
    const pred = predMap.get(m.id);
    const hasResult = m.resultA != null && m.resultB != null;
    const locked = hasResult || isPredictionLocked(m.kickoffAt, now);
    const earned = pointsForPrediction(
      pred ? { scoreA: pred.scoreA, scoreB: pred.scoreB } : null,
      { resultA: m.resultA, resultB: m.resultB },
    );

    return {
      matchId: m.id,
      teamA: m.teamA ? teamMap.get(m.teamA) ?? null : null,
      teamB: m.teamB ? teamMap.get(m.teamB) ?? null : null,
      kickoffAt: m.kickoffAt.toISOString(),
      round: m.round,
      locked,
      hasResult,
      resultA: m.resultA,
      resultB: m.resultB,
      initialScoreA: pred?.scoreA ?? null,
      initialScoreB: pred?.scoreB ?? null,
      earned,
      isFinal: m.stage === "final",
    };
  });

  const rounds = Array.from(new Set(items.map((i) => i.round)));

  return (
    <div>
      <h2 style={{ margin: "0 0 14px", fontSize: 18, letterSpacing: "-0.015em" }}>Seus palpites</h2>
      <p className="page-sub" style={{ marginTop: 0, marginBottom: 18 }}>
        Placar exato = <b style={{ color: "var(--accent)" }}>+10 pts</b>. Só o vencedor ={" "}
        <b style={{ color: "var(--accent)" }}>+5 pts</b>. Palpite bloqueia 24h antes do jogo.
        <br />
        Acertar o campeão (vencedor da final) ={" "}
        <b style={{ color: "var(--accent)" }}>+50 pts extras</b>. Empate não permitido na final.
      </p>

      {items.length === 0 ? (
        <div className="card">
          <div className="empty">Nenhum jogo com times definidos ainda.</div>
        </div>
      ) : (
        <PalpitesList bolaoId={bolaoId} items={items} rounds={rounds} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Lint + typecheck**

Run: `npm run lint && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 4: Manual check**

Run: `npm run dev`, open `/bolao/<id>/palpites` for a bolão that has matches across more than one round.
Expected: select shows "Todas as rodadas" selected by default and full list visible. Picking a round in the dropdown narrows the list to only that round's match(es), instantly, no page reload. Picking "Todas as rodadas" again restores the full list. Existing score input/save behavior on each row still works.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/bolao/\[id\]/palpites/list.tsx src/app/\(app\)/bolao/\[id\]/palpites/page.tsx
git commit -m "feat(palpites): filtrar jogos por rodada"
```

---

### Task 3: Todos — extract `MatchCard` (pure refactor, no behavior change)

**Files:**
- Create: `src/app/(app)/bolao/[id]/todos/card.tsx`
- Modify: `src/app/(app)/bolao/[id]/todos/page.tsx`

**Interfaces:**
- Consumes: `TeamLabel, type TeamLite` from `@/components/flag` (existing).
- Produces: `MatchCard(props: MatchCardItem)` and `type MatchCardItem` (exported from `card.tsx`) — Task 4 imports both.

This task only moves existing JSX into its own file and feeds it the same values the inline code already computed — page output must be pixel-identical to before.

- [ ] **Step 1: Create `card.tsx`**

```tsx
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
  matchId,
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
    <details key={matchId} className="card" open={!hasResult}>
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
```

- [ ] **Step 2: Rewrite `page.tsx` to build `MatchCardItem[]` and render `MatchCard` directly (no filter yet — that's Task 4)**

Replace the full file content of `src/app/(app)/bolao/[id]/todos/page.tsx` with:

```tsx
import { requireAuth } from "@/lib/auth";
import { requireBolaoAccess } from "@/lib/access";
import { db } from "@/db";
import { memberships, predictions, teams } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getEffectiveMatches, pointsForPrediction } from "@/lib/match-state";
import { getUsers } from "@/lib/clerk-users";
import { colorFor } from "@/lib/colors";
import type { TeamLite } from "@/components/flag";
import { championBonus } from "@/lib/scoring";
import { MatchCard, type MatchCardItem } from "./card";

export const dynamic = "force-dynamic";

function relativeTime(from: Date, now: number): string {
  const diffMs = from.getTime() - now;
  const abs = Math.abs(diffMs);
  const minutes = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  if (minutes < 1) return "agora";
  if (minutes < 60) return rtf.format(Math.sign(diffMs) * minutes, "minute");
  if (hours < 24) return rtf.format(Math.sign(diffMs) * hours, "hour");
  return rtf.format(Math.sign(diffMs) * days, "day");
}

export default async function TodosPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await requireAuth();
  const { id: bolaoId } = await params;
  await requireBolaoAccess({ userId, bolaoId });

  const [effective, allTeams, members, allPreds] = await Promise.all([
    getEffectiveMatches(bolaoId),
    db.select().from(teams),
    db.select().from(memberships).where(eq(memberships.bolaoId, bolaoId)),
    db.select().from(predictions).where(eq(predictions.bolaoId, bolaoId)),
  ]);

  const teamMap = new Map<string, TeamLite>(allTeams.map((t) => [t.code, t]));
  const userMap = await getUsers(members.map((m) => m.userId));
  const now = Date.now();

  const predByMatch = new Map<
    string,
    Map<string, { scoreA: number; scoreB: number; updatedAt: Date }>
  >();
  for (const p of allPreds) {
    let inner = predByMatch.get(p.matchId);
    if (!inner) {
      inner = new Map();
      predByMatch.set(p.matchId, inner);
    }
    inner.set(p.userId, { scoreA: p.scoreA, scoreB: p.scoreB, updatedAt: p.updatedAt });
  }

  const ready = effective.filter((m) => m.teamA && m.teamB);

  const items: MatchCardItem[] = ready.map((m) => {
    const hasResult = m.resultA != null && m.resultB != null;
    const predsForMatch = predByMatch.get(m.id) ?? new Map();
    const isFinal = m.stage === "final";

    return {
      matchId: m.id,
      round: m.round,
      kickoffLabel: m.kickoffAt.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
      teamA: m.teamA ? teamMap.get(m.teamA) ?? null : null,
      teamB: m.teamB ? teamMap.get(m.teamB) ?? null : null,
      resultA: m.resultA,
      resultB: m.resultB,
      hasResult,
      isFinal,
      members: members.map((mem) => {
        const u = userMap.get(mem.userId);
        const name = u?.name ?? mem.userId.slice(0, 6);
        const color = u?.color ?? colorFor(mem.userId);
        const init = name
          .split(" ")
          .slice(0, 2)
          .map((s) => s[0])
          .join("")
          .toUpperCase();
        const pred = predsForMatch.get(mem.userId);
        const isMe = mem.userId === userId;

        const earned = pred
          ? pointsForPrediction(
              { scoreA: pred.scoreA, scoreB: pred.scoreB },
              { resultA: m.resultA, resultB: m.resultB },
            )
          : 0;
        const champ = pred
          ? championBonus(pred, { resultA: m.resultA, resultB: m.resultB })
          : 0;
        const total = earned + (isFinal ? champ : 0);

        return {
          userId: mem.userId,
          name,
          init,
          color,
          avatarUrl: u?.avatarUrl ?? null,
          isMe,
          predLabel: pred ? `${pred.scoreA} × ${pred.scoreB}` : "— × —",
          hasPred: !!pred,
          relativeLabel: pred ? relativeTime(pred.updatedAt, now) : "—",
          total,
        };
      }),
    };
  });

  return (
    <div>
      <h2 style={{ margin: "0 0 14px", fontSize: 18, letterSpacing: "-0.015em" }}>
        Palpites de todos
      </h2>
      <p className="page-sub" style={{ marginTop: 0, marginBottom: 18 }}>
        Veja o palpite de cada membro e quando foi feito. Jogos com resultado vêm recolhidos — clique para expandir.
      </p>

      {items.length === 0 && <div className="empty">Nenhum jogo com times definidos ainda.</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {items.map((item) => (
          <MatchCard key={item.matchId} {...item} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Lint + typecheck**

Run: `npm run lint && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 4: Manual check (regression only — no new behavior yet)**

Run: `npm run dev`, open `/bolao/<id>/todos`.
Expected: page looks and behaves exactly as before this task — same cards, same collapse/expand on click, same scores/points/avatars/relative times per member. No visual diff.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/bolao/\[id\]/todos/card.tsx src/app/\(app\)/bolao/\[id\]/todos/page.tsx
git commit -m "refactor(todos): extrair MatchCard do page.tsx"
```

---

### Task 4: Todos — round filter

**Files:**
- Create: `src/app/(app)/bolao/[id]/todos/list.tsx`
- Modify: `src/app/(app)/bolao/[id]/todos/page.tsx`

**Interfaces:**
- Consumes: `RoundSelect` from Task 1. `MatchCard`, `type MatchCardItem` from Task 3 (`src/app/(app)/bolao/[id]/todos/card.tsx`).
- Produces: `TodosList({ items, rounds }: { items: MatchCardItem[]; rounds: string[] })` — only consumed by `page.tsx`.

- [ ] **Step 1: Create `list.tsx`**

```tsx
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
```

- [ ] **Step 2: Wire `page.tsx` to use `TodosList`**

In `src/app/(app)/bolao/[id]/todos/page.tsx`:

1. Change the import line:

```tsx
import { MatchCard, type MatchCardItem } from "./card";
```

to:

```tsx
import type { MatchCardItem } from "./card";
import { TodosList } from "./list";
```

2. Replace the final return block:

```tsx
  return (
    <div>
      <h2 style={{ margin: "0 0 14px", fontSize: 18, letterSpacing: "-0.015em" }}>
        Palpites de todos
      </h2>
      <p className="page-sub" style={{ marginTop: 0, marginBottom: 18 }}>
        Veja o palpite de cada membro e quando foi feito. Jogos com resultado vêm recolhidos — clique para expandir.
      </p>

      {items.length === 0 && <div className="empty">Nenhum jogo com times definidos ainda.</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {items.map((item) => (
          <MatchCard key={item.matchId} {...item} />
        ))}
      </div>
    </div>
  );
```

with:

```tsx
  const rounds = Array.from(new Set(items.map((i) => i.round)));

  return (
    <div>
      <h2 style={{ margin: "0 0 14px", fontSize: 18, letterSpacing: "-0.015em" }}>
        Palpites de todos
      </h2>
      <p className="page-sub" style={{ marginTop: 0, marginBottom: 18 }}>
        Veja o palpite de cada membro e quando foi feito. Jogos com resultado vêm recolhidos — clique para expandir.
      </p>

      {items.length === 0 ? (
        <div className="empty">Nenhum jogo com times definidos ainda.</div>
      ) : (
        <TodosList items={items} rounds={rounds} />
      )}
    </div>
  );
```

- [ ] **Step 3: Lint + typecheck**

Run: `npm run lint && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 4: Manual check**

Run: `npm run dev`, open `/bolao/<id>/todos` for a bolão with matches across more than one round.
Expected: select shows "Todas as rodadas" selected by default, full list visible. Picking a round narrows the cards shown to that round, instantly, no reload. Picking "Todas as rodadas" restores full list. Collapse/expand per card, avatars, scores, points all still behave as before.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/bolao/\[id\]/todos/list.tsx src/app/\(app\)/bolao/\[id\]/todos/page.tsx
git commit -m "feat(todos): filtrar palpites por rodada"
```
