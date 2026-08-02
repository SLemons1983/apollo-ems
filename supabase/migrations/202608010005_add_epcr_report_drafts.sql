begin;

alter table public.epcr_reports drop constraint if exists epcr_reports_status_check;
alter table public.epcr_reports add constraint epcr_reports_status_check
  check (status in ('DRAFT', 'SUBMITTED', 'REJECTED', 'COMPLETED'));

commit;
