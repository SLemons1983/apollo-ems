create table if not exists public.ce_classes (
  id uuid primary key default gen_random_uuid(),
  class_date date not null,
  topic text not null,
  ce_hours numeric(5,2) not null check (ce_hours > 0),
  course_type text not null default 'INSTRUCTOR_BASED' check (course_type in ('INSTRUCTOR_BASED','NON_INSTRUCTOR_BASED')),
  created_at timestamptz not null default now()
);

create table if not exists public.ce_attendance (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.ce_classes(id) on delete cascade,
  employee_id text not null,
  employee_name text not null,
  credential_type text not null,
  license_number text not null default '',
  created_at timestamptz not null default now(),
  unique(class_id, employee_id)
);

create index if not exists ce_classes_class_date_idx on public.ce_classes(class_date desc);
create index if not exists ce_attendance_class_id_idx on public.ce_attendance(class_id);

grant select, insert, update, delete on public.ce_classes to anon, authenticated;
grant select, insert, update, delete on public.ce_attendance to anon, authenticated;
