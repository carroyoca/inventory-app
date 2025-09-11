"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, Calendar, DollarSign } from 'lucide-react'

interface InventoryItem {
  id: string
  product_name: string
  product_type: string
  house_zone: string
  estimated_price?: number
  sale_price?: number
  status: string
  created_at: string
  photos: string[]
}

interface RecentItemsProps {
  projectId: string
}

export function RecentItems({ projectId }: RecentItemsProps) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadRecentItems = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(5)

        if (error) {
          console.error('Error loading recent items:', error)
          return
        }

        setItems(data || [])
      } catch (error) {
        console.error('Error loading recent items:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (projectId) {
      loadRecentItems()
    }
  }, [projectId])

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">No hay items en el inventario</p>
        <p className="text-sm text-gray-400">
          Añade tu primer item para comenzar
        </p>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800'
      case 'published':
        return 'bg-indigo-100 text-indigo-800'
      case 'sold':
        return 'bg-red-100 text-red-800'
      case 'reserved':
        return 'bg-yellow-100 text-yellow-800'
      case 'not_for_sale':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return 'Disponible'
      case 'published':
        return 'Publicado'
      case 'sold':
        return 'Vendido'
      case 'reserved':
        return 'Reservado'
      case 'not_for_sale':
        return 'No en venta'
      default:
        return status
    }
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.product_name}</h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>{item.product_type}</span>
                      <span>•</span>
                      <span>{item.house_zone}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <DollarSign className="w-3 h-3" />
                    <span>
                      {item.estimated_price || item.sale_price || 0}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-gray-400">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                </div>
                
                <Badge className={getStatusColor(item.status)}>
                  {getStatusText(item.status)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {items.length >= 5 && (
        <div className="text-center pt-4">
          <Button variant="outline" size="sm">
            Ver todos los items
          </Button>
        </div>
      )}
    </div>
  )
}
