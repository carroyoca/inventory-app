-- Create project categories tables for editable areas and product types
-- This script should be executed manually in Supabase SQL Editor

-- Project inventory types (product types)
CREATE TABLE IF NOT EXISTS project_inventory_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique names per project
  UNIQUE(project_id, name)
);

-- Project house zones (areas)
CREATE TABLE IF NOT EXISTS project_house_zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique names per project
  UNIQUE(project_id, name)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_inventory_types_project_id ON project_inventory_types(project_id);
CREATE INDEX IF NOT EXISTS idx_project_house_zones_project_id ON project_house_zones(project_id);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_project_inventory_types_updated_at ON project_inventory_types;
CREATE TRIGGER update_project_inventory_types_updated_at
    BEFORE UPDATE ON project_inventory_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_house_zones_updated_at ON project_house_zones;
CREATE TRIGGER update_project_house_zones_updated_at
    BEFORE UPDATE ON project_house_zones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for project_inventory_types
ALTER TABLE project_inventory_types ENABLE ROW LEVEL SECURITY;

-- Users can view inventory types for projects they're members of
CREATE POLICY "Users can view project inventory types" ON project_inventory_types
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid()
    )
  );

-- Project owners and managers can insert inventory types
CREATE POLICY "Project owners and managers can create inventory types" ON project_inventory_types
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Project owners and managers can update inventory types
CREATE POLICY "Project owners and managers can update inventory types" ON project_inventory_types
  FOR UPDATE USING (
    project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Project owners and managers can delete inventory types
CREATE POLICY "Project owners and managers can delete inventory types" ON project_inventory_types
  FOR DELETE USING (
    project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- RLS Policies for project_house_zones
ALTER TABLE project_house_zones ENABLE ROW LEVEL SECURITY;

-- Users can view house zones for projects they're members of
CREATE POLICY "Users can view project house zones" ON project_house_zones
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid()
    )
  );

-- Project owners and managers can insert house zones
CREATE POLICY "Project owners and managers can create house zones" ON project_house_zones
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Project owners and managers can update house zones
CREATE POLICY "Project owners and managers can update house zones" ON project_house_zones
  FOR UPDATE USING (
    project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Project owners and managers can delete house zones
CREATE POLICY "Project owners and managers can delete house zones" ON project_house_zones
  FOR DELETE USING (
    project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Insert some default categories for existing projects
INSERT INTO project_inventory_types (project_id, name, description, created_by)
SELECT 
  p.id,
  'Pintura',
  'Obras de arte en pintura',
  p.created_by
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_inventory_types pit WHERE pit.project_id = p.id
);

INSERT INTO project_inventory_types (project_id, name, description, created_by)
SELECT 
  p.id,
  'Escultura',
  'Obras de arte escultóricas',
  p.created_by
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_inventory_types pit WHERE pit.project_id = p.id AND pit.name = 'Escultura'
);

INSERT INTO project_house_zones (project_id, name, description, created_by)
SELECT 
  p.id,
  'Sala Principal',
  'Área principal de exhibición',
  p.created_by
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_house_zones phz WHERE phz.project_id = p.id
);

INSERT INTO project_house_zones (project_id, name, description, created_by)
SELECT 
  p.id,
  'Almacén',
  'Área de almacenamiento',
  p.created_by
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_house_zones phz WHERE phz.project_id = p.id AND phz.name = 'Almacén'
);

-- Show summary
SELECT 
  'project_inventory_types' as table_name,
  COUNT(*) as total_records
FROM project_inventory_types
UNION ALL
SELECT 
  'project_house_zones' as table_name,
  COUNT(*) as total_records
FROM project_house_zones;
