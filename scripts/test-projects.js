#!/usr/bin/env node

/**
 * Script para probar el sistema de proyectos
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

async function testProjects() {
  try {
    console.log('\n🧪 Probando sistema de proyectos...')
    
    // 1. Verificar estructura de tabla projects
    console.log('🔍 Verificando estructura de tabla projects...')
    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .limit(5)
      
      if (error) {
        console.error('  ❌ Error accediendo a projects:', error.message)
      } else {
        console.log(`  ✅ Tabla projects accesible, ${projects?.length || 0} proyectos encontrados`)
        if (projects && projects.length > 0) {
          console.log('  📊 Proyectos existentes:')
          projects.forEach(p => {
            console.log(`    - ${p.name} (${p.id})`)
          })
        }
      }
    } catch (error) {
      console.error('  ❌ Error:', error.message)
    }
    
    // 2. Verificar estructura de tabla project_members
    console.log('🔍 Verificando estructura de tabla project_members...')
    try {
      const { data: members, error } = await supabase
        .from('project_members')
        .select('*')
        .limit(5)
      
      if (error) {
        console.error('  ❌ Error accediendo a project_members:', error.message)
      } else {
        console.log(`  ✅ Tabla project_members accesible, ${members?.length || 0} miembros encontrados`)
        if (members && members.length > 0) {
          console.log('  📊 Miembros existentes:')
          members.forEach(m => {
            console.log(`    - Usuario ${m.user_id} con rol ${m.role} en proyecto ${m.project_id}`)
          })
        }
      }
    } catch (error) {
      console.error('  ❌ Error:', error.message)
    }
    
    // 3. Verificar columna project_id en inventory_items
    console.log('🔍 Verificando columna project_id en inventory_items...')
    try {
      const { data: items, error } = await supabase
        .from('inventory_items')
        .select('id, project_id, created_by')
        .limit(5)
      
      if (error) {
        console.error('  ❌ Error accediendo a inventory_items:', error.message)
      } else {
        console.log(`  ✅ Columna project_id accesible, ${items?.length || 0} items encontrados`)
        if (items && items.length > 0) {
          console.log('  📊 Items existentes:')
          items.forEach(item => {
            console.log(`    - Item ${item.id}: project_id=${item.project_id}, created_by=${item.created_by}`)
          })
        }
      }
    } catch (error) {
      console.error('  ❌ Error:', error.message)
    }
    
    // 4. Intentar crear un proyecto de prueba
    console.log('🔍 Intentando crear proyecto de prueba...')
    try {
      const testProject = {
        name: 'Test Project - ' + new Date().toISOString(),
        description: 'Proyecto de prueba para verificar el sistema',
        created_by: '00000000-0000-0000-0000-000000000000' // UUID inválido para forzar error
      }
      
      const { data, error } = await supabase
        .from('projects')
        .insert(testProject)
        .select()
      
      if (error) {
        if (error.message.includes('violates foreign key constraint')) {
          console.log('  ✅ Tabla projects funciona (error esperado por UUID inválido)')
        } else {
          console.error('  ❌ Error inesperado:', error.message)
        }
      } else {
        console.log('  ✅ Proyecto de prueba creado:', data)
        
        // Limpiar proyecto de prueba
        await supabase.from('projects').delete().eq('id', data[0].id)
        console.log('  🧹 Proyecto de prueba eliminado')
      }
    } catch (error) {
      console.error('  ❌ Error creando proyecto de prueba:', error.message)
    }
    
    console.log('\n🎉 ¡Pruebas completadas!')
    
  } catch (error) {
    console.error('❌ Error general:', error)
    process.exit(1)
  }
}

// Ejecutar pruebas
testProjects()
