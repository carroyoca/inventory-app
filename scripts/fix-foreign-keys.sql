-- Fix foreign key relationships for project_members and project_invitations

-- Drop existing foreign key constraints if they exist
ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_user_id_fkey;
ALTER TABLE project_invitations DROP CONSTRAINT IF EXISTS project_invitations_inviter_id_fkey;

-- Add correct foreign key constraints
ALTER TABLE project_members 
ADD CONSTRAINT project_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE project_invitations 
ADD CONSTRAINT project_invitations_inviter_id_fkey 
FOREIGN KEY (inviter_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key for project_id in both tables
ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_project_id_fkey;
ALTER TABLE project_invitations DROP CONSTRAINT IF EXISTS project_invitations_project_id_fkey;

ALTER TABLE project_members 
ADD CONSTRAINT project_members_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE project_invitations 
ADD CONSTRAINT project_invitations_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Verify the constraints were created
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('project_members', 'project_invitations')
ORDER BY tc.table_name, tc.constraint_name;
