import { createServiceRoleClient } from "@/lib/supabase/api-client"
import { type NextRequest, NextResponse } from "next/server"
import type { CreateProjectData, ProjectsResponse } from "@/lib/types/projects"

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
      return NextResponse.json({ error: "Authorization header required" }, { status: 401 })
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
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    console.log("✅ User authenticated:", user.id)

    // Get projects where user is a member
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        *,
        members!project_members(
          id,
          user_id,
          role,
          joined_at,
          user:user_id(email)
        )
      `)
      .eq('members.user_id', user.id)
      .order('created_at', { ascending: false })

    if (projectsError) {
      console.error("❌ Error fetching projects:", projectsError)
      return NextResponse.json({ 
        error: "Failed to fetch projects", 
        details: projectsError.message 
      }, { status: 500 })
    }

    // Transform data to match our types
    const transformedProjects = projects?.map(project => ({
      ...project,
      members: project.members || [],
      member_count: project.members?.length || 0
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
export async function POST(request: NextRequest) {
  try {
    console.log("=== CREATE PROJECT API START ===")
    
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Authorization header required" }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log("Token extracted, length:", token.length)

    // Parse request body
    const body: CreateProjectData = await request.json()
    console.log("Request body:", body)

    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 })
    }

    // Create service role client
    const supabase = createServiceRoleClient()
    console.log("✅ Service role client created")

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error("❌ Auth error:", authError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
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
