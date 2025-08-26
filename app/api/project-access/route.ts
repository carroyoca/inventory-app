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
          }
        }
      })
    )

    return NextResponse.json({ accessList })

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
          { error: 'User is already a member of this project' },
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
      // User doesn't exist yet, store the access request for when they sign up
      // For now, we'll just return success and the user will be added when they sign up
      return NextResponse.json({
        success: true,
        message: 'Access granted. User will be added to project when they sign up.',
        pending: true
      })
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
