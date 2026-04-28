-- supabase/rls-policies.sql
-- Tenant-isolation Row Level Security policies for LeaseUp Bulldog.
--
-- Apply with:  psql $DATABASE_URL -f supabase/rls-policies.sql
-- Or paste into the Supabase SQL editor and run.
--
-- These policies ensure every authenticated user can only read/write rows that
-- belong to their own operator account. The service role (used server-side via
-- getSupabaseAdmin()) bypasses RLS entirely, so API routes are unaffected.
--
-- Prerequisites:
--   - Each table has an `operator_id` column (UUID FK → operators.id), OR
--     a `property_id` column that joins back to `properties.operator_id`.
--   - Supabase Auth is in use; `auth.uid()` returns the user's UUID.
--   - The `operators` table has a `user_id` column linking to `auth.users.id`.

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: a stable function that returns the operator_id for the current user.
-- Used by policies to avoid a subquery per row.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.current_operator_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id
  FROM operators o
  JOIN auth.users u ON u.email = o.email
  WHERE u.id = auth.uid()
  LIMIT 1;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- operators
-- Users can only see and edit their own operator row.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE operators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "operators_select_own" ON operators;
CREATE POLICY "operators_select_own" ON operators
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS "operators_update_own" ON operators;
CREATE POLICY "operators_update_own" ON operators
  FOR UPDATE USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- properties
-- Scoped to the calling user's operator_id.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "properties_select_own" ON properties;
CREATE POLICY "properties_select_own" ON properties
  FOR SELECT USING (operator_id = public.current_operator_id());

DROP POLICY IF EXISTS "properties_insert_own" ON properties;
CREATE POLICY "properties_insert_own" ON properties
  FOR INSERT WITH CHECK (operator_id = public.current_operator_id());

DROP POLICY IF EXISTS "properties_update_own" ON properties;
CREATE POLICY "properties_update_own" ON properties
  FOR UPDATE USING (operator_id = public.current_operator_id());

