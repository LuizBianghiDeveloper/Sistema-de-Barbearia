-- =====================================================================
-- Lembrete automático — controle de envio.
-- Marca quando o lembrete de um agendamento já foi enviado, evitando
-- que o cron reenvie a mesma mensagem.
-- =====================================================================

alter table public.appointments
  add column lembrete_enviado_em timestamptz;

comment on column public.appointments.lembrete_enviado_em is
  'Quando o lembrete (WhatsApp) foi enviado; null = ainda não enviado.';

create index appointments_lembrete_idx
  on public.appointments (status, lembrete_enviado_em, inicio);
