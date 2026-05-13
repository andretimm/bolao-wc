# Bolão da Copa 2026

Next.js 16 · Clerk · Neon Postgres · Drizzle ORM.

Bolão da Copa do Mundo 2026 — palpites, ranking, bracket. Placar exato vale 10 pts, só vencedor vale 5.

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack)
- **Clerk** — auth (email/social/passkey)
- **Neon Postgres** — serverless DB via `@neondatabase/serverless`
- **Drizzle ORM** — schema + migrations
- **Tailwind v4** + custom design tokens

## Setup

```bash
pnpm install
cp .env.example .env.local
# Preencha:
#  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY (dashboard.clerk.com)
#  DATABASE_URL (Neon pooled connection)
#  CLERK_WEBHOOK_SIGNING_SECRET (após criar webhook)

pnpm db:push     # aplica schema no Neon
pnpm db:seed     # popula 48 times + 12 grupos + jogos de grupo
pnpm dev
```

## Identidade do usuário

Clerk é a **única fonte da verdade** para usuários. Não há tabela `users` no Postgres — `memberships.user_id`, `predictions.user_id` e `boloes.admin_id` armazenam o Clerk user id como `text` (sem FK).

Para exibir nome/avatar em ranking/leaderboard, use `getUsers([...])` em `src/lib/clerk-users.ts` — batch via `clerkClient().users.getUserList()`, cacheado por request com `React.cache`.

## Modelo de dados

| tabela        | descrição                                                  |
| ------------- | ---------------------------------------------------------- |
| `teams`       | 48 seleções (código, nome, cores)                          |
| `groups`      | A..L                                                       |
| `group_teams` | M:N grupos↔times                                           |
| `matches`     | jogos (group → final), com `result_a`/`result_b` opcional |
| `boloes`      | bolão, admin (Clerk id), código de convite único           |
| `memberships` | Clerk userId ↔ bolão + role (admin/member)                 |
| `predictions` | palpite (PK composta: bolão + user + match)                |

## Pontuação

```ts
// src/lib/scoring.ts
placarExato      → +10
vencedorCorreto  → +5
errou            →  0
```

## Segurança

- Toda rota fora de `/`, `/sign-in`, `/sign-up` exige auth (`middleware.ts`).
- Server Actions validam input (regex, comprimento, sanitização).
- Acesso a bolões valida `memberships` antes de retornar dados.
- DB acessado **apenas no servidor**. Nada de driver no client.
- Código de convite usa `crypto.randomInt` + alfabeto sem caracteres ambíguos.
- Sem PII no Postgres além de IDs Clerk opacos — nome/email vivem no Clerk.

## Próximas iterações (não no scaffold inicial)

- Telas de chaves / bracket / palpites / admin / ranking / atividade
- Cron de fechamento de palpites antes do kickoff
- Notificações realtime
