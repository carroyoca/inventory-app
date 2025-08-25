-- Create project invitations table
CREATE TABLE IF NOT EXISTS public.project_invitations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    inviter_id uuid NOT NULL,
    invitee_email text NOT NULL,
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'manager', 'member', 'viewer')),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    token text NOT NULL UNIQUE,
    expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    accepted_at timestamp with time zone,
    rejected_at timestamp with time zone,
    CONSTRAINT project_invitations_pkey PRIMARY KEY (id),
    CONSTRAINT project_invitations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
    CONSTRAINT project_invitations_inviter_id_fkey FOREIGN KEY (inviter_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON public.project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_invitee_email ON public.project_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_project_invitations_token ON public.project_invitations(token);
CREATE INDEX IF NOT EXISTS idx_project_invitations_status ON public.project_invitations(status);
CREATE INDEX IF NOT EXISTS idx_project_invitations_expires_at ON public.project_invitations(expires_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_project_invitations_updated_at 
    BEFORE UPDATE ON public.project_invitations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for project_invitations
ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;

-- Allow project owners and managers to view invitations for their projects
CREATE POLICY "Project members can view project invitations" ON public.project_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_invitations.project_id
            AND pm.user_id = auth.uid()
            AND pm.role IN ('owner', 'manager')
        )
    );

-- Allow project owners and managers to create invitations
CREATE POLICY "Project owners and managers can create invitations" ON public.project_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_invitations.project_id
            AND pm.user_id = auth.uid()
            AND pm.role IN ('owner', 'manager')
        )
        AND inviter_id = auth.uid()
    );

-- Allow project owners and managers to update invitations
CREATE POLICY "Project owners and managers can update invitations" ON public.project_invitations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_invitations.project_id
            AND pm.user_id = auth.uid()
            AND pm.role IN ('owner', 'manager')
        )
    );

-- Allow project owners and managers to delete invitations
CREATE POLICY "Project owners and managers can delete invitations" ON public.project_invitations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_invitations.project_id
            AND pm.user_id = auth.uid()
            AND pm.role IN ('owner', 'manager')
        )
    );

-- Allow users to view their own invitations (by email)
CREATE POLICY "Users can view their own invitations" ON public.project_invitations
    FOR SELECT USING (
        invitee_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );

-- Allow users to update their own invitations (accept/reject)
CREATE POLICY "Users can update their own invitations" ON public.project_invitations
    FOR UPDATE USING (
        invitee_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );

-- Function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
    UPDATE public.project_invitations 
    SET status = 'expired' 
    WHERE expires_at < now() 
    AND status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired invitations (if using pg_cron)
-- SELECT cron.schedule('cleanup-expired-invitations', '0 2 * * *', 'SELECT cleanup_expired_invitations();');
