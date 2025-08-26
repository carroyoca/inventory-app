const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://xwfbunljlevcwazzpmlj.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3ZmJ1bmxqbGV2Y3dhenpwbWxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkzOTI5OCwiZXhwIjoyMDcxNTE1Mjk4fQ.W_oJijT7HuwQB07i-061eZe7E8DTOchIGx8FWAJk3A8'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function cleanupUser() {
  console.log('🧹 COMPLETE USER CLEANUP: carroyoca66@gmail.com')
  
  try {
    // Step 1: Find the user ID
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) {
      console.error('Error fetching users:', authError)
      return
    }

    const user = authUsers.users.find(u => u.email === 'carroyoca66@gmail.com')
    
    if (!user) {
      console.log('✅ User not found in auth.users - already cleaned up')
    } else {
      console.log(`🔍 Found user: ${user.id}`)
      
      // Step 2: Delete from all related tables
      console.log('\n🗑️ CLEANING UP DATABASE TABLES...')
      
      // Delete from project_invitations (as invitee)
      const { data: invitationsDeleted, error: invitationsError } = await supabase
        .from('project_invitations')
        .delete()
        .eq('invitee_email', 'carroyoca66@gmail.com')
      
      if (invitationsError) {
        console.log('❌ Error deleting invitations:', invitationsError)
      } else {
        console.log(`✅ Deleted ${invitationsDeleted?.length || 0} invitations`)
      }

      // Delete from project_invitations (as inviter)
      const { data: invitationsAsInviter, error: invitationsAsInviterError } = await supabase
        .from('project_invitations')
        .delete()
        .eq('inviter_id', user.id)
      
      if (invitationsAsInviterError) {
        console.log('❌ Error deleting invitations as inviter:', invitationsAsInviterError)
      } else {
        console.log(`✅ Deleted ${invitationsAsInviter?.length || 0} invitations as inviter`)
      }

      // Delete from project_members
      const { data: membersDeleted, error: membersError } = await supabase
        .from('project_members')
        .delete()
        .eq('user_id', user.id)
      
      if (membersError) {
        console.log('❌ Error deleting project members:', membersError)
      } else {
        console.log(`✅ Deleted ${membersDeleted?.length || 0} project memberships`)
      }

      // Delete from profiles
      const { data: profileDeleted, error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id)
      
      if (profileError) {
        console.log('❌ Error deleting profile:', profileError)
      } else {
        console.log(`✅ Deleted ${profileDeleted?.length || 0} profile`)
      }

      // Delete from inventory_items (if any)
      const { data: inventoryDeleted, error: inventoryError } = await supabase
        .from('inventory_items')
        .delete()
        .eq('user_id', user.id)
      
      if (inventoryError) {
        console.log('❌ Error deleting inventory items:', inventoryError)
      } else {
        console.log(`✅ Deleted ${inventoryDeleted?.length || 0} inventory items`)
      }

      // Step 3: Finally delete from auth.users
      console.log('\n🗑️ DELETING FROM AUTH.USERS...')
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(user.id)
      
      if (deleteAuthError) {
        console.log('❌ Error deleting from auth.users:', deleteAuthError)
      } else {
        console.log('✅ Deleted from auth.users')
      }
    }

    // Step 4: Verify cleanup
    console.log('\n🔍 VERIFYING CLEANUP...')
    
    const { data: remainingUsers, error: remainingError } = await supabase.auth.admin.listUsers()
    if (remainingError) {
      console.log('❌ Error checking remaining users:', remainingError)
    } else {
      const remainingUser = remainingUsers.users.find(u => u.email === 'carroyoca66@gmail.com')
      if (remainingUser) {
        console.log('❌ User still exists in auth.users')
      } else {
        console.log('✅ User completely removed from auth.users')
      }
    }

    // Check profiles
    const { data: remainingProfiles, error: profilesCheckError } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', 'carroyoca66@gmail.com')
    
    if (profilesCheckError) {
      console.log('❌ Error checking remaining profiles:', profilesCheckError)
    } else if (remainingProfiles && remainingProfiles.length > 0) {
      console.log('❌ Profile still exists')
    } else {
      console.log('✅ Profile completely removed')
    }

    // Check invitations
    const { data: remainingInvitations, error: invitationsCheckError } = await supabase
      .from('project_invitations')
      .select('invitee_email')
      .eq('invitee_email', 'carroyoca66@gmail.com')
    
    if (invitationsCheckError) {
      console.log('❌ Error checking remaining invitations:', invitationsCheckError)
    } else if (remainingInvitations && remainingInvitations.length > 0) {
      console.log('❌ Invitations still exist')
    } else {
      console.log('✅ Invitations completely removed')
    }

    console.log('\n🎉 CLEANUP COMPLETED!')
    console.log('You can now test the complete workflow with carroyoca66@gmail.com')

  } catch (error) {
    console.error('❌ Cleanup error:', error)
  }
}

cleanupUser()
