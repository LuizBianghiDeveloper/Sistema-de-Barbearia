-- =====================================================================
-- ENB-02 — Row Level Security conforme a matriz de permissões
-- =====================================================================

alter table public.profiles     enable row level security;
alter table public.barbers      enable row level security;
alter table public.services     enable row level security;
alter table public.availability enable row level security;
alter table public.time_off     enable row level security;
alter table public.appointments enable row level security;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
-- Impede que um não-admin altere o próprio papel (escalonamento).
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Só protege usuários autenticados não-admin. Quando auth.uid() é nulo
  -- (seed, superuser, service_role — contextos confiáveis do servidor),
  -- a mudança de papel é permitida.
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Ler o próprio perfil.
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

-- Admin lê todos os perfis.
create policy "profiles_select_admin"
  on public.profiles for select
  using (public.is_admin());

-- Barbeiro lê o perfil dos clientes que têm agendamento na sua agenda
-- (para exibir nome/telefone na agenda — US-09).
create policy "profiles_select_barber_clients"
  on public.profiles for select
  using (
    exists (
      select 1 from public.appointments a
      where a.client_id = profiles.id
        and a.barber_id = public.current_barber_id()
    )
  );

-- Atualizar o próprio perfil (o trigger acima trava mudança de role).
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admin atualiza qualquer perfil (inclusive promover a barbeiro/admin).
create policy "profiles_update_admin"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- barbers  (RN06: só admin gerencia)
-- ---------------------------------------------------------------------
create policy "barbers_select_all"
  on public.barbers for select
  using (auth.role() = 'authenticated');

create policy "barbers_admin_write"
  on public.barbers for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- services  (leitura pública p/ autenticados; escrita só admin — US-03)
-- ---------------------------------------------------------------------
create policy "services_select_all"
  on public.services for select
  using (auth.role() = 'authenticated');

create policy "services_admin_write"
  on public.services for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- availability  (RN11: barbeiro na sua; admin em qualquer)
-- ---------------------------------------------------------------------
-- Leitura liberada p/ autenticados (necessária ao cálculo de slots).
create policy "availability_select_all"
  on public.availability for select
  using (auth.role() = 'authenticated');

create policy "availability_owner_write"
  on public.availability for all
  using (barber_id = public.current_barber_id() or public.is_admin())
  with check (barber_id = public.current_barber_id() or public.is_admin());

-- ---------------------------------------------------------------------
-- time_off  (dono barbeiro + admin; motivo é privado -> sem leitura pública)
-- O cálculo de disponibilidade para clientes usará uma função SECURITY
-- DEFINER (Fase 4) que expõe apenas os intervalos ocupados.
-- ---------------------------------------------------------------------
create policy "time_off_owner_all"
  on public.time_off for all
  using (barber_id = public.current_barber_id() or public.is_admin())
  with check (barber_id = public.current_barber_id() or public.is_admin());

-- ---------------------------------------------------------------------
-- appointments
-- ---------------------------------------------------------------------
-- SELECT: cliente vê os seus (RN19); barbeiro vê a sua agenda (RN21);
-- admin vê tudo.
create policy "appointments_select_own_client"
  on public.appointments for select
  using (client_id = auth.uid());

create policy "appointments_select_own_barber"
  on public.appointments for select
  using (barber_id = public.current_barber_id());

create policy "appointments_select_admin"
  on public.appointments for select
  using (public.is_admin());

-- INSERT: cliente cria para si (RN18); barbeiro cria na própria agenda
-- (RN22, inclusive cliente avulso); admin em qualquer agenda.
create policy "appointments_insert"
  on public.appointments for insert
  with check (
    client_id = auth.uid()
    or barber_id = public.current_barber_id()
    or public.is_admin()
  );

-- UPDATE (usado para cancelar = mudar status): cliente no próprio;
-- barbeiro na própria agenda; admin em qualquer. Regras de prazo (RN20)
-- são aplicadas na Server Action.
create policy "appointments_update_client"
  on public.appointments for update
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

create policy "appointments_update_barber"
  on public.appointments for update
  using (barber_id = public.current_barber_id())
  with check (barber_id = public.current_barber_id());

create policy "appointments_update_admin"
  on public.appointments for update
  using (public.is_admin())
  with check (public.is_admin());
