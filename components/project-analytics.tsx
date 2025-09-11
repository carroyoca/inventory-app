"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { 
  BarChart3, 
  TrendingUp, 
  Package, 
  DollarSign, 
  Calendar, 
  MapPin,
  Loader2,
  Users,
  Clock
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useProject } from "@/contexts/ProjectContext"

interface AnalyticsData {
  overview: {
    totalItems: number
    totalEstimatedValue: number
    totalSaleValue: number
    projectName: string
    projectAge: number
    itemsThisMonth: number
  }
  distributions: {
    byType: Record<string, number>
    byZone: Record<string, number>
    byStatus: Record<string, number>
  }
  recentItems: Array<{
    id: string
    product_name: string
    product_type: string
    estimated_price: number | null
    created_at: string
  }>
  trends: {
    averageItemsPerWeek: number
    mostCommonType: string
    mostCommonZone: string
  }
}

export function ProjectAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const { activeProject } = useProject()

  useEffect(() => {
    if (activeProject) {
      loadAnalytics()
    }
  }, [activeProject])

  const loadAnalytics = async () => {
    if (!activeProject) return

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) return

      const response = await fetch(`/api/projects/${activeProject.id}/analytics`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.data)
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Error al cargar las analíticas",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
      toast({
        title: "Error",
        description: "Error de conexión al cargar las analíticas",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available': return 'bg-green-100 text-green-800'
      case 'published': return 'bg-indigo-100 text-indigo-800'
      case 'sold': return 'bg-blue-100 text-blue-800'
      case 'reserved': return 'bg-yellow-100 text-yellow-800'
      case 'not_for_sale': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available': return 'Disponible'
      case 'published': return 'Publicado'
      case 'sold': return 'Vendido'
      case 'reserved': return 'Reservado'
      case 'not_for_sale': return 'No en venta'
      default: return status
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Cargando analíticas...</span>
        </CardContent>
      </Card>
    )
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-gray-500">No se pudieron cargar las analíticas</p>
        </CardContent>
      </Card>
    )
  }

  const { overview, distributions, recentItems, trends } = analytics

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Items</p>
                <div className="text-2xl font-bold text-gray-900">
                  {overview.totalItems}
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Valor Estimado</p>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(overview.totalEstimatedValue)}
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Edad del Proyecto</p>
                <div className="text-2xl font-bold text-gray-900">
                  {overview.projectAge} días
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Este Mes</p>
                <div className="text-2xl font-bold text-gray-900">
                  {overview.itemsThisMonth}
                </div>
              </div>
              <div className="p-3 bg-orange-100 rounded-xl">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* By Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5" />
              Por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(distributions.byType).map(([type, count]) => {
              const percentage = overview.totalItems > 0 ? (count / overview.totalItems) * 100 : 0
              return (
                <div key={type} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{type}</span>
                    <span className="text-sm text-gray-500">{count}</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              )
            })}
            {Object.keys(distributions.byType).length === 0 && (
              <p className="text-sm text-gray-500">No hay datos disponibles</p>
            )}
          </CardContent>
        </Card>

        {/* By Zone */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5" />
              Por Área
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(distributions.byZone).map(([zone, count]) => {
              const percentage = overview.totalItems > 0 ? (count / overview.totalItems) * 100 : 0
              return (
                <div key={zone} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{zone}</span>
                    <span className="text-sm text-gray-500">{count}</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              )
            })}
            {Object.keys(distributions.byZone).length === 0 && (
              <p className="text-sm text-gray-500">No hay datos disponibles</p>
            )}
          </CardContent>
        </Card>

        {/* By Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              Por Estado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(distributions.byStatus).map(([status, count]) => {
              const percentage = overview.totalItems > 0 ? (count / overview.totalItems) * 100 : 0
              return (
                <div key={status} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Badge className={getStatusColor(status)} variant="secondary">
                      {getStatusLabel(status)}
                    </Badge>
                    <span className="text-sm text-gray-500">{count}</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              )
            })}
            {Object.keys(distributions.byStatus).length === 0 && (
              <p className="text-sm text-gray-500">No hay datos disponibles</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trends and Recent Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tendencias
            </CardTitle>
            <CardDescription>
              Métricas clave del proyecto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Items por semana</p>
                  <p className="text-sm text-gray-500">Promedio de actividad</p>
                </div>
              </div>
              <span className="text-lg font-bold">{trends.averageItemsPerWeek}</span>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Package className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Tipo más común</p>
                  <p className="text-sm text-gray-500">Categoría principal</p>
                </div>
              </div>
              <Badge variant="outline">{trends.mostCommonType}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MapPin className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Área más usada</p>
                  <p className="text-sm text-gray-500">Ubicación principal</p>
                </div>
              </div>
              <Badge variant="outline">{trends.mostCommonZone}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Recent Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Items Recientes
            </CardTitle>
            <CardDescription>
              Últimos items agregados al inventario
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentItems.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No hay items recientes
              </p>
            ) : (
              <div className="space-y-3">
                {recentItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.product_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {item.product_type}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatDate(item.created_at)}
                        </span>
                      </div>
                    </div>
                    {item.estimated_price && (
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatCurrency(item.estimated_price)}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
