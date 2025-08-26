import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/api-client'
import { sendAccessNotificationEmail } from '@/lib/services/email'

interface GrantAccessData {
  project_id: string
  user_email: string
  role: 'owner' | 'manager' | 'member' | 'viewer'
}

interface SendNotificationData {
  project_id: string
  user_email: string
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this project and is owner/manager
    const { data: userMembership, error: membershipError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !userMembership) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Only owners and managers can view/manage project access
    if (!['owner', 'manager'].includes(userMembership.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only owners and managers can manage project access.' },
        { status: 403 }
      )
    }

    // Get project members list
    const { data: membersList, error: membersError } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', projectId)
      .order('joined_at', { ascending: false })

    if (membersError) {
      console.error('Error fetching project members:', membersError)
      return NextResponse.json(
        { error: 'Failed to fetch project members' },
        { status: 500 }
      )
    }

    // Get pending access list
    const { data: pendingList, error: pendingError } = await supabase
      .from('pending_project_access')
      .select('*')
      .eq('project_id', projectId)
      .gt('expires_at', new Date().toISOString()) // Only get non-expired pending access
      .order('granted_at', { ascending: false })

    if (pendingError) {
      console.error('Error fetching pending access:', pendingError)
      // Don't fail the whole request if pending access fails
    }

    // Get user details for each member
    const accessList = await Promise.all(
      (membersList || []).map(async (member) => {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', member.user_id)
          .single()

        return {
          id: member.id,
          user_email: userProfile?.email || 'Unknown',
          role: member.role,
          granted_at: member.joined_at,
          granted_by: {
            full_name: userProfile?.full_name || 'Unknown',
            email: userProfile?.email || 'Unknown'
          },
          status: 'active'
        }
      })
    )

