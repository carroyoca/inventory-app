#!/usr/bin/env node

/**
 * Script para vincular proyecto de Supabase
 */

import { spawn } from 'child_process'

const password = 'supabase97_'
const projectRef = 'xwfbunljlevcwazzpmlj'

console.log('🔗 Vinculando proyecto de Supabase...')
console.log('  Proyecto:', projectRef)

const supabase = spawn('supabase', ['link', '--project-ref', projectRef], {
  stdio: ['pipe', 'pipe', 'pipe']
})

// Enviar contraseña cuando se solicite
supabase.stdin.write(password + '\n')

supabase.stdout.on('data', (data) => {
  console.log('📤 Output:', data.toString())
})

supabase.stderr.on('data', (data) => {
  console.log('❌ Error:', data.toString())
})

supabase.on('close', (code) => {
  console.log(`🔚 Proceso terminado con código: ${code}`)
  if (code === 0) {
    console.log('✅ Proyecto vinculado exitosamente!')
  } else {
    console.log('❌ Error al vincular proyecto')
  }
})

supabase.on('error', (error) => {
  console.error('💥 Error del proceso:', error)
})
