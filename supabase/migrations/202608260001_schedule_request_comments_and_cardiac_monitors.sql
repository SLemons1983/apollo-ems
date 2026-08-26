-- ApolloEMS Schedule Patch 001
-- Adds employee comments to open shift requests and shift-level cardiac monitor assignments.

alter table public.open_shift_requests
  add column if not exists employee_note text;

alter table public.schedule_assignments
  add column if not exists cardiac_monitor text;

alter table public.schedule_assignments
  drop constraint if exists schedule_assignments_cardiac_monitor_check;

alter table public.schedule_assignments
  add constraint schedule_assignments_cardiac_monitor_check
  check (
    cardiac_monitor is null
    or cardiac_monitor in ('LP35-10', 'LP35-20', 'LP35-30', 'LP35-40', 'LP35-50', 'LP35-60')
  );
