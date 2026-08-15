create table if not exists public.mdt_messages (
  id uuid primary key default gen_random_uuid(),
  sender text not null default 'Dispatch',
  recipient text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists mdt_messages_recipient_created
  on public.mdt_messages (recipient, created_at desc);

alter table public.mdt_messages enable row level security;
