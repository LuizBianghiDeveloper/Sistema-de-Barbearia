-- =====================================================================
-- Seeds de desenvolvimento (rodam em `supabase db reset`).
-- Senha de todos os usuários de teste: senha123
-- =====================================================================

-- Cria usuários no Auth de forma robusta (tokens vazios evitam erros do
-- GoTrue no login). O trigger on_auth_user_created cria os profiles.
do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('11111111-1111-1111-1111-111111111111'::uuid, 'admin@barbearia.test',  'Ana Admin',    '11999990001'),
      ('22222222-2222-2222-2222-222222222222'::uuid, 'joao@barbearia.test',   'João Barbeiro','11999990002'),
      ('33333333-3333-3333-3333-333333333333'::uuid, 'carlos@barbearia.test', 'Carlos Barber','11999990003'),
      ('44444444-4444-4444-4444-444444444444'::uuid, 'maria@cliente.test',    'Maria Cliente','11999990004')
    ) as t(id, email, nome, telefone)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      u.id, 'authenticated', 'authenticated', u.email,
      crypt('senha123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('nome', u.nome, 'telefone', u.telefone),
      '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), u.id, u.id::text,
      jsonb_build_object('sub', u.id::text, 'email', u.email),
      'email', now(), now(), now()
    );
  end loop;
end $$;

-- Papéis --------------------------------------------------------------
update public.profiles set role = 'admin'
  where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set role = 'barber'
  where id in (
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
  );

-- Barbeiros -----------------------------------------------------------
insert into public.barbers (id, profile_id, ativo) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', true),
  ('aaaaaaaa-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', true);

-- Serviços ------------------------------------------------------------
insert into public.services (id, nome, duracao_min, preco, ativo) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Corte de cabelo',       30, 45.00, true),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Barba',                 30, 35.00, true),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'Corte + Barba',         60, 70.00, true),
  ('bbbbbbbb-0000-0000-0000-000000000004', 'Acabamento (pezinho)',  30, 20.00, true);

-- Jornada semanal: seg–sex 09:00–12:00 e 13:00–18:00; sáb 09:00–13:00
-- dia_semana: 0=dom ... 6=sáb
insert into public.availability (barber_id, dia_semana, hora_inicio, hora_fim)
select b.id, d.dia, h.ini, h.fim
from (values
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid),
  ('aaaaaaaa-0000-0000-0000-000000000002'::uuid)
) as b(id)
cross join (values (1),(2),(3),(4),(5)) as d(dia)
cross join (values ('09:00'::time, '12:00'::time), ('13:00'::time, '18:00'::time)) as h(ini, fim)
union all
select b.id, 6, '09:00'::time, '13:00'::time
from (values
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid),
  ('aaaaaaaa-0000-0000-0000-000000000002'::uuid)
) as b(id);
