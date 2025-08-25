import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/api-client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

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
