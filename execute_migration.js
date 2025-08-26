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
    console.log('🚀 === EXECUTING PENDING ACCESS TABLE MIGRATION ===')
    
    // Read the migration script
    const migrationSQL = fs.readFileSync('scripts/012_create_pending_access_table.sql', 'utf8')
    
    console.log('📝 Migration script loaded, executing...')
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('❌ Migration failed:', error)
      
      // Try alternative approach - execute parts individually
      console.log('🔄 Trying step-by-step execution...')
      
      // Create table first
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS public.pending_project_access (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
            user_email text NOT NULL,
            role text NOT NULL CHECK (role IN ('owner', 'manager', 'member', 'viewer')),
            granted_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            granted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
            expires_at timestamp with time zone DEFAULT (timezone('utc'::text, now()) + interval '30 days'),
            created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
            updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
        );
      `
      
      const { error: tableError } = await supabase.rpc('exec_sql', { sql: createTableSQL })
      
      if (tableError) {
        console.error('❌ Table creation failed:', tableError)
      } else {
        console.log('✅ Table created successfully')
      }
      
    } else {
      console.log('✅ Migration executed successfully:', data)
    }
    
  } catch (error) {
    console.error('❌ Error executing migration:', error)
  }
}

executeMigration()
