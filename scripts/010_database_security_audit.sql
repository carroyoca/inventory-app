-- Database Security Audit Script
-- This script checks all tables in the public schema for RLS status and policies

-- Check which tables have RLS enabled
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN 'ENABLED'
        ELSE 'DISABLED'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check all RLS policies for public schema tables
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check for tables without any policies (potential security risk)
SELECT t.tablename
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public' 
  AND t.rowsecurity = true
  AND p.policyname IS NULL;

-- Summary report of security status
WITH table_security AS (
    SELECT 
        t.tablename,
        t.rowsecurity,
        COUNT(p.policyname) as policy_count
    FROM pg_tables t
    LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
    WHERE t.schemaname = 'public'
    GROUP BY t.tablename, t.rowsecurity
)
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity AND policy_count > 0 THEN '✅ SECURE'
        WHEN rowsecurity AND policy_count = 0 THEN '⚠️  RLS ENABLED BUT NO POLICIES'
        WHEN NOT rowsecurity THEN '❌ NO RLS'
    END as security_status,
    policy_count
FROM table_security
ORDER BY security_status, tablename;

-- List of expected tables and their security requirements
/*
Expected tables and their RLS requirements:
1. profiles - ✅ Should have RLS with user-specific policies
2. projects - ⚠️  NEEDS RLS with project member policies
3. project_members - ⚠️  NEEDS RLS with project-based policies
4. project_areas - ✅ Should have RLS with project member policies
5. project_invitations - ✅ Should have RLS with project manager policies
6. project_inventory_types - ✅ Should have RLS with project member policies
7. project_house_zones - ✅ Should have RLS with project member policies
8. inventory_items - ⚠️  NEEDS UPDATED RLS for project-based access
*/