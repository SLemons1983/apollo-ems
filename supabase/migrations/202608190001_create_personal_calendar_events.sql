-- ApolloEMS Personal Calendar
-- Private account-backed personal events with row-level security.

create table if not exists public.personal_calendar_events (
  id uuid primary key default gen_random_uuid(),
  employee_id text not null,
  employee_email text not null,
  title text not null check (char_length(trim(title)) between 1 and 200),
  date_key date not null,
  start_time time,
  end_time time,
  all_day boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_calendar_event_times_check check (
    (all_day = true and start_time is null and end_time is null)
    or
    (all_day = false and start_time is not null and end_time is not null and end_time > start_time)
  )
);

create index if not exists personal_calendar_events_employee_email_date_idx
  on public.personal_calendar_events (lower(employee_email), date_key);

alter table public.personal_calendar_events enable row level security;

drop policy if exists "Employees can read own personal calendar events" on public.personal_calendar_events;
create policy "Employees can read own personal calendar events"
  on public.personal_calendar_events
  for select
  to authenticated
  using (
    lower(employee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "Employees can create own personal calendar events" on public.personal_calendar_events;
create policy "Employees can create own personal calendar events"
  on public.personal_calendar_events
  for insert
  to authenticated
  with check (
    lower(employee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "Employees can update own personal calendar events" on public.personal_calendar_events;
create policy "Employees can update own personal calendar events"
  on public.personal_calendar_events
  for update
  to authenticated
  using (
    lower(employee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (
    lower(employee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "Employees can delete own personal calendar events" on public.personal_calendar_events;
create policy "Employees can delete own personal calendar events"
  on public.personal_calendar_events
  for delete
  to authenticated
  using (
    lower(employee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

grant select, insert, update, delete on public.personal_calendar_events to authenticated;

create or replace function public.set_personal_calendar_event_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_personal_calendar_event_updated_at on public.personal_calendar_events;
create trigger set_personal_calendar_event_updated_at
before update on public.personal_calendar_events
for each row execute function public.set_personal_calendar_event_updated_at();
