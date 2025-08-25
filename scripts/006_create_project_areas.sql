-- Create project_areas table for customizable areas per project
CREATE TABLE IF NOT EXISTS public.project_areas (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    name text NOT NULL,
    description text,
    project_id uuid NOT NULL,
    created_by uuid NOT NULL,
    CONSTRAINT project_areas_pkey PRIMARY KEY (id),
    CONSTRAINT project_areas_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
    CONSTRAINT project_areas_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS project_areas_project_id_idx ON public.project_areas(project_id);
CREATE INDEX IF NOT EXISTS project_areas_created_by_idx ON public.project_areas(created_by);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_project_areas_updated_at 
    BEFORE UPDATE ON public.project_areas 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.project_areas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view areas of projects they are members of" ON public.project_areas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_members.project_id = project_areas.project_id 
            AND project_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Project owners and managers can create areas" ON public.project_areas
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_members.project_id = project_areas.project_id 
            AND project_members.user_id = auth.uid()
            AND project_members.role IN ('owner', 'manager')
        )
    );

CREATE POLICY "Project owners and managers can update areas" ON public.project_areas
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_members.project_id = project_areas.project_id 
            AND project_members.user_id = auth.uid()
            AND project_members.role IN ('owner', 'manager')
        )
    );

CREATE POLICY "Project owners and managers can delete areas" ON public.project_areas
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_members.project_id = project_areas.project_id 
            AND project_members.user_id = auth.uid()
            AND project_members.role IN ('owner', 'manager')
        )
    );
