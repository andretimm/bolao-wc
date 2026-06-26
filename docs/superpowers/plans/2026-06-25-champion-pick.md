# Champion Pick Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the final-guess champion bonus with a separate "pick the champion" bet made once the round-of-16 bracket opens, scored against the actual final winner; the final itself reverts to scoring like any other match.

**Architecture:** New `championPicks` table (insert-once, no update path = enforcement). New `src/lib/champion.ts` exposes two pure-ish query helpers (`getChampionWindow`, `getChampionTeam`) built on the existing `getEffectiveMatches`. `palpites/page.tsx` gains a blocking pick modal; `todos/page.tsx` gains a visibility section; `ranking/page.tsx` recomputes the bonus in JS instead of SQL.

**Tech Stack:** Next.js (App Router, Server Actions), Drizzle ORM (Postgres/Neon), TypeScript, no CSS framework (inline styles + global classes in `globals.css`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-25-champion-pick-design.md` — every task below implements one section of it.
- **No automated test runner exists in this repo** (no jest/vitest config, no `*.test.*` files, no `test` script in `package.json`). Do not add one as part of this feature. Verify each task with `npx tsc --noEmit` (type-check) and, where noted, a manual DB/browser check. This is a deliberate deviation from the default TDD step template — the codebase has zero test infra and adding one is out of scope.
- **Do NOT run `git commit` for any step in this plan.** The user explicitly asked for no commits this session. Skip every commit step that would normally appear in this template; leave all changes in the working tree.
- Follow existing code style exactly: inline `style={{...}}` objects, no Tailwind, Portuguese copy/strings, `"use client"` only on interactive leaf components, server components do the data fetching.
- Money/points constants: exact = 10, winner-only = 5, champion bonus = 50 (`CHAMPION_BONUS`, unchanged value, new meaning).

---

### Task 1: `championPicks` table + migration

**Files:**
- Modify: `src/db/schema.ts`
- Create (generated): a new file under `drizzle/` (via `drizzle-kit generate`)

**Interfaces:**
- Produces: exported table `championPicks` with columns `bolaoId: text`, `userId: text`, `teamCode: text`, `pickedAt: timestamp` (withTimezone, defaultNow, notNull), PK `(bolaoId, userId)`. Consumed by `src/lib/champion.ts` (Task 2), `palpites/actions.ts` (Task 4), `todos/page.tsx` (Task 8), `ranking/page.tsx` (Task 9).

- [ ] **Step 1: Add the table to the schema**

Open `src/db/schema.ts`. Insert this block right after the `predictions` table definition (after the closing `);` that follows the `predictions` table, before the `/* ─── Relations ─── */` comment):

```ts
/* ─── Champion picks — escolha única por usuário, feita na abertura das oitavas (r16).
   Sem update/delete exposto: a ausência de qualquer action de edição é a garantia de
   "não pode trocar depois". */
