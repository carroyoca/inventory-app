const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://xwfbunljlevcwazzpmlj.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3ZmJ1bmxqbGV2Y3dhenpwbWxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkzOTI5OCwiZXhwIjoyMDcxNTE1Mjk4fQ.W_oJijT7HuwQB07i-061eZe7E8DTOchIGx8FWAJk3A8'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function debugDatabase() {
  console.log('🔍 DEBUGGING SUPABASE DATABASE...')
  
  try {
    // 1. Check users in auth.users
    console.log('\n📊 AUTH USERS:')
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) {
      console.error('Error fetching auth users:', authError)
    } else {
      console.log(`Found ${authUsers.users.length} users in auth.users`)
      authUsers.users.forEach(user => {
        console.log(`- ${user.id}: ${user.email} (confirmed: ${!!user.email_confirmed_at})`)
      })
    }

    // 2. Check profiles table
    console.log('\n👤 PROFILES:')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
    } else {
      console.log(`Found ${profiles.length} profiles`)
      profiles.forEach(profile => {
        console.log(`- ${profile.id}: ${profile.email} (${profile.full_name})`)
      })
    }

    // 3. Check projects
    console.log('\n🏠 PROJECTS:')
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
    if (projectsError) {
      console.error('Error fetching projects:', projectsError)
    } else {
      console.log(`Found ${projects.length} projects`)
      projects.forEach(project => {
        console.log(`- ${project.id}: ${project.name}`)
      })
    }

    // 4. Check project members
    console.log('\n👥 PROJECT MEMBERS:')
    const { data: members, error: membersError } = await supabase
      .from('project_members')
      .select('*')
    if (membersError) {
      console.error('Error fetching project members:', membersError)
    } else {
      console.log(`Found ${members.length} project members`)
      members.forEach(member => {
        console.log(`- User ${member.user_id} in project ${member.project_id} (${member.role})`)
      })
    }

    // 5. Check invitations
    console.log('\n✉️ INVITATIONS:')
    const { data: invitations, error: invitationsError } = await supabase
      .from('project_invitations')
      .select('*')
    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError)
    } else {
      console.log(`Found ${invitations.length} invitations`)
      invitations.forEach(invitation => {
        console.log(`- ${invitation.id}: ${invitation.invitee_email} → project ${invitation.project_id} (${invitation.status})`)
      })
    }

    // 6. Find users without profiles
    console.log('\n🚨 USERS WITHOUT PROFILES:')
    if (authUsers && profiles) {
      const authUserIds = authUsers.users.map(u => u.id)
      const profileIds = profiles.map(p => p.id)
      const usersWithoutProfiles = authUserIds.filter(id => !profileIds.includes(id))
      
      if (usersWithoutProfiles.length > 0) {
        console.log(`Found ${usersWithoutProfiles.length} users without profiles:`)
        usersWithoutProfiles.forEach(userId => {
          const user = authUsers.users.find(u => u.id === userId)
          console.log(`- ${userId}: ${user.email}`)
        })
      } else {
        console.log('✅ All users have profiles')
      }
    }

    // 7. Summary
    console.log('\n📋 SUMMARY:')
    console.log(`- Auth Users: ${authUsers ? authUsers.users.length : 'N/A'}`)
    console.log(`- Profiles: ${profiles ? profiles.length : 'N/A'}`)
    console.log(`- Projects: ${projects ? projects.length : 'N/A'}`)
    console.log(`- Members: ${members ? members.length : 'N/A'}`)
    console.log(`- Invitations: ${invitations ? invitations.length : 'N/A'}`)

  } catch (error) {
    console.error('❌ Debug error:', error)
  }
}

debugDatabase()
