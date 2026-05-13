# Aba "Todos" + Bônus Campeão — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Todos" tab showing every member's predictions per match with timestamps, and a +50 champion-bonus for picking the final's winner.

**Architecture:** No schema changes. New server component page reads `predictions` + `memberships` + `getEffectiveMatches`. Scoring helper `championBonus()` added in `src/lib/scoring.ts`. Ranking page extends SQL aggregation to add the bonus on `matches.stage = 'final'`. Server action and client row validate that final-stage predictions can't be a draw.

**Tech Stack:** Next.js 16 (App Router), React 19 Server Components, Drizzle ORM, Clerk auth, TypeScript, no test framework (manual verification per project convention).

**Notes:**
- No test framework in `package.json`. Verify each task manually via `pnpm dev` + browser, plus `pnpm lint` and `pnpm build` at the end.
- AGENTS.md requires reading the relevant Next 16 guide in `node_modules/next/dist/docs/` before writing route code. Step 1 does this.
- Spec: `docs/superpowers/specs/2026-05-13-todos-palpites-e-bonus-campeao-design.md`.
- Portuguese is the project language; UI strings are PT-BR. Code identifiers stay English where existing patterns are English (e.g. `championBonus`).

---

## Task 1: Read Next 16 routing guide

**Files:** none (read-only)

- [ ] **Step 1: Confirm async-params + server-action patterns**

Run: `ls node_modules/next/dist/docs/`
Then read whichever file covers app-router pages and server actions (look for `app`, `server-actions`, `routing` related files). Specifically confirm:
- `params: Promise<{ id: string }>` is the correct typing (matches existing `palpites/page.tsx`).
- `"use server"` action patterns (matches existing `palpites/actions.ts`).
- `revalidatePath` usage from `next/cache`.

No file changes. This is context-only.

---

## Task 2: Add `championBonus` to scoring lib

**Files:**
- Modify: `src/lib/scoring.ts`

- [ ] **Step 1: Add constant and function**

Replace the entire file with:

```ts
export type Score = { a: number; b: number };

/**
 * Scoring rules:
 *  +10 placar exato
 *  +5  só vencedor (ou empate certo)
 *  0   errou
 */
export function scorePrediction(pred: Score, result: Score | null): number {
  if (!result) return 0;
  if (pred.a === result.a && pred.b === result.b) return 10;
  const predWinner = Math.sign(pred.a - pred.b);
  const realWinner = Math.sign(result.a - result.b);
  return predWinner === realWinner ? 5 : 0;
}

/** Pontos extras por acertar o campeão (vencedor da final). */
export const CHAMPION_BONUS = 50;

/**
 * Retorna CHAMPION_BONUS se:
 *  - há resultado da final
 *  - palpite não é empate
 *  - resultado não é empate
 *  - sinal(palpite.a - palpite.b) === sinal(resultado.a - resultado.b)
 * Caso contrário retorna 0.
 *
 * Chamado apenas para o jogo cujo stage === "final".
 */
export function championBonus(
  pred: { scoreA: number; scoreB: number } | null,
  res: { resultA: number | null; resultB: number | null },
): number {
  if (!pred) return 0;
  if (res.resultA == null || res.resultB == null) return 0;
  if (pred.scoreA === pred.scoreB) return 0;
  if (res.resultA === res.resultB) return 0;
  return Math.sign(pred.scoreA - pred.scoreB) === Math.sign(res.resultA - res.resultB)
    ? CHAMPION_BONUS
    : 0;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/scoring.ts
git commit -m "feat(scoring): add championBonus for picking final winner"
```

---

## Task 3: Validate empate-na-final no server action

**Files:**
- Modify: `src/app/(app)/bolao/[id]/palpites/actions.ts`

- [ ] **Step 1: Add `stage` to the select and reject draw on final**

The current select pulls match fields. Add `stage: matches.stage` to the select object, then after the existing `kickoffAt` lock check, add the final-draw guard.

Replace the select block:

```ts
  const [row] = await db
    .select({
      kickoffAt: matches.kickoffAt,
      stage: matches.stage,
      tplA: matches.teamA,
      tplB: matches.teamB,
      stA: bolaoMatchState.teamA,
      stB: bolaoMatchState.teamB,
      resultA: bolaoMatchState.resultA,
      resultB: bolaoMatchState.resultB,
      offA: matchOfficialResult.teamA,
      offB: matchOfficialResult.teamB,
      offResA: matchOfficialResult.resultA,
      offResB: matchOfficialResult.resultB,
    })
    .from(matches)
    .leftJoin(
      bolaoMatchState,
      sql`${bolaoMatchState.matchId} = ${matches.id} and ${bolaoMatchState.bolaoId} = ${bolaoId}`,
    )
    .leftJoin(matchOfficialResult, eq(matchOfficialResult.matchId, matches.id))
    .where(eq(matches.id, matchId));
```

Then add the guard just before the `db.insert(...)`:

```ts
  if (row.stage === "final" && scoreA === scoreB) {
    return { error: "Empate não permitido na final — escolha o campeão." } as const;
  }
```

- [ ] **Step 2: Verify typecheck + lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 3: Manual test**

Run `pnpm dev`. Open `/bolao/<id>/palpites` and attempt to save a 1×1 prediction on the final (when teams resolved). Expect error toast "Empate não permitido na final — escolha o campeão." Other matches still accept draws.

If the final has no teams yet (KO not resolved), skip manual test — Task 6 verification will cover after teams are set.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/bolao/[id]/palpites/actions.ts
git commit -m "feat(palpites): reject draw predictions on the final"
```

---

## Task 4: Client-side block of empate-na-final + aviso campeão

**Files:**
- Modify: `src/app/(app)/bolao/[id]/palpites/row.tsx`
- Modify: `src/app/(app)/bolao/[id]/palpites/page.tsx`

- [ ] **Step 1: Add `isFinal` prop and final-draw block in `row.tsx`**

In `src/app/(app)/bolao/[id]/palpites/row.tsx`, add `isFinal: boolean;` to the props type. Then:

- Compute a `finalDraw` flag inside the component: `const finalDraw = props.isFinal && a !== "" && b !== "" && Number(a) === Number(b);`
- Block submission when `finalDraw` is true: in `submit()`, return early and set error `"Sem empate na final."`.
- Also pass that error to the existing error UI (just set `setError("Sem empate na final.")` and bail).

Full replacement of the `submit` function:

```tsx
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
```

Then add a visible "CAMPEÃO +50" pill in the `pr-status` block when `props.isFinal && !props.hasResult && !props.locked`. Insert this immediately above the existing `ABERTO` branch:

```tsx
        ) : props.locked ? (
          <span className="tag danger">FECHADO</span>
        ) : props.isFinal ? (
          <span className="tag accent">CAMPEÃO +50</span>
        ) : (
          <span className="tag accent">ABERTO</span>
        )}
```

- [ ] **Step 2: Pass `isFinal` from `page.tsx`**

In `src/app/(app)/bolao/[id]/palpites/page.tsx`, inside the `ready.map`, add `isFinal={m.stage === "final"}` to the `<PredictionRow ... />` props.

Also update the rules `<p>` block to mention the champion bonus. Replace the existing `<p className="page-sub">…</p>`:

```tsx
      <p className="page-sub" style={{ marginTop: 0, marginBottom: 18 }}>
        Placar exato = <b style={{ color: "var(--accent)" }}>+10 pts</b>. Só o vencedor ={" "}
        <b style={{ color: "var(--accent)" }}>+5 pts</b>. Palpite bloqueia 24h antes do jogo.
        <br />
        Acertar o campeão (vencedor da final) ={" "}
        <b style={{ color: "var(--accent)" }}>+50 pts extras</b>. Empate não permitido na final.
      </p>
```

- [ ] **Step 3: Verify typecheck + lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 4: Manual test**

`pnpm dev`. Open `/bolao/<id>/palpites`:
- Final match row shows `CAMPEÃO +50` pill when open.
- Try to set 1×1 on final → inline error "Sem empate na final.", server never called.
- Other matches still accept draws.
- Rules paragraph mentions +50 bonus.

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/bolao/[id]/palpites/row.tsx src/app/(app)/bolao/[id]/palpites/page.tsx
git commit -m "feat(palpites): block draw on final + show CAMPEÃO +50 pill"
```

---

## Task 5: Apply champion bonus in ranking aggregation

**Files:**
- Modify: `src/app/(app)/bolao/[id]/ranking/page.tsx`

- [ ] **Step 1: Join `matches` and add `championBonus` column to the SQL aggregation**

Open `src/app/(app)/bolao/[id]/ranking/page.tsx`. Import `matches` from the schema (already imports `bolaoMatchState, matchOfficialResult, memberships, predictions` — add `matches`):

```ts
import { bolaoMatchState, matches, matchOfficialResult, memberships, predictions } from "@/db/schema";
```

Add the join with `matches` and a new aggregate column. The new query body:

