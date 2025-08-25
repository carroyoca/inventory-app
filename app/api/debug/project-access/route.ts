import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/api-client'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

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
        { error: 'Invalid authentication', details: authError },
        { status: 401 }
      )
    }

    console.log('🔍 DEBUG: User ID:', user.id)
    console.log('🔍 DEBUG: Project ID:', projectId)

    // Test 1: Check if user has any projects at all
    const { data: allProjects, error: allError } = await supabase
      .from('project_members')
      .select('project_id, role, joined_at')
      .eq('user_id', user.id)

    console.log('🔍 DEBUG: All projects query:', { count: allProjects?.length || 0, error: allError })

    // Test 2: Check specific project access (if projectId provided)
    let specificProject = null
    let specificError = null
    if (projectId) {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          project_id,
          role,
          joined_at,
          projects (
            id,
            name,
            description,
            created_by,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .single()

      specificProject = data
      specificError = error
      console.log('🔍 DEBUG: Specific project query:', { found: !!data, error })
    }

    // Test 3: Check RLS policies status
    const { data: rlsCheck, error: rlsError } = await supabase
      .rpc('check_table_rls', { table_name: 'project_members' })
      .single()

    console.log('🔍 DEBUG: RLS status:', { rlsCheck, rlsError })

    return NextResponse.json({
      success: true,
      debug: {
        userId: user.id,
        requestedProjectId: projectId,
        allProjects: {
          count: allProjects?.length || 0,
          projects: allProjects || [],
          error: allError
        },
        specificProject: {
          found: !!specificProject,
          data: specificProject,
          error: specificError
        },
        rls: {
          status: rlsCheck,
          error: rlsError
        }
      }
    })

  } catch (error) {
    console.error('🔍 DEBUG: Error in debug API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}