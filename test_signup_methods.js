const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://xwfbunljlevcwazzpmlj.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3ZmJ1bmxqbGV2Y3dhenpwbWxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkzOTI5OCwiZXhwIjoyMDcxNTE1Mjk4fQ.W_oJijT7HuwQB07i-061eZe7E8DTOchIGx8FWAJk3A8'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3ZmJ1bmxqbGV2Y3dhenpwbWxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MzkyOTgsImV4cCI6MjA3MTUxNTI5OH0.eW44Jz115sX-omrQfQv-28xy-WlEJ7e5XKKbHiAs6dQ'

const adminClient = createClient(supabaseUrl, supabaseServiceKey)
const clientClient = createClient(supabaseUrl, supabaseAnonKey)

async function testSignupMethods() {
  console.log('🧪 TESTING DIFFERENT SIGNUP METHODS...')
  
  try {
    // Test 1: Admin API (we know this works)
    console.log('\n1️⃣ TESTING ADMIN API SIGNUP...')
    const adminEmail = `admin-test-${Date.now()}@example.com`
    
    const { data: adminUser, error: adminError } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Admin Test User'
      }
    })

    if (adminError) {
      console.log('❌ Admin signup error:', adminError)
    } else {
      console.log('✅ Admin user created:', adminUser.user.id)
      
      // Check profile
      await new Promise(resolve => setTimeout(resolve, 1000))
      const { data: adminProfile, error: adminProfileError } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', adminUser.user.id)
        .single()

      if (adminProfileError) {
        console.log('❌ Admin user - NO PROFILE CREATED')
      } else {
        console.log('✅ Admin user - Profile created:', adminProfile.full_name)
      }
      
      // Cleanup
      await adminClient.auth.admin.deleteUser(adminUser.user.id)
    }

    // Test 2: Client API (normal signup)
    console.log('\n2️⃣ TESTING CLIENT API SIGNUP...')
    const clientEmail = `client-test-${Date.now()}@gmail.com`
    
    const { data: clientUser, error: clientError } = await clientClient.auth.signUp({
      email: clientEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          full_name: 'Client Test User'
        }
      }
    })

    if (clientError) {
      console.log('❌ Client signup error:', clientError)
    } else {
      console.log('✅ Client user created:', clientUser.user?.id)
      console.log('Client user confirmed:', !!clientUser.user?.email_confirmed_at)
      
      if (clientUser.user) {
        // Check profile
        await new Promise(resolve => setTimeout(resolve, 1000))
        const { data: clientProfile, error: clientProfileError } = await adminClient
          .from('profiles')
          .select('*')
          .eq('id', clientUser.user.id)
          .single()

        if (clientProfileError) {
          console.log('❌ Client user - NO PROFILE CREATED!')
          console.log('This is the root cause!')
        } else {
          console.log('✅ Client user - Profile created:', clientProfile.full_name)
        }
        
        // Cleanup
        await adminClient.auth.admin.deleteUser(clientUser.user.id)
      }
    }

    // Test 3: Check Supabase Auth settings
    console.log('\n3️⃣ CHECKING AUTH SETTINGS...')
    
    // Try to get auth settings (this might not work with current permissions)
    const { data: settings, error: settingsError } = await adminClient
      .from('auth.config')
      .select('*')

    if (settingsError) {
      console.log('Cannot access auth settings directly')
      console.log('Need to check Supabase Dashboard > Authentication > Settings')
      console.log('Look for:')
      console.log('- Email confirmation required')
      console.log('- Auto-confirm users')
      console.log('- Custom access token hook')
    } else {
      console.log('Auth settings:', settings)
    }

  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

testSignupMethods()