DROP POLICY IF EXISTS "properties_delete_own" ON properties;
CREATE POLICY "properties_delete_own" ON properties
  FOR DELETE USING (operator_id = public.current_operator_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- leads
-- Scoped via property → operator_id.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_select_own" ON leads;
CREATE POLICY "leads_select_own" ON leads
  FOR SELECT USING (
    property_id IN (
      SELECT id FROM properties WHERE operator_id = public.current_operator_id()
    )
  );

DROP POLICY IF EXISTS "leads_insert_own" ON leads;
CREATE POLICY "leads_insert_own" ON leads
  FOR INSERT WITH CHECK (
    property_id IN (
      SELECT id FROM properties WHERE operator_id = public.current_operator_id()
    )
  );

DROP POLICY IF EXISTS "leads_update_own" ON leads;
CREATE POLICY "leads_update_own" ON leads
  FOR UPDATE USING (
    property_id IN (
      SELECT id FROM properties WHERE operator_id = public.current_operator_id()
    )
  );

DROP POLICY IF EXISTS "leads_delete_own" ON leads;
CREATE POLICY "leads_delete_own" ON leads
  FOR DELETE USING (
    property_id IN (
      SELECT id FROM properties WHERE operator_id = public.current_operator_id()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- conversations
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select_own" ON conversations;
CREATE POLICY "conversations_select_own" ON conversations
  FOR SELECT USING (
    property_id IN (
      SELECT id FROM properties WHERE operator_id = public.current_operator_id()
    )
  );

DROP POLICY IF EXISTS "conversations_insert_own" ON conversations;
CREATE POLICY "conversations_insert_own" ON conversations
  FOR INSERT WITH CHECK (
    property_id IN (
      SELECT id FROM properties WHERE operator_id = public.current_operator_id()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- units
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "units_select_own" ON units;
CREATE POLICY "units_select_own" ON units
  FOR SELECT USING (
    property_id IN (
      SELECT id FROM properties WHERE operator_id = public.current_operator_id()
    )
  );

DROP POLICY IF EXISTS "units_insert_own" ON units;
CREATE POLICY "units_insert_own" ON units
  FOR INSERT WITH CHECK (
    property_id IN (
      SELECT id FROM properties WHERE operator_id = public.current_operator_id()
    )
  );

DROP POLICY IF EXISTS "units_update_own" ON units;
CREATE POLICY "units_update_own" ON units
  FOR UPDATE USING (
    property_id IN (
      SELECT id FROM properties WHERE operator_id = public.current_operator_id()
    )
  );

DROP POLICY IF EXISTS "units_delete_own" ON units;
CREATE POLICY "units_delete_own" ON units
  FOR DELETE USING (
    property_id IN (
      SELECT id FROM properties WHERE operator_id = public.current_operator_id()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- competitors
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "competitors_select_own" ON competitors;
CREATE POLICY "competitors_select_own" ON competitors
  FOR SELECT USING (
    property_id IN (
      SELECT id FROM properties WHERE operator_id = public.current_operator_id()
    )
  );

DROP POLICY IF EXISTS "competitors_insert_own" ON competitors;
CREATE POLICY "competitors_insert_own" ON competitors
  FOR INSERT WITH CHECK (
    property_id IN (
      SELECT id FROM properties WHERE operator_id = public.current_operator_id()
    )
  );

DROP POLICY IF EXISTS "competitors_update_own" ON competitors;
CREATE POLICY "competitors_update_own" ON competitors
  FOR UPDATE USING (
    property_id IN (
      SELECT id FROM properties WHERE operator_id = public.current_operator_id()
    )
  );

DROP POLICY IF EXISTS "competitors_delete_own" ON competitors;
CREATE POLICY "competitors_delete_own" ON competitors
  FOR DELETE USING (
    property_id IN (
      SELECT id FROM properties WHERE operator_id = public.current_operator_id()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- activity_logs
-- Readable by tenant; system writes use service role (bypasses RLS).
-- Security events (auth_* actions) use sentinel UUIDs — exclude from tenant reads.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_logs_select_own" ON activity_logs;
CREATE POLICY "activity_logs_select_own" ON activity_logs
  FOR SELECT USING (
    property_id != '00000000-0000-0000-0000-000000000000'
    AND property_id IN (
      SELECT id FROM properties WHERE operator_id = public.current_operator_id()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- tours
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE tours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tours_select_own" ON tours;
CREATE POLICY "tours_select_own" ON tours
  FOR SELECT USING (
    property_id IN (
      SELECT id FROM properties WHERE operator_id = public.current_operator_id()
    )
  );

DROP POLICY IF EXISTS "tours_insert_own" ON tours;
CREATE POLICY "tours_insert_own" ON tours
  FOR INSERT WITH CHECK (
    property_id IN (
      SELECT id FROM properties WHERE operator_id = public.current_operator_id()
    )
  );

DROP POLICY IF EXISTS "tours_update_own" ON tours;
CREATE POLICY "tours_update_own" ON tours
  FOR UPDATE USING (
    property_id IN (
      SELECT id FROM properties WHERE operator_id = public.current_operator_id()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- organizations & organization_members
-- Members can read their own org; only owners can modify.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizations_select_member" ON organizations;
CREATE POLICY "organizations_select_member" ON organizations
  FOR SELECT USING (
    operator_id = public.current_operator_id()
    OR id IN (
      SELECT organization_id FROM organization_members
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1)
        AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "organizations_update_owner" ON organizations;
CREATE POLICY "organizations_update_owner" ON organizations
  FOR UPDATE USING (operator_id = public.current_operator_id());

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_select_same_org" ON organization_members;
CREATE POLICY "org_members_select_same_org" ON organization_members
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM organizations WHERE operator_id = public.current_operator_id()
    )
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS "org_members_manage_owner" ON organization_members;
CREATE POLICY "org_members_manage_owner" ON organization_members
  FOR ALL USING (
    organization_id IN (
      SELECT id FROM organizations WHERE operator_id = public.current_operator_id()
    )
  );
