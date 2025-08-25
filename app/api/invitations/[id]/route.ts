import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/api-client'
import type { UpdateInvitationData, InvitationResponse } from '@/lib/types/invitations'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invitationId } = await params
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

    const { data: invitation, error } = await supabase
      .from('project_invitations')
      .select(`
        *,
        project:projects(id, name, description)
      `)
      .eq('id', invitationId)
      .single()

    if (error) {
      console.error('Error fetching invitation:', error)
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Get inviter details
    const { data: inviter } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', invitation.inviter_id)
      .single()

    const invitationWithDetails = {
      ...invitation,
      inviter: inviter || { id: invitation.inviter_id, full_name: null, email: null }
    }

    return NextResponse.json({
      success: true,
      data: invitationWithDetails
    } as InvitationResponse)

  } catch (error) {
    console.error('Error in get invitation API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invitationId } = await params
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

    const body: UpdateInvitationData = await request.json()
    const { status } = body

    if (!status || !['accepted', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "accepted" or "rejected"' },
        { status: 400 }
      )
    }

    // Get the invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('project_invitations')
      .select('*')
      .eq('id', invitationId)
      .single()

    if (fetchError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invitation is no longer pending' },
        { status: 400 }
      )
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // Verify the user is the invitee
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    console.log('🔍 === ACCEPT INVITATION DEBUG ===')
    console.log('🔍 User ID:', user.id)
    console.log('🔍 User profile email:', userProfile?.email)
    console.log('🔍 Invitation invitee_email:', invitation.invitee_email)
    console.log('🔍 Emails match:', userProfile?.email === invitation.invitee_email)

    if (userProfile?.email !== invitation.invitee_email) {
      console.log('❌ Email mismatch - user cannot accept this invitation')
      return NextResponse.json(
        { error: 'You can only respond to invitations sent to your email' },
        { status: 403 }
      )
    }
    
    console.log('✅ Email verification passed')

    // Update invitation status
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'accepted') {
      updateData.accepted_at = new Date().toISOString()
    } else if (status === 'rejected') {
      updateData.rejected_at = new Date().toISOString()
    }

    const { data: updatedInvitation, error: updateError } = await supabase
      .from('project_invitations')
      .update(updateData)
      .eq('id', invitationId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating invitation:', updateError)
      return NextResponse.json(
        { error: 'Failed to update invitation' },
        { status: 500 }
      )
    }

    // If accepted, add user to project members
    if (status === 'accepted') {
      const { error: memberError } = await supabase
        .from('project_members')
        .insert({
          project_id: invitation.project_id,
          user_id: user.id,
          role: invitation.role,
          joined_at: new Date().toISOString()
        })

      if (memberError) {
        console.error('Error adding user to project members:', memberError)
        // Don't fail the request, but log the error
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedInvitation,
      message: status === 'accepted' ? 'Invitation accepted successfully' : 'Invitation rejected'
    } as InvitationResponse)

  } catch (error) {
    console.error('Error in update invitation API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invitationId } = await params
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

    // Get the invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('project_invitations')
      .select('*')
      .eq('id', invitationId)
      .single()

    if (fetchError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if user is owner/manager of the project
    const { data: membership, error: membershipError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', invitation.project_id)
      .eq('user_id', user.id)
      .in('role', ['owner', 'manager'])
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this invitation' },
        { status: 403 }
      )
    }

    // Delete the invitation
    const { error: deleteError } = await supabase
      .from('project_invitations')
      .delete()
      .eq('id', invitationId)

    if (deleteError) {
      console.error('Error deleting invitation:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete invitation' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation deleted successfully'
    })

  } catch (error) {
    console.error('Error in delete invitation API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
