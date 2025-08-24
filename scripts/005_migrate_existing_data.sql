-- Sprint 1: Migración de datos existentes
-- Este script migra el inventario existente al nuevo sistema de proyectos

-- 1. Crear un proyecto por defecto para usuarios existentes
-- Primero, obtenemos todos los usuarios únicos que tienen inventario
WITH users_with_inventory AS (
  SELECT DISTINCT created_by 
  FROM inventory_items 
  WHERE created_by IS NOT NULL
),
default_projects AS (
  INSERT INTO projects (name, description, created_by)
  SELECT 
    'Default Project' as name,
    'Automatically created project for existing inventory' as description,
    created_by
  FROM users_with_inventory
  RETURNING id, created_by
),
project_members AS (
  INSERT INTO project_members (project_id, user_id, role)
  SELECT 
    dp.id as project_id,
    dp.created_by as user_id,
    'owner' as role
  FROM default_projects dp
  RETURNING project_id, user_id
)
-- 2. Actualizar el inventario existente para asignarlo al proyecto por defecto
UPDATE inventory_items 
SET project_id = (
  SELECT dp.id 
  FROM default_projects dp 
  WHERE dp.created_by = inventory_items.created_by
)
WHERE project_id IS NULL;

-- 3. Verificar que la migración fue exitosa
SELECT 
  'Migration Summary' as summary,
  COUNT(DISTINCT p.id) as total_projects,
  COUNT(DISTINCT pm.user_id) as total_users,
  COUNT(i.id) as total_inventory_items,
  COUNT(CASE WHEN i.project_id IS NOT NULL THEN 1 END) as migrated_items
FROM projects p
LEFT JOIN project_members pm ON p.id = pm.project_id
LEFT JOIN inventory_items i ON p.id = i.project_id
GROUP BY p.id;

-- 4. Mostrar estadísticas por proyecto
SELECT 
  p.name as project_name,
  p.description,
  COUNT(DISTINCT pm.user_id) as member_count,
  COUNT(i.id) as item_count,
  p.created_at
FROM projects p
LEFT JOIN project_members pm ON p.id = pm.project_id
LEFT JOIN inventory_items i ON p.id = i.project_id
GROUP BY p.id, p.name, p.description, p.created_at
ORDER BY p.created_at DESC;
