import { createServiceRoleClient } from "@/lib/supabase/api-client"
import { type NextRequest, NextResponse } from "next/server"
import type { CreateProjectData, ProjectsResponse, ProjectWithMembers } from "@/lib/types/projects"

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// GET /api/projects - Listar proyectos del usuario
export async function GET(request: NextRequest) {
  try {
    console.log("=== GET PROJECTS API START ===")
    
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Se requiere autenticación" }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log("Token extracted, length:", token.length)

    // Create service role client
    const supabase = createServiceRoleClient()
    console.log("✅ Service role client created")

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error("❌ Auth error:", authError)
      return NextResponse.json({ error: "Falló la autenticación" }, { status: 401 })
    }

    console.log("✅ User authenticated:", user.id)

    // Get projects where user is a member - Simplified query
    const { data: projects, error: projectsError } = await supabase
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
      .order('joined_at', { ascending: false })

    if (projectsError) {
      console.error("❌ Error fetching projects:", projectsError)
      return NextResponse.json({ 
        error: "Failed to fetch projects", 
        details: projectsError.message 
      }, { status: 500 })
    }

    // Transform data to match our types
    const transformedProjects: ProjectWithMembers[] = projects?.map((member: any) => ({
      id: member.projects.id,
      name: member.projects.name,
      description: member.projects.description,
      created_by: member.projects.created_by,
      created_at: member.projects.created_at,
      updated_at: member.projects.updated_at,
      members: [{
        id: member.project_id,
        project_id: member.project_id,
        user_id: user.id,
        role: member.role,
        joined_at: member.joined_at
      }],
      member_count: 1
    })) || []

    console.log(`✅ Found ${transformedProjects.length} projects for user`)
    console.log("=== GET PROJECTS API SUCCESS ===")

    const response: ProjectsResponse = {
      projects: transformedProjects,
      total: transformedProjects.length
    }

    const nextResponse = NextResponse.json(response)
    nextResponse.headers.set('Access-Control-Allow-Origin', '*')
    nextResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    nextResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return nextResponse

  } catch (error) {
    console.error("=== GET PROJECTS API ERROR ===")
    console.error("Error:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// POST /api/projects - Crear nuevo proyecto
export async function DELETE(request: NextRequest) {
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

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
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

    // Check if user is owner of the project
    const { data: membership } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Only project owners can delete projects' },
        { status: 403 }
      )
    }

    // Delete project (cascade will handle related data)
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (deleteError) {
      console.error('Error deleting project:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Proyecto eliminado exitosamente'
    })

  } catch (error) {
    console.error('Error in delete project API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== CREATE PROJECT API START ===")
    
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Se requiere autenticación" }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log("Token extracted, length:", token.length)

    // Parse request body
    const body: CreateProjectData = await request.json()
    console.log("Request body:", body)

    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: "Se requiere el nombre del proyecto" }, { status: 400 })
    }

    // Create service role client
    const supabase = createServiceRoleClient()
    console.log("✅ Service role client created")

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error("❌ Auth error:", authError)
      return NextResponse.json({ error: "Falló la autenticación" }, { status: 401 })
    }

    console.log("✅ User authenticated:", user.id)

    // Create project
    const { data: project, error: createError } = await supabase
      .from('projects')
      .insert({
        name: body.name.trim(),
        description: body.description?.trim() || null,
        created_by: user.id
      })
      .select()
      .single()

    if (createError) {
      console.error("❌ Error creating project:", createError)
      return NextResponse.json({ 
        error: "Failed to create project", 
        details: createError.message 
      }, { status: 500 })
    }

    // Add user as owner member
    const { error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: user.id,
        role: 'owner'
      })

    if (memberError) {
      console.error("❌ Error adding user as member:", memberError)
      // Try to delete the project if adding member fails
      await supabase.from('projects').delete().eq('id', project.id)
      return NextResponse.json({ 
        error: "Failed to create project", 
        details: "Error adding user as member" 
      }, { status: 500 })
    }

    console.log("✅ Project created successfully:", project.id)
    console.log("✅ User added as owner member")
    console.log("=== CREATE PROJECT API SUCCESS ===")

    const response = {
      project,
      message: "Project created successfully"
    }

    const nextResponse = NextResponse.json(response)
    nextResponse.headers.set('Access-Control-Allow-Origin', '*')
    nextResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    nextResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return nextResponse

  } catch (error) {
    console.error("=== CREATE PROJECT API ERROR ===")
    console.error("Error:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
