-- VIVA+ — Solicitações compartilhadas entre idosos e voluntários.
-- Execute uma vez no SQL Editor. Preserva as contas e dados existentes.
create table if not exists public.help_requests (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  details text not null default '',
  category text not null default 'Apoio',
  requested_date text not null default 'A combinar',
  status text not null default 'Disponível' check (status in ('Disponível','Aceita','Concluída')),
  volunteer_id uuid references auth.users(id) on delete set null,
  urgent boolean not null default false,
  legacy_id text,
  created_at timestamptz not null default now(),
  unique(elder_id, legacy_id)
);
create index if not exists help_requests_status_idx on public.help_requests(status, created_at desc);
create index if not exists help_requests_elder_idx on public.help_requests(elder_id);
create index if not exists help_requests_volunteer_idx on public.help_requests(volunteer_id);
alter table public.help_requests enable row level security;

-- Idoso vê seus pedidos; voluntários veem os disponíveis e os que aceitaram.
-- Familiar só terá acesso aos pedidos autorizados por outra funcionalidade específica.
drop policy if exists help_requests_read on public.help_requests;
create policy help_requests_read on public.help_requests for select to authenticated
using (
  elder_id = (select auth.uid())
  or (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='voluntario')
      and (status='Disponível' or volunteer_id=(select auth.uid())))
);
drop policy if exists help_requests_insert on public.help_requests;
create policy help_requests_insert on public.help_requests for insert to authenticated
with check (
  elder_id=(select auth.uid()) and volunteer_id is null and status='Disponível'
  and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='idoso')
);
-- Não concedemos UPDATE direto: aceite/conclusão só por funções com verificação de perfil.
drop policy if exists help_requests_update on public.help_requests;
revoke update, delete on public.help_requests from authenticated, anon;
grant select, insert on public.help_requests to authenticated;

create or replace function public.accept_help_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and role='voluntario') then
    raise exception 'Apenas voluntários podem aceitar pedidos';
  end if;
  update public.help_requests
  set status='Aceita', volunteer_id=auth.uid()
  where id=p_request_id and status='Disponível' and volunteer_id is null;
  if not found then raise exception 'Pedido indisponível ou já aceito'; end if;
end;
$$;
create or replace function public.finish_help_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and role='voluntario') then
    raise exception 'Apenas voluntários podem concluir pedidos';
  end if;
  update public.help_requests set status='Concluída'
  where id=p_request_id and volunteer_id=auth.uid() and status='Aceita';
  if not found then raise exception 'Pedido não encontrado ou não atribuído a você'; end if;
end;
$$;
revoke all on function public.accept_help_request(uuid) from public, anon;
revoke all on function public.finish_help_request(uuid) from public, anon;
grant execute on function public.accept_help_request(uuid) to authenticated;
grant execute on function public.finish_help_request(uuid) to authenticated;

-- Importa pedidos antigos de user_data.payload.requests, sem apagar o JSON original.
-- O ID legado evita duplicação caso o SQL seja executado novamente.
insert into public.help_requests
  (elder_id,title,details,category,requested_date,status,volunteer_id,urgent,legacy_id,created_at)
select
  ud.user_id,
  left(coalesce(nullif(trim(r.item->>'title'),''),'Pedido de ajuda'),200),
  coalesce(r.item->>'details',''),
  coalesce(r.item->>'category','Apoio'),
  coalesce(r.item->>'date','A combinar'),
  case when r.item->>'status' in ('Aceita','Concluída')
       and exists(select 1 from auth.users u where u.id::text=r.item->>'volunteerId')
       then r.item->>'status' else 'Disponível' end,
  case when (r.item->>'volunteerId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       and exists(select 1 from auth.users u where u.id=(r.item->>'volunteerId')::uuid)
       then (r.item->>'volunteerId')::uuid else null end,
  coalesce((r.item->>'urgent')::boolean,false),
  r.item->>'id',
  now()
from public.user_data ud
join public.profiles p on p.id=ud.user_id and p.role='idoso'
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(ud.payload->'requests')='array' then ud.payload->'requests' else '[]'::jsonb end
) as r(item)
where r.item->>'id' is not null
on conflict (elder_id, legacy_id) do nothing;

notify pgrst, 'reload schema';
