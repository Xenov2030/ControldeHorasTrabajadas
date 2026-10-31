-- Run in the Supabase SQL editor. No service-role key is used by the application.
begin;
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create or replace function app_private.valid_workspace(document jsonb)
returns boolean language sql immutable strict set search_path = '' as $$
  select coalesce(
    jsonb_typeof(document) = 'object'
    and document -> 'version' = '2'::jsonb
    and jsonb_typeof(document -> 'configured') = 'boolean'
    and jsonb_typeof(document -> 'profile') = 'object'
    and jsonb_typeof(document -> 'entries') = 'array'
    and jsonb_typeof(document -> 'compensation') = 'array'
    and jsonb_array_length(document -> 'compensation') > 0
    and jsonb_typeof(document -> 'payments') = 'array'
    and jsonb_typeof(document -> 'sac') = 'array'
    and jsonb_typeof(document -> 'schedule') = 'array'
    and jsonb_array_length(document -> 'schedule') = 7
    and jsonb_typeof(document -> 'cycle') = 'object'
    and jsonb_typeof(document -> 'reminders') = 'object'
    and (document -> 'activeSession' = 'null'::jsonb or jsonb_typeof(document -> 'activeSession') = 'object')
    and octet_length(document::text) <= 2000000,
  false);
$$;

create table if not exists public.workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (app_private.valid_workspace(payload)),
  revision bigint not null default 1 check (revision > 0),
  device_id uuid not null,
  updated_at timestamptz not null default now()
);
alter table public.workspaces enable row level security;
revoke all on public.workspaces from public, anon, authenticated;
grant select on public.workspaces to authenticated;
drop policy if exists workspace_owner_read on public.workspaces;
create policy workspace_owner_read on public.workspaces for select to authenticated
  using ((select auth.uid()) = owner_id);

-- Writes are only available through this atomic, owner-checked operation.
-- p_owner_id is checked against the authenticated JWT; it never grants access.
create or replace function public.save_workspace(
  p_owner_id uuid,
  p_expected_revision bigint,
  p_payload jsonb,
  p_device_id uuid
) returns table(revision bigint, updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null or actor is distinct from p_owner_id then
    raise exception using errcode = '42501', message = 'Account mismatch';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 or p_device_id is null
     or p_payload is null or not coalesce(app_private.valid_workspace(p_payload), false) then
    raise exception using errcode = '22023', message = 'Invalid workspace';
  end if;
  if p_expected_revision = 0 then
    return query insert into public.workspaces as w(owner_id, payload, revision, device_id)
      values (actor, p_payload, 1, p_device_id)
      on conflict (owner_id) do nothing
      returning w.revision, w.updated_at;
  else
    return query update public.workspaces as w
      set payload = p_payload, revision = w.revision + 1, device_id = p_device_id, updated_at = clock_timestamp()
      where w.owner_id = actor and w.revision = p_expected_revision
      returning w.revision, w.updated_at;
  end if;
  if not found then
    raise exception using errcode = '40001', message = 'Workspace changed on another device';
  end if;
end;
$$;
revoke all on function public.save_workspace(uuid,bigint,jsonb,uuid) from public, anon;
grant execute on function public.save_workspace(uuid,bigint,jsonb,uuid) to authenticated;
commit;
