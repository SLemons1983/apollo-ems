begin;

create table if not exists public.epcr_reports (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.apollo_agencies(id) on delete restrict,
  submitted_by_membership_id uuid not null references public.epcr_memberships(id) on delete restrict,
  submitted_by_auth_user_id uuid not null,
  report_number text not null,
  incident_number text,
  patient_display text not null default 'Patient',
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED', 'REJECTED', 'COMPLETED')),
  chart jsonb not null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_membership_id uuid references public.epcr_memberships(id) on delete restrict,
  reviewer_message text,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint epcr_reports_agency_report_revision_unique unique (agency_id, report_number, revision)
);

create index if not exists epcr_reports_agency_status_submitted_idx
  on public.epcr_reports (agency_id, status, submitted_at desc);
create index if not exists epcr_reports_submitter_idx
  on public.epcr_reports (submitted_by_membership_id, submitted_at desc);

create table if not exists public.epcr_report_review_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.epcr_reports(id) on delete restrict,
  agency_id uuid not null references public.apollo_agencies(id) on delete restrict,
  actor_membership_id uuid not null references public.epcr_memberships(id) on delete restrict,
  event_type text not null check (event_type in ('SUBMITTED', 'RESUBMITTED', 'COMPLETED', 'REJECTED')),
  message text,
  report_revision integer not null,
  created_at timestamptz not null default now()
);

create index if not exists epcr_report_review_events_report_idx
  on public.epcr_report_review_events (report_id, created_at asc);

alter table public.epcr_reports enable row level security;
alter table public.epcr_report_review_events enable row level security;
revoke all on table public.epcr_reports from anon, authenticated;
revoke all on table public.epcr_report_review_events from anon, authenticated;

create or replace function public.set_epcr_report_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_epcr_report_updated_at on public.epcr_reports;
create trigger set_epcr_report_updated_at before update on public.epcr_reports
for each row execute function public.set_epcr_report_updated_at();

commit;
