import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/api-client'
import { generateInvitationToken, isValidEmail } from '@/lib/utils/invitations'
import { sendInvitationEmail } from '@/lib/services/email'
import type { CreateInvitationData, InvitationsListResponse, InvitationResponse } from '@/lib/types/invitations'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const status = searchParams.get('status')
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

    let query = supabase
      .from('project_invitations')
      .select(`
        *,
        project:projects(id, name, description)
      `)

    // Filter by project if specified
    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    // Filter by status if specified
    if (status) {
      query = query.eq('status', status)
    }

    // If no project_id specified, only show invitations for projects where user is owner/manager
    if (!projectId) {
      // Get user's projects where they are owner/manager
      const { data: userProjects } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id)
        .in('role', ['owner', 'manager'])

      if (userProjects && userProjects.length > 0) {
        const projectIds = userProjects.map(p => p.project_id)
        query = query.in('project_id', projectIds)
      } else {
        // User has no projects where they can manage invitations
        return NextResponse.json({
          success: true,
          data: []
        } as InvitationsListResponse)
      }
    }

    const { data: invitations, error } = await query
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invitations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      )
    }

    // Get inviter details for each invitation
    const invitationsWithDetails = await Promise.all(
      invitations.map(async (invitation) => {
        const { data: inviter } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', invitation.inviter_id)
          .single()

        return {
          ...invitation,
          inviter: inviter || { id: invitation.inviter_id, full_name: null, email: null }
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: invitationsWithDetails
    } as InvitationsListResponse)

  } catch (error) {
    console.error('Error in invitations API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📧 === CREATE INVITATION API START ===')
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      console.log('❌ No authentication token provided')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabase = createServiceRoleClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.log('❌ Authentication failed:', authError)
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    console.log('✅ User authenticated:', user.id)

    const body: CreateInvitationData = await request.json()
    const { project_id, invitee_email, role } = body
    
    console.log('📧 Invitation request:', { project_id, invitee_email, role })

    // Validate required fields
    if (!project_id || !invitee_email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!isValidEmail(invitee_email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
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
        { error: 'You do not have permission to invite users to this project' },
        { status: 403 }
      )
    }

    // Check if user is trying to invite themselves
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    if (userProfile?.email === invitee_email) {
      return NextResponse.json(
        { error: 'You cannot invite yourself to a project' },
        { status: 400 }
      )
    }

            // Check if invitation already exists
        const { data: existingInvitations, error: checkError } = await supabase
          .from('project_invitations')
          .select('id, status')
          .eq('project_id', project_id)
          .eq('invitee_email', invitee_email)

        if (checkError) {
          console.error('Error checking existing invitations:', checkError)
          return NextResponse.json(
            { error: 'Failed to check existing invitations' },
            { status: 500 }
          )
        }

        if (existingInvitations && existingInvitations.length > 0) {
          const existingInvitation = existingInvitations[0]
          
          if (existingInvitation.status === 'pending') {
            console.log('❌ Invitation already pending for:', invitee_email)
            return NextResponse.json(
              { error: 'Ya existe una invitación pendiente para este usuario' },
              { status: 409 }
            )
          } else if (existingInvitation.status === 'accepted') {
            console.log('❌ User already member:', invitee_email)
            return NextResponse.json(
              { error: 'El usuario ya es miembro de este proyecto' },
              { status: 409 }
            )
          } else if (existingInvitation.status === 'rejected') {
            console.log('🔄 User previously rejected, creating new invitation')
            // Delete the rejected invitation and create a new one
            await supabase
              .from('project_invitations')
              .delete()
              .eq('id', existingInvitation.id)
          }
        }

    // Generate invitation token
    const invitationToken = generateInvitationToken()

    // Create invitation
    const { data: invitation, error: createError } = await supabase
      .from('project_invitations')
      .insert({
        project_id,
        inviter_id: user.id,
        invitee_email,
        role,
        token: invitationToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating invitation:', createError)
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      )
    }

            // Send email notification
        try {
          console.log('📧 === EMAIL SENDING START ===')
          console.log('📧 Invitation ID:', invitation.id)
          console.log('📧 To:', invitee_email)
          console.log('📧 Role:', role)
          
          const { data: project } = await supabase
            .from('projects')
            .select('name')
            .eq('id', project_id)
            .single()

          const { data: inviterProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .single()

          console.log('📧 Project data:', project)
          console.log('📧 Inviter profile:', inviterProfile)

          if (project && inviterProfile) {
            console.log('📧 Attempting to send invitation email to:', invitee_email)
            console.log('📧 Project:', project.name)
            console.log('📧 Inviter:', inviterProfile.full_name || inviterProfile.email)
            
            const emailResult = await sendInvitationEmail({
              to: invitee_email,
              projectName: project.name,
              inviterName: inviterProfile.full_name || inviterProfile.email,
              inviterEmail: inviterProfile.email,
              role,
              invitationId: invitation.id,
            })
            
            console.log('📧 Email service result:', emailResult)
            
            if (emailResult?.success === false) {
              console.log('❌ Email not sent:', emailResult.reason)
            } else {
              console.log('✅ Email sent successfully:', emailResult)
            }
          } else {
            console.log('❌ Missing project or inviter profile for email')
            console.log('❌ Project found:', !!project)
            console.log('❌ Profile found:', !!inviterProfile)
          }
        } catch (emailError) {
          console.error('❌ Error sending invitation email:', emailError)
          console.error('❌ Email error stack:', emailError.stack)
          // Don't fail the request if email fails, but log the error
        }
        console.log('📧 === EMAIL SENDING END ===')

            console.log('✅ Invitation created successfully:', invitation.id)
        
        return NextResponse.json({
          success: true,
          data: invitation,
          message: 'Invitation sent successfully'
        } as InvitationResponse)

  } catch (error) {
    console.error('Error in create invitation API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
