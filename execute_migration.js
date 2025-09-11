const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_INVAPPSUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function executeMigration() {
  try {
    const fileArg = process.argv[2] || process.env.MIGRATION_FILE || 'scripts/017_add_listing_fields.sql'
    console.log('🚀 === EXECUTING MIGRATION ===')
    console.log('📄 File:', fileArg)
    
    // Read the migration script
    const migrationSQL = fs.readFileSync(fileArg, 'utf8')
    
    console.log('📝 Migration script loaded, executing...')
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('❌ Migration failed:', error)
      
      // Try alternative approach - execute parts individually
      console.log('ℹ️ Could not execute via exec_sql. If your database does not have the exec_sql function, run the file manually in Supabase SQL Editor:')
      console.log('--- BEGIN SQL ---')
      console.log(migrationSQL)
      console.log('--- END SQL ---')
    
    } else {
      console.log('✅ Migration executed successfully:', data)
    }
    
  } catch (error) {
    console.error('❌ Error executing migration:', error)
  }
}

executeMigration()
