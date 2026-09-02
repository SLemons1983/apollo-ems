-- Secure continuing education records behind authenticated supervisor API routes.
begin;

alter table public.ce_classes enable row level security;
alter table public.ce_attendance enable row level security;

revoke all on table public.ce_classes from anon, authenticated;
revoke all on table public.ce_attendance from anon, authenticated;

grant select, insert, update, delete on table public.ce_classes to service_role;
grant select, insert, update, delete on table public.ce_attendance to service_role;

commit;
