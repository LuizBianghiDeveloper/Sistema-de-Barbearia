-- =====================================================================
-- ENB-02 — Modelo de dados
-- Barbearia MVP · schema base
-- Fuso: horários em timestamptz (UTC); exibição em America/Sao_Paulo (RN02)
-- =====================================================================

-- Extensão necessária para a exclusion constraint anti-sobreposição (RN03)
create extension if not exists btree_gist;

-- Papéis do sistema (RN01) -------------------------------------------------
create type public.user_role as enum ('client', 'barber', 'admin');

-- Status do agendamento (RN24) --------------------------------------------
create type public.appointment_status as enum ('pendente', 'confirmado', 'cancelado');

-- profiles: 1-para-1 com auth.users ---------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nome        text not null,
  email       text,
  telefone    text,
  role        public.user_role not null default 'client',
  criado_em   timestamptz not null default now()
);
comment on table public.profiles is 'Perfil do usuário autenticado, com papel (RN01).';

-- barbers: dados profissionais do barbeiro --------------------------------
create table public.barbers (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null unique references public.profiles (id) on delete cascade,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);
comment on table public.barbers is 'Barbeiro com agenda. ativo=false não recebe novos agendamentos (RN07).';

-- services: catálogo único da barbearia (US-03) ---------------------------
create table public.services (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  duracao_min  integer not null check (duracao_min > 0),   -- RN08
  preco        numeric(10, 2) not null default 0 check (preco >= 0),
  ativo        boolean not null default true,
  criado_em    timestamptz not null default now()
);
comment on table public.services is 'Serviço com duração (alimenta o motor de slots) e preço.';

-- availability: jornada semanal do barbeiro (US-04) -----------------------
-- dia_semana: 0=domingo ... 6=sábado (padrão getDay do JS / EXTRACT(DOW))
create table public.availability (
  id           uuid primary key default gen_random_uuid(),
  barber_id    uuid not null references public.barbers (id) on delete cascade,
  dia_semana   smallint not null check (dia_semana between 0 and 6),
  hora_inicio  time not null,
  hora_fim     time not null,
  check (hora_fim > hora_inicio)                            -- RN10
);
comment on table public.availability is 'Intervalos de trabalho por dia da semana (US-04).';
create index availability_barber_idx on public.availability (barber_id, dia_semana);

-- time_off: bloqueios e folgas pontuais (US-05) ---------------------------
create table public.time_off (
  id          uuid primary key default gen_random_uuid(),
  barber_id   uuid not null references public.barbers (id) on delete cascade,
  inicio      timestamptz not null,
  fim         timestamptz not null,
  motivo      text,
  criado_em   timestamptz not null default now(),
  check (fim > inicio)
);
comment on table public.time_off is 'Períodos indisponíveis; prevalecem sobre a jornada (RN12).';
create index time_off_barber_idx on public.time_off (barber_id, inicio, fim);

-- appointments: agendamentos ----------------------------------------------
-- client_id é nullable para suportar cliente avulso sem conta (RN25),
-- identificado por cliente_nome/cliente_telefone.
create table public.appointments (
  id               uuid primary key default gen_random_uuid(),
  barber_id        uuid not null references public.barbers (id) on delete restrict,
  service_id       uuid not null references public.services (id) on delete restrict,
  client_id        uuid references public.profiles (id) on delete set null,
  cliente_nome     text,
  cliente_telefone text,
  inicio           timestamptz not null,
  fim              timestamptz not null,
  status           public.appointment_status not null default 'confirmado', -- RN24
  criado_por       uuid references public.profiles (id) on delete set null,
  criado_em        timestamptz not null default now(),
  check (fim > inicio),
  -- Todo agendamento identifica o cliente: por conta OU por nome avulso (RN25)
  check (client_id is not null or cliente_nome is not null)
);
comment on table public.appointments is 'Agendamento. Cliente por conta (client_id) ou avulso (cliente_nome) — RN25.';
create index appointments_barber_inicio_idx on public.appointments (barber_id, inicio);
create index appointments_client_idx on public.appointments (client_id);

-- RN03 / RN17: um barbeiro não pode ter dois agendamentos ATIVOS
-- (não cancelados) sobrepostos no tempo. Garantido no banco, à prova de
-- concorrência, via exclusion constraint sobre o range [inicio, fim).
alter table public.appointments
  add constraint appointments_sem_sobreposicao
  exclude using gist (
    barber_id with =,
    tstzrange(inicio, fim) with &&
  )
  where (status <> 'cancelado');
