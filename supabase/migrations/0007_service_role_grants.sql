-- =====================================================================
-- Concede ao role de serviço (backend confiável) acesso total às tabelas
-- do schema public — padrão do Supabase. O service_role ignora a RLS e é
-- usado apenas no servidor (nunca exposto ao cliente).
-- =====================================================================

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to service_role;
