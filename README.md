# Barbearia — Sistema de Agendamento (MVP)

Sistema web de agendamento para barbearia, com perfis de **cliente**, **barbeiro** e **admin**, múltiplos barbeiros e agenda com motor de disponibilidade.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind + shadcn/ui · Supabase (Postgres, Auth, RLS) · Vitest.

## Pré-requisitos

- **Node.js 20+**
- **Docker Desktop** rodando (o Supabase local sobe em containers)

## Setup

```bash
# 1. Instalar dependências
npm install

# 2. Subir o Supabase local (Postgres + Auth + Studio)
npm run db:start

# 3. Aplicar schema, RLS e seeds
npm run db:reset

# 4. Configurar variáveis de ambiente
cp .env.example .env.local
npm run db:status   # copie ANON_KEY / API_URL / SERVICE_ROLE_KEY para o .env.local

# 5. Rodar a aplicação
npm run dev
```

App em http://localhost:3000 · Supabase Studio em http://localhost:54323

## Usuários de teste (seed)

Senha de todos: **`senha123`**

| Papel | E-mail |
|---|---|
| Admin | `admin@barbearia.test` |
| Barbeiro | `joao@barbearia.test` |
| Barbeiro | `carlos@barbearia.test` |
| Cliente | `maria@cliente.test` |

## Scripts

| Comando | Ação |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run test` | Testes unitários (Vitest) |
| `npm run test:db` | Inclui os testes de integração (requer Supabase local) |
| `npm run db:start` / `db:stop` | Sobe / para o Supabase local |
| `npm run db:reset` | Recria o banco com migrations + seed |
| `npm run db:push` | Aplica as migrations no projeto remoto |
| `npm run db:status` | Mostra URLs e chaves locais |

## Testes e CI

- **Unitários:** motor de slots (`src/lib/slots.test.ts`) — 19 casos de borda (fuso, encaixe, bloqueios, passado, meia-noite).
- **Integração:** anti double-booking sob concorrência (`src/lib/slots.integration.test.ts`) — roda com `npm run test:db`; pulado no CI.
- **CI** (`.github/workflows/ci.yml`): lint → testes → build em cada push/PR.

## Deploy

Publicação em produção (Supabase Cloud + Vercel) documentada em [DEPLOY.md](DEPLOY.md).

## Estrutura

```
src/
  app/            # rotas (App Router)
  components/ui/  # shadcn/ui
  lib/
    supabase/     # clientes server/client + middleware de sessão
    slots.ts      # motor de disponibilidade (Fase 4)
  actions/        # Server Actions
supabase/
  migrations/     # 0001_schema, 0002_auth, 0003_rls, 0004_grants
  seed.sql        # dados de teste
```

## Modelo de dados

`profiles` (papel) · `barbers` · `services` · `availability` (jornada semanal) · `time_off` (bloqueios) · `appointments`.

Regras-chave: horários em **UTC** no banco, exibidos em `America/Sao_Paulo`; **RLS** por papel conforme a matriz de permissões; **exclusion constraint** (`btree_gist`) impede double-booking no nível do banco.

## Progresso (fases)

- [x] **Fase 0** — Fundação técnica (ENB-01)
- [x] **Fase 1** — Banco, Auth e RLS (ENB-02)
- [x] **Fase 2** — Cadastro e acesso (US-01, US-02)
- [x] **Fase 3** — Configuração da barbearia (US-03/04/05)
- [x] **Fase 4** — Motor de slots (US-06)
- [x] **Fase 5** — Agendamento do cliente (US-07, US-08)
- [x] **Fase 6** — Painel do barbeiro (US-09, US-10)
- [x] **Fase 7** — Entrega (ENB-11, ENB-12)

**MVP completo** — todas as user stories (US-01 a US-10) implementadas, testadas e prontas para deploy.