    // Add pending access to the list
    const pendingAccessList = await Promise.all(
      (pendingList || []).map(async (pending) => {
        const { data: granterProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', pending.granted_by)
          .single()

        return {
          id: `pending_${pending.id}`,
          user_email: pending.user_email,
          role: pending.role,
          granted_at: pending.granted_at,
          granted_by: {
            full_name: granterProfile?.full_name || 'Unknown',
            email: granterProfile?.email || 'Unknown'
          },
          status: 'pending',
          expires_at: pending.expires_at
        }
      })
    )

    // Combine active and pending access
    const combinedAccessList = [...accessList, ...pendingAccessList]

    return NextResponse.json({ 
      accessList: combinedAccessList,
      summary: {
        active: accessList.length,
        pending: pendingAccessList.length,
        total: combinedAccessList.length
      }
    })

  } catch (error) {
    console.error('Project access GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
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

    const body: GrantAccessData = await request.json()
    const { project_id, user_email, role } = body

    // Validate required fields
    if (!project_id || !user_email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(user_email)) {
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
        { error: 'You do not have permission to grant access to this project' },
        { status: 403 }
      )
    }

    // Check if user is trying to grant access to themselves
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    if (userProfile?.email === user_email) {
      return NextResponse.json(
        { error: 'You cannot grant access to yourself' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', user_email)
      .single()

    if (existingUser) {
      // Check if user is already a member
      const { data: existingMember, error: memberCheckError } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', project_id)
        .eq('user_id', existingUser.id)
        .single()

      if (existingMember) {
        return NextResponse.json(
          { 
            error: 'User is already a member of this project',
            message: 'This user already has access to the project. You can send them a notification email instead.',
            alreadyMember: true
          },
          { status: 409 }
        )
      }

      // Add user to project_members
      const { data: member, error: memberError } = await supabase
        .from('project_members')
        .insert({
          project_id,
          user_id: existingUser.id,
          role
        })
        .select()
        .single()

      if (memberError) {
        console.error('Error adding user to project:', memberError)
        return NextResponse.json(
          { error: 'Failed to add user to project' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'User added to project successfully',
        member
      })
    } else {
      // User doesn't exist yet - create a pending access record
      try {
        const { data: pendingAccess, error: pendingError } = await supabase
          .from('pending_project_access')
          .insert({
            project_id,
            user_email,
            role,
            granted_by: user.id
          })
          .select()
          .single()

        if (pendingError) {
          // Check if it's a unique constraint violation (user already has pending access)
          if (pendingError.code === '23505') {
            // Update the existing pending access record
            const { data: updatedAccess, error: updateError } = await supabase
              .from('pending_project_access')
              .update({
                role,
                granted_by: user.id,
                granted_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
              })
              .eq('project_id', project_id)
              .eq('user_email', user_email)
              .select()
              .single()

            if (updateError) {
              console.error('Error updating pending access:', updateError)
              return NextResponse.json(
                { error: 'Failed to update pending access' },
                { status: 500 }
              )
            }

            return NextResponse.json({
              success: true,
              message: `Access updated for ${user_email}. They will automatically join the project when they sign up.`,
              pending: true,
              email: user_email,
              pendingAccess: updatedAccess
            })
          } else {
            console.error('Error creating pending access:', pendingError)
            return NextResponse.json(
              { error: 'Failed to create pending access' },
              { status: 500 }
            )
          }
        }

        return NextResponse.json({
          success: true,
          message: `Access granted for ${user_email}. They will automatically join the project when they sign up.`,
          pending: true,
          email: user_email,
          pendingAccess
        })
      } catch (error) {
        console.error('Error handling pending access:', error)
        return NextResponse.json(
          { error: 'Failed to process pending access' },
          { status: 500 }
        )
      }
    }

    // This code should never be reached, but just in case
    return NextResponse.json({
      success: true,
      message: 'Access granted successfully'
    })

  } catch (error) {
    console.error('Project access POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const accessId = searchParams.get('access_id')

    if (!accessId) {
      return NextResponse.json(
        { error: 'Access ID is required' },
        { status: 400 }
      )
    }

    // Check if this is a pending access removal
    if (accessId.startsWith('pending_')) {
      const pendingId = accessId.replace('pending_', '')
      
      // Get pending access details
      const { data: pendingAccess, error: pendingError } = await supabase
        .from('pending_project_access')
        .select('*')
        .eq('id', pendingId)
        .single()

      if (pendingError || !pendingAccess) {
        return NextResponse.json(
          { error: 'Pending access not found' },
          { status: 404 }
        )
      }

      // Check if user is owner/manager of the project
      const { data: membership, error: membershipError } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', pendingAccess.project_id)
        .eq('user_id', user.id)
        .in('role', ['owner', 'manager'])
        .single()

      if (membershipError || !membership) {
        return NextResponse.json(
          { error: 'You do not have permission to remove pending access from this project' },
          { status: 403 }
        )
      }

      // Remove pending access
      const { error: removeError } = await supabase
        .from('pending_project_access')
        .delete()
        .eq('id', pendingId)

      if (removeError) {
        console.error('Error removing pending access:', removeError)
        return NextResponse.json(
          { error: 'Failed to remove pending access' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Pending access removed successfully'
      })
    }

    // Handle regular member removal
    // Get member details
    const { data: member, error: memberError } = await supabase
      .from('project_members')
      .select('*')
      .eq('id', accessId)
      .single()

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Check if user is owner/manager of the project
    const { data: membership, error: membershipError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', member.project_id)
      .eq('user_id', user.id)
      .in('role', ['owner', 'manager'])
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'You do not have permission to remove members from this project' },
        { status: 403 }
      )
    }

    // Remove member from project
    const { error: removeError } = await supabase
      .from('project_members')
      .delete()
      .eq('id', accessId)

    if (removeError) {
      console.error('Error removing member:', removeError)
      return NextResponse.json(
        { error: 'Failed to remove member' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Access removed successfully'
    })

  } catch (error) {
    console.error('Project access DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
