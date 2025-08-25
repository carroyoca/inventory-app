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

    // Get project inventory types
    const { data: inventoryTypes, error } = await supabase
      .from('project_inventory_types')
      .select('*')
      .eq('project_id', projectId)
      .order('name')

    if (error) {
      console.error('Error fetching inventory types:', error)
      return NextResponse.json(
        { error: 'Failed to fetch inventory types' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: inventoryTypes || []
    })

  } catch (error) {
    console.error('Error in inventory types API:', error)
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

    // Create new inventory type
    const { data: inventoryType, error } = await supabase
      .from('project_inventory_types')
      .insert({
        project_id: projectId,
        name,
        description,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating inventory type:', error)
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'Ya existe un tipo de inventario con ese nombre' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to create inventory type' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: inventoryType,
      message: 'Tipo de inventario creado exitosamente'
    })

  } catch (error) {
    console.error('Error in create inventory type API:', error)
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

    // Update inventory type
    const { data: inventoryType, error } = await supabase
      .from('project_inventory_types')
      .update({ name, description })
      .eq('id', id)
      .eq('project_id', projectId)
      .select()
      .single()

    if (error) {
      console.error('Error updating inventory type:', error)
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'Ya existe un tipo de inventario con ese nombre' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to update inventory type' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: inventoryType,
      message: 'Tipo de inventario actualizado exitosamente'
    })

  } catch (error) {
    console.error('Error in update inventory type API:', error)
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
    const typeId = searchParams.get('typeId')

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!typeId) {
      return NextResponse.json(
        { error: 'Type ID is required' },
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

    // Delete inventory type
    const { error } = await supabase
      .from('project_inventory_types')
      .delete()
      .eq('id', typeId)
      .eq('project_id', projectId)

    if (error) {
      console.error('Error deleting inventory type:', error)
      return NextResponse.json(
        { error: 'Failed to delete inventory type' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Tipo de inventario eliminado exitosamente'
    })

  } catch (error) {
    console.error('Error in delete inventory type API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
