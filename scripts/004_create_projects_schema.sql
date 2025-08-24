-- Sprint 1: Estructura de Proyectos
-- Este script crea las tablas necesarias para el sistema de proyectos

-- Tabla de proyectos
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de miembros del proyecto
CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'member', 'viewer')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Añadir columna project_id a la tabla de inventario existente
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_project_id ON public.inventory_items(project_id);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para actualizar updated_at en projects
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON public.projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar proyecto por defecto para usuarios existentes
-- Esto se hará programáticamente cuando se implemente la funcionalidad

-- Comentarios sobre la estructura
COMMENT ON TABLE public.projects IS 'Tabla principal de proyectos/inventarios';
COMMENT ON TABLE public.project_members IS 'Relación muchos a muchos entre proyectos y usuarios con roles';
COMMENT ON COLUMN public.projects.name IS 'Nombre del proyecto (ej: "Calle Don Juan 20")';
COMMENT ON COLUMN public.projects.description IS 'Descripción opcional del proyecto';
COMMENT ON COLUMN public.project_members.role IS 'Rol del usuario en el proyecto: owner, manager, member, viewer';
COMMENT ON COLUMN public.inventory_items.project_id IS 'Referencia al proyecto al que pertenece este item';
