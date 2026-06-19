# Filtro de rodada — palpites e todos os palpites

## Problema

Telas `palpites` e `todos` (de `/bolao/[id]/`) listam todos os jogos numa lista só, sem jeito de filtrar por rodada. Bolão tem fase de grupos (várias rodadas) + mata-mata, lista cresce e fica difícil achar jogos de uma rodada específica.

## Solução

Select de rodada no topo de cada tela. Opção padrão "Todas as rodadas" (sempre ativa ao abrir a página). Trocar opção filtra lista na hora, sem reload (client-side, React state).

Valores do select = valores distintos do campo `matches.round` presentes nos jogos da tela (ex: `"Grupo A · R1"`, `"16-avos"`, `"Final"`), na ordem de primeira aparição cronológica (lista já vem ordenada por `kickoffAt`).

## Componentes novos

- **`src/components/round-select.tsx`** ("use client") — select genérico. Props: `rounds: string[]`, `value: string`, `onChange: (v: string) => void`. Primeira `<option value="all">Todas as rodadas</option>`, depois uma `<option>` por valor de `rounds`. Usa classe `.input` existente (mesmo padrão do select em `admin/row.tsx`).

- **`src/app/(app)/bolao/[id]/palpites/list.tsx`** ("use client") — recebe `items` (array de objetos com os mesmos campos hoje passados pra `<PredictionRow>`, incluindo `round`) e `rounds: string[]`. State `selectedRound` (default `"all"`). Filtra `items` por `round === selectedRound` (ou tudo se `"all"`). Renderiza `<RoundSelect>` + `.map` pra `<PredictionRow>`.

- **`src/app/(app)/bolao/[id]/todos/card.tsx`** (componente puro, sem `"use client"`) — extrai o `<details className="card">...</details>` de cada jogo (markup que já existe em `todos/page.tsx` linhas 77-234) pra um componente próprio. Recebe os mesmos dados já calculados hoje (match info + lista de membros com pred/pontos).

- **`src/app/(app)/bolao/[id]/todos/list.tsx`** ("use client") — mesmo padrão do `palpites/list.tsx`: recebe `items` + `rounds`, state `selectedRound`, filtra, renderiza `<RoundSelect>` + `.map` pra `<MatchCard>`.

## Mudança nas pages

`palpites/page.tsx` e `todos/page.tsx` continuam fazendo fetch e cálculo (predições, pontos, bônus campeão) exatamente como hoje — tudo server-side. Só muda: ao invés de `.map()` direto no JSX, montam:

- `items`: array de objetos planos com os props que cada linha/card precisa (sem `Map`, sem `Date` cru onde já tem que ser string — mantém o que cada componente já recebe hoje).
- `rounds`: `Array.from(new Set(ready.map(m => m.round)))` — dedupe mantendo ordem de aparição.

E passam pra `<PalpitesList items={items} rounds={rounds} />` / `<TodosList items={items} rounds={rounds} />` no lugar do bloco de render atual.

## Fora de escopo

- Sem persistência da rodada escolhida (não salva em URL nem localStorage — reseta pra "Todas" a cada load de página).
- Sem mudança nos cálculos de pontos/predições, só na exibição/filtro.
