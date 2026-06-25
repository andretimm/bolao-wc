# Champion pick — design

## Problem

Today, the champion bonus (+50 pts) is derived from the user's prediction on the
final match (`src/lib/scoring.ts: championBonus`): if you guess a non-draw score
for the final and the sign of your guess matches the sign of the real result, you
get +50. This forces the final to disallow draws in predictions
(`palpites/actions.ts` and `row.tsx` both special-case `isFinal`).

New rule: the final scores like any other match (10 exact / 5 winner-only, draws
allowed, resolved by penalties same as other knockout rounds). The +50 bonus
becomes a separate "pick the champion" bet, made once the round-of-16 (`r16`
stage, 16 teams / 8 matches) bracket is known, locked in, and resolved against
the actual final winner.

## Data model

New table `championPicks`:

| column     | type      | notes                                  |
|------------|-----------|-----------------------------------------|
| bolaoId    | text      | FK → boloes.id, cascade                |
| userId     | text      | Clerk user id, no FK (existing pattern) |
| teamCode   | text      | FK → teams.code                        |
| pickedAt   | timestamp | default now                            |

PK: `(bolaoId, userId)`. No update/delete action is exposed anywhere — the pick
is insert-once. This is the enforcement mechanism for "no take-backs," not a
flag or lock column.

## Window rules (`src/lib/champion.ts`, new file)

```ts
getChampionWindow(bolaoId): Promise<{ teams: string[]; opened: boolean; locked: boolean }>
```

- `opened` = all 8 `r16`-stage matches (effective, via `getEffectiveMatches`) have
  both `teamA` and `teamB` filled. This happens naturally once the bracket
  propagation (`propagateBracket` in `admin/actions.ts`) fills every r16 slot
  from r32 results.
- `teams` = the 16 unique team codes across those 8 matches (only meaningful
  when `opened`).
- `locked` = `opened && now >= min(kickoffAt)` across the 8 r16 matches — i.e.
  the window closes the instant the first r16 match kicks off, regardless of
  whether the user ever opened the app during the window.

```ts
getChampionTeam(bolaoId): Promise<string | null>
```

- Looks at the effective `final` match. Returns the winning team code:
  - `resultA !== resultB` → higher-score team.
  - `resultA === resultB` → resolved by `winner` field (admin-entered penalty
    result, same convention as every other KO stage).
  - No result yet → `null`.

## Scoring (`src/lib/scoring.ts`)

- Remove `championBonus(pred, res)` (prediction-based) entirely. The final's
  match prediction now scores through the plain `pointsForPrediction` path with
  no special case — delete the `isFinal` no-draw guard in `palpites/actions.ts`
  (`row.tsx` client-side guard too).
- Add:
  ```ts
  export const CHAMPION_BONUS = 50;
  export function championPickBonus(pickTeam: string | null, championTeam: string | null): number {
    if (!pickTeam || !championTeam) return 0;
    return pickTeam === championTeam ? CHAMPION_BONUS : 0;
  }
  ```

## Pick flow — "Seus palpites" page only

- Server action `pickChampion(formData)` in `palpites/actions.ts`:
  1. auth + `requireBolaoAccess`.
  2. `getChampionWindow(bolaoId)`; error if `!opened` ("Fase ainda não abriu.")
     or `locked` ("Janela de escolha encerrada.").
  3. Validate `teamCode` is one of `window.teams`.
  4. Check no existing row for `(bolaoId, userId)` in `championPicks`; error if
     present ("Você já escolheu seu campeão.").
  5. Insert. `revalidatePath` the palpites page.
- `palpites/page.tsx` fetches `getChampionWindow`, the caller's existing pick
  (if any), and resolves team metadata (flag/name) for the 16 candidates.
- Modal (`champion-modal.tsx`, new client component, same `ModalShell` visual
  pattern as `dashboard/ui.tsx`) renders when `opened && !locked && !myPick`.
  Two steps: grid of 16 teams (select one) → confirmation step ("não vai poder
  trocar depois — confirmar?"). No backdrop-click / escape dismissal — picking
  is mandatory to clear the modal. On success, `router.refresh()` so the
  server component re-renders without the modal.
- If `locked && !myPick`: short inline note ("Você não escolheu a tempo —
  sem chance de bônus de campeão desta vez.") instead of the modal.
- If `myPick` exists: badge "Seu campeão: <time>" shown only on this page
  (not site-wide), regardless of window state.
- Page copy describing scoring rules updates to drop the "sem empate na final"
  line and describe the champion bonus as tied to the r16 pick, not the final
  guess.

## Visibility — "Todos" page

- New section above the match-card list: one row per member showing their
  picked team (flag + name), rendered only when `getChampionWindow(...).opened`
  is true (members can see each other's picks immediately, per product
  decision — no hiding until the final).
- Members who haven't picked show a muted "—" while the window is still open,
  or "não escolheu" once `locked`.
- Once `getChampionTeam` resolves (final decided), highlight correct picks
  (accent color) vs incorrect (muted), same visual language as the existing
  ranking "CAMP +50" tag.
- Remove the "· CAMPEÃO +50" suffix on the final's card header in `card.tsx` —
  the final is no longer visually special. Drop the `isFinal` field from
  `MatchCardItem`/`MatchCard` and from `PalpitesItem`/`PredictionRow` (dead
  once the special-casing is gone).

## Ranking page

- Remove the SQL `championBonus` case expression and its contribution to the
  `points` sum in the aggregate query.
- After the aggregate query resolves and is sorted, fetch all `championPicks`
  rows for the bolão + `getChampionTeam(bolaoId)`, compute each user's bonus
  via `championPickBonus`, add it into `r.points` and set `r.championBonus`,
  then re-sort by the final `points` value. Display logic (`CAMP +50` tag)
  stays as-is — only the source of the number changes.

## Out of scope / known limitations (accepted)

- Members who join the bolão after the r16 window locks can never pick a
  champion (no bonus possible for them). Not handled specially — matches the
  product intent of forcing the pick during the r16 window.
- If an admin corrects a r32/r16 result after picks have been made (changing
  which 16 teams are actually in the bracket), existing picks are not
  invalidated or re-validated. Not handled — edge case, manual admin
  intervention only.
