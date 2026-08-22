-- ============================================================
-- SCHEMA FIX - Run this in Supabase SQL Editor
-- Ensures profiles table matches the application code
-- ============================================================

-- First, let's see current table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Add any missing columns that the app expects (safe - only adds if not exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_minor BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parental_consent_required BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parental_consent_given BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing users to have proper defaults
UPDATE profiles SET 
  email_verified = COALESCE(email_verified, true),
  is_active = COALESCE(is_active, true),
  is_minor = COALESCE(is_minor, false),
  parental_consent_required = COALESCE(parental_consent_required, false),
  parental_consent_given = COALESCE(parental_consent_given, false),
  terms_accepted = COALESCE(terms_accepted, true),
  terms_accepted_at = COALESCE(terms_accepted_at, NOW())
WHERE email_verified IS NULL OR is_active IS NULL;

-- Verify the fix
SELECT 
  name, 
  role, 
  email_verified, 
  is_active, 
  is_minor,
  created_at
FROM profiles 
ORDER BY created_at DESC 
LIMIT 10;