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

    // Check if user is member of this project
    const { data: membership } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 }
      )
    }

    // Get all project areas
    const { data: areas, error } = await supabase
      .from('project_areas')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching project areas:', error)
      return NextResponse.json(
        { error: 'Failed to fetch project areas' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: areas || []
    })

  } catch (error) {
    console.error('Error in areas API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    const { name, description } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!projectId || !name) {
      return NextResponse.json(
        { error: 'Project ID and area name are required' },
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

    // Check if user has permission to create areas (owner, manager, member)
    const { data: membership } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .in('role', ['owner', 'manager', 'member'])
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not have permission to create areas in this project' },
        { status: 403 }
      )
    }

    // Check if area name already exists in this project
    const { data: existingArea } = await supabase
      .from('project_areas')
      .select('id')
      .eq('project_id', projectId)
      .eq('name', name.trim())
      .single()

    if (existingArea) {
      return NextResponse.json(
        { error: 'An area with this name already exists in this project' },
        { status: 409 }
      )
    }

    // Create the area
    const { data: area, error: createError } = await supabase
      .from('project_areas')
      .insert({
        project_id: projectId,
        name: name.trim(),
        description: description?.trim() || null,
        created_by: user.id
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating project area:', createError)
      return NextResponse.json(
        { error: 'Failed to create project area' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: area,
      message: 'Area created successfully'
    })

  } catch (error) {
    console.error('Error in create area API:', error)
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
    const { areaId } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!projectId || !areaId) {
      return NextResponse.json(
        { error: 'Project ID and Area ID are required' },
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

    // Check if user has permission to delete areas (owner, manager, member)
    const { data: membership } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .in('role', ['owner', 'manager', 'member'])
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not have permission to delete areas in this project' },
        { status: 403 }
      )
    }

    // Verify the area belongs to this project
    const { data: area } = await supabase
      .from('project_areas')
      .select('id')
      .eq('id', areaId)
      .eq('project_id', projectId)
      .single()

    if (!area) {
      return NextResponse.json(
        { error: 'Area not found or does not belong to this project' },
        { status: 404 }
      )
    }

    // Delete the area
    const { error: deleteError } = await supabase
      .from('project_areas')
      .delete()
      .eq('id', areaId)
      .eq('project_id', projectId)

    if (deleteError) {
      console.error('Error deleting project area:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete project area' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Area deleted successfully'
    })

  } catch (error) {
    console.error('Error in delete area API:', error)
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
    const { areaId, name, description } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!projectId || !areaId || !name) {
      return NextResponse.json(
        { error: 'Project ID, Area ID, and name are required' },
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

    // Check if user has permission to edit areas (owner, manager, member)
    const { data: membership } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .in('role', ['owner', 'manager', 'member'])
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not have permission to edit areas in this project' },
        { status: 403 }
      )
    }

    // Verify the area belongs to this project
    const { data: existingArea } = await supabase
      .from('project_areas')
      .select('id')
      .eq('id', areaId)
      .eq('project_id', projectId)
      .single()

    if (!existingArea) {
      return NextResponse.json(
        { error: 'Area not found or does not belong to this project' },
        { status: 404 }
      )
    }

    // Check if new name conflicts with existing areas (excluding current area)
    const { data: nameConflict } = await supabase
      .from('project_areas')
      .select('id')
      .eq('project_id', projectId)
      .eq('name', name.trim())
      .neq('id', areaId)
      .single()

    if (nameConflict) {
      return NextResponse.json(
        { error: 'An area with this name already exists in this project' },
        { status: 409 }
      )
    }

    // Update the area
    const { data: area, error: updateError } = await supabase
      .from('project_areas')
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', areaId)
      .eq('project_id', projectId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating project area:', updateError)
      return NextResponse.json(
        { error: 'Failed to update project area' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: area,
      message: 'Area updated successfully'
    })

  } catch (error) {
    console.error('Error in update area API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}