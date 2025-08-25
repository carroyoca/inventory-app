#!/usr/bin/env node

/**
 * Script para crear tablas usando la API de Supabase
 * En lugar de SQL directo, usamos operaciones de la API
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
console.log('  URL:', supabaseUrl)
console.log('  Key:', supabaseKey.substring(0, 20) + '...')

// Crear cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseKey)

async function createTablesDirectly() {
  try {
    console.log('\n🚀 Creando tablas usando API de Supabase...')
    
    // 1. Verificar si las tablas existen
    console.log('🔍 Verificando estado actual de las tablas...')
    
    let projectsExist = false
    let projectMembersExist = false
    let projectIdColumnExists = false
    
    // Verificar tabla projects
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id')
        .limit(1)
      
      if (error && error.code === 'PGRST116') {
        console.log('  ❌ Tabla projects NO existe')
      } else {
        console.log('  ✅ Tabla projects existe')
        projectsExist = true
      }
    } catch (error) {
      console.log('  ❌ Tabla projects NO existe')
    }
    
    // Verificar tabla project_members
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select('id')
        .limit(1)
      
      if (error && error.code === 'PGRST116') {
        console.log('  ❌ Tabla project_members NO existe')
      } else {
        console.log('  ✅ Tabla project_members existe')
        projectMembersExist = true
      }
    } catch (error) {
      console.log('  ❌ Tabla project_members NO existe')
    }
    
    // Verificar columna project_id en inventory_items
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('project_id')
        .limit(1)
      
      if (error && error.message.includes('column "project_id" does not exist')) {
        console.log('  ❌ Columna project_id NO existe en inventory_items')
      } else {
        console.log('  ✅ Columna project_id existe en inventory_items')
        projectIdColumnExists = true
      }
    } catch (error) {
      console.log('  ❌ Columna project_id NO existe en inventory_items')
    }
    
    console.log('\n📊 Resumen del estado:')
    console.log(`  - Tabla projects: ${projectsExist ? '✅' : '❌'}`)
    console.log(`  - Tabla project_members: ${projectMembersExist ? '✅' : '❌'}`)
    console.log(`  - Columna project_id: ${projectIdColumnExists ? '✅' : '❌'}`)
    
    if (projectsExist && projectMembersExist && projectIdColumnExists) {
      console.log('\n🎉 ¡Todas las tablas ya existen! No es necesario crear nada.')
      return
    }
    
    console.log('\n⚠️  Las tablas NO existen. Necesitas crearlas manualmente desde el dashboard de Supabase.')
    console.log('\n📋 Pasos para crear las tablas:')
    console.log('1. Ve a: https://supabase.com/dashboard')
    console.log('2. Selecciona tu proyecto: supabase-inventory-app')
    console.log('3. Ve a: SQL Editor')
    console.log('4. Copia y pega el contenido del archivo: scripts/004_create_projects_schema.sql')
    console.log('5. Ejecuta el script')
    console.log('6. Luego ejecuta: scripts/005_migrate_existing_data.sql')
    
    console.log('\n🔗 Enlaces útiles:')
    console.log('  - Dashboard: https://supabase.com/dashboard')
    console.log('  - Tu proyecto: https://supabase.com/dashboard/project/xwfbunljlevcwazzpmlj')
    
  } catch (error) {
    console.error('❌ Error general:', error)
    process.exit(1)
  }
}

// Ejecutar creación de tablas
createTablesDirectly()
