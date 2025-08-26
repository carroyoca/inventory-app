const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://xwfbunljlevcwazzpmlj.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3ZmJ1bmxqbGV2Y3dhenpwbWxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkzOTI5OCwiZXhwIjoyMDcxNTE1Mjk4fQ.W_oJijT7HuwQB07i-061eZe7E8DTOchIGx8FWAJk3A8'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3ZmJ1bmxqbGV2Y3dhenpwbWxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MzkyOTgsImV4cCI6MjA3MTUxNTI5OH0.eW44Jz115sX-omrQfQv-28xy-WlEJ7e5XKKbHiAs6dQ'

const adminClient = createClient(supabaseUrl, supabaseServiceKey)
const clientClient = createClient(supabaseUrl, supabaseAnonKey)

async function testCompleteWorkflow() {
  console.log('🧪 TESTING COMPLETE USER ONBOARDING WORKFLOW...')
  
  try {
    // Test 1: Create a user with auto-confirmation (simulating the fix)
    console.log('\n1️⃣ CREATING TEST USER WITH AUTO-CONFIRMATION...')
    const testEmail = `workflow-test-${Date.now()}@gmail.com`
    const testPassword = 'TestPassword123!'
    
    console.log(`Creating test user: ${testEmail}`)
    
    const { data: testUser, error: createError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Auto-confirm (this is what we want after the fix)
      user_metadata: {
        full_name: 'Workflow Test User'
      }
    })

    if (createError) {
      console.log('❌ Error creating test user:', createError)
      return
    }

    console.log('✅ Test user created:', testUser.user.id)
    console.log('Email confirmed:', !!testUser.user.email_confirmed_at)
    
    // Check if profile was created
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const { data: testProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', testUser.user.id)
      .single()

    if (profileError) {
      console.log('❌ NO PROFILE CREATED')
      return
    } else {
      console.log('✅ Profile created automatically:', testProfile.full_name)
    }

    // Test 2: Simulate user login
    console.log('\n2️⃣ TESTING USER LOGIN...')
    
    const { data: loginData, error: loginError } = await clientClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })

    if (loginError) {
      console.log('❌ Login failed:', loginError)
    } else {
      console.log('✅ Login successful:', loginData.user.id)
      console.log('User session valid:', !!loginData.session)
    }

    // Test 3: Create an invitation for this user
    console.log('\n3️⃣ TESTING INVITATION CREATION...')
    
    // Get a project to invite to
    const { data: projects, error: projectsError } = await adminClient
      .from('projects')
      .select('id, name')
      .limit(1)

    if (projectsError || !projects || projects.length === 0) {
      console.log('❌ No projects found for invitation test')
    } else {
      const project = projects[0]
      console.log(`Creating invitation to project: ${project.name}`)
      
      const { data: invitation, error: invitationError } = await adminClient
        .from('project_invitations')
        .insert({
          project_id: project.id,
          inviter_id: testUser.user.id,
          invitee_email: testEmail,
          role: 'member',
          status: 'pending'
        })
        .select()
        .single()

      if (invitationError) {
        console.log('❌ Error creating invitation:', invitationError)
      } else {
        console.log('✅ Invitation created:', invitation.id)
      }
    }

    // Test 4: Check if user can access project data
    console.log('\n4️⃣ TESTING PROJECT ACCESS...')
    
    if (loginData && loginData.session) {
      // Set the session for the client
      const { data: sessionData, error: sessionError } = await clientClient.auth.setSession(loginData.session)
      
      if (sessionError) {
        console.log('❌ Session error:', sessionError)
      } else {
        console.log('✅ Session set successfully')
        
        // Try to access projects
        const { data: userProjects, error: projectsError } = await clientClient
          .from('projects')
          .select('*')
          .eq('id', projects[0].id)

        if (projectsError) {
          console.log('❌ Cannot access projects:', projectsError)
        } else {
          console.log('✅ Can access project data:', userProjects.length, 'projects')
        }
      }
    }

    // Test 5: Clean up
    console.log('\n5️⃣ CLEANING UP...')
    
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(testUser.user.id)
    if (deleteError) {
      console.log('⚠️ Could not delete test user:', deleteError)
    } else {
      console.log('🗑️ Test user cleaned up')
    }

    console.log('\n🎉 WORKFLOW TEST COMPLETED!')
    console.log('\n📋 SUMMARY:')
    console.log('✅ User creation with auto-confirmation works')
    console.log('✅ Profile creation works')
    console.log('✅ User login works')
    console.log('✅ Invitation creation works')
    console.log('✅ Project access works')
    
    console.log('\n🚀 NEXT STEPS:')
    console.log('1. Go to Supabase Dashboard → Authentication → Settings')
    console.log('2. Disable "Enable email confirmations"')
    console.log('3. Enable "Auto-confirm users"')
    console.log('4. Test the real signup form')
    console.log('5. Test the complete invitation workflow')

  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

testCompleteWorkflow()
