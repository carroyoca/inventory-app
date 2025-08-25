#!/usr/bin/env node

/**
 * Script para verificar profundamente si las tablas funcionan
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

async function deepVerify() {
  try {
    console.log('\n🔍 Verificación profunda de las tablas...')
    
    // 1. Verificar tabla projects con operaciones reales
    console.log('\n📋 Verificando tabla projects...')
    try {
      // Intentar SELECT
      const { data: projects, error: selectError } = await supabase
        .from('projects')
        .select('*')
        .limit(1)
      
      if (selectError) {
        console.log('  ❌ Error en SELECT:', selectError.message)
        console.log('  🔍 Código de error:', selectError.code)
      } else {
        console.log('  ✅ SELECT funciona, proyectos encontrados:', projects?.length || 0)
      }
      
      // Intentar INSERT (con datos de prueba)
      const testProject = {
        name: 'Test Project - ' + Date.now(),
        description: 'Proyecto de prueba para verificación',
        created_by: '00000000-0000-0000-0000-000000000000' // UUID inválido
      }
      
      const { data: insertData, error: insertError } = await supabase
        .from('projects')
        .insert(testProject)
        .select()
      
      if (insertError) {
        if (insertError.message.includes('violates foreign key constraint')) {
          console.log('  ✅ INSERT funciona (error esperado por UUID inválido)')
        } else {
          console.log('  ❌ Error inesperado en INSERT:', insertError.message)
        }
      } else {
        console.log('  ✅ INSERT funciona, proyecto creado:', insertData)
        // Limpiar
        await supabase.from('projects').delete().eq('id', insertData[0].id)
        console.log('  🧹 Proyecto de prueba eliminado')
      }
      
    } catch (error) {
      console.log('  ❌ Error general con tabla projects:', error.message)
    }
    
    // 2. Verificar tabla project_members
    console.log('\n👥 Verificando tabla project_members...')
    try {
      const { data: members, error: selectError } = await supabase
        .from('project_members')
        .select('*')
        .limit(1)
      
      if (selectError) {
        console.log('  ❌ Error en SELECT:', selectError.message)
      } else {
        console.log('  ✅ SELECT funciona, miembros encontrados:', members?.length || 0)
      }
      
    } catch (error) {
      console.log('  ❌ Error general con tabla project_members:', error.message)
    }
    
    // 3. Verificar columna project_id en inventory_items
    console.log('\n📦 Verificando columna project_id en inventory_items...')
    try {
      const { data: items, error: selectError } = await supabase
        .from('inventory_items')
        .select('id, project_id, created_by')
        .limit(1)
      
      if (selectError) {
        console.log('  ❌ Error en SELECT:', selectError.message)
      } else {
        console.log('  ✅ SELECT funciona, items encontrados:', items?.length || 0)
        if (items && items.length > 0) {
          console.log('  📊 Primer item:', items[0])
        }
      }
      
    } catch (error) {
      console.log('  ❌ Error general con inventory_items:', error.message)
    }
    
    // 4. Verificar estructura de las tablas
    console.log('\n🏗️ Verificando estructura de las tablas...')
    try {
      // Intentar obtener información de la estructura
      const { data: projectsStructure, error: projectsStructError } = await supabase
        .from('projects')
        .select('id, name, description, created_by, created_at, updated_at')
        .limit(0) // Solo estructura, sin datos
      
      if (projectsStructError) {
        console.log('  ❌ Error obteniendo estructura de projects:', projectsStructError.message)
      } else {
        console.log('  ✅ Estructura de projects verificada')
      }
      
      const { data: membersStructure, error: membersStructError } = await supabase
        .from('project_members')
        .select('id, project_id, user_id, role, joined_at')
        .limit(0)
      
      if (membersStructError) {
        console.log('  ❌ Error obteniendo estructura de project_members:', membersStructError.message)
      } else {
        console.log('  ✅ Estructura de project_members verificada')
      }
      
    } catch (error) {
      console.log('  ❌ Error verificando estructura:', error.message)
    }
    
    console.log('\n🎉 ¡Verificación profunda completada!')
    
  } catch (error) {
    console.error('❌ Error general:', error)
    process.exit(1)
  }
}

// Ejecutar verificación profunda
deepVerify()
