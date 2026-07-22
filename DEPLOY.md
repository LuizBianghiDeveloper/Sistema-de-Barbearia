# Deploy — Barbearia (ENB-12)

Guia para publicar em produção: **Supabase Cloud** (banco + auth) + **Vercel** (app).
Requer contas próprias — os passos que envolvem senha/credenciais são executados por você.

## Visão geral dos ambientes

| Ambiente | App | Banco/Auth |
|---|---|---|
| Local (dev) | `npm run dev` | Supabase local (Docker) |
| Preview | Deploy de PR na Vercel | Projeto Supabase de produção (ou um de staging) |
| Produção | Branch `main` na Vercel | Projeto Supabase de produção |

## 1. Criar o projeto no Supabase Cloud

1. Em https://supabase.com crie um projeto (guarde a **senha do banco**).
2. Em **Project Settings → API**, anote:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (secreto, só no servidor)

## 2. Aplicar as migrations no banco de produção

As migrations versionadas em `supabase/migrations/` são a fonte da verdade do schema.

```bash
# Autentica a CLI (abre o navegador)
npx supabase login

# Vincula o repositório ao projeto (pega o ref em Project Settings → General)
npx supabase link --project-ref <SEU_PROJECT_REF>

# Envia todas as migrations para o banco de produção
npx supabase db push
```

> **Seeds NÃO vão para produção.** `supabase/seed.sql` é só para desenvolvimento
> (usuários de teste). Em produção, crie o primeiro admin manualmente (passo 5).

## 3. Configurar o Auth em produção

Em **Authentication → URL Configuration** do projeto Supabase:

- **Site URL:** `https://<seu-dominio>` (ou a URL da Vercel)
- **Redirect URLs:** adicione `https://<seu-dominio>/auth/confirm`
  (necessário para o link de recuperação de senha — US-01).

Em **Authentication → Providers → Email**: mantenha e-mail/senha habilitado.
Para produção, considere **ativar a confirmação de e-mail** (no local ela está
desligada em `supabase/config.toml`).

## 4. Deploy na Vercel

1. Importe o repositório em https://vercel.com/new (framework Next.js é detectado).
2. Em **Settings → Environment Variables**, defina (para Production e Preview):

   | Variável | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave anon |
   | `SUPABASE_SERVICE_ROLE_KEY` | chave service_role (secreta) |
   | `REMINDER_HOURS_BEFORE` | antecedência do lembrete (ex.: `3`) |
   | `CRON_SECRET` | um segredo forte (protege a rota do cron) |
   | `ZAPI_INSTANCE_ID` / `ZAPI_TOKEN` / `ZAPI_CLIENT_TOKEN` | credenciais Z-API (WhatsApp) |

3. Faça o deploy. A cada push em `main`, a Vercel publica produção; PRs geram Preview.
4. (Opcional) Configure o **domínio** em Settings → Domains e atualize o Site URL do Auth.

## 4b. Lembretes automáticos por WhatsApp (Z-API)

O sistema envia um lembrete pelo WhatsApp **X horas antes** de cada agendamento
confirmado (`REMINDER_HOURS_BEFORE`, padrão 3h).

- **Agendador:** `vercel.json` já define um **Vercel Cron** que chama
  `/api/cron/reminders` a cada 15 min. A Vercel envia o header
  `Authorization: Bearer <CRON_SECRET>`, então basta definir `CRON_SECRET`.
- **WhatsApp (Z-API):** crie uma instância em https://z-api.io, conecte o número
  (QR code) e copie `Instance ID`, `Token` e o `Client-Token` (conta) para as
  variáveis `ZAPI_*`. Sem elas, o sistema roda em **modo simulação** (só registra
  no log, não envia).
- **Teste manual:** `GET /api/cron/reminders?secret=<CRON_SECRET>` retorna um
  resumo `{ verificados, enviados, simulados, ... }`.

## 5. Criar o primeiro admin

Como o cadastro público cria `role = client`, promova a si mesmo após se cadastrar:

1. Cadastre-se pelo app em produção.
2. No **SQL Editor** do Supabase, rode (troque o e-mail):
   ```sql
   update public.profiles set role = 'admin'
   where email = 'voce@seudominio.com';
   ```
3. Agora você acessa **Barbeiros** e **Serviços** e pode promover barbeiros pelo app.

## 6. Smoke test pós-deploy

Fluxo principal (cadastro → agendar → cancelar):

- [ ] Cadastro de um cliente novo autentica e cai no painel
- [ ] Admin cadastra um serviço e promove um barbeiro
- [ ] Barbeiro define jornada semanal
- [ ] Cliente agenda um horário (aparece em "Meus agendamentos")
- [ ] Cliente cancela (>12h) e o horário volta a ficar livre
- [ ] Barbeiro vê o agendamento na sua agenda
- [ ] RLS: um cliente não vê agendamentos de outro

## CI

`.github/workflows/ci.yml` roda em cada push/PR: **lint → testes (Vitest) → build**.
Os testes de integração com banco são pulados no CI (não há Postgres); rode-os
localmente com o Supabase de pé:

```bash
RUN_DB_TESTS=1 npm test
```

## Fluxo de novas migrations

```bash
# cria um arquivo novo em supabase/migrations/
npx supabase migration new nome_da_mudanca
# ...edite o SQL...
npx supabase db reset      # testa localmente (recria + seeds)
git commit && git push     # CI valida
npx supabase db push       # aplica em produção
```
