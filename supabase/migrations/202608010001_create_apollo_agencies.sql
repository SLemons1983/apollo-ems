begin;

create extension if not exists pgcrypto;

create table if not exists public.apollo_agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  slug text not null,
  status text not null default 'ONBOARDING' check (status in ('ONBOARDING','ACTIVE','SUSPENDED','INACTIVE')),
  agency_type text not null default 'AMBULANCE' check (agency_type in ('AMBULANCE','FIRE_EMS','FIRE_DEPARTMENT','EDUCATION','OTHER')),
  service_level text not null default 'BLS_ALS' check (service_level in ('BLS','ALS','BLS_ALS','CCT','NON_TRANSPORT','EDUCATION')),
  primary_contact_name text not null,
  primary_contact_email text not null,
  primary_contact_phone text,
  website text,
  enabled_modules text[] not null default '{}',
  subscription_status text not null default 'TRIAL' check (subscription_status in ('BETA','TRIAL','ACTIVE','PAST_DUE','COMPLIMENTARY','CANCELED')),
  is_beta boolean not null default false,
  internal_notes text,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint apollo_agencies_name_unique unique (name),
  constraint apollo_agencies_slug_unique unique (slug),
  constraint apollo_agencies_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

alter table public.apollo_agencies enable row level security;
revoke all on table public.apollo_agencies from anon, authenticated;

create or replace function public.set_apollo_agencies_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_apollo_agencies_updated_at on public.apollo_agencies;
create trigger set_apollo_agencies_updated_at before update on public.apollo_agencies
for each row execute function public.set_apollo_agencies_updated_at();

insert into public.apollo_agencies (
  name, legal_name, slug, status, agency_type, service_level,
  primary_contact_name, primary_contact_email, enabled_modules,
  subscription_status, is_beta, internal_notes, created_by, updated_by
) values (
  'Sequoia Safety Council', 'Sequoia Safety Council', 'sequoia-safety-council', 'ACTIVE', 'AMBULANCE', 'BLS_ALS',
  'ApolloEMS Owner', 's.lemons1983@gmail.com',
  array['Scheduling','Timecards & Payroll','Employee Records','Certifications','Supervisor Tools','Dispatch','Incident Reports','Unit Inspections','Inventory','Fleet','SMS Notifications'],
  'COMPLIMENTARY', true,
  'Initial operational agency. Existing Sequoia tables are not linked or modified by this registry.',
  'migration', 'migration'
)
on conflict (slug) do nothing;

commit;
