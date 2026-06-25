-- ===== FIX SHIFTS RLS POLICIES =====
-- Drop old policies that reference profiles.user_id (which is never set by trigger)
DROP POLICY IF EXISTS "Members can read shifts" ON shifts;
DROP POLICY IF EXISTS "Admins can insert shifts" ON shifts;
DROP POLICY IF EXISTS "Admins can update shifts" ON shifts;

-- Recreate using get_my_org_id() helper (SECURITY DEFINER, no recursion)
CREATE POLICY "Users can read shifts" ON shifts
  FOR SELECT USING (organization_id = public.get_my_org_id());

CREATE POLICY "Users can insert shifts" ON shifts
  FOR INSERT WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "Users can update shifts" ON shifts
  FOR UPDATE USING (organization_id = public.get_my_org_id());
