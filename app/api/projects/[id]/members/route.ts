import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/api-client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
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

    // Check if user is a member of this project
    const { data: membership, error: membershipError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 }
      )
    }

    // Get all project members
    const { data: members, error } = await supabase
      .from('project_members')
      .select(`
        id,
        user_id,
        role,
        joined_at
      `)
      .eq('project_id', projectId)
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('Error fetching project members:', error)
      return NextResponse.json(
        { error: 'Failed to fetch project members' },
        { status: 500 }
      )
    }

    // Get user details for each member
    const membersWithDetails = await Promise.all(
      members.map(async (member) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', member.user_id)
          .single()

        return {
          ...member,
          user: profile || { id: member.user_id, full_name: null, email: null }
        }
      })
    )

    if (error) {
      console.error('Error fetching project members:', error)
      return NextResponse.json(
        { error: 'Failed to fetch project members' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: membersWithDetails
    })

  } catch (error) {
    console.error('Error in project members API:', error)
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
    const { id: projectId } = await params
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    const { userId } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!projectId || !userId) {
      return NextResponse.json(
        { error: 'Project ID and User ID are required' },
        { status: 400 }
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

    // Check if user is owner or manager of this project
    const { data: membership } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .in('role', ['owner', 'manager'])
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not have permission to remove members from this project' },
        { status: 403 }
      )
    }

    // Prevent removing the project owner
    const { data: targetMember } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()

    if (targetMember?.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot remove the project owner' },
        { status: 400 }
      )
    }

    // Remove the member
    const { error: deleteError } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Error removing project member:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove project member' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully'
    })

  } catch (error) {
    console.error('Error in remove member API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    const { userId, role } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!projectId || !userId || !role) {
      return NextResponse.json(
        { error: 'Project ID, User ID, and role are required' },
        { status: 400 }
      )
    }

    if (!['owner', 'manager', 'member', 'readonly'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
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

    // Check if user is owner of this project (only owners can change roles)
    const { data: membership } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Only project owners can change member roles' },
        { status: 403 }
      )
    }

    // Update the member's role
    const { error: updateError } = await supabase
      .from('project_members')
      .update({ role })
      .eq('project_id', projectId)
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error updating member role:', updateError)
      return NextResponse.json(
        { error: 'Failed to update member role' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Member role updated successfully'
    })

  } catch (error) {
    console.error('Error in update member role API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
