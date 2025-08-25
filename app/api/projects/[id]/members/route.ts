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
        joined_at,
        user:profiles!project_members_user_id_fkey (
          id,
          full_name,
          email
        )
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

    return NextResponse.json({
      success: true,
      data: members
    })

  } catch (error) {
    console.error('Error in project members API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
