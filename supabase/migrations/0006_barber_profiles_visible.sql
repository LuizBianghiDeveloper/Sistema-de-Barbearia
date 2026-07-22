-- =====================================================================
-- US-07/08 — O cliente precisa ver o NOME do barbeiro (para escolher no
-- agendamento e para exibir em "meus agendamentos"). O nome vive em
-- profiles, cuja leitura é restrita. Liberamos a leitura APENAS de perfis
-- que pertencem a um barbeiro (nome semi-público, exibido no fluxo).
-- =====================================================================

create policy "profiles_select_barbers"
  on public.profiles for select
  using (
    exists (
      select 1 from public.barbers b
      where b.profile_id = profiles.id
    )
  );
