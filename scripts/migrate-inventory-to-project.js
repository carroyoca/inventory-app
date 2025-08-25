const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_INVAPPSUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateInventoryToProject() {
  console.log('🔄 Starting inventory migration to project...')

  try {
    // 1. Get the default project for the user
    console.log('📋 Step 1: Finding default project...')
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, created_by')
      .order('created_at', { ascending: true })
      .limit(1)

    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError)
      return
    }

    if (!projects || projects.length === 0) {
      console.error('❌ No projects found')
      return
    }

    const defaultProject = projects[0]
    console.log(`✅ Found default project: ${defaultProject.name} (ID: ${defaultProject.id})`)

    // 2. Get all inventory items without project_id
    console.log('📋 Step 2: Finding inventory items without project_id...')
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('inventory_items')
      .select('id, product_name, created_by, project_id')
      .is('project_id', null)

    if (inventoryError) {
      console.error('❌ Error fetching inventory items:', inventoryError)
      return
    }

    if (!inventoryItems || inventoryItems.length === 0) {
      console.log('✅ No inventory items found without project_id')
      return
    }

    console.log(`📦 Found ${inventoryItems.length} inventory items without project_id`)

    // 3. Update inventory items with the default project_id
    console.log('📋 Step 3: Updating inventory items with project_id...')
    
    const updatePromises = inventoryItems.map(async (item) => {
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ project_id: defaultProject.id })
        .eq('id', item.id)

      if (updateError) {
        console.error(`❌ Error updating item ${item.id}:`, updateError)
        return { success: false, itemId: item.id, error: updateError }
      }

      console.log(`✅ Updated item: ${item.product_name} (ID: ${item.id})`)
      return { success: true, itemId: item.id }
    })

    const results = await Promise.all(updatePromises)
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log(`\n📊 Migration Results:`)
    console.log(`✅ Successfully updated: ${successful} items`)
    console.log(`❌ Failed to update: ${failed} items`)

    if (failed > 0) {
      console.log('\n❌ Failed items:')
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - Item ID: ${r.itemId}, Error: ${r.error?.message}`)
      })
    }

    // 4. Verify the migration
    console.log('\n📋 Step 4: Verifying migration...')
    const { data: verifyItems, error: verifyError } = await supabase
      .from('inventory_items')
      .select('id, product_name, project_id')
      .eq('project_id', defaultProject.id)

    if (verifyError) {
      console.error('❌ Error verifying migration:', verifyError)
      return
    }

    console.log(`✅ Verification: ${verifyItems?.length || 0} items now belong to project "${defaultProject.name}"`)

    console.log('\n🎉 Migration completed successfully!')

  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

// Run the migration
migrateInventoryToProject()
