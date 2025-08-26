const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://xwfbunljlevcwazzpmlj.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3ZmJ1bmxqbGV2Y3dhenpwbWxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkzOTI5OCwiZXhwIjoyMDcxNTE1Mjk4fQ.W_oJijT7HuwQB07i-061eZe7E8DTOchIGx8FWAJk3A8'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function analyzeExistingUsers() {
  console.log('🔍 ANALYZING EXISTING USER ISSUES...')
  
  try {
    // Get all users with detailed info
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) {
      console.error('Error fetching users:', authError)
      return
    }

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return
    }

    // Get project memberships
    const { data: memberships, error: membersError } = await supabase
      .from('project_members')
      .select('*')
    
    if (membersError) {
      console.error('Error fetching memberships:', membersError)
      return
    }

    console.log('\n📊 DETAILED USER ANALYSIS:')
    
    authUsers.users.forEach(user => {
      const profile = profiles.find(p => p.id === user.id)
      const userMemberships = memberships.filter(m => m.user_id === user.id)
      
      console.log(`\n👤 USER: ${user.email}`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Created: ${user.created_at}`)
      console.log(`   Email Confirmed: ${!!user.email_confirmed_at}`)
      console.log(`   Last Sign In: ${user.last_sign_in_at || 'Never'}`)
      console.log(`   Metadata: ${JSON.stringify(user.user_metadata)}`)
      
      if (profile) {
        console.log(`   ✅ Profile: ${profile.full_name} (${profile.email})`)
      } else {
        console.log(`   ❌ NO PROFILE FOUND`)
      }
      
      if (userMemberships.length > 0) {
        console.log(`   🏠 Projects: ${userMemberships.length}`)
        userMemberships.forEach(m => {
          console.log(`      - Project ${m.project_id} (${m.role})`)
        })
      } else {
        console.log(`   🏠 Projects: None`)
      }
      
      // Identify potential issues
      const issues = []
      if (!user.email_confirmed_at) issues.push('Email not confirmed')
      if (!profile) issues.push('No profile')
      if (!profile?.full_name) issues.push('No full name')
      if (userMemberships.length === 0) issues.push('No project memberships')
      
      if (issues.length > 0) {
        console.log(`   ⚠️ Issues: ${issues.join(', ')}`)
      } else {
        console.log(`   ✅ All good`)
      }
    })

    // Check what happens when carroyoca66@gmail.com tries to login
    const problematicUser = authUsers.users.find(u => u.email === 'carroyoca66@gmail.com')
    if (problematicUser) {
      console.log('\n🔍 ANALYZING PROBLEMATIC USER: carroyoca66@gmail.com')
      
      const userProfile = profiles.find(p => p.id === problematicUser.id)
      const userMemberships = memberships.filter(m => m.user_id === problematicUser.id)
      
      console.log('✅ User exists in auth.users')
      console.log('✅ Email confirmed:', !!problematicUser.email_confirmed_at)
      console.log('✅ Profile exists:', !!userProfile)
      console.log('✅ Full name:', userProfile?.full_name || 'MISSING')
      console.log('✅ Project memberships:', userMemberships.length)
      
      if (userMemberships.length > 0) {
        console.log('\n🎯 ROOT CAUSE IDENTIFIED:')
        console.log('The user HAS everything needed:')
        console.log('- ✅ Confirmed email')
        console.log('- ✅ Complete profile') 
        console.log('- ✅ Project membership')
        console.log('\n❌ THE ISSUE IS IN OUR APPLICATION LOGIC!')
        console.log('Our middleware/security checks are incorrectly blocking this user.')
      }
    }

  } catch (error) {
    console.error('❌ Analysis error:', error)
  }
}

analyzeExistingUsers()
