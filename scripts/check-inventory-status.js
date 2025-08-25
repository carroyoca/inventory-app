const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_INVAPPSUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkInventoryStatus() {
  console.log('🔍 Checking inventory status...')

  try {
    // 1. Get all projects
    console.log('\n📋 Step 1: Checking projects...')
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, created_by, created_at')

    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError)
      return
    }

    console.log(`✅ Found ${projects?.length || 0} projects:`)
    projects?.forEach(project => {
      console.log(`  - ${project.name} (ID: ${project.id}) - Created: ${project.created_at}`)
    })

    // 2. Get all inventory items
    console.log('\n📋 Step 2: Checking inventory items...')
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('inventory_items')
      .select('id, product_name, created_by, project_id, created_at')

    if (inventoryError) {
      console.error('❌ Error fetching inventory items:', inventoryError)
      return
    }

    console.log(`✅ Found ${inventoryItems?.length || 0} inventory items:`)
    
    if (inventoryItems && inventoryItems.length > 0) {
      inventoryItems.forEach(item => {
        const projectName = projects?.find(p => p.id === item.project_id)?.name || 'Unknown Project'
        console.log(`  - ${item.product_name} (ID: ${item.id}) - Project: ${projectName} (${item.project_id || 'NULL'})`)
      })
    }

    // 3. Check items without project_id
    console.log('\n📋 Step 3: Checking items without project_id...')
    const itemsWithoutProject = inventoryItems?.filter(item => !item.project_id) || []
    console.log(`📦 Found ${itemsWithoutProject.length} items without project_id:`)
    
    if (itemsWithoutProject.length > 0) {
      itemsWithoutProject.forEach(item => {
        console.log(`  - ${item.product_name} (ID: ${item.id})`)
      })
    }

    // 4. Check items by project
    console.log('\n📋 Step 4: Items by project...')
    const projectMap = new Map()
    
    inventoryItems?.forEach(item => {
      const projectId = item.project_id || 'NO_PROJECT'
      if (!projectMap.has(projectId)) {
        projectMap.set(projectId, [])
      }
      projectMap.get(projectId).push(item)
    })

    projectMap.forEach((items, projectId) => {
      const projectName = projects?.find(p => p.id === projectId)?.name || 'Unknown Project'
      console.log(`📁 ${projectName} (${projectId}): ${items.length} items`)
      items.forEach(item => {
        console.log(`    - ${item.product_name}`)
      })
    })

    console.log('\n✅ Inventory status check completed!')

  } catch (error) {
    console.error('❌ Check failed:', error)
  }
}

// Run the check
checkInventoryStatus()
