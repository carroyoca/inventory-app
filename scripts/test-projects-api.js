#!/usr/bin/env node

/**
 * Script para probar la API de proyectos
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
const supabaseKey = envVars.NEXT_PUBLIC_INVAPPSUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno requeridas no encontradas')
  process.exit(1)
}

console.log('✅ Variables de entorno cargadas')

// Crear cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseKey)

async function testProjectsAPI() {
  try {
    console.log('\n🧪 Probando API de proyectos...')
    
    // 1. Verificar que las tablas existen y tienen datos
    console.log('\n📊 Verificando datos en las tablas...')
    
    // Verificar projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
    
    if (projectsError) {
      console.error('❌ Error obteniendo projects:', projectsError)
    } else {
      console.log(`  📋 Projects: ${projects?.length || 0} encontrados`)
      projects?.forEach(project => {
        console.log(`    - ${project.name} (${project.id})`)
      })
    }
    
    // Verificar project_members
    const { data: members, error: membersError } = await supabase
      .from('project_members')
      .select('*')
    
    if (membersError) {
      console.error('❌ Error obteniendo project_members:', membersError)
    } else {
      console.log(`  👥 Project Members: ${members?.length || 0} encontrados`)
      members?.forEach(member => {
        console.log(`    - Project: ${member.project_id}, User: ${member.user_id}, Role: ${member.role}`)
      })
    }
    
    // 2. Probar la consulta que usa la API
    console.log('\n🔍 Probando consulta de la API...')
    
    const { data: testQuery, error: testError } = await supabase
      .from('project_members')
      .select(`
        project_id,
        role,
        joined_at,
        projects (
          id,
          name,
          description,
          created_by,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', 'e093dbaf-a1e1-4f4c-8060-64277f8e1b8b') // Usar un user_id real
      .order('joined_at', { ascending: false })
    
    if (testError) {
      console.error('❌ Error en consulta de prueba:', testError)
    } else {
      console.log(`  ✅ Consulta exitosa: ${testQuery?.length || 0} resultados`)
      testQuery?.forEach(result => {
        console.log(`    - Project: ${result.projects?.name}, Role: ${result.role}`)
      })
    }
    
    // 3. Verificar que el usuario tiene items de inventario
    console.log('\n📦 Verificando items de inventario...')
    
    const { data: items, error: itemsError } = await supabase
      .from('inventory_items')
      .select('id, project_id, created_by')
      .eq('created_by', 'e093dbaf-a1e1-4f4c-8060-64277f8e1b8b')
    
    if (itemsError) {
      console.error('❌ Error obteniendo items:', itemsError)
    } else {
      console.log(`  📦 Items: ${items?.length || 0} encontrados`)
      items?.forEach(item => {
        console.log(`    - ID: ${item.id}, Project: ${item.project_id || 'null'}`)
      })
    }
    
    console.log('\n🎉 ¡Prueba completada!')
    
  } catch (error) {
    console.error('❌ Error general:', error)
    process.exit(1)
  }
}

// Ejecutar prueba
testProjectsAPI()
