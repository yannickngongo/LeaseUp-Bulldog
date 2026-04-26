create table if not exists waitlist_signups (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  email         text        not null unique,
  property_count text,
  created_at    timestamptz not null default now()
);
