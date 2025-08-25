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

    // Check if user is member of the project
    const { data: membership } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get project house zones
    const { data: houseZones, error } = await supabase
      .from('project_house_zones')
      .select('*')
      .eq('project_id', projectId)
      .order('name')

    if (error) {
      console.error('Error fetching house zones:', error)
      return NextResponse.json(
        { error: 'Failed to fetch house zones' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: houseZones || []
    })

  } catch (error) {
    console.error('Error in house zones API:', error)
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

    // Check if user is owner or manager
    const { data: membership } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .in('role', ['owner', 'manager'])
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Create new house zone
    const { data: houseZone, error } = await supabase
      .from('project_house_zones')
      .insert({
        project_id: projectId,
        name,
        description,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating house zone:', error)
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'Ya existe un área con ese nombre' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to create house zone' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: houseZone,
      message: 'Área creada exitosamente'
    })

  } catch (error) {
    console.error('Error in create house zone API:', error)
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

    // Check if user is owner or manager
    const { data: membership } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .in('role', ['owner', 'manager'])
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, name, description } = body

    if (!id || !name) {
      return NextResponse.json(
        { error: 'ID and name are required' },
        { status: 400 }
      )
    }

    // Update house zone
    const { data: houseZone, error } = await supabase
      .from('project_house_zones')
      .update({ name, description })
      .eq('id', id)
      .eq('project_id', projectId)
      .select()
      .single()

    if (error) {
      console.error('Error updating house zone:', error)
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'Ya existe un área con ese nombre' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to update house zone' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: houseZone,
      message: 'Área actualizada exitosamente'
    })

  } catch (error) {
    console.error('Error in update house zone API:', error)
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
    const { searchParams } = new URL(request.url)
    const zoneId = searchParams.get('zoneId')

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!zoneId) {
      return NextResponse.json(
        { error: 'Zone ID is required' },
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

    // Check if user is owner or manager
    const { data: membership } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .in('role', ['owner', 'manager'])
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Delete house zone
    const { error } = await supabase
      .from('project_house_zones')
      .delete()
      .eq('id', zoneId)
      .eq('project_id', projectId)

    if (error) {
      console.error('Error deleting house zone:', error)
      return NextResponse.json(
        { error: 'Failed to delete house zone' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Área eliminada exitosamente'
    })

  } catch (error) {
    console.error('Error in delete house zone API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
