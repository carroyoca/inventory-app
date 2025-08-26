const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://xwfbunljlevcwazzpmlj.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3ZmJ1bmxqbGV2Y3dhenpwbWxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkzOTI5OCwiZXhwIjoyMDcxNTE1Mjk4fQ.W_oJijT7HuwQB07i-061eZe7E8DTOchIGx8FWAJk3A8'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixFullNames() {
  console.log('🔧 FIXING MISSING FULL NAMES...')
  
  try {
    // Get all users and their metadata
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

    console.log('\n🔍 CHECKING FULL NAMES...')
    
    for (const profile of profiles) {
      const user = authUsers.users.find(u => u.id === profile.id)
      if (!user) continue
      
      console.log(`\n👤 ${profile.email}:`)
      console.log(`   Current full_name: "${profile.full_name}"`)
      console.log(`   User metadata:`, user.user_metadata)
      
      // Extract full_name from metadata
      const metadataFullName = user.user_metadata?.full_name || ''
      
      if (!profile.full_name && metadataFullName) {
        console.log(`   ✅ Updating full_name to: "${metadataFullName}"`)
        
        const { data: updated, error: updateError } = await supabase
          .from('profiles')
          .update({ 
            full_name: metadataFullName,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id)
          .select()
          .single()

        if (updateError) {
          console.log(`   ❌ Error updating: ${updateError.message}`)
        } else {
          console.log(`   ✅ Updated successfully`)
        }
      } else if (!profile.full_name && !metadataFullName) {
        console.log(`   ⚠️ No full_name in metadata either - need to set manually`)
        
        // Set a default name based on email
        const defaultName = profile.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ')
        
        const { data: updated, error: updateError } = await supabase
          .from('profiles')
          .update({ 
            full_name: defaultName,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id)
          .select()
          .single()

        if (updateError) {
          console.log(`   ❌ Error updating: ${updateError.message}`)
        } else {
          console.log(`   ✅ Set default name: "${defaultName}"`)
        }
      } else {
        console.log(`   ✅ Full name is already set`)
      }
    }

    console.log('\n✅ FULL NAME FIX COMPLETED!')
    
    // Verify the fix
    const { data: updatedProfiles, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
    
    if (verifyError) {
      console.error('Error verifying fix:', verifyError)
    } else {
      console.log('\n📊 VERIFICATION:')
      updatedProfiles.forEach(profile => {
        console.log(`- ${profile.email}: "${profile.full_name}"`)
      })
    }

  } catch (error) {
    console.error('❌ Fix error:', error)
  }
}

fixFullNames()
