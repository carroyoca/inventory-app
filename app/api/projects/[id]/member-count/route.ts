import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const projectId = resolvedParams.id
    
    // Get the authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Create Supabase client with service role for server-side queries
    const supabase = createClient(
      process.env.NEXT_PUBLIC_INVAPPSUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Extract and verify the user token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to this project
    const { data: membership } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    // Count active members
    const { count: activeMemberCount, error: activeMemberError } = await supabase
      .from('project_members')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)

    if (activeMemberError) {
      console.error('Error counting active members:', activeMemberError)
      return NextResponse.json({ error: 'Failed to count active members' }, { status: 500 })
    }

    // Count pending access (only if user is owner/manager)
    let pendingAccessCount = 0
    if (['owner', 'manager'].includes(membership.role)) {
      const { count, error: pendingError } = await supabase
        .from('pending_project_access')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)

      if (pendingError) {
        console.warn('Could not count pending access:', pendingError)
      } else {
        pendingAccessCount = count || 0
      }
    }

    const totalMemberCount = (activeMemberCount || 0) + pendingAccessCount

    return NextResponse.json({
      projectId,
      activeMemberCount: activeMemberCount || 0,
      pendingAccessCount,
      totalMemberCount,
      userRole: membership.role
    })

  } catch (error) {
    console.error('Error in member-count API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}