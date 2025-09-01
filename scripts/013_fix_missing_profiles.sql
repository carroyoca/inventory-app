-- Fix missing profiles for existing users
-- This script creates profiles for users who exist in auth.users but not in profiles

-- First, let's see how many users are missing profiles
SELECT 
  COUNT(*) as users_without_profiles
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Create profiles for users who don't have them
INSERT INTO profiles (id, email, full_name, created_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data ->> 'full_name', '') as full_name,
  u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verify the fix
SELECT 
  COUNT(*) as users_without_profiles_after_fix
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Show all users with their profile status
SELECT 
  u.id,
  u.email,
  u.created_at as user_created,
  u.email_confirmed_at,
  p.id as profile_exists,
  p.full_name,
  p.created_at as profile_created
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC;
