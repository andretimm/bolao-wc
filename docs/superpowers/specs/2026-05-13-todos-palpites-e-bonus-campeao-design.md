# Aba "Todos" + Bônus Campeão — Design

**Date:** 2026-05-13
**Status:** Approved

## Motivação

Duas features novas no bolão:

1. **Visibilidade de todos os palpites.** Atualmente cada membro só vê os próprios palpites na aba `palpites`. Membros querem ver os palpites de todos os participantes (com timestamp da última edição) sempre.
2. **Bônus de campeão.** Adicionar incentivo para acertar o campeão do torneio. O palpite de campeão é derivado do palpite da final (não tem campo separado). Acerto vale +50 pts extras.

## Feature 1 — Aba "Todos"

### Decisões

- **Visibilidade:** sempre visível, sem lock. Transparência total entre membros.
- **Local:** nova aba `"Todos"` em `tabs.tsx`, posicionada entre `Palpites` e `Ranking`.
- **Layout:** por jogo. Cada jogo é um card. Body lista palpites de cada membro do bolão (placar + timestamp + avatar/nome).

### Rota

`src/app/(app)/bolao/[id]/todos/page.tsx` (Server Component, `dynamic = "force-dynamic"`).

### Query

- `getEffectiveMatches(bolaoId)` — todos jogos com times e resultados efetivos. Já existe.
- `memberships` filtradas por `bolaoId` — para ter a lista canônica de membros.
- `predictions` filtradas por `bolaoId` — todos palpites do bolão (inclui `updatedAt`).
- `getUsers(userIds)` em `@/lib/clerk-users` — para nomes/avatares/cores.

Estrutura em memória:
- `Map<matchId, Map<userId, {scoreA, scoreB, updatedAt}>>` para lookup O(1).
- Lista de membros (`memberships`) ordenada por `joinedAt`.

### Render

Filtra jogos pelo critério atual do palpites page (`m.teamA && m.teamB`), mesma ordenação (`kickoffAt` asc, mesma do `getEffectiveMatches`).

Cada card de jogo:
```
[round badge] [teamA flag/name] vs [teamB flag/name] · [kickoffAt]
[resultado oficial se houver]
─────────────────────────────
[avatar] Nome           1 x 2     há 3 dias
[avatar] Outro Nome     0 x 0     há 1 hora
[avatar] Sem palpite    — x —     —
```

- Linha por membro do bolão (inclusive sem palpite — mostra `— x —` cinza).
- Timestamp formatado como relativo (PT-BR). Usa `Intl.RelativeTimeFormat` (sem nova dependência).
- Linha do `userId` atual destacada com `var(--accent-soft)` (mesmo padrão do ranking).
- Se palpite acertou (placar exato → +10) ou venceu (+5), mostra o ganho à direita com `var(--accent)`. Reusa `pointsForPrediction`.

### Empty state

Se não há jogos com times definidos: `<div className="empty">Nenhum jogo com times definidos ainda.</div>` (mesmo texto do palpites page).

## Feature 2 — Bônus Campeão (+50)

### Decisões

- Derivado do palpite da final. Sem nova tabela, sem campo no `boloes`.
- Final identificada por `matches.stage = 'final'`.
- Bônus = +50 se o vencedor implícito no palpite do user na final == vencedor real da final.
- Empate na final é proibido no palpite. Server action rejeita; UI bloqueia.
- Bônus **soma** ao scoring normal do jogo (não substitui). Exemplo:
  - placar exato na final: +10 (jogo) + +50 (campeão) = +60.
  - só vencedor: +5 + +50 = +55.
  - errou vencedor: 0 (sem bônus).

### Constante

Em `src/lib/scoring.ts`:

```ts
export const CHAMPION_BONUS = 50;

export function championBonus(
  pred: { scoreA: number; scoreB: number } | null,
  res: { resultA: number | null; resultB: number | null },
): number {
  if (!pred) return 0;
  if (res.resultA == null || res.resultB == null) return 0;
  if (pred.scoreA === pred.scoreB) return 0; // user predisse empate — não escolheu campeão
  if (res.resultA === res.resultB) return 0; // sem vencedor real (não deveria acontecer na final, defensivo)
  return Math.sign(pred.scoreA - pred.scoreB) === Math.sign(res.resultA - res.resultB)
    ? CHAMPION_BONUS
    : 0;
}
```

### Aplicação no ranking

`src/app/(app)/bolao/[id]/ranking/page.tsx` — adicionar coluna `championBonus` na agregação SQL. Aplica somente quando `matches.stage = 'final'`. Soma ao `points`.

Modificação na query (pseudo-SQL):
```sql
points = sum(scoring_normal) + sum(case when matches.stage = 'final' and ... then 50 else 0 end)
```

Join adicional com `matches` para acessar `stage`. Filtro de campeão: `stage = 'final'` AND `pred.scoreA != pred.scoreB` AND `result não null` AND `sign(pred) = sign(result)`.

UI do ranking exibe novo flag visual quando user ganhou bônus (ex.: chip "👑" ou label "CAMPEÃO" — usa apenas texto, sem emoji por preferência do projeto). Decisão concreta: adicionar pequena badge `CAMP +50` ao lado da linha do ranking dos users que acertaram.

### Validação de empate na final

**Server action** (`src/app/(app)/bolao/[id]/palpites/actions.ts`):

Antes de salvar prediction, carregar `matches.stage` do `matchId`. Se `stage = 'final'` e `scoreA === scoreB`, retornar erro: `"Empate não permitido na final — escolha o campeão."`.

**Client** (`src/app/(app)/bolao/[id]/palpites/row.tsx`):

Receber `isFinal: boolean` como prop (calculado em `palpites/page.tsx` via `m.stage === 'final'`). Quando `isFinal` e `scoreA === scoreB`, desabilitar botão de salvar e mostrar dica inline: `"Sem empate na final."`.

### UX da palpites page

Acima do card de jogos, adicionar ao bloco de regras (`page-sub`) uma linha extra:

> Acertar o campeão (vencedor da final) = **+50 pts extras**.

Na própria linha da final, mostrar um pill `CAMPEÃO +50` para deixar saliente.

## Schema

**Sem alterações.** Tudo derivado de tabelas existentes.

## Arquivos tocados

| Arquivo | Mudança |
|---|---|
| `src/lib/scoring.ts` | + `CHAMPION_BONUS`, `championBonus()` |
| `src/app/(app)/bolao/[id]/tabs.tsx` | + aba "Todos" |
| `src/app/(app)/bolao/[id]/todos/page.tsx` | **novo** |
| `src/app/(app)/bolao/[id]/palpites/page.tsx` | aviso campeão; passa `isFinal` |
| `src/app/(app)/bolao/[id]/palpites/row.tsx` | bloqueio empate na final, dica |
| `src/app/(app)/bolao/[id]/palpites/actions.ts` | valida empate na final |
| `src/app/(app)/bolao/[id]/ranking/page.tsx` | soma bônus campeão na agregação + badge UI |

## Não escopo

- Histórico de edições (versionamento de palpites). Só a `updatedAt` atual.
- Notificações em mudança de palpite alheio.
- Configurabilidade do bônus por bolão (fixo em 50).
- Lock/visibilidade condicional na aba Todos (sempre visível).
- Palpite de campeão como campo separado (decisão: derivado da final).

## Testing

- Validar manualmente os fluxos:
  - Usuário A faz palpite, usuário B vê na aba Todos com timestamp correto.
  - Tentativa de salvar 1x1 na final → erro server + UI bloqueia.
  - Final tem resultado → usuário com vencedor correto ganha +50 no ranking.
  - Usuário sem palpite na final → sem bônus.
  - Usuário que errou vencedor da final → sem bônus.

## Migrations

Nenhuma.
