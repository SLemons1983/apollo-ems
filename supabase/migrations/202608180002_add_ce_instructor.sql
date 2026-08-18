alter table public.ce_classes
  add column if not exists instructor_key text not null default 'jose';

update public.ce_classes
set instructor_key = 'jose'
where instructor_key is null or btrim(instructor_key) = '';

alter table public.ce_classes
  drop constraint if exists ce_classes_instructor_key_check;

alter table public.ce_classes
  add constraint ce_classes_instructor_key_check
  check (instructor_key in ('jose','heather'));
