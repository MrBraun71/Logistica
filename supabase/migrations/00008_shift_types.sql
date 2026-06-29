-- Update shift type CHECK constraint to new types.
-- Run this in Supabase SQL Editor.

ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_type_check;

UPDATE shifts SET type = 'sanitario' WHERE type = 'emergenza';

ALTER TABLE shifts ADD CONSTRAINT shifts_type_check
  CHECK (type IN ('ordinario', 'straordinario', 'rappresentanza', 'evento', 'sanitario'));
