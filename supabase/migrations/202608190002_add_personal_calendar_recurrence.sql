-- ApolloEMS Personal Calendar recurrence support.

alter table public.personal_calendar_events
  add column if not exists repeat_frequency text not null default 'NONE',
  add column if not exists repeat_until date;

alter table public.personal_calendar_events
  drop constraint if exists personal_calendar_events_repeat_frequency_check;

alter table public.personal_calendar_events
  add constraint personal_calendar_events_repeat_frequency_check
  check (repeat_frequency in ('NONE', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY'));

alter table public.personal_calendar_events
  drop constraint if exists personal_calendar_events_repeat_until_check;

alter table public.personal_calendar_events
  add constraint personal_calendar_events_repeat_until_check
  check (
    (repeat_frequency = 'NONE' and repeat_until is null)
    or
    (repeat_frequency <> 'NONE' and repeat_until is not null and repeat_until >= date_key)
  );

create index if not exists personal_calendar_events_repeat_until_idx
  on public.personal_calendar_events (repeat_until)
  where repeat_until is not null;
