-- =====================================================================
-- ENB-02 — GRANTs de tabela para os roles da API do Supabase.
-- A RLS (0003) só é avaliada DEPOIS do privilégio de tabela. Concedemos
-- as operações ao role `authenticated` e deixamos a RLS filtrar as linhas
-- (inclusive distinguir admin via is_admin()).
-- =====================================================================

grant usage on schema public to anon, authenticated;

-- Todas as operações de dados ao usuário autenticado; a RLS restringe.
grant select, insert, update, delete
  on all tables in schema public
  to authenticated;

-- Mantém o padrão para tabelas futuras criadas pelo owner das migrations.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
