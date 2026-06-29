-- Support multiple vehicles per shift via junction table.
-- Run this in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS shift_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shift_id, vehicle_id)
);

ALTER TABLE shift_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shift_vehicles in their org"
  ON shift_vehicles FOR SELECT
  USING (shift_id IN (SELECT id FROM shifts WHERE organization_id = public.get_my_org_id()));

CREATE POLICY "Admins can insert shift_vehicles"
  ON shift_vehicles FOR INSERT
  WITH CHECK (public.is_my_role('admin') AND shift_id IN (SELECT id FROM shifts WHERE organization_id = public.get_my_org_id()));

CREATE POLICY "Admins can delete shift_vehicles"
  ON shift_vehicles FOR DELETE
  USING (public.is_my_role('admin') AND shift_id IN (SELECT id FROM shifts WHERE organization_id = public.get_my_org_id()));
