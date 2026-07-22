-- =====================================================================
-- Mensalistas — reserva de horário FIXO recorrente (semanal).
-- Cliente com horário garantido toda semana (ex.: toda sexta 12:00).
-- Guarda apenas a REGRA; as ocorrências são calculadas (não materializadas).
-- Sem controle financeiro nesta fase — apenas a reserva do horário.
-- =====================================================================

create table public.reservas_fixas (
  id               uuid primary key default gen_random_uuid(),
  barber_id        uuid not null references public.barbers (id) on delete cascade,
  service_id       uuid not null references public.services (id) on delete restrict,
  cliente_nome     text not null,
  cliente_telefone text,
  dia_semana       smallint not null check (dia_semana between 0 and 6),
  hora_inicio      time not null,
  data_inicio      date not null default current_date,
  data_fim         date,                      -- null = indefinido
  ativo            boolean not null default true,
  criado_por       uuid references public.profiles (id) on delete set null,
  criado_em        timestamptz not null default now(),
  check (data_fim is null or data_fim >= data_inicio)
);
comment on table public.reservas_fixas is 'Reserva semanal fixa (mensalista). Ocorrências calculadas via get_busy_intervals.';
create index reservas_fixas_barber_idx on public.reservas_fixas (barber_id, dia_semana);

-- Grants + RLS (dono barbeiro ou admin) --------------------------------
grant select, insert, update, delete on public.reservas_fixas to authenticated;
grant all on public.reservas_fixas to service_role;

alter table public.reservas_fixas enable row level security;

create policy "reservas_fixas_owner_all"
  on public.reservas_fixas for all
  using (barber_id = public.current_barber_id() or public.is_admin())
  with check (barber_id = public.current_barber_id() or public.is_admin());

-- ---------------------------------------------------------------------
-- get_busy_intervals: agora inclui as ocorrências das reservas fixas no
-- período consultado. Assim o motor de slots bloqueia o horário do
-- mensalista toda semana, para qualquer cliente, sem materializar nada.
-- ---------------------------------------------------------------------
create or replace function public.get_busy_intervals(
  p_barber uuid,
  p_from   timestamptz,
  p_to     timestamptz
)
returns table (inicio timestamptz, fim timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  -- Agendamentos ativos
  select a.inicio, a.fim
  from public.appointments a
  where a.barber_id = p_barber
    and a.status <> 'cancelado'
    and a.inicio < p_to
    and a.fim > p_from
  union all
  -- Bloqueios / folgas
  select t.inicio, t.fim
  from public.time_off t
  where t.barber_id = p_barber
    and t.inicio < p_to
    and t.fim > p_from
  union all
  -- Reservas fixas (mensalistas) — ocorrências no período
  select
    ((g.d + r.hora_inicio) at time zone 'America/Sao_Paulo') as inicio,
    ((g.d + r.hora_inicio) at time zone 'America/Sao_Paulo'
      + make_interval(mins => s.duracao_min)) as fim
  from public.reservas_fixas r
  join public.services s on s.id = r.service_id
  cross join lateral (
    select generate_series(
      (p_from at time zone 'America/Sao_Paulo')::date,
      (p_to   at time zone 'America/Sao_Paulo')::date,
      interval '1 day'
    )::date as d
  ) g
  where r.barber_id = p_barber
    and r.ativo
    and extract(dow from g.d)::int = r.dia_semana
    and g.d >= r.data_inicio
    and (r.data_fim is null or g.d <= r.data_fim)
    and ((g.d + r.hora_inicio) at time zone 'America/Sao_Paulo') < p_to
    and ((g.d + r.hora_inicio) at time zone 'America/Sao_Paulo'
          + make_interval(mins => s.duracao_min)) > p_from;
$$;
