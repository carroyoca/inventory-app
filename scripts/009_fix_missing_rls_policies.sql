-- CRITICAL SECURITY FIX: Add missing RLS policies for projects and project_members tables
-- This script fixes the security vulnerability where projects and project_members tables
-- did not have Row Level Security policies, allowing potential unauthorized access.

-- Enable RLS on projects table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Enable RLS on project_members table
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects table
-- Users can only view projects where they are members
CREATE POLICY "Users can view projects they are members of" ON public.projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_members.project_id = projects.id 
            AND project_members.user_id = auth.uid()
        )
    );

-- Users can insert projects (they become the owner automatically)
CREATE POLICY "Users can create projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Only project owners can update projects
CREATE POLICY "Project owners can update projects" ON public.projects
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_members.project_id = projects.id 
            AND project_members.user_id = auth.uid()
            AND project_members.role = 'owner'
        )
    );

-- Only project owners can delete projects
CREATE POLICY "Project owners can delete projects" ON public.projects
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_members.project_id = projects.id 
            AND project_members.user_id = auth.uid()
            AND project_members.role = 'owner'
        )
    );

-- RLS Policies for project_members table
-- Users can view members of projects they belong to
CREATE POLICY "Users can view project members" ON public.project_members
    FOR SELECT USING (
        project_id IN (
            SELECT project_id FROM public.project_members pm
            WHERE pm.user_id = auth.uid()
        )
    );

-- Only project owners and managers can add members
CREATE POLICY "Project owners and managers can add members" ON public.project_members
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT project_id FROM public.project_members pm
            WHERE pm.user_id = auth.uid()
            AND pm.role IN ('owner', 'manager')
        )
    );

-- Only project owners and managers can update member roles
CREATE POLICY "Project owners and managers can update member roles" ON public.project_members
    FOR UPDATE USING (
        project_id IN (
            SELECT pm.project_id FROM public.project_members pm
            WHERE pm.user_id = auth.uid()
            AND pm.role IN ('owner', 'manager')
        )
    );

-- Only project owners and managers can remove members
-- Also allow users to remove themselves from projects
CREATE POLICY "Project owners and managers can remove members" ON public.project_members
    FOR DELETE USING (
        project_id IN (
            SELECT pm.project_id FROM public.project_members pm
            WHERE pm.user_id = auth.uid()
            AND pm.role IN ('owner', 'manager')
        )
        OR user_id = auth.uid() -- Users can remove themselves
    );

-- Update inventory_items RLS to work with project-based access
-- First drop the old policies
DROP POLICY IF EXISTS "Users can view their own inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Users can insert their own inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Users can update their own inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Users can delete their own inventory items" ON inventory_items;

-- Create new project-based policies for inventory_items
CREATE POLICY "Users can view inventory items of projects they are members of" ON inventory_items
    FOR SELECT USING (
        project_id IN (
            SELECT project_id FROM public.project_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Project members can insert inventory items" ON inventory_items
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT pm.project_id FROM public.project_members pm
            WHERE pm.user_id = auth.uid()
            AND pm.role IN ('owner', 'manager', 'member')
        )
        AND created_by = auth.uid()
    );

CREATE POLICY "Project members can update inventory items" ON inventory_items
    FOR UPDATE USING (
        project_id IN (
            SELECT pm.project_id FROM public.project_members pm
            WHERE pm.user_id = auth.uid()
            AND pm.role IN ('owner', 'manager', 'member')
        )
    );

CREATE POLICY "Project members can delete inventory items" ON inventory_items
    FOR DELETE USING (
        project_id IN (
            SELECT pm.project_id FROM public.project_members pm
            WHERE pm.user_id = auth.uid()
            AND pm.role IN ('owner', 'manager', 'member')
        )
    );

-- Verification queries to check if policies are working
-- These should be run after applying the policies to verify security

-- Test 1: Check that projects table has RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('projects', 'project_members', 'inventory_items')
AND schemaname = 'public';

-- Test 2: Check that policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('projects', 'project_members', 'inventory_items')
ORDER BY tablename, policyname;

-- Summary of changes:
-- 1. Added RLS policies for projects table (SELECT, INSERT, UPDATE, DELETE)
-- 2. Added RLS policies for project_members table (SELECT, INSERT, UPDATE, DELETE)
-- 3. Updated inventory_items policies to work with project-based access instead of user-based
-- 4. Ensured proper role-based permissions (owners/managers for project management)
-- 5. Added self-removal capability for project members

COMMENT ON TABLE public.projects IS 'Projects table with RLS policies - users can only access projects they are members of';
COMMENT ON TABLE public.project_members IS 'Project members table with RLS policies - role-based access control';