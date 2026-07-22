-- =====================================================================
-- ENB-02 — Autenticação, papéis e funções auxiliares
-- =====================================================================

-- Cria automaticamente um profile (role 'client') quando um usuário é
-- registrado no Supabase Auth. Nome/telefone vêm do metadata do signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email, telefone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'telefone',
    'client'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Funções auxiliares de autorização.
-- SECURITY DEFINER + search_path fixo: rodam com privilégio do owner e
-- IGNORAM a RLS, evitando recursão quando usadas dentro de policies.
-- ---------------------------------------------------------------------

-- Papel do usuário autenticado atual.
create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- É admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- id do barbeiro vinculado ao usuário atual (null se não for barbeiro).
create or replace function public.current_barber_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select b.id
  from public.barbers b
  where b.profile_id = auth.uid();
$$;
