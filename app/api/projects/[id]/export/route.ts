import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/api-client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'

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

    if (format === 'csv') {
      // Export inventory items as CSV
      const { data: items, error: itemsError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (itemsError) {
        console.error('Error fetching inventory items:', itemsError)
        return NextResponse.json(
          { error: 'Failed to fetch inventory items' },
          { status: 500 }
        )
      }

      // Convert to CSV
      if (!items || items.length === 0) {
        const csv = 'No inventory items found'
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="inventory-${projectId}.csv"`
          }
        })
      }

      const headers = Object.keys(items[0]).join(',')
      const csvRows = items.map(item => 
        Object.values(item).map(value => {
          // Handle arrays (like photos) and null values
          if (Array.isArray(value)) {
            return `"${value.join('; ')}"`
          }
          if (value === null || value === undefined) {
            return ''
          }
          // Escape quotes and wrap in quotes if contains comma
          const stringValue = String(value)
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }
          return stringValue
        }).join(',')
      )

      const csv = [headers, ...csvRows].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="inventory-${projectId}.csv"`
        }
      })
    }

    // Export complete project data as JSON
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError) {
      console.error('Error fetching project:', projectError)
      return NextResponse.json(
        { error: 'Failed to fetch project' },
        { status: 500 }
      )
    }

    // Get all related data
    const [
      { data: members },
      { data: items },
      { data: areas },
      { data: inventoryTypes },
      { data: houseZones },
      { data: invitations }
    ] = await Promise.all([
      supabase
        .from('project_members')
        .select(`
          *,
          profiles(id, full_name, email)
        `)
        .eq('project_id', projectId),
      supabase
        .from('inventory_items')
        .select('*')
        .eq('project_id', projectId),
      supabase
        .from('project_areas')
        .select('*')
        .eq('project_id', projectId),
      supabase
        .from('project_inventory_types')
        .select('*')
        .eq('project_id', projectId),
      supabase
        .from('project_house_zones')
        .select('*')
        .eq('project_id', projectId),
      supabase
        .from('project_invitations')
        .select('*')
        .eq('project_id', projectId)
    ])

    const exportData = {
      project,
      members: members || [],
      inventory_items: items || [],
      project_areas: areas || [],
      inventory_types: inventoryTypes || [],
      house_zones: houseZones || [],
      invitations: invitations || [],
      exported_at: new Date().toISOString(),
      exported_by: user.id
    }

    return NextResponse.json({
      success: true,
      data: exportData
    })

  } catch (error) {
    console.error('Error in project export API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
