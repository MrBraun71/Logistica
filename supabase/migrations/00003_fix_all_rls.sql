-- ===== 1. ENSURE DEFAULT on profiles.id & DROP old FK on id =====
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profile_id_fkey;

-- ===== 2. HELPER FUNCTIONS =====
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$ SELECT organization_id FROM public.profiles WHERE id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION public.is_my_role(role_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = role_name); $$;

-- ===== 3. DROP OLD POLICIES =====
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Members can read org profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage org profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can read profiles" ON profiles;

-- ===== 4. PROFILES POLICIES =====
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read profiles" ON profiles
  FOR SELECT USING (auth.uid() = id OR organization_id = public.get_my_org_id());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can insert profiles" ON profiles
  FOR INSERT WITH CHECK (public.is_my_role('admin'));

CREATE POLICY "Admins can update profiles" ON profiles
  FOR UPDATE USING (public.is_my_role('admin'));

-- ===== 5. ORGANIZATIONS POLICIES =====
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Users can read organizations" ON organizations;
DROP POLICY IF EXISTS "Members can read organization" ON organizations;

CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can read organizations" ON organizations
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ===== 6. SHIFT ASSIGNMENTS POLICIES =====
DROP POLICY IF EXISTS "Users can read shift_assignments" ON shift_assignments;
DROP POLICY IF EXISTS "Users can insert shift_assignments" ON shift_assignments;
DROP POLICY IF EXISTS "Users can update shift_assignments" ON shift_assignments;

CREATE POLICY "Users can read shift_assignments" ON shift_assignments
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = profile_id AND profiles.organization_id = public.get_my_org_id()));

CREATE POLICY "Users can insert shift_assignments" ON shift_assignments
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = profile_id AND profiles.organization_id = public.get_my_org_id()));

CREATE POLICY "Users can update shift_assignments" ON shift_assignments
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = profile_id AND profiles.organization_id = public.get_my_org_id()));

-- ===== 7. VEHICLES POLICIES =====
DROP POLICY IF EXISTS "Members can read vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can read vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can insert vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can update vehicles" ON vehicles;

CREATE POLICY "Users can read vehicles" ON vehicles
  FOR SELECT USING (organization_id = public.get_my_org_id());

CREATE POLICY "Users can insert vehicles" ON vehicles
  FOR INSERT WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "Users can update vehicles" ON vehicles
  FOR UPDATE USING (organization_id = public.get_my_org_id());

-- ===== 8. ATTENDANCE POLICIES =====
DROP POLICY IF EXISTS "Users can read attendance" ON attendance;
DROP POLICY IF EXISTS "Users can insert attendance" ON attendance;
DROP POLICY IF EXISTS "Users can update attendance" ON attendance;

CREATE POLICY "Users can read attendance" ON attendance
  FOR SELECT USING (organization_id = public.get_my_org_id());

CREATE POLICY "Users can insert attendance" ON attendance
  FOR INSERT WITH CHECK (profile_id = auth.uid() AND organization_id = public.get_my_org_id());

CREATE POLICY "Users can update attendance" ON attendance
  FOR UPDATE USING (profile_id = auth.uid());

-- ===== 9. RPC: create org + setup profile (bypasses RLS) =====
CREATE OR REPLACE FUNCTION public.create_organization(org_name TEXT, org_type TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org organizations%ROWTYPE;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  INSERT INTO organizations (name, type) VALUES (org_name, org_type)
  RETURNING * INTO v_org;

  UPDATE profiles SET organization_id = v_org.id, role = 'admin'
  WHERE id = v_user_id;

  RETURN jsonb_build_object('id', v_org.id, 'name', v_org.name, 'type', v_org.type);
END;
$$;

-- ===== 10. TRIGGER: auto-create profile on signup =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    'volunteer',
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
