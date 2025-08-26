-- Remove invitation system and create new access management
-- This script removes the old invitation system and creates a simpler direct access system

-- Step 1: Drop invitation-related tables
DROP TABLE IF EXISTS project_invitations CASCADE;

-- Step 2: Create new access management table
CREATE TABLE IF NOT EXISTS project_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'manager', 'member', 'viewer')),
  granted_by UUID NOT NULL REFERENCES profiles(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  
  -- Ensure unique email per project
  UNIQUE(project_id, user_email)
);

-- Step 3: Update project_members table to reference project_access
-- First, let's create a backup of existing memberships
CREATE TABLE IF NOT EXISTS project_members_backup AS 
SELECT * FROM project_members;

-- Drop the old project_members table
DROP TABLE IF EXISTS project_members CASCADE;

-- Create new project_members table that references project_access
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'manager', 'member', 'viewer')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique user per project
  UNIQUE(project_id, user_id)
);

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_access_project_id ON project_access(project_id);
CREATE INDEX IF NOT EXISTS idx_project_access_user_email ON project_access(user_email);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);

-- Step 5: Enable RLS
ALTER TABLE project_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Step 6: RLS Policies for project_access
CREATE POLICY "Users can view access for projects they belong to" 
  ON project_access FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm 
      WHERE pm.project_id = project_access.project_id 
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners and managers can manage access" 
  ON project_access FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm 
      WHERE pm.project_id = project_access.project_id 
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'manager')
    )
  );

-- Step 7: RLS Policies for project_members
CREATE POLICY "Users can view members of projects they belong to" 
  ON project_members FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm 
      WHERE pm.project_id = project_members.project_id 
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners and managers can manage members" 
  ON project_members FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm 
      WHERE pm.project_id = project_members.project_id 
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'manager')
    )
  );

-- Step 8: Create function to automatically add users to project_members when they sign up
CREATE OR REPLACE FUNCTION handle_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add user to project_members for any project_access entries with their email
  INSERT INTO project_members (project_id, user_id, role)
  SELECT pa.project_id, NEW.id, pa.role
  FROM project_access pa
  WHERE pa.user_email = NEW.email
  AND pa.is_active = true
  ON CONFLICT (project_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Step 9: Create trigger for new user signup
DROP TRIGGER IF EXISTS on_user_signup ON profiles;
CREATE TRIGGER on_user_signup
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_signup();

-- Step 10: Create function to send access notification email
CREATE OR REPLACE FUNCTION notify_user_access_granted(
  p_project_id UUID,
  p_user_email TEXT,
  p_role TEXT,
  p_granted_by_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function will be called from the application
  -- The actual email sending will be handled by the API
  NULL;
END;
$$;

-- Step 11: Restore existing memberships (if any)
-- This will be handled by the application logic

COMMENT ON TABLE project_access IS 'Direct access management - users are granted access by email before they sign up';
COMMENT ON TABLE project_members IS 'Active project memberships - populated when users sign up';
