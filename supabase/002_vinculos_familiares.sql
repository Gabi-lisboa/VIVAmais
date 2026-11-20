-- VIVA+ / Etapa 2: solicitações de vínculo familiar com aprovação.
-- Execute após 001_inicial.sql. Não remove contas nem perfis existentes.
create table if not exists public.family_links (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.profiles(id) on delete cascade,
  elder_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(family_id, elder_id),
  check (family_id <> elder_id)
);
alter table public.family_links enable row level security;
drop policy if exists family_links_select_own on public.family_links;
create policy family_links_select_own on public.family_links for select to authenticated
using (family_id = (select auth.uid()) or elder_id = (select auth.uid()));
-- Writes are only allowed through the carefully scoped SECURITY DEFINER RPC functions.
revoke all on public.family_links from anon, authenticated;
grant select on public.family_links to authenticated;

create or replace function public.request_family_link(p_elder_email text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_elder uuid; v_role text; v_id uuid := (select auth.uid());
begin
  select role into v_role from public.profiles where id = v_id;
  if v_role is distinct from 'familiar' then raise exception 'Apenas familiares podem solicitar vínculos'; end if;
  select id into v_elder from auth.users where lower(email) = lower(trim(p_elder_email));
  if v_elder is null or not exists(select 1 from public.profiles where id = v_elder and role = 'idoso') then
    -- Same response to avoid exposing whether an email exists.
    return 'Se a conta informada existir e for de uma pessoa idosa, a solicitação será registrada.';
  end if;
  insert into public.family_links(family_id, elder_id, status)
  values(v_id, v_elder, 'pending')
  on conflict(family_id, elder_id) do update set
    status = case when public.family_links.status = 'approved' then 'approved' else 'pending' end,
    updated_at = now();
  return 'Solicitação registrada. Aguarde a aprovação da pessoa idosa.';
end; $$;
revoke all on function public.request_family_link(text) from public;
grant execute on function public.request_family_link(text) to authenticated;

create or replace function public.respond_family_link(p_link_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.profiles where id = (select auth.uid()) and role = 'idoso') then
    raise exception 'Apenas a pessoa idosa pode responder';
  end if;
  update public.family_links set status = case when p_approve then 'approved' else 'rejected' end,
    updated_at = now()
  where id = p_link_id and elder_id = (select auth.uid()) and status = 'pending';
  if not found then raise exception 'Solicitação não encontrada ou já respondida'; end if;
end; $$;
revoke all on function public.respond_family_link(uuid, boolean) from public;
grant execute on function public.respond_family_link(uuid, boolean) to authenticated;

-- Share name, city and approved care records only. Approved care records may contain sensitive notes and locations; use only with informed consent.
create or replace function public.get_family_connections()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid := (select auth.uid()); v_role text;
begin
  select role into v_role from public.profiles where id = v_id;
  if v_role = 'familiar' then
    return coalesce((select jsonb_agg(jsonb_build_object(
      'link_id',l.id,'status',l.status,'id',p.id,'name',p.full_name,'city',p.city,
      'shared',case when l.status = 'approved' then jsonb_build_object(
        'requests',coalesce(d.payload->'requests','[]'::jsonb),
        'checkins',coalesce(d.payload->'checkins','[]'::jsonb),
        'reminders',coalesce(d.payload->'reminders','[]'::jsonb),
        'alerts',coalesce(d.payload->'alerts','[]'::jsonb)) else null end))
      from public.family_links l join public.profiles p on p.id=l.elder_id
      left join public.user_data d on d.user_id=l.elder_id
      where l.family_id=v_id), '[]'::jsonb);
  elsif v_role = 'idoso' then
    return coalesce((select jsonb_agg(jsonb_build_object(
      'link_id',l.id,'status',l.status,'id',p.id,'name',p.full_name,'city',p.city))
      from public.family_links l join public.profiles p on p.id=l.family_id
      where l.elder_id=v_id), '[]'::jsonb);
  end if;
  return '[]'::jsonb;
end; $$;
revoke all on function public.get_family_connections() from public;
grant execute on function public.get_family_connections() to authenticated;
