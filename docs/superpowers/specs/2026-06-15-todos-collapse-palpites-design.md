# Aba "Todos" — Collapse por jogo — Design

**Date:** 2026-06-15
**Status:** Approved

## Motivação

A aba `todos` (`src/app/(app)/bolao/[id]/todos/page.tsx`) lista todos os jogos com os palpites de cada membro, sempre expandidos. Com muitos jogos a página fica longa, especialmente jogos já encerrados cujo palpite não interessa mais no dia a dia.

## Decisão

Cada card de jogo passa a ser um `<details>`/`<summary>` nativo (sem JS, sem client component):

- **Critério de estado padrão:** `open = !hasResult` (jogo sem resultado oficial → aberto; jogo com resultado → fechado).
- **`<summary>`** contém o cabeçalho atual do card: linha de times + placar/"vs", e a linha `ROUND · data/hora` (com badge `CAMPEÃO +50` quando `isFinal`).
- **Conteúdo colapsável** = lista de palpites de cada membro (o bloco que hoje vem depois do cabeçalho).
- **Toggle:** usuário pode clicar no `<summary>` para abrir/fechar livremente. Sem persistência entre reloads (volta ao padrão acima a cada carregamento da página).

## UI

- Remove o marcador padrão do `<summary>` (`::-webkit-details-marker` / `list-style: none`) e adiciona um chevron customizado (`▾`) que rotaciona 180° quando `details[open]`.
- `cursor: pointer` no `<summary>`.
- Atualiza o texto `page-sub` (atualmente "Veja o palpite de cada membro e quando foi feito. Sempre visível.") para refletir o novo comportamento, ex.: "Veja o palpite de cada membro e quando foi feito. Jogos com resultado vêm recolhidos — clique para expandir."

## Arquivos tocados

| Arquivo | Mudança |
|---|---|
| `src/app/(app)/bolao/[id]/todos/page.tsx` | troca `<div className="card">` por `<details className="card" open={!hasResult}>`, move cabeçalho para `<summary>`, ajusta texto `page-sub` |
| `src/app/globals.css` | estilos do `summary` dentro de `.card` (remover marker nativo, chevron customizado, cursor) |

## Não escopo

- Persistência de estado de collapse entre reloads.
- Indicador de quantos membros já palpitaram no `<summary>` (não pedido).
- Mudanças em outras abas.

## Testing

- Validar manualmente:
  - Jogo sem resultado → card aberto por padrão, lista de palpites visível.
  - Jogo com resultado → card fechado por padrão.
  - Clique no cabeçalho abre/fecha o card em ambos os casos.
  - Recarregar a página volta ao padrão (sem lembrar toggle manual).

## Migrations

Nenhuma.
