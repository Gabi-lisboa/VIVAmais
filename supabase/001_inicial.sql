-- VIVA+ / Etapa 1: autenticação, perfil e dados pessoais.
-- Execute no SQL Editor de um projeto Supabase novo.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('idoso','familiar','voluntario')),
  phone text not null default '',
  city text not null default '',
  skills text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint payload_object check (jsonb_typeof(payload) = 'object')
);

alter table public.profiles enable row level security;
alter table public.user_data enable row level security;

-- Acesso restrito ao dono: nenhum perfil pode ler dados pessoais de outro usuário.
drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles for select to authenticated
using ((select auth.uid()) = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists "user_data_read_own" on public.user_data;
create policy "user_data_read_own" on public.user_data for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists "user_data_insert_own" on public.user_data;
create policy "user_data_insert_own" on public.user_data for insert to authenticated
with check ((select auth.uid()) = user_id);
drop policy if exists "user_data_update_own" on public.user_data;
create policy "user_data_update_own" on public.user_data for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- O perfil é criado automaticamente quando o Supabase Auth registra uma conta.
create or replace function public.handle_new_viva_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Usuário VIVA+'),
    case when new.raw_user_meta_data ->> 'role' in ('idoso','familiar','voluntario')
      then new.raw_user_meta_data ->> 'role' else 'idoso' end
  );
  insert into public.user_data(user_id, payload) values (new.id, '{}'::jsonb);
  return new;
end;
$$;

drop trigger if exists on_viva_auth_user_created on auth.users;
create trigger on_viva_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_viva_user();

-- Não permitir que o próprio usuário altere seu papel por update direto.
create or replace function public.prevent_viva_role_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role then
    raise exception 'Alteração de perfil não permitida';
  end if;
  return new;
end;
$$;
drop trigger if exists prevent_viva_role_change_trigger on public.profiles;
create trigger prevent_viva_role_change_trigger
before update on public.profiles
for each row execute function public.prevent_viva_role_change();
