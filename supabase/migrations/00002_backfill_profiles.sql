-- Backfill profiles for existing users who registered before the trigger was added.
-- Run this once in Supabase SQL Editor.

INSERT INTO public.profiles (user_id, first_name, last_name, email, role, is_active)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'first_name', ''),
  COALESCE(raw_user_meta_data->>'last_name', ''),
  email,
  'volunteer',
  true
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles WHERE user_id IS NOT NULL)
ON CONFLICT DO NOTHING;
