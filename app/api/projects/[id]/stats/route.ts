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

    // Get inventory items for this project
    const { data: items, error } = await supabase
      .from('inventory_items')
      .select('estimated_price, sale_price')
      .eq('project_id', projectId)

    if (error) {
      console.error('Error fetching inventory stats:', error)
      return NextResponse.json(
        { error: 'Failed to fetch inventory statistics' },
        { status: 500 }
      )
    }

    const totalItems = items?.length || 0
    const totalValue = items?.reduce((sum, item) => {
      const price = item.estimated_price || item.sale_price || 0
      return sum + Number(price)
    }, 0) || 0

    return NextResponse.json({
      totalItems,
      totalValue,
      success: true
    })

  } catch (error) {
    console.error('Error in stats API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
