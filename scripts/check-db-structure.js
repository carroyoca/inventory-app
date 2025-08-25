const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_INVAPPSUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabaseStructure() {
  try {
    console.log('🔍 === CHECKING DATABASE STRUCTURE ===')
    
    // Check if profiles table exists and has data
    console.log('\n📋 Checking profiles table...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5)
    
    if (profilesError) {
      console.log('❌ Profiles table error:', profilesError)
    } else {
      console.log(`✅ Profiles table exists with ${profiles?.length || 0} records`)
      if (profiles && profiles.length > 0) {
        console.log('Sample profile:', profiles[0])
      }
    }
    
    // Check project_members table
    console.log('\n👥 Checking project_members table...')
    const { data: members, error: membersError } = await supabase
      .from('project_members')
      .select('*')
      .limit(5)
    
    if (membersError) {
      console.log('❌ Project members error:', membersError)
    } else {
      console.log(`✅ Project members table exists with ${members?.length || 0} records`)
      if (members && members.length > 0) {
        console.log('Sample member:', members[0])
      }
    }
    
    // Check project_invitations table
    console.log('\n📧 Checking project_invitations table...')
    const { data: invitations, error: invitationsError } = await supabase
      .from('project_invitations')
      .select('*')
      .limit(5)
    
    if (invitationsError) {
      console.log('❌ Project invitations error:', invitationsError)
    } else {
      console.log(`✅ Project invitations table exists with ${invitations?.length || 0} records`)
      if (invitations && invitations.length > 0) {
        console.log('Sample invitation:', invitations[0])
      }
    }
    
    // Check foreign key relationships
    console.log('\n🔗 Checking foreign key relationships...')
    
    // Test a simple join to see if it works
    const { data: testJoin, error: joinError } = await supabase
      .from('project_members')
      .select(`
        *,
        profiles!project_members_user_id_fkey(id, full_name, email)
      `)
      .limit(1)
    
    if (joinError) {
      console.log('❌ Join test failed:', joinError)
    } else {
      console.log('✅ Join test successful:', testJoin)
    }
    
    // Check if we can fetch user details separately
    console.log('\n🔍 Testing separate queries...')
    if (members && members.length > 0) {
      const member = members[0]
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', member.user_id)
        .single()
      
      if (userError) {
        console.log('❌ Separate user query failed:', userError)
      } else {
        console.log('✅ Separate user query successful:', userProfile)
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking database structure:', error)
  }
}

checkDatabaseStructure()
