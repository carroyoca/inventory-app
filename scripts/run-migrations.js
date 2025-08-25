#!/usr/bin/env node

/**
 * Script para ejecutar migraciones de Supabase
 * Usa las credenciales del archivo .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Cargar variables de entorno
const envPath = join(__dirname, '..', '.env.local')
let envContent = ''

try {
  envContent = readFileSync(envPath, 'utf8')
} catch (error) {
  console.error('❌ Error leyendo .env.local:', error.message)
  process.exit(1)
}

// Parsear variables de entorno
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_INVAPPSUPABASE_URL
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_INVAPPSUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno requeridas no encontradas:')
  console.error('  NEXT_PUBLIC_INVAPPSUPABASE_URL:', !!supabaseUrl)
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', !!envVars.SUPABASE_SERVICE_ROLE_KEY)
  console.error('  NEXT_PUBLIC_INVAPPSUPABASE_ANON_KEY:', !!envVars.NEXT_PUBLIC_INVAPPSUPABASE_ANON_KEY)
  process.exit(1)
}

console.log('✅ Variables de entorno cargadas:')
console.log('  URL:', supabaseUrl)
console.log('  Key:', supabaseKey.substring(0, 20) + '...')

// Crear cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  try {
    console.log('\n🚀 Iniciando migración...')
    
    // Leer script de esquema
    const schemaPath = join(__dirname, '004_create_projects_schema.sql')
    const schemaSQL = readFileSync(schemaPath, 'utf8')
    
    console.log('📖 Script de esquema cargado')
    
    // Ejecutar script de esquema
    console.log('🔧 Ejecutando script de esquema...')
    const { error: schemaError } = await supabase.rpc('exec_sql', { sql: schemaSQL })
    
    if (schemaError) {
      console.error('❌ Error ejecutando esquema:', schemaError)
      
      // Intentar ejecutar por partes
      console.log('🔄 Intentando ejecutar por partes...')
      await executeSchemaInParts()
    } else {
      console.log('✅ Esquema ejecutado exitosamente')
    }
    
    // Leer script de migración
    const migrationPath = join(__dirname, '005_migrate_existing_data.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    console.log('📖 Script de migración cargado')
    
    // Ejecutar script de migración
    console.log('🔧 Ejecutando script de migración...')
    const { error: migrationError } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (migrationError) {
      console.error('❌ Error ejecutando migración:', migrationError)
      console.log('🔄 Intentando ejecutar por partes...')
      await executeMigrationInParts()
    } else {
      console.log('✅ Migración ejecutada exitosamente')
    }
    
    console.log('\n🎉 ¡Migración completada!')
    
  } catch (error) {
    console.error('❌ Error general:', error)
    process.exit(1)
  }
}

async function executeSchemaInParts() {
  console.log('🔧 Ejecutando esquema por partes...')
  
  const parts = [
    // Crear tabla projects
    `CREATE TABLE IF NOT EXISTS public.projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
    
    // Crear tabla project_members
    `CREATE TABLE IF NOT EXISTS public.project_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'member', 'viewer')),
      joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(project_id, user_id)
    );`,
    
    // Añadir columna project_id a inventory_items
    `ALTER TABLE public.inventory_items 
     ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);`,
    
    // Crear índices
    `CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
     CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
     CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);
     CREATE INDEX IF NOT EXISTS idx_inventory_items_project_id ON public.inventory_items(project_id);`,
    
    // Crear función y trigger para updated_at
    `CREATE OR REPLACE FUNCTION update_updated_at_column()
     RETURNS TRIGGER AS $$
     BEGIN
         NEW.updated_at = NOW();
         RETURN NEW;
     END;
     $$ language 'plpgsql';
     
     CREATE TRIGGER update_projects_updated_at 
         BEFORE UPDATE ON public.projects 
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`
  ]
  
  for (let i = 0; i < parts.length; i++) {
    try {
      console.log(`  Ejecutando parte ${i + 1}/${parts.length}...`)
      const { error } = await supabase.rpc('exec_sql', { sql: parts[i] })
      
      if (error) {
        console.error(`  ❌ Error en parte ${i + 1}:`, error.message)
      } else {
        console.log(`  ✅ Parte ${i + 1} ejecutada`)
      }
    } catch (error) {
      console.error(`  ❌ Error ejecutando parte ${i + 1}:`, error.message)
    }
  }
}

async function executeMigrationInParts() {
  console.log('🔧 Ejecutando migración por partes...')
  
  // Crear proyecto por defecto para usuarios existentes
  try {
    console.log('  Creando proyectos por defecto...')
    
    // Obtener usuarios únicos con inventario
    const { data: users, error: usersError } = await supabase
      .from('inventory_items')
      .select('created_by')
      .not('created_by', 'is', null)
    
    if (usersError) {
      console.error('  ❌ Error obteniendo usuarios:', usersError.message)
      return
    }
    
    const uniqueUsers = [...new Set(users.map(u => u.created_by))]
    console.log(`  📊 Encontrados ${uniqueUsers.length} usuarios únicos`)
    
    for (const userId of uniqueUsers) {
      try {
        // Crear proyecto
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert({
            name: 'Default Project',
            description: 'Automatically created project for existing inventory',
            created_by: userId
          })
          .select()
          .single()
        
        if (projectError) {
          console.error(`  ❌ Error creando proyecto para usuario ${userId}:`, projectError.message)
          continue
        }
        
        // Añadir usuario como owner
        const { error: memberError } = await supabase
          .from('project_members')
          .insert({
            project_id: project.id,
            user_id: userId,
            role: 'owner'
          })
        
        if (memberError) {
          console.error(`  ❌ Error añadiendo usuario como member:`, memberError.message)
          // Intentar eliminar el proyecto si falla
          await supabase.from('projects').delete().eq('id', project.id)
          continue
        }
        
        // Actualizar inventario existente
        const { error: updateError } = await supabase
          .from('inventory_items')
          .update({ project_id: project.id })
          .eq('created_by', userId)
          .is('project_id', null)
        
        if (updateError) {
          console.error(`  ❌ Error actualizando inventario:`, updateError.message)
        } else {
          console.log(`  ✅ Proyecto creado y migrado para usuario ${userId}`)
        }
        
      } catch (error) {
        console.error(`  ❌ Error procesando usuario ${userId}:`, error.message)
      }
    }
    
  } catch (error) {
    console.error('  ❌ Error en migración:', error.message)
  }
}

// Ejecutar migración
runMigration()
