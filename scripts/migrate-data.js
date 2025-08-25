#!/usr/bin/env node

/**
 * Script para migrar datos existentes y crear proyecto por defecto
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
  console.error('❌ Variables de entorno requeridas no encontradas')
  process.exit(1)
}

console.log('✅ Variables de entorno cargadas')

// Crear cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseKey)

async function migrateData() {
  try {
    console.log('\n🚀 Iniciando migración de datos...')
    
    // 1. Obtener todos los usuarios únicos que tienen items de inventario
    console.log('\n👥 Buscando usuarios con items de inventario...')
    const { data: items, error: itemsError } = await supabase
      .from('inventory_items')
      .select('created_by')
      .not('created_by', 'is', null)
    
    if (itemsError) {
      console.error('❌ Error obteniendo items:', itemsError)
      return
    }
    
    const uniqueUsers = [...new Set(items.map(item => item.created_by))]
    console.log(`  📊 Usuarios únicos encontrados: ${uniqueUsers.length}`)
    
    if (uniqueUsers.length === 0) {
      console.log('⚠️  No hay usuarios con items de inventario')
      return
    }
    
    // 2. Para cada usuario, crear un proyecto por defecto
    for (const userId of uniqueUsers) {
      console.log(`\n🏗️ Creando proyecto por defecto para usuario: ${userId}`)
      
      // Crear proyecto
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: 'Mi Casa - Proyecto por Defecto',
          description: 'Proyecto creado automáticamente para migrar inventario existente',
          created_by: userId
        })
        .select()
        .single()
      
      if (projectError) {
        console.error(`  ❌ Error creando proyecto para ${userId}:`, projectError)
        continue
      }
      
      console.log(`  ✅ Proyecto creado: ${project.name} (ID: ${project.id})`)
      
      // Crear miembro del proyecto (owner)
      const { error: memberError } = await supabase
        .from('project_members')
        .insert({
          project_id: project.id,
          user_id: userId,
          role: 'owner'
        })
      
      if (memberError) {
        console.error(`  ❌ Error creando miembro para ${userId}:`, memberError)
        continue
      }
      
      console.log(`  ✅ Miembro creado como owner`)
      
      // Actualizar todos los items del usuario para asignarlos al proyecto
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ project_id: project.id })
        .eq('created_by', userId)
      
      if (updateError) {
        console.error(`  ❌ Error actualizando items para ${userId}:`, updateError)
        continue
      }
      
      console.log(`  ✅ Items actualizados con project_id`)
    }
    
    // 3. Verificar el resultado
    console.log('\n🔍 Verificando resultado de la migración...')
    
    const { data: finalProjects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
    
    if (projectsError) {
      console.error('❌ Error obteniendo proyectos:', projectsError)
    } else {
      console.log(`  📊 Total de proyectos creados: ${finalProjects?.length || 0}`)
      finalProjects?.forEach(project => {
        console.log(`    - ${project.name} (${project.id})`)
      })
    }
    
    const { data: finalMembers, error: membersError } = await supabase
      .from('project_members')
      .select('*')
    
    if (membersError) {
      console.error('❌ Error obteniendo miembros:', membersError)
    } else {
      console.log(`  👥 Total de miembros: ${finalMembers?.length || 0}`)
    }
    
    const { data: finalItems, error: itemsFinalError } = await supabase
      .from('inventory_items')
      .select('id, project_id, created_by')
    
    if (itemsFinalError) {
      console.error('❌ Error obteniendo items finales:', itemsFinalError)
    } else {
      const itemsWithProject = finalItems?.filter(item => item.project_id !== null) || []
      console.log(`  📦 Items con project_id: ${itemsWithProject.length}/${finalItems?.length || 0}`)
    }
    
    console.log('\n🎉 ¡Migración completada exitosamente!')
    console.log('\n📋 Próximos pasos:')
    console.log('1. Prueba el sistema localmente')
    console.log('2. Ve a /projects para ver tus proyectos')
    console.log('3. Los items existentes ahora están asociados a proyectos')
    
  } catch (error) {
    console.error('❌ Error general en migración:', error)
    process.exit(1)
  }
}

// Ejecutar migración
migrateData()
