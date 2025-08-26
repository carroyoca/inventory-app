-- Create pending_project_access table for users who haven't signed up yet
-- This allows us to track access grants for users who don't exist in the system yet

CREATE TABLE IF NOT EXISTS public.pending_project_access (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_email text NOT NULL,
    role text NOT NULL CHECK (role IN ('owner', 'manager', 'member', 'viewer')),
    granted_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    granted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at timestamp with time zone DEFAULT (timezone('utc'::text, now()) + interval '30 days'),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add unique constraint to prevent duplicate pending access for same email/project
CREATE UNIQUE INDEX IF NOT EXISTS pending_project_access_email_project_idx 
ON public.pending_project_access(project_id, user_email);

-- Enable RLS
ALTER TABLE public.pending_project_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pending_project_access table
-- Users can view pending access for projects they are owners/managers of
CREATE POLICY "Project managers can view pending access" ON public.pending_project_access
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_members.project_id = pending_project_access.project_id 
            AND project_members.user_id = auth.uid()
            AND project_members.role IN ('owner', 'manager')
        )
    );

-- Users can create pending access if they are owners/managers
CREATE POLICY "Project managers can create pending access" ON public.pending_project_access
    FOR INSERT WITH CHECK (
        granted_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_members.project_id = pending_project_access.project_id 
            AND project_members.user_id = auth.uid()
            AND project_members.role IN ('owner', 'manager')
        )
    );

-- Users can update pending access they created
CREATE POLICY "Granters can update their pending access" ON public.pending_project_access
    FOR UPDATE USING (granted_by = auth.uid());

-- Users can delete pending access if they are owners/managers
CREATE POLICY "Project managers can delete pending access" ON public.pending_project_access
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_members.project_id = pending_project_access.project_id 
            AND project_members.user_id = auth.uid()
            AND project_members.role IN ('owner', 'manager')
        )
    );

-- Function to automatically add users to projects when they sign up
-- This function should be called during the user registration process
CREATE OR REPLACE FUNCTION public.process_pending_access_on_signup()
RETURNS trigger AS $$
BEGIN
    -- When a new profile is created, check for pending access
    INSERT INTO public.project_members (project_id, user_id, role, joined_at)
    SELECT 
        p.project_id,
        NEW.id,
        p.role,
        NOW()
    FROM public.pending_project_access p
    WHERE p.user_email = NEW.email
    AND p.expires_at > NOW();
    
    -- Clean up the processed pending access records
    DELETE FROM public.pending_project_access 
    WHERE user_email = NEW.email 
    AND expires_at > NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically process pending access when users sign up
DROP TRIGGER IF EXISTS trigger_process_pending_access ON public.profiles;
CREATE TRIGGER trigger_process_pending_access
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.process_pending_access_on_signup();

-- Add comments for documentation
COMMENT ON TABLE public.pending_project_access IS 'Stores project access grants for users who have not yet signed up';
COMMENT ON FUNCTION public.process_pending_access_on_signup IS 'Automatically adds users to projects they were granted access to before signing up';