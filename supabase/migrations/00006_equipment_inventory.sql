-- ===== 1. EQUIPMENT (Inventario) =====
CREATE TABLE IF NOT EXISTS equipment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  id_numero TEXT NOT NULL,
  articolo TEXT NOT NULL,
  marca TEXT NOT NULL DEFAULT '',
  modello TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL DEFAULT '',
  inventario_interno TEXT NOT NULL DEFAULT '',
  sede TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, id_numero)
);

CREATE INDEX IF NOT EXISTS idx_equipment_organization ON equipment(organization_id);
CREATE INDEX IF NOT EXISTS idx_equipment_categoria ON equipment(categoria);

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read equipment" ON equipment
  FOR SELECT USING (organization_id = public.get_my_org_id());

CREATE POLICY "Admins can insert equipment" ON equipment
  FOR INSERT WITH CHECK (public.is_my_role('admin'));

CREATE POLICY "Admins can update equipment" ON equipment
  FOR UPDATE USING (public.is_my_role('admin'));

CREATE POLICY "Admins can delete equipment" ON equipment
  FOR DELETE USING (public.is_my_role('admin'));

-- ===== 2. SHIFT-EQUIPMENT JUNCTION =====
CREATE TABLE IF NOT EXISTS shift_equipment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  UNIQUE(shift_id, equipment_id)
);

CREATE INDEX IF NOT EXISTS idx_shift_equipment_shift ON shift_equipment(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_equipment_equipment ON shift_equipment(equipment_id);

ALTER TABLE shift_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read shift_equipment" ON shift_equipment
  FOR SELECT USING (EXISTS (SELECT 1 FROM shifts WHERE shifts.id = shift_id AND shifts.organization_id = public.get_my_org_id()));

CREATE POLICY "Users can insert shift_equipment" ON shift_equipment
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM shifts WHERE shifts.id = shift_id AND shifts.organization_id = public.get_my_org_id()));

CREATE POLICY "Users can update shift_equipment" ON shift_equipment
  FOR UPDATE USING (EXISTS (SELECT 1 FROM shifts WHERE shifts.id = shift_id AND shifts.organization_id = public.get_my_org_id()));

CREATE POLICY "Users can delete shift_equipment" ON shift_equipment
  FOR DELETE USING (EXISTS (SELECT 1 FROM shifts WHERE shifts.id = shift_id AND shifts.organization_id = public.get_my_org_id()));

-- ===== 3. NOTIFICATIONS =====
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  created_by UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(organization_id, is_read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read notifications" ON notifications
  FOR SELECT USING (organization_id = public.get_my_org_id() AND public.is_my_role('admin'));

CREATE POLICY "Users can insert notifications" ON notifications
  FOR INSERT WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "Admins can update notifications" ON notifications
  FOR UPDATE USING (organization_id = public.get_my_org_id() AND public.is_my_role('admin'));

-- ===== 4. ADD updated_at TRIGGERS =====
CREATE OR REPLACE FUNCTION update_equipment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_equipment_updated_at ON equipment;
CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_equipment_updated_at();
