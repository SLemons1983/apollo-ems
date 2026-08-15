create table if not exists public.mdt_unit_sessions (
  id uuid primary key default gen_random_uuid(),
  active boolean not null default true,
  physical_vehicle text not null,
  radio_identifier text not null,
  station text not null default '',
  level text not null check (level in ('SUP','ALS','BLS')),
  crew_members jsonb not null default '[]'::jsonb,
  ride_along_type text not null default 'None',
  ride_along_name text not null default '',
  status text not null default 'Unit Available',
  out_of_service_reason text not null default '',
  active_call_number text,
  emergency_active boolean not null default false,
  latitude double precision,
  longitude double precision,
  logged_on_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists mdt_one_active_vehicle on public.mdt_unit_sessions (physical_vehicle) where active;
create unique index if not exists mdt_one_active_radio on public.mdt_unit_sessions (radio_identifier) where active;

create table if not exists public.mdt_cad_calls (
  call_number text primary key,
  radio_identifier text not null,
  payload jsonb not null,
  active boolean not null default true,
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mdt_active_call_by_radio on public.mdt_cad_calls (radio_identifier, active);

alter table public.mdt_unit_sessions enable row level security;
alter table public.mdt_cad_calls enable row level security;
