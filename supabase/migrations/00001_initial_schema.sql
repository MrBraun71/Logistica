-- 1. TABLES

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cri', 'public_assistance', 'other')),
  address TEXT,
  phone TEXT,
  email TEXT,
  fiscal_code TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id),
  role TEXT NOT NULL DEFAULT 'volunteer' CHECK (role IN ('admin', 'volunteer', 'employee', 'director', 'operator')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  date_of_birth DATE,
  fiscal_code TEXT,
  phone TEXT,
  address TEXT,
  qualifications TEXT,
  certifications TEXT,
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL DEFAULT 'ordinario' CHECK (type IN ('ordinario', 'straordinario', 'emergenza', 'evento')),
  vehicle_id UUID REFERENCES vehicles(id),
  max_volunteers INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'aperto' CHECK (status IN ('aperto', 'chiuso', 'completato', 'cancellato')),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'assegnato' CHECK (status IN ('assegnato', 'confermato', 'rifiutato', 'sostituito')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE TABLE shift_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  notes TEXT
);

CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES shifts(id),
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  check_in_location JSONB,
  check_out_location JSONB,
  method TEXT NOT NULL DEFAULT 'app' CHECK (method IN ('badge', 'app', 'manual')),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES profiles(id)
);

-- 2. INDEXES

CREATE INDEX idx_profiles_organization ON profiles(organization_id);
CREATE INDEX idx_profiles_user ON profiles(user_id);
CREATE INDEX idx_profiles_active ON profiles(is_active);
CREATE INDEX idx_shifts_organization ON shifts(organization_id);
CREATE INDEX idx_shifts_start ON shifts(start_time);
CREATE INDEX idx_shifts_status ON shifts(status);
CREATE INDEX idx_shift_assignments_shift ON shift_assignments(shift_id);
CREATE INDEX idx_shift_assignments_profile ON shift_assignments(profile_id);
CREATE INDEX idx_attendance_organization ON attendance(organization_id);
CREATE INDEX idx_attendance_profile ON attendance(profile_id);
CREATE INDEX idx_attendance_date ON attendance(check_in_time);
CREATE INDEX idx_vehicles_organization ON vehicles(organization_id);

-- 3. ROW LEVEL SECURITY

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- Allow users to create their own profile during signup
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow all members of an org to see other members
CREATE POLICY "Members can read org profiles" ON profiles
  FOR SELECT USING (
    organization_id IN (
      SELECT p.organization_id FROM profiles p WHERE p.user_id = auth.uid()
    )
  );

-- Allow admins to insert/update any profile in their org
CREATE POLICY "Admins can manage org profiles" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update org profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Organizations: members of the org can read it
CREATE POLICY "Members can read organization" ON organizations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.organization_id = organizations.id AND profiles.user_id = auth.uid())
  );

-- Allow any authenticated user to create an organization
CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Shifts
CREATE POLICY "Members can read shifts" ON shifts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.organization_id = shifts.organization_id AND profiles.user_id = auth.uid())
  );

CREATE POLICY "Admins can insert shifts" ON shifts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admins can update shifts" ON shifts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  );

-- Attendance
CREATE POLICY "Members can read attendance" ON attendance
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.organization_id = attendance.organization_id AND profiles.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own attendance" ON attendance
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = attendance.profile_id AND profiles.user_id = auth.uid())
  );

CREATE POLICY "Users can update own attendance" ON attendance
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = attendance.profile_id AND profiles.user_id = auth.uid())
  );

-- Vehicles
CREATE POLICY "Members can read vehicles" ON vehicles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.organization_id = vehicles.organization_id AND profiles.user_id = auth.uid())
  );

-- News
CREATE POLICY "Members can read news" ON news
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.organization_id = news.organization_id AND profiles.user_id = auth.uid())
  );

-- 4. AUTO-CREATE PROFILE ON SIGNUP

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, email, role, is_active)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 5. UPDATE TIMESTAMPS

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
