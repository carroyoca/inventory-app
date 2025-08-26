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

    // Get project access list
    const { data: accessList, error: accessError } = await supabase
      .from('project_access')
      .select(`
        *,
        granted_by:profiles!project_access_granted_by_fkey(full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('granted_at', { ascending: false })

    if (accessError) {
      console.error('Error fetching project access:', accessError)
      return NextResponse.json(
        { error: 'Failed to fetch project access' },
        { status: 500 }
      )
    }

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

    // Check if access already exists
    const { data: existingAccess, error: existingError } = await supabase
      .from('project_access')
      .select('id')
      .eq('project_id', project_id)
      .eq('user_email', user_email)
      .eq('is_active', true)
      .single()

    if (existingAccess) {
      return NextResponse.json(
        { error: 'User already has access to this project' },
        { status: 409 }
      )
    }

    // Grant access
    const { data: access, error: accessError } = await supabase
      .from('project_access')
      .insert({
        project_id,
        user_email,
        role,
        granted_by: user.id
      })
      .select()
      .single()

    if (accessError) {
      console.error('Error granting access:', accessError)
      return NextResponse.json(
        { error: 'Failed to grant access' },
        { status: 500 }
      )
    }

    // If user already has a profile, add them to project_members immediately
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', user_email)
      .single()

    if (existingUser) {
      const { error: memberError } = await supabase
        .from('project_members')
        .insert({
          project_id,
          user_id: existingUser.id,
          role
        })

      if (memberError) {
        console.error('Error adding existing user to project:', memberError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Access granted successfully',
      access
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

    // Get access details
    const { data: access, error: accessError } = await supabase
      .from('project_access')
      .select('*')
      .eq('id', accessId)
      .single()

    if (accessError || !access) {
      return NextResponse.json(
        { error: 'Access not found' },
        { status: 404 }
      )
    }

    // Check if user is owner/manager of the project
    const { data: membership, error: membershipError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', access.project_id)
      .eq('user_id', user.id)
      .in('role', ['owner', 'manager'])
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'You do not have permission to remove access from this project' },
        { status: 403 }
      )
    }

    // Remove access (soft delete)
    const { error: removeError } = await supabase
      .from('project_access')
      .update({ is_active: false })
      .eq('id', accessId)

    if (removeError) {
      console.error('Error removing access:', removeError)
      return NextResponse.json(
        { error: 'Failed to remove access' },
        { status: 500 }
      )
    }

    // Remove from project_members if user exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', access.user_email)
      .single()

    if (existingUser) {
      const { error: memberError } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', access.project_id)
        .eq('user_id', existingUser.id)

      if (memberError) {
        console.error('Error removing user from project:', memberError)
      }
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