```ts
  const agg = await db
    .select({
      userId: memberships.userId,
      exact: sql<number>`
        coalesce(sum(case
          when ${rA} is not null
           and ${predictions.scoreA} = ${rA}
           and ${predictions.scoreB} = ${rB} then 1 else 0 end), 0)::int`,
      winners: sql<number>`
        coalesce(sum(case
          when ${rA} is not null
           and not (${predictions.scoreA} = ${rA} and ${predictions.scoreB} = ${rB})
           and sign(${predictions.scoreA} - ${predictions.scoreB}) = sign(${rA} - ${rB})
          then 1 else 0 end), 0)::int`,
      misses: sql<number>`
        coalesce(sum(case
          when ${rA} is not null
           and not (${predictions.scoreA} = ${rA} and ${predictions.scoreB} = ${rB})
           and sign(${predictions.scoreA} - ${predictions.scoreB}) <> sign(${rA} - ${rB})
          then 1 else 0 end), 0)::int`,
      championBonus: sql<number>`
        coalesce(sum(case
          when ${matches.stage} = 'final'
           and ${rA} is not null
           and ${predictions.scoreA} <> ${predictions.scoreB}
           and ${rA} <> ${rB}
           and sign(${predictions.scoreA} - ${predictions.scoreB}) = sign(${rA} - ${rB})
          then 50 else 0 end), 0)::int`,
      points: sql<number>`
        coalesce(sum(case
          when ${rA} is not null then
            case
              when ${predictions.scoreA} = ${rA} and ${predictions.scoreB} = ${rB} then 10
              when sign(${predictions.scoreA} - ${predictions.scoreB}) = sign(${rA} - ${rB}) then 5
              else 0
            end
          else 0 end), 0)::int
        +
        coalesce(sum(case
          when ${matches.stage} = 'final'
           and ${rA} is not null
           and ${predictions.scoreA} <> ${predictions.scoreB}
           and ${rA} <> ${rB}
           and sign(${predictions.scoreA} - ${predictions.scoreB}) = sign(${rA} - ${rB})
          then 50 else 0 end), 0)::int`,
    })
    .from(memberships)
    .leftJoin(
      predictions,
      and(eq(predictions.bolaoId, memberships.bolaoId), eq(predictions.userId, memberships.userId)),
    )
    .leftJoin(matches, eq(matches.id, predictions.matchId))
    .leftJoin(
      bolaoMatchState,
      and(eq(bolaoMatchState.bolaoId, memberships.bolaoId), eq(bolaoMatchState.matchId, predictions.matchId)),
    )
    .leftJoin(matchOfficialResult, eq(matchOfficialResult.matchId, predictions.matchId))
    .where(eq(memberships.bolaoId, bolaoId))
    .groupBy(memberships.userId);
```

- [ ] **Step 2: Show `CAMP +50` badge in list rows when `championBonus > 0`**

In the list-row render (the `sorted.map` block), modify the stats line that currently shows `<b>{r.exact}</b> ex · ... err`. Append the champion badge conditionally. Replace that `<div>`:

```tsx
              <div className="mono" style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.04em" }}>
                <b style={{ color: "var(--text)" }}>{r.exact}</b> ex ·{" "}
                <b style={{ color: "var(--text)" }}>{r.winners}</b> venc ·{" "}
                <b style={{ color: "var(--text)" }}>{r.misses}</b> err
                {r.championBonus > 0 && (
                  <>
                    {" · "}
                    <b style={{ color: "var(--accent)" }}>CAMP +50</b>
                  </>
                )}
              </div>
```

- [ ] **Step 3: Verify typecheck + lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 4: Manual test**

