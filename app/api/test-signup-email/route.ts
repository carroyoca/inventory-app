import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/api-client'

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json()
    
    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    
    // Test signup with email confirmation
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Don't auto-confirm, send confirmation email
      user_metadata: {
        full_name: fullName
      }
    })

    if (error) {
      console.error('Test signup error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log('Test signup successful:', data)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test signup completed. Check if confirmation email was sent.',
      user: data.user 
    })

  } catch (error) {
    console.error('Test signup API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
