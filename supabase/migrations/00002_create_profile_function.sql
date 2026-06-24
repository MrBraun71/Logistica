-- Create profile for current user (bypasses RLS via SECURITY DEFINER)
-- Execute this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION create_my_profile(
  p_first_name TEXT DEFAULT '',
  p_last_name TEXT DEFAULT '',
  p_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_profile profiles%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE user_id = v_user_id;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', v_profile.id,
      'user_id', v_profile.user_id,
      'first_name', v_profile.first_name,
      'last_name', v_profile.last_name,
      'email', v_profile.email,
      'role', v_profile.role,
      'organization_id', v_profile.organization_id,
      'is_active', v_profile.is_active,
      'created_at', v_profile.created_at,
      'updated_at', v_profile.updated_at
    );
  END IF;

  INSERT INTO profiles (user_id, first_name, last_name, email, role, is_active)
  VALUES (v_user_id, p_first_name, p_last_name, p_email, 'volunteer', true)
  RETURNING * INTO v_profile;

  RETURN jsonb_build_object(
    'id', v_profile.id,
    'user_id', v_profile.user_id,
    'first_name', v_profile.first_name,
    'last_name', v_profile.last_name,
    'email', v_profile.email,
    'role', v_profile.role,
    'organization_id', v_profile.organization_id,
    'is_active', v_profile.is_active,
    'created_at', v_profile.created_at,
    'updated_at', v_profile.updated_at
  );
END;
$$;