`pnpm dev`. Open `/bolao/<id>/ranking`:
- If the final has no result yet, all `championBonus` = 0, no badge shown.
- (Simulate via admin / DB) set a final result and a prediction whose winner side matches → that user's `points` increases by 50 and `CAMP +50` badge appears next to their stats line.
- A user who predicted a draw on the final or wrong side gets no bonus.

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/bolao/[id]/ranking/page.tsx
git commit -m "feat(ranking): add +50 champion bonus to points + badge"
```

---

## Task 6: Add "Todos" tab to navigation

**Files:**
- Modify: `src/app/(app)/bolao/[id]/tabs.tsx`

- [ ] **Step 1: Add entry**

Insert `{ href: \`${base}/todos\`, label: "Todos" }` between `Palpites` and the admin/ranking entries. Replace the `tabs` array:

```tsx
  const tabs: { href: string; label: string }[] = [
    { href: `${base}/chaves`, label: "Chaves" },
    { href: `${base}/palpites`, label: "Palpites" },
    { href: `${base}/todos`, label: "Todos" },
    ...(isAdmin ? [{ href: `${base}/admin`, label: "Admin" }] : []),
    { href: `${base}/ranking`, label: "Ranking" },
    { href: `${base}/atividade`, label: "Atividade" },
    { href: `${base}/settings`, label: isAdmin ? "Settings" : "Sair" },
  ];
```

- [ ] **Step 2: Verify dev render**

Note: route doesn't exist yet — clicking the new tab will 404. That's fine for this step; Task 7 adds the page. Just confirm the tab renders in the strip without breaking the layout.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/bolao/[id]/tabs.tsx
git commit -m "feat(bolao): add Todos tab"
```

---

## Task 7: Create the "Todos" page

**Files:**
- Create: `src/app/(app)/bolao/[id]/todos/page.tsx`

- [ ] **Step 1: Write the page**

Create `src/app/(app)/bolao/[id]/todos/page.tsx`:

```tsx
import { requireAuth } from "@/lib/auth";
import { requireBolaoAccess } from "@/lib/access";
import { db } from "@/db";
import { memberships, predictions, teams } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getEffectiveMatches, pointsForPrediction } from "@/lib/match-state";
import { getUsers } from "@/lib/clerk-users";
import { colorFor } from "@/lib/colors";
import { TeamLabel, type TeamLite } from "@/components/flag";
import { championBonus } from "@/lib/scoring";

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

  return (
    <div>
      <h2 style={{ margin: "0 0 14px", fontSize: 18, letterSpacing: "-0.015em" }}>
        Palpites de todos
      </h2>
      <p className="page-sub" style={{ marginTop: 0, marginBottom: 18 }}>
        Veja o palpite de cada membro e quando foi feito. Sempre visível.
      </p>

      {ready.length === 0 && <div className="empty">Nenhum jogo com times definidos ainda.</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {ready.map((m) => {
          const hasResult = m.resultA != null && m.resultB != null;
          const predsForMatch = predByMatch.get(m.id) ?? new Map();
          const isFinal = m.stage === "final";

          return (
            <div key={m.id} className="card">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto 1fr",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <TeamLabel team={m.teamA ? teamMap.get(m.teamA) ?? null : null} />
                <div className="mono" style={{ fontSize: 14, fontWeight: 700, textAlign: "center" }}>
                  {hasResult ? `${m.resultA} × ${m.resultB}` : "vs"}
                </div>
                <TeamLabel team={m.teamB ? teamMap.get(m.teamB) ?? null : null} align="right" />
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
                {m.round.toUpperCase()} · {m.kickoffAt.toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {isFinal && <span style={{ color: "var(--accent)" }}> · CAMPEÃO +50</span>}
              </div>

              <div>
                {members.map((mem) => {
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

                  return (
                    <div
                      key={mem.userId}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "32px 1fr auto auto",
                        gap: 12,
                        padding: "10px 16px",
                        borderBottom: "1px solid var(--border)",
                        alignItems: "center",
                        background: isMe ? "var(--accent-soft)" : undefined,
                      }}
                    >
                      <span
                        className="avatar"
                        style={{ background: color, color: "#0a0a0b", borderColor: "transparent" }}
                      >
                        {init}
                      </span>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        {name}
                        {isMe && (
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
                          color: pred ? "var(--text)" : "var(--text-3)",
                          minWidth: 60,
                          textAlign: "center",
                        }}
                      >
                        {pred ? `${pred.scoreA} × ${pred.scoreB}` : "— × —"}
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
                        {pred ? relativeTime(pred.updatedAt, now) : "—"}
                        {hasResult && pred && (
                          <div
                            style={{
                              color: total > 0 ? "var(--accent)" : "var(--text-3)",
                              fontWeight: 700,
                              marginTop: 2,
                            }}
                          >
                            +{total} pts
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck + lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 3: Manual test**

`pnpm dev`. Open `/bolao/<id>/todos`:
- Loads without errors.
- Shows each ready match (teams defined) as a card.
- Each card lists every bolão member in order — including members with no prediction (`— × —` and `—` timestamp).
- Members with a prediction show `score × score` and relative timestamp (e.g. "há 3 horas").
- Your own row is highlighted with `--accent-soft`.
- For the final match, header shows `CAMPEÃO +50`.
- When a match has an official result, each prediction shows `+N pts` (10 for exact, 5 for winner, +50 added on final if champion bonus applies).

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/bolao/[id]/todos/page.tsx
git commit -m "feat(bolao): add Todos page showing every member's predictions"
```

---

## Task 8: Final verification (typecheck, lint, build, smoke test)

**Files:** none

- [ ] **Step 1: Full build**

Run: `pnpm lint && pnpm exec tsc --noEmit && pnpm build`
Expected: zero errors.

- [ ] **Step 2: Smoke test across pages**

`pnpm dev`. Visit:
- `/bolao/<id>/palpites` — final has CAMPEÃO +50 pill; draw blocked on final.
- `/bolao/<id>/todos` — every member listed per match with timestamp.
- `/bolao/<id>/ranking` — totals consistent; CAMP +50 badge if final winner correct.

- [ ] **Step 3: No commit needed** (verification only)
