const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_INVAPPSUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function consolidateDuplicateProjects() {
  console.log('🔄 Starting project consolidation...')

  try {
    // 1. Get all projects with the same name
    console.log('📋 Step 1: Finding duplicate projects...')
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, created_by, created_at')
      .eq('name', 'Mi Casa - Proyecto por Defecto')
      .order('created_at', { ascending: true })

    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError)
      return
    }

    if (!projects || projects.length <= 1) {
      console.log('✅ No duplicate projects found')
      return
    }

    console.log(`📁 Found ${projects.length} projects with name "Mi Casa - Proyecto por Defecto":`)
    projects.forEach((project, index) => {
      console.log(`  ${index + 1}. ${project.name} (ID: ${project.id}) - Created: ${project.created_at}`)
    })

    // 2. Use the first project as the main project
    const mainProject = projects[0]
    const duplicateProjects = projects.slice(1)
    
    console.log(`\n🎯 Main project: ${mainProject.name} (ID: ${mainProject.id})`)
    console.log(`📦 Projects to consolidate: ${duplicateProjects.length}`)

    // 3. Move all items from duplicate projects to the main project
    console.log('\n📋 Step 2: Moving items to main project...')
    
    for (const duplicateProject of duplicateProjects) {
      console.log(`\n🔄 Processing project: ${duplicateProject.name} (ID: ${duplicateProject.id})`)
      
      // Get items from this project
      const { data: items, error: itemsError } = await supabase
        .from('inventory_items')
        .select('id, product_name')
        .eq('project_id', duplicateProject.id)

      if (itemsError) {
        console.error(`❌ Error fetching items from project ${duplicateProject.id}:`, itemsError)
        continue
      }

      if (!items || items.length === 0) {
        console.log(`  ✅ No items to move from project ${duplicateProject.id}`)
        continue
      }

      console.log(`  📦 Found ${items.length} items to move:`)
      items.forEach(item => {
        console.log(`    - ${item.product_name} (ID: ${item.id})`)
      })

      // Move items to main project
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ project_id: mainProject.id })
        .eq('project_id', duplicateProject.id)

      if (updateError) {
        console.error(`❌ Error moving items from project ${duplicateProject.id}:`, updateError)
        continue
      }

      console.log(`  ✅ Successfully moved ${items.length} items to main project`)
    }

    // 4. Move project members to the main project
    console.log('\n📋 Step 3: Moving project members...')
    
    for (const duplicateProject of duplicateProjects) {
      console.log(`\n🔄 Processing members from project: ${duplicateProject.id}`)
      
      // Get members from this project
      const { data: members, error: membersError } = await supabase
        .from('project_members')
        .select('user_id, role')
        .eq('project_id', duplicateProject.id)

      if (membersError) {
        console.error(`❌ Error fetching members from project ${duplicateProject.id}:`, membersError)
        continue
      }

      if (!members || members.length === 0) {
        console.log(`  ✅ No members to move from project ${duplicateProject.id}`)
        continue
      }

      console.log(`  👥 Found ${members.length} members to move:`)
      members.forEach(member => {
        console.log(`    - User: ${member.user_id}, Role: ${member.role}`)
      })

      // Check if members already exist in main project
      for (const member of members) {
        const { data: existingMember } = await supabase
          .from('project_members')
          .select('id')
          .eq('project_id', mainProject.id)
          .eq('user_id', member.user_id)
          .single()

        if (!existingMember) {
          // Add member to main project
          const { error: insertError } = await supabase
            .from('project_members')
            .insert({
              project_id: mainProject.id,
              user_id: member.user_id,
              role: member.role
            })

          if (insertError) {
            console.error(`❌ Error adding member ${member.user_id} to main project:`, insertError)
          } else {
            console.log(`  ✅ Added member ${member.user_id} to main project`)
          }
        } else {
          console.log(`  ℹ️  Member ${member.user_id} already exists in main project`)
        }
      }
    }

    // 5. Delete duplicate projects
    console.log('\n📋 Step 4: Deleting duplicate projects...')
    
    for (const duplicateProject of duplicateProjects) {
      console.log(`🗑️  Deleting project: ${duplicateProject.name} (ID: ${duplicateProject.id})`)
      
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', duplicateProject.id)

      if (deleteError) {
        console.error(`❌ Error deleting project ${duplicateProject.id}:`, deleteError)
      } else {
        console.log(`  ✅ Successfully deleted project ${duplicateProject.id}`)
      }
    }

    // 6. Verify consolidation
    console.log('\n📋 Step 5: Verifying consolidation...')
    
    const { data: finalProjects, error: finalProjectsError } = await supabase
      .from('projects')
      .select('id, name, created_at')
      .eq('name', 'Mi Casa - Proyecto por Defecto')

    if (finalProjectsError) {
      console.error('❌ Error verifying projects:', finalProjectsError)
      return
    }

    console.log(`✅ Final projects with name "Mi Casa - Proyecto por Defecto": ${finalProjects?.length || 0}`)
    finalProjects?.forEach(project => {
      console.log(`  - ${project.name} (ID: ${project.id}) - Created: ${project.created_at}`)
    })

    // Check items in main project
    const { data: mainProjectItems, error: mainProjectItemsError } = await supabase
      .from('inventory_items')
      .select('id, product_name')
      .eq('project_id', mainProject.id)

    if (mainProjectItemsError) {
      console.error('❌ Error verifying items:', mainProjectItemsError)
      return
    }

    console.log(`\n📦 Items in main project: ${mainProjectItems?.length || 0}`)
    mainProjectItems?.forEach(item => {
      console.log(`  - ${item.product_name} (ID: ${item.id})`)
    })

    console.log('\n🎉 Project consolidation completed successfully!')

  } catch (error) {
    console.error('❌ Consolidation failed:', error)
  }
}

// Run the consolidation
consolidateDuplicateProjects()
