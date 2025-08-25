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

    // Get analytics data
    const [
      { data: totalItems },
      { data: totalValue },
      { data: itemsByType },
      { data: itemsByZone },
      { data: itemsByStatus },
      { data: recentItems },
      { data: projectInfo }
    ] = await Promise.all([
      // Total items count
      supabase
        .from('inventory_items')
        .select('id', { count: 'exact' })
        .eq('project_id', projectId),
      
      // Total estimated and sale value
      supabase
        .from('inventory_items')
        .select('estimated_price, sale_price')
        .eq('project_id', projectId),
      
      // Items by product type
      supabase
        .from('inventory_items')
        .select('product_type')
        .eq('project_id', projectId),
      
      // Items by house zone
      supabase
        .from('inventory_items')
        .select('house_zone')
        .eq('project_id', projectId),
      
      // Items by status
      supabase
        .from('inventory_items')
        .select('status')
        .eq('project_id', projectId),
      
      // Recent items (last 10)
      supabase
        .from('inventory_items')
        .select('id, product_name, product_type, estimated_price, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10),
      
      // Project basic info
      supabase
        .from('projects')
        .select('name, created_at')
        .eq('id', projectId)
        .single()
    ])

    // Calculate total values
    let totalEstimatedValue = 0
    let totalSaleValue = 0
    
    if (totalValue && totalValue.length > 0) {
      totalValue.forEach(item => {
        if (item.estimated_price) totalEstimatedValue += item.estimated_price
        if (item.sale_price) totalSaleValue += item.sale_price
      })
    }

    // Group items by type
    const typeDistribution: Record<string, number> = {}
    if (itemsByType && itemsByType.length > 0) {
      itemsByType.forEach(item => {
        const type = item.product_type || 'Sin categoría'
        typeDistribution[type] = (typeDistribution[type] || 0) + 1
      })
    }

    // Group items by zone
    const zoneDistribution: Record<string, number> = {}
    if (itemsByZone && itemsByZone.length > 0) {
      itemsByZone.forEach(item => {
        const zone = item.house_zone || 'Sin zona'
        zoneDistribution[zone] = (zoneDistribution[zone] || 0) + 1
      })
    }

    // Group items by status
    const statusDistribution: Record<string, number> = {}
    if (itemsByStatus && itemsByStatus.length > 0) {
      itemsByStatus.forEach(item => {
        const status = item.status || 'Sin estado'
        statusDistribution[status] = (statusDistribution[status] || 0) + 1
      })
    }

    // Calculate project age in days
    const projectAge = projectInfo 
      ? Math.floor((new Date().getTime() - new Date(projectInfo.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0

    // Calculate items added this month
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)
    
    const itemsThisMonth = recentItems 
      ? recentItems.filter(item => new Date(item.created_at) >= thisMonth).length
      : 0

    const analytics = {
      overview: {
        totalItems: totalItems?.length || 0,
        totalEstimatedValue,
        totalSaleValue,
        projectName: projectInfo?.name || 'Proyecto',
        projectAge,
        itemsThisMonth
      },
      distributions: {
        byType: typeDistribution,
        byZone: zoneDistribution,
        byStatus: statusDistribution
      },
      recentItems: recentItems || [],
      trends: {
        // Calculate average items per week (if project > 7 days old)
        averageItemsPerWeek: projectAge > 7 
          ? Math.round(((totalItems?.length || 0) / projectAge) * 7 * 10) / 10
          : 0,
        // Most common type
        mostCommonType: Object.keys(typeDistribution).reduce((a, b) => 
          typeDistribution[a] > typeDistribution[b] ? a : b, 'N/A'
        ),
        // Most common zone
        mostCommonZone: Object.keys(zoneDistribution).reduce((a, b) => 
          zoneDistribution[a] > zoneDistribution[b] ? a : b, 'N/A'
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: analytics
    })

  } catch (error) {
    console.error('Error in project analytics API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
