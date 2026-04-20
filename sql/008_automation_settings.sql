-- 008_automation_settings.sql
-- Adds settings JSONB column to operators and properties for automation configuration.
-- Also adds webhook_secret to properties for the universal lead intake webhook.

alter table operators
  add column if not exists settings jsonb not null default '{}';

alter table properties
  add column if not exists settings jsonb not null default '{}',
  add column if not exists webhook_secret text;

-- Sub-account system (organizations, roles, user access)
-- Organizations: company-level accounts (one operator can become an org)
create table if not exists organizations (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  name         text not null,
  owner_id     uuid,             -- references auth.users(id)
  operator_id  uuid references operators(id) on delete cascade,
  plan         text not null default 'starter'
);

create index if not exists organizations_operator_id_idx on organizations(operator_id);

-- Organization members
create table if not exists organization_members (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null,   -- references auth.users(id)
  email           text not null,
  role            text not null default 'viewer',
    -- 'owner' | 'admin' | 'manager' | 'leasing_agent' | 'viewer'
  status          text not null default 'invited',
    -- 'invited' | 'active' | 'deactivated'
  invited_at      timestamptz not null default now(),
  accepted_at     timestamptz,
  unique (organization_id, user_id)
);

create index if not exists org_members_org_id_idx on organization_members(organization_id);
create index if not exists org_members_user_id_idx on organization_members(user_id);

-- Property access: which members can access which properties
create table if not exists user_property_access (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null,
  property_id     uuid not null references properties(id) on delete cascade,
  granted_by      uuid,           -- user_id of the admin who granted access
  unique (user_id, property_id)
);

create index if not exists upa_user_id_idx    on user_property_access(user_id);
create index if not exists upa_property_id_idx on user_property_access(property_id);

-- Pending invitations (before user accepts / creates account)
create table if not exists organization_invitations (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email           text not null,
  role            text not null default 'viewer',
  property_ids    uuid[] not null default '{}',
  token           text not null unique default encode(gen_random_bytes(32), 'hex'),
  expires_at      timestamptz not null default (now() + interval '7 days'),
  accepted_at     timestamptz,
  invited_by      uuid
);

create index if not exists invitations_token_idx on organization_invitations(token);
create index if not exists invitations_email_idx  on organization_invitations(email);
