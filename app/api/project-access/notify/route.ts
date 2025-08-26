import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/api-client'
import { sendAccessNotificationEmail } from '@/lib/services/email'

interface SendNotificationData {
  project_id: string
  user_email: string
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabase = createServiceRoleClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    const body: SendNotificationData = await request.json()
    const { project_id, user_email } = body

    // Validate required fields
    if (!project_id || !user_email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user is owner/manager of the project
    const { data: membership, error: membershipError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .in('role', ['owner', 'manager'])
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'You do not have permission to send notifications for this project' },
        { status: 403 }
      )
    }

    // Check if target user exists and get their role (for notifications)
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', user_email)
      .single()

    let userRole = 'member' // default role for pending users

    if (targetUser) {
      // User exists, check if they're a member to get their role
      const { data: member } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', project_id)
        .eq('user_id', targetUser.id)
        .single()

      if (member) {
        // User is already a member, use their current role
        userRole = member.role
        console.log('Sending notification to existing member:', user_email, 'with role:', userRole)
      } else {
        // User exists but is not a member - they should have been granted access separately
        // We'll send notification with the default 'member' role
        console.log('Sending notification to existing user (not yet member):', user_email)
      }
    } else {
      // User doesn't exist yet - this is fine for notifications
      // We'll send them an email to inform them about the project access
      console.log('Sending notification to non-existent user:', user_email)
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('name')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Get sender details
    const { data: senderProfile, error: senderError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    if (senderError || !senderProfile) {
      return NextResponse.json(
        { error: 'Sender profile not found' },
        { status: 404 }
      )
    }

    // Send notification email
    try {
      const emailResult = await sendAccessNotificationEmail({
        to: user_email,
        projectName: project.name,
        grantedBy: senderProfile.full_name || senderProfile.email,
        role: userRole
      })

      if (emailResult && 'success' in emailResult && emailResult.success === false) {
        console.log('❌ Email not sent:', emailResult.reason)
        return NextResponse.json({
          success: false,
          message: 'Email notification could not be sent',
          reason: emailResult.reason
        })
      } else {
        console.log('✅ Access notification email sent successfully')
        return NextResponse.json({
          success: true,
          message: 'Access notification email sent successfully'
        })
      }
    } catch (emailError) {
      console.error('❌ Email sending error:', emailError)
      return NextResponse.json({
        success: false,
        message: 'Failed to send access notification email',
        error: emailError instanceof Error ? emailError.message : 'Unknown error'
      })
    }

  } catch (error) {
    console.error('Project access notification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
