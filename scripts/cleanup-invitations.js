const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_INVAPPSUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanupInvitations() {
  try {
    console.log('🧹 Starting invitation cleanup...')
    
    // Get all invitations
    const { data: invitations, error } = await supabase
      .from('project_invitations')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Error fetching invitations:', error)
      return
    }
    
    console.log(`📧 Found ${invitations.length} total invitations`)
    
    // Group by project_id and invitee_email
    const groups = {}
    invitations.forEach(invitation => {
      const key = `${invitation.project_id}-${invitation.invitee_email}`
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(invitation)
    })
    
    // Find duplicates
    let duplicatesToDelete = []
    Object.values(groups).forEach(group => {
      if (group.length > 1) {
        // Keep the most recent one, delete the rest
        const sorted = group.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        duplicatesToDelete.push(...sorted.slice(1))
      }
    })
    
    console.log(`🗑️ Found ${duplicatesToDelete.length} duplicate invitations to delete`)
    
    if (duplicatesToDelete.length > 0) {
      const idsToDelete = duplicatesToDelete.map(inv => inv.id)
      
      const { error: deleteError } = await supabase
        .from('project_invitations')
        .delete()
        .in('id', idsToDelete)
      
      if (deleteError) {
        console.error('❌ Error deleting duplicates:', deleteError)
      } else {
        console.log('✅ Successfully deleted duplicate invitations')
      }
    }
    
    // Show summary
    const { data: remainingInvitations } = await supabase
      .from('project_invitations')
      .select('*')
    
    console.log(`📊 Remaining invitations: ${remainingInvitations?.length || 0}`)
    
  } catch (error) {
    console.error('❌ Error in cleanup:', error)
  }
}

cleanupInvitations()
