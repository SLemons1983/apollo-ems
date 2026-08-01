begin;

alter table public.epcr_memberships
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by text;

create or replace function public.protect_last_active_epcr_primary_admin()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.role = 'PRIMARY_ADMIN'
     and old.status = 'ACTIVE'
     and (new.role <> 'PRIMARY_ADMIN' or new.status <> 'ACTIVE')
     and not exists (
       select 1
       from public.epcr_memberships other
       where other.agency_id = old.agency_id
         and other.id <> old.id
         and other.role = 'PRIMARY_ADMIN'
         and other.status = 'ACTIVE'
     ) then
    raise exception 'Every agency must retain at least one active Primary Admin.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_last_active_epcr_primary_admin on public.epcr_memberships;
create trigger protect_last_active_epcr_primary_admin
before update on public.epcr_memberships
for each row execute function public.protect_last_active_epcr_primary_admin();

commit;
