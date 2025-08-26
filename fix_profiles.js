const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://xwfbunljlevcwazzpmlj.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3ZmJ1bmxqbGV2Y3dhenpwbWxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkzOTI5OCwiZXhwIjoyMDcxNTE1Mjk4fQ.W_oJijT7HuwQB07i-061eZe7E8DTOchIGx8FWAJk3A8'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixMissingProfiles() {
  console.log('🔧 FIXING MISSING PROFILES...')
  
  try {
    // Get all users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) {
      console.error('Error fetching users:', authError)
      return
    }

    // Get existing profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return
    }

    const existingProfileIds = profiles.map(p => p.id)
    const usersWithoutProfiles = authUsers.users.filter(user => !existingProfileIds.includes(user.id))

    console.log(`Found ${usersWithoutProfiles.length} users without profiles`)

    // Create profiles for users without them
    for (const user of usersWithoutProfiles) {
      console.log(`Creating profile for: ${user.email}`)
      
      const profileData = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
        created_at: user.created_at,
        updated_at: new Date().toISOString()
      }

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single()

      if (insertError) {
        console.error(`❌ Error creating profile for ${user.email}:`, insertError)
      } else {
        console.log(`✅ Profile created for ${user.email}:`, newProfile.id)
      }
    }

    // Now let's try to process the pending invitation
    console.log('\n🔄 PROCESSING PENDING INVITATION...')
    
    const { data: pendingInvitations, error: inviteError } = await supabase
      .from('project_invitations')
      .select('*')
      .eq('status', 'pending')

    if (inviteError) {
      console.error('Error fetching invitations:', inviteError)
      return
    }

    for (const invitation of pendingInvitations) {
      console.log(`Processing invitation for: ${invitation.invitee_email}`)
      
      // Find the user with this email
      const user = authUsers.users.find(u => u.email === invitation.invitee_email)
      if (!user) {
        console.log(`❌ No user found for email: ${invitation.invitee_email}`)
        continue
      }

      // Check if user is already a member
      const { data: existingMember, error: memberError } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', invitation.project_id)
        .eq('user_id', user.id)
        .single()

      if (existingMember) {
        console.log(`✅ User ${user.email} is already a member of project ${invitation.project_id}`)
        
        // Update invitation to accepted
        const { error: updateError } = await supabase
          .from('project_invitations')
          .update({ 
            status: 'accepted',
            accepted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', invitation.id)

        if (updateError) {
          console.error(`❌ Error updating invitation:`, updateError)
        } else {
          console.log(`✅ Invitation marked as accepted`)
        }
      } else {
        // Add user to project
        console.log(`Adding user ${user.email} to project ${invitation.project_id}`)
        
        const { data: newMember, error: addMemberError } = await supabase
          .from('project_members')
          .insert({
            project_id: invitation.project_id,
            user_id: user.id,
            role: invitation.role,
            joined_at: new Date().toISOString()
          })
          .select()
          .single()

        if (addMemberError) {
          console.error(`❌ Error adding user to project:`, addMemberError)
        } else {
          console.log(`✅ User added to project:`, newMember.id)
          
          // Update invitation to accepted
          const { error: updateError } = await supabase
            .from('project_invitations')
            .update({ 
              status: 'accepted',
              accepted_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', invitation.id)

          if (updateError) {
            console.error(`❌ Error updating invitation:`, updateError)
          } else {
            console.log(`✅ Invitation marked as accepted`)
          }
        }
      }
    }

    console.log('\n✅ PROFILE FIX COMPLETED!')

  } catch (error) {
    console.error('❌ Fix error:', error)
  }
}

fixMissingProfiles()
