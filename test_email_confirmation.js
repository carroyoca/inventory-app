const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://xwfbunljlevcwazzpmlj.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3ZmJ1bmxqbGV2Y3dhenpwbWxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkzOTI5OCwiZXhwIjoyMDcxNTE1Mjk4fQ.W_oJijT7HuwQB07i-061eZe7E8DTOchIGx8FWAJk3A8'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3ZmJ1bmxqbGV2Y3dhenpwbWxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MzkyOTgsImV4cCI6MjA3MTUxNTI5OH0.eW44Jz115sX-omrQfQv-28xy-WlEJ7e5XKKbHiAs6dQ'

const adminClient = createClient(supabaseUrl, supabaseServiceKey)
const clientClient = createClient(supabaseUrl, supabaseAnonKey)

async function testEmailConfirmation() {
  console.log('🧪 TESTING EMAIL CONFIRMATION FLOW...')
  
  try {
    // Test 1: Check Supabase Auth Settings
    console.log('\n1️⃣ CHECKING SUPABASE AUTH SETTINGS...')
    
    // Try to get auth settings (this might not work with current permissions)
    try {
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
    } catch (e) {
      console.log('Cannot access auth config table')
    }

    // Test 2: Create a user with email confirmation required
    console.log('\n2️⃣ TESTING USER CREATION WITH EMAIL CONFIRMATION...')
    const testEmail = `test-confirmation-${Date.now()}@gmail.com`
    
    console.log(`Creating test user: ${testEmail}`)
    
    const { data: testUser, error: createError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: false, // Don't auto-confirm, require email confirmation
      user_metadata: {
        full_name: 'Test Confirmation User'
      }
    })

    if (createError) {
      console.log('❌ Error creating test user:', createError)
    } else {
      console.log('✅ Test user created:', testUser.user.id)
      console.log('Email confirmed:', !!testUser.user.email_confirmed_at)
      console.log('Email confirmation sent:', !!testUser.user.email_confirmed_at)
      
      // Check if profile was created
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const { data: testProfile, error: profileError } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', testUser.user.id)
        .single()

      if (profileError) {
        console.log('❌ NO PROFILE CREATED - TRIGGER NOT WORKING!')
      } else {
        console.log('✅ Profile created automatically:', testProfile.full_name)
      }
      
      // Clean up test user
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(testUser.user.id)
      if (deleteError) {
        console.log('⚠️ Could not delete test user:', deleteError)
      } else {
        console.log('🗑️ Test user cleaned up')
      }
    }

    // Test 3: Check if there are any pending email confirmations
    console.log('\n3️⃣ CHECKING FOR PENDING EMAIL CONFIRMATIONS...')
    
    const { data: pendingUsers, error: pendingError } = await adminClient.auth.admin.listUsers()
    if (pendingError) {
      console.log('❌ Error fetching users:', pendingError)
    } else {
      const unconfirmedUsers = pendingUsers.users.filter(user => !user.email_confirmed_at)
      console.log(`Found ${unconfirmedUsers.length} users with unconfirmed emails:`)
      
      unconfirmedUsers.forEach(user => {
        console.log(`- ${user.email} (created: ${user.created_at})`)
      })
    }

    // Test 4: Check Resend email configuration
    console.log('\n4️⃣ CHECKING RESEND EMAIL CONFIGURATION...')
    
    // Test the email API endpoint
    try {
      const response = await fetch('https://inventory-obdtecmns-carlos-arroyos-projects.vercel.app/api/test-email')
      const emailTest = await response.json()
      
      console.log('Email API test result:', emailTest)
      
      if (emailTest.success) {
        console.log('✅ Email service is working')
      } else {
        console.log('❌ Email service has issues:', emailTest.error)
      }
    } catch (e) {
      console.log('❌ Cannot test email API:', e.message)
    }

    // Test 5: Check environment variables
    console.log('\n5️⃣ CHECKING ENVIRONMENT VARIABLES...')
    console.log('This would need to be checked in Vercel dashboard:')
    console.log('- RESEND_API_KEY: Should be set')
    console.log('- NEXT_PUBLIC_APP_URL: Should be set to production URL')
    console.log('- SUPABASE_SERVICE_ROLE_KEY: Should be set')

  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

testEmailConfirmation()