export const championPicks = pgTable(
  "champion_picks",
  {
    bolaoId: text("bolao_id").notNull().references(() => boloes.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    teamCode: text("team_code").notNull().references(() => teams.code),
    pickedAt: timestamp("picked_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.bolaoId, t.userId] })],
);
```

- [ ] **Step 2: Generate the migration**

Run: `npm run db:generate`
Expected: a new `drizzle/00XX_<name>.sql` file is created containing `CREATE TABLE "champion_picks" (...)`. Read the generated SQL file to confirm it has `bolao_id`, `user_id`, `team_code`, `picked_at`, and a composite primary key on `(bolao_id, user_id)`.

- [ ] **Step 3: Apply the migration**

Run: `npm run db:migrate`
Expected output ends with: `[✓] migrations applied successfully!`

- [ ] **Step 4: Verify the table exists**

Run: `npx tsc --noEmit`
Expected: no errors (confirms `championPicks` is a valid exported member of the schema module before later tasks import it).

---

### Task 2: `src/lib/champion.ts` — window + champion resolution

**Files:**
- Create: `src/lib/champion.ts`

**Interfaces:**
- Consumes: `getEffectiveMatches(bolaoId: string)` from `@/lib/match-state` (returns `EffectiveMatch[]` with fields `stage`, `teamA: string | null`, `teamB: string | null`, `kickoffAt: Date`, `resultA: number | null`, `resultB: number | null`, `winner: "A" | "B" | null` — already defined in `src/lib/match-state.ts:6-18`).
- Produces:
  - `getChampionWindow(bolaoId: string): Promise<{ teams: string[]; opened: boolean; locked: boolean }>` — consumed by `palpites/actions.ts` (Task 4), `palpites/page.tsx` (Task 7), `todos/page.tsx` (Task 8).
  - `getChampionTeam(bolaoId: string): Promise<string | null>` — consumed by `todos/page.tsx` (Task 8), `ranking/page.tsx` (Task 9).

- [ ] **Step 1: Write the file**

```ts
import { getEffectiveMatches } from "@/lib/match-state";

export type ChampionWindow = {
  /** Os 16 codes de time disponíveis para escolha. Vazio se `opened` for false. */
  teams: string[];
  /** true quando os 8 jogos da fase r16 (oitavas) já têm os dois times definidos. */
  opened: boolean;
  /** true quando o primeiro jogo das oitavas já começou — janela de escolha fechada. */
  locked: boolean;
};

export async function getChampionWindow(bolaoId: string): Promise<ChampionWindow> {
  const effective = await getEffectiveMatches(bolaoId);
  const r16 = effective.filter((m) => m.stage === "r16");

  if (r16.length < 8 || r16.some((m) => !m.teamA || !m.teamB)) {
    return { teams: [], opened: false, locked: false };
  }

  const teams = Array.from(new Set(r16.flatMap((m) => [m.teamA as string, m.teamB as string])));
  const earliestKickoff = Math.min(...r16.map((m) => m.kickoffAt.getTime()));
  const locked = Date.now() >= earliestKickoff;

  return { teams, opened: true, locked };
}

/** Time campeão real, com base no resultado efetivo da final. null se a final ainda não terminou. */
export async function getChampionTeam(bolaoId: string): Promise<string | null> {
  const effective = await getEffectiveMatches(bolaoId);
  const final = effective.find((m) => m.stage === "final");
  if (!final || final.resultA == null || final.resultB == null) return null;

  if (final.resultA !== final.resultB) {
    return final.resultA > final.resultB ? final.teamA : final.teamB;
  }
  if (final.winner === "A") return final.teamA;
  if (final.winner === "B") return final.teamB;
  return null;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual sanity check against the dev DB**

Run this one-off check (adjust the bolão id to one that exists in your dev DB — list them with `npx tsx -e "import {db} from './src/db'; import {boloes} from './src/db/schema'; db.select().from(boloes).then(r=>{console.log(r); process.exit(0)})"`):

```bash
npx tsx -e "
import { getChampionWindow, getChampionTeam } from './src/lib/champion';
const bolaoId = process.argv[1];
Promise.all([getChampionWindow(bolaoId), getChampionTeam(bolaoId)]).then(([w, c]) => {
  console.log('window:', w);
  console.log('champion:', c);
  process.exit(0);
});
" <bolao-id>
```

Expected: prints a `window` object with `opened: false, teams: [], locked: false` if r16 isn't seeded with both teams yet (true for a freshly seeded DB), and `champion: null`. This confirms the function runs without throwing against real data — the seed script only fills `r32`-stage data via results, so `opened: false` is the correct result at this point.

---

### Task 3: `src/lib/scoring.ts` — swap champion bonus source

**Files:**
- Modify: `src/lib/scoring.ts`

**Interfaces:**
- Produces: `CHAMPION_BONUS = 50` (unchanged name/value), `championPickBonus(pickTeam: string | null, championTeam: string | null): number` (new — replaces the old `championBonus(pred, res)`). Consumed by `todos/page.tsx` (Task 8) and `ranking/page.tsx` (Task 9).
- Removes: `championBonus(pred, res)` — its only callers (`ranking/page.tsx:41-48`, `todos/page.tsx:102-105`) are rewritten in Tasks 8 and 9 to stop calling it.

- [ ] **Step 1: Replace the champion bonus section**

In `src/lib/scoring.ts`, replace lines 17-41 (everything from `/** Pontos extras por acertar o campeão...` through the closing `}` of `championBonus`) with:

```ts
/** Pontos extras por escolher corretamente o campeão na abertura das oitavas (r16). */
export const CHAMPION_BONUS = 50;

/**
 * +50 se o time escolhido pelo usuário (championPicks.teamCode) é o time que
 * de fato venceu a final. 0 caso contrário, ou se a final ainda não terminou,
 * ou se o usuário nunca escolheu.
 */
export function championPickBonus(pickTeam: string | null, championTeam: string | null): number {
  if (!pickTeam || !championTeam) return 0;
  return pickTeam === championTeam ? CHAMPION_BONUS : 0;
}
```

The full file should now read:

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

/** Pontos extras por escolher corretamente o campeão na abertura das oitavas (r16). */
export const CHAMPION_BONUS = 50;

/**
 * +50 se o time escolhido pelo usuário (championPicks.teamCode) é o time que
 * de fato venceu a final. 0 caso contrário, ou se a final ainda não terminou,
 * ou se o usuário nunca escolheu.
 */
export function championPickBonus(pickTeam: string | null, championTeam: string | null): number {
  if (!pickTeam || !championTeam) return 0;
  return pickTeam === championTeam ? CHAMPION_BONUS : 0;
}
```

- [ ] **Step 2: Type-check (expect failures elsewhere — that's the point)**

Run: `npx tsc --noEmit`
Expected: errors in `src/app/(app)/bolao/[id]/ranking/page.tsx` and `src/app/(app)/bolao/[id]/todos/page.tsx` (`championBonus` no longer exported). This is expected — Tasks 8 and 9 fix those files. Do not fix them here; just confirm the only errors are in those two files (no unexpected breakage elsewhere).

---

### Task 4: `palpites/actions.ts` — drop final no-draw rule, add `pickChampion`

**Files:**
- Modify: `src/app/(app)/bolao/[id]/palpites/actions.ts`

**Interfaces:**
- Consumes: `getChampionWindow` from `@/lib/champion` (Task 2), `championPicks` from `@/db/schema` (Task 1).
- Produces: server action `pickChampion(formData: FormData): Promise<{ error: string } | { ok: true }>` — consumed by `champion-modal.tsx` (Task 6).

- [ ] **Step 1: Remove the final no-draw guard**

In `src/app/(app)/bolao/[id]/palpites/actions.ts`, delete lines 66-68:

```ts
  if (row.stage === "final" && scoreA === scoreB) {
    return { error: "Empate não permitido na final — escolha o campeão." } as const;
  }
```

(The `row.stage` field becomes unused after this — that's fine, it's still selected and harmless; leave the `select` as-is to avoid touching unrelated code.)

- [ ] **Step 2: Add imports for the new action**

At the top of the file, change:

```ts
import { bolaoMatchState, matches, matchOfficialResult, predictions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { isPredictionLocked } from "@/lib/prediction-lock";
```

to:

```ts
import { bolaoMatchState, championPicks, matches, matchOfficialResult, predictions } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { isPredictionLocked } from "@/lib/prediction-lock";
import { getChampionWindow } from "@/lib/champion";
```

- [ ] **Step 3: Append the `pickChampion` action**

At the end of the file (after the closing `}` of `savePrediction`), add:

```ts

export async function pickChampion(formData: FormData) {
  const { userId } = await requireAuth();

  const bolaoId = String(formData.get("bolaoId") ?? "");
  const teamCode = String(formData.get("teamCode") ?? "");
  if (!bolaoId || !teamCode) return { error: "Dados inválidos." } as const;

  await requireBolaoAccess({ userId, bolaoId });

  const window = await getChampionWindow(bolaoId);
  if (!window.opened) return { error: "Fase ainda não abriu." } as const;
  if (window.locked) return { error: "Janela de escolha encerrada." } as const;
  if (!window.teams.includes(teamCode)) return { error: "Time inválido." } as const;

  const existing = await db.query.championPicks.findFirst({
    where: and(eq(championPicks.bolaoId, bolaoId), eq(championPicks.userId, userId)),
  });
  if (existing) return { error: "Você já escolheu seu campeão." } as const;

  await db.insert(championPicks).values({ bolaoId, userId, teamCode });

  revalidatePath(`/bolao/${bolaoId}/palpites`);
  return { ok: true } as const;
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in this file (the pre-existing ranking/todos errors from Task 3 remain — unrelated to this task).

---

### Task 5: Strip `isFinal` special-casing from the palpites prediction row

**Files:**
- Modify: `src/app/(app)/bolao/[id]/palpites/list.tsx`
- Modify: `src/app/(app)/bolao/[id]/palpites/row.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `PalpitesItem` type (in `list.tsx`) and `PredictionRow` props (in `row.tsx`) both drop the `isFinal: boolean` field — consumed by `palpites/page.tsx` (Task 7), which must stop setting it.

- [ ] **Step 1: Remove `isFinal` from `PalpitesItem`**

In `src/app/(app)/bolao/[id]/palpites/list.tsx`, in the `PalpitesItem` type (lines 8-23), delete the line:

```ts
  isFinal: boolean;
```

- [ ] **Step 2: Remove the no-draw guard and `isFinal` prop from `PredictionRow`**

In `src/app/(app)/bolao/[id]/palpites/row.tsx`:

1. In the props type (lines 7-22), delete the line `isFinal: boolean;`.
2. In `submit()` (lines 33-49), delete:

```ts
    if (props.isFinal && a !== "" && b !== "" && Number(a) === Number(b)) {
      setError("Sem empate na final.");
      return;
    }
```

3. In the JSX `pr-status` block (lines 105-135), the ternary currently reads:

```tsx
        {props.hasResult ? (
          <>
            ...
          </>
        ) : props.locked ? (
          <span className="tag danger">FECHADO</span>
        ) : props.isFinal ? (
          <span className="tag accent">CAMPEÃO +50</span>
        ) : (
          <span className="tag accent">ABERTO</span>
        )}
```

Delete the `props.isFinal ? (...) :` branch so it reads:

```tsx
        {props.hasResult ? (
          <>
            ...
          </>
        ) : props.locked ? (
          <span className="tag danger">FECHADO</span>
        ) : (
          <span className="tag accent">ABERTO</span>
        )}
```

(Leave the `hasResult` branch's inner content untouched — only the `isFinal` branch is removed.)

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: a new error in `palpites/page.tsx` (still passing `isFinal` into the items array / `PredictionRow` spread) — expected, fixed in Task 7.

---

### Task 6: `champion-modal.tsx` — the pick UI

**Files:**
- Create: `src/app/(app)/bolao/[id]/palpites/champion-modal.tsx`

**Interfaces:**
- Consumes: `pickChampion` from `./actions` (Task 4), `TeamLite` + `Flag` from `@/components/flag`.
- Produces: `ChampionPickModal({ bolaoId, teams }: { bolaoId: string; teams: TeamLite[] })` — a client component consumed by `palpites/page.tsx` (Task 7).

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag, type TeamLite } from "@/components/flag";
import { pickChampion } from "./actions";

export function ChampionPickModal({ bolaoId, teams }: { bolaoId: string; teams: TeamLite[] }) {
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [selected, setSelected] = useState<TeamLite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const confirm = () => {
    if (!selected) return;
    setError(null);
    const fd = new FormData();
    fd.set("bolaoId", bolaoId);
    fd.set("teamCode", selected.code);
    start(async () => {
      const r = await pickChampion(fd);
      if ("error" in r && r.error) {
        setError(r.error);
        setStep("select");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        zIndex: 200,
        padding: 20,
      }}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          background: "var(--bg-elev)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}
      >
        {step === "select" ? (
          <>
            <div style={{ padding: "22px 24px 6px" }}>
              <h2 style={{ margin: 0, fontSize: 20, letterSpacing: "-0.02em" }}>
                Escolha seu campeão
              </h2>
              <p style={{ margin: "6px 0 0", color: "var(--text-2)", fontSize: 14 }}>
                As oitavas abriram. Escolha entre os 16 times quem você acha que vai ser
                campeão. Acertar vale +50 pts extras. Só dá pra escolher uma vez.
              </p>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 8,
                padding: "16px 24px",
                maxHeight: 360,
                overflowY: "auto",
              }}
            >
              {teams.map((t) => (
                <button
                  key={t.code}
                  type="button"
                  onClick={() => setSelected(t)}
                  className="btn"
                  style={{
                    justifyContent: "flex-start",
                    gap: 10,
                    borderColor: selected?.code === t.code ? "var(--accent)" : undefined,
                    background: selected?.code === t.code ? "var(--accent-soft)" : undefined,
                  }}
                >
                  <Flag team={t} size="sm" />
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
            {error && (
              <div
                style={{
                  margin: "0 24px 16px",
                  padding: 12,
                  background: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.3)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 12,
                  color: "var(--danger)",
                }}
              >
                {error}
              </div>
            )}
            <div style={{ padding: "0 24px 22px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn primary"
                disabled={!selected}
                onClick={() => setStep("confirm")}
              >
                Continuar
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: "22px 24px 6px" }}>
              <h2 style={{ margin: 0, fontSize: 20, letterSpacing: "-0.02em" }}>
                Confirmar campeão
              </h2>
              <p style={{ margin: "6px 0 0", color: "var(--text-2)", fontSize: 14 }}>
                Escolheu <b>{selected?.name}</b> como campeão. Essa escolha não pode ser
                trocada depois. Confirmar?
              </p>
            </div>
            <div style={{ padding: "16px 24px 22px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setStep("select")}
                disabled={pending}
              >
                Voltar
              </button>
              <button type="button" className="btn primary" onClick={confirm} disabled={pending}>
                {pending ? "Confirmando..." : "Confirmar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

Note there is no backdrop `onClick` handler and no close button — this is intentional. The modal cannot be dismissed without either picking+confirming or navigating away (and it will reappear on next visit to this page, per the locked/opened condition computed in Task 7).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in this file.

---

### Task 7: Wire the picker into `palpites/page.tsx`

**Files:**
- Modify: `src/app/(app)/bolao/[id]/palpites/page.tsx`

**Interfaces:**
- Consumes: `getChampionWindow` (Task 2), `championPicks` table (Task 1), `ChampionPickModal` (Task 6).
- Produces: nothing new consumed elsewhere — this is the leaf that assembles everything for this page.

- [ ] **Step 1: Replace the file**

Replace the full contents of `src/app/(app)/bolao/[id]/palpites/page.tsx` with:

```tsx
import { requireAuth } from "@/lib/auth";
import { requireBolaoAccess } from "@/lib/access";
import { db } from "@/db";
import { championPicks, predictions, teams } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getEffectiveMatches, pointsForPrediction } from "@/lib/match-state";
import { getChampionWindow } from "@/lib/champion";
import type { TeamLite } from "@/components/flag";
import { PalpitesList } from "./list";
import { ChampionPickModal } from "./champion-modal";
import { isPredictionLocked } from "@/lib/prediction-lock";
import { roundFilterKey } from "@/lib/round";

export const dynamic = "force-dynamic";

export default async function PalpitesPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await requireAuth();
  const { id: bolaoId } = await params;
  await requireBolaoAccess({ userId, bolaoId });

  const [effective, allTeams, myPreds, myChampionPick, championWindow] = await Promise.all([
    getEffectiveMatches(bolaoId),
    db.select().from(teams),
    db
      .select()
      .from(predictions)
      .where(and(eq(predictions.bolaoId, bolaoId), eq(predictions.userId, userId))),
    db.query.championPicks.findFirst({
      where: and(eq(championPicks.bolaoId, bolaoId), eq(championPicks.userId, userId)),
    }),
    getChampionWindow(bolaoId),
  ]);

  const teamMap = new Map<string, TeamLite>(allTeams.map((t) => [t.code, t]));
  const predMap = new Map(myPreds.map((p) => [p.matchId, p]));

  const ready = effective.filter((m) => m.teamA && m.teamB);

  const items = ready.map((m) => {
    const pred = predMap.get(m.id);
    const hasResult = m.resultA != null && m.resultB != null;
    const locked = hasResult || isPredictionLocked(m.kickoffAt, Date.now());
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
      roundKey: roundFilterKey(m.round),
      locked,
      hasResult,
      resultA: m.resultA,
      resultB: m.resultB,
      initialScoreA: pred?.scoreA ?? null,
      initialScoreB: pred?.scoreB ?? null,
      earned,
    };
  });

  const rounds = Array.from(new Set(items.map((i) => i.roundKey)));
  const showPicker = championWindow.opened && !championWindow.locked && !myChampionPick;
  const champTeams = championWindow.teams
    .map((code) => teamMap.get(code))
    .filter((t): t is TeamLite => !!t);

  return (
    <div>
      <h2 style={{ margin: "0 0 14px", fontSize: 18, letterSpacing: "-0.015em" }}>Seus palpites</h2>
      <p className="page-sub" style={{ marginTop: 0, marginBottom: 18 }}>
        Placar exato = <b style={{ color: "var(--accent)" }}>+10 pts</b>. Só o vencedor ={" "}
        <b style={{ color: "var(--accent)" }}>+5 pts</b>. Palpite bloqueia 24h antes do jogo.
        <br />
        Quando as oitavas abrirem, escolha o campeão entre os 16 times — acertar vale{" "}
        <b style={{ color: "var(--accent)" }}>+50 pts extras</b>. Escolha única, sem troca.
      </p>

      {myChampionPick && (
        <div
          className="tag accent"
          style={{ marginBottom: 18, display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          Seu campeão: {teamMap.get(myChampionPick.teamCode)?.name ?? myChampionPick.teamCode}
        </div>
      )}
      {championWindow.opened && championWindow.locked && !myChampionPick && (
        <div className="tag danger" style={{ marginBottom: 18 }}>
          Você não escolheu a tempo — sem chance de bônus de campeão desta vez.
        </div>
      )}

      {items.length === 0 ? (
        <div className="card">
          <div className="empty">Nenhum jogo com times definidos ainda.</div>
        </div>
      ) : (
        <PalpitesList bolaoId={bolaoId} items={items} rounds={rounds} />
      )}

      {showPicker && <ChampionPickModal bolaoId={bolaoId} teams={champTeams} />}
    </div>
  );
}
```

Note `isFinal` is gone from the `items` map (Task 5 removed it from the consuming types) and the old "Empate não permitido na final" copy is replaced.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors related to `palpites/*`. (Errors in `ranking/page.tsx` and `todos/page.tsx` from Task 3 still remain — fixed in Tasks 8-9.)

---

### Task 8: `todos` page — drop final special-casing, add champion picks section

**Files:**
- Modify: `src/app/(app)/bolao/[id]/todos/card.tsx`
- Modify: `src/app/(app)/bolao/[id]/todos/page.tsx`

**Interfaces:**
- Consumes: `getChampionWindow`, `getChampionTeam` (Task 2), `championPicks` table (Task 1), `Flag` from `@/components/flag`.
- Produces: `MatchCardItem` (in `card.tsx`) drops `isFinal`.

- [ ] **Step 1: Remove `isFinal` from the match card**

In `src/app/(app)/bolao/[id]/todos/card.tsx`:

1. In the `MatchCardItem` type, delete the line `isFinal: boolean;`.
2. In the `MatchCard` function's destructured props, delete `isFinal,`.
3. Delete this line from the JSX (inside the round/kickoff `div`):

```tsx
          {isFinal && <span style={{ color: "var(--accent)" }}> · CAMPEÃO +50</span>}
```

- [ ] **Step 2: Replace `todos/page.tsx`**

Replace the full contents of `src/app/(app)/bolao/[id]/todos/page.tsx` with:

```tsx
import { requireAuth } from "@/lib/auth";
import { requireBolaoAccess } from "@/lib/access";
import { db } from "@/db";
import { championPicks, memberships, predictions, teams } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getEffectiveMatches, pointsForPrediction } from "@/lib/match-state";
import { getChampionTeam, getChampionWindow } from "@/lib/champion";
import { getUsers } from "@/lib/clerk-users";
import { colorFor } from "@/lib/colors";
import { Flag, type TeamLite } from "@/components/flag";
import type { MatchCardItem } from "./card";
import { TodosList } from "./list";
import { roundFilterKey } from "@/lib/round";

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

  const [effective, allTeams, members, allPreds, championWindow, championTeam, picks] =
    await Promise.all([
      getEffectiveMatches(bolaoId),
      db.select().from(teams),
      db.select().from(memberships).where(eq(memberships.bolaoId, bolaoId)),
      db.select().from(predictions).where(eq(predictions.bolaoId, bolaoId)),
      getChampionWindow(bolaoId),
      getChampionTeam(bolaoId),
      db.select().from(championPicks).where(eq(championPicks.bolaoId, bolaoId)),
    ]);

  const teamMap = new Map<string, TeamLite>(allTeams.map((t) => [t.code, t]));
  const userMap = await getUsers(members.map((m) => m.userId));
  const now = Date.now();
  const pickByUser = new Map(picks.map((p) => [p.userId, p.teamCode]));

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

    return {
      matchId: m.id,
      round: m.round,
      roundKey: roundFilterKey(m.round),
      kickoffLabel: m.kickoffAt.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
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

        const total = pred
          ? pointsForPrediction(
              { scoreA: pred.scoreA, scoreB: pred.scoreB },
              { resultA: m.resultA, resultB: m.resultB },
            )
          : 0;

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

  const rounds = Array.from(new Set(items.map((i) => i.roundKey)));

  return (
    <div>
      <h2 style={{ margin: "0 0 14px", fontSize: 18, letterSpacing: "-0.015em" }}>
        Palpites de todos
      </h2>
      <p className="page-sub" style={{ marginTop: 0, marginBottom: 18 }}>
        Veja o palpite de cada membro e quando foi feito. Jogos com resultado vêm recolhidos — clique para expandir.
      </p>

      {championWindow.opened && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-head">
            <h3>Campeões escolhidos</h3>
          </div>
          {members.map((mem) => {
            const u = userMap.get(mem.userId);
            const name = u?.name ?? mem.userId.slice(0, 6);
            const pickCode = pickByUser.get(mem.userId) ?? null;
            const pickTeam = pickCode ? teamMap.get(pickCode) ?? null : null;
            const correct = championTeam != null && pickCode === championTeam;
            const wrong = championTeam != null && pickCode != null && pickCode !== championTeam;

            return (
              <div
                key={mem.userId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 12,
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--border)",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500 }}>{name}</span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: correct ? "var(--accent)" : wrong ? "var(--text-3)" : undefined,
                  }}
                >
                  {pickTeam ? (
                    <>
                      <Flag team={pickTeam} size="sm" />
                      {pickTeam.name}
                    </>
                  ) : championWindow.locked ? (
                    "não escolheu"
                  ) : (
                    "—"
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty">Nenhum jogo com times definidos ainda.</div>
      ) : (
        <TodosList items={items} rounds={rounds} />
      )}
    </div>
  );
}
```

Note `championBonus`/`isFinal` are gone from the per-member `total` (now just `pointsForPrediction` — the final scores exactly like any other match here too).

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in `todos/*`. (`ranking/page.tsx` error from Task 3 still remains — fixed next.)

---

### Task 9: `ranking/page.tsx` — compute champion bonus in JS

**Files:**
- Modify: `src/app/(app)/bolao/[id]/ranking/page.tsx`

**Interfaces:**
- Consumes: `getChampionTeam` (Task 2), `championPicks` table (Task 1), `championPickBonus` (Task 3).

- [ ] **Step 1: Drop the SQL champion bonus, fetch picks instead**

In `src/app/(app)/bolao/[id]/ranking/page.tsx`, change the imports (lines 1-8) from:

```ts
import { requireAuth } from "@/lib/auth";
import { requireBolaoAccess } from "@/lib/access";
import { db } from "@/db";
import { bolaoMatchState, matches, matchOfficialResult, memberships, predictions } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getUsers } from "@/lib/clerk-users";
import { colorFor } from "@/lib/colors";
import Image from "next/image"
```

to:

```ts
import { requireAuth } from "@/lib/auth";
import { requireBolaoAccess } from "@/lib/access";
import { db } from "@/db";
import { bolaoMatchState, championPicks, matches, matchOfficialResult, memberships, predictions } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getChampionTeam } from "@/lib/champion";
import { championPickBonus } from "@/lib/scoring";
import { getUsers } from "@/lib/clerk-users";
import { colorFor } from "@/lib/colors";
import Image from "next/image"
```

- [ ] **Step 2: Remove the `championBonus` SQL field and its contribution to `points`**

Replace the `agg` query's `select` object. It currently reads (lines 22-66):

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
```

Replace it with (drop the `championBonus` field entirely, drop the second `+ coalesce(...)` block from `points`):

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
      points: sql<number>`
        coalesce(sum(case
          when ${rA} is not null then
            case
              when ${predictions.scoreA} = ${rA} and ${predictions.scoreB} = ${rB} then 10
              when sign(${predictions.scoreA} - ${predictions.scoreB}) = sign(${rA} - ${rB}) then 5
              else 0
            end
          else 0 end), 0)::int`,
    })
```

(The `matches` join further down is still used for the `sign(...)` comparisons — leave the rest of the query, including the `.from`/`.leftJoin`/`.where`/`.groupBy` chain, untouched.)

- [ ] **Step 3: Compute the bonus in JS and re-sort**

Immediately after the `agg` query (right before the current `const sorted = ...` line), replace:

```ts
  const sorted = [...agg].sort((a, b) => b.points - a.points || b.exact - a.exact);
  const userMap = await getUsers(sorted.map((r) => r.userId));
```

with:

```ts
  const [championTeam, picks] = await Promise.all([
    getChampionTeam(bolaoId),
    db.select().from(championPicks).where(eq(championPicks.bolaoId, bolaoId)),
  ]);
  const pickByUser = new Map(picks.map((p) => [p.userId, p.teamCode]));

  const withBonus = agg.map((r) => {
    const bonus = championPickBonus(pickByUser.get(r.userId) ?? null, championTeam);
    return { ...r, championBonus: bonus, points: r.points + bonus };
  });

  const sorted = [...withBonus].sort((a, b) => b.points - a.points || b.exact - a.exact);
  const userMap = await getUsers(sorted.map((r) => r.userId));
```

The rest of the file (the `r.championBonus > 0 && (...)` display block, the podium, the list rendering) needs no changes — `r.championBonus` and `r.points` keep the same names and meaning, just computed differently.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors anywhere in the project.

---

### Task 10: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors (warnings about pre-existing code are fine; nothing new from the files touched in this plan).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds (`✓ Compiled successfully`).

- [ ] **Step 4: Manual browser walkthrough**

Use the `run` skill (or `npm run dev`) to start the app, then as a member of a bolão whose r32 results are NOT yet fully entered:

1. Open "Seus palpites" — confirm no champion modal appears, no champion badge, and the final match (if listed) accepts a draw without an inline "Sem empate na final" error.
2. As the bolão admin, enter results for all 16 `r32` matches (via "Admin" tab) until all 8 `r16` matches show both teams filled on the "Chaves" tab.
3. Reload "Seus palpites" as a regular member — confirm the champion pick modal now appears, lists 16 teams, and walking through select → confirm → submit saves the pick, closes the modal, and shows the "Seu campeão: <time>" badge on reload.
4. Reload "Seus palpites" again — confirm the modal does NOT reappear (pick persisted) and there's no way to change the pick from this page.
5. Open "Todos" — confirm the new "Campeões escolhidos" section lists every member and shows the just-made pick with a flag.
6. As admin, enter a result for one `r16` match (anything making `kickoffAt` of that round be in the past — or just check that once the first r16 match's kickoff time passes, a member who never picked sees the "não escolheu a tempo" message instead of the modal on "Seus palpites", and "não escolheu" in the "Todos" section).
7. Drive the bracket through to a finished final (enter results for `qf`, `sf`, `final`). Confirm: the final's own score predictions earn 10/5/0 like any other match (no special "CAMPEÃO +50" tag on it anywhere), and on "Ranking", members whose champion pick matches the actual winner show the "CAMP +50" tag and the extra 50 points; members who picked wrong show no tag and no bonus.

---

## Self-Review

- **Spec coverage:** data model (Task 1), window/champion helpers (Task 2), scoring swap (Task 3), pick action + final no-draw removal (Task 4), dead `isFinal` cleanup (Tasks 5, 8), pick modal (Tasks 6-7), "Todos" visibility section (Task 8), ranking recompute (Task 9), end-to-end check (Task 10) — every section of the spec maps to a task.
- **Placeholder scan:** no TODOs; every step has runnable code or an exact command.
- **Type consistency:** `getChampionWindow`/`getChampionTeam` (Task 2) signatures match every call site in Tasks 4, 7, 8, 9. `championPickBonus(pickTeam, championTeam)` (Task 3) signature matches its only two call sites (Tasks 8, 9). `ChampionPickModal({ bolaoId, teams })` (Task 6) matches its usage in Task 7.
- **Scope check:** single subsystem (champion pick feature touching DB, scoring, three pages) — appropriately sized for one plan, no decomposition needed.
