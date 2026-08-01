begin;

create table if not exists public.epcr_memberships (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.apollo_agencies(id) on delete restrict,
  auth_user_id uuid references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text not null,
  username text not null,
  role text not null check (role in ('PRIMARY_ADMIN','ADMIN','REVIEWER','CLINICIAN')),
  status text not null default 'INVITED' check (status in ('INVITED','ACTIVE','INACTIVE','REVOKED')),
  invited_by text not null,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  last_invited_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint epcr_memberships_agency_email_unique unique (agency_id, email),
  constraint epcr_memberships_agency_username_unique unique (agency_id, username),
  constraint epcr_memberships_email_lowercase check (email = lower(email)),
  constraint epcr_memberships_username_format check (username ~ '^[a-z][a-z0-9]{1,31}$')
);

create index if not exists epcr_memberships_auth_user_idx on public.epcr_memberships(auth_user_id);
create index if not exists epcr_memberships_agency_status_idx on public.epcr_memberships(agency_id, status);

alter table public.epcr_memberships enable row level security;
revoke all on table public.epcr_memberships from anon, authenticated;

create or replace function public.set_epcr_memberships_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_epcr_memberships_updated_at on public.epcr_memberships;
create trigger set_epcr_memberships_updated_at before update on public.epcr_memberships
for each row execute function public.set_epcr_memberships_updated_at();

commit;
