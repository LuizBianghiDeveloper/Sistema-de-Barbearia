-- =====================================================================
-- US-06 — Suporte ao motor de disponibilidade.
-- Função que expõe APENAS os intervalos ocupados (bloqueios + agendamentos
-- ativos) de um barbeiro num período. SECURITY DEFINER para que o cliente
-- possa calcular horários livres sem ler motivo de folga nem dados de
-- agendamentos de terceiros (a RLS bloquearia a leitura direta).
-- =====================================================================

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
  select a.inicio, a.fim
  from public.appointments a
  where a.barber_id = p_barber
    and a.status <> 'cancelado'
    and a.inicio < p_to
    and a.fim > p_from
  union all
  select t.inicio, t.fim
  from public.time_off t
  where t.barber_id = p_barber
    and t.inicio < p_to
    and t.fim > p_from
$$;

grant execute on function public.get_busy_intervals(uuid, timestamptz, timestamptz)
  to authenticated;
