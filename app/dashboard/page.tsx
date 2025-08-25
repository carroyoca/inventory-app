"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProject } from '@/contexts/ProjectContext'
import { ProjectHeader } from '@/components/project-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Package, 
  Plus, 
  BarChart3, 
  Users, 
  Settings,
  ArrowRight,
  FolderOpen
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { RecentItems } from '@/components/recent-items'

export default function DashboardPage() {
  const { activeProject, isLoading } = useProject()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalItems: 0,
    totalValue: 0,
    isLoading: true
  })

  // Cargar estadísticas del inventario
  const loadInventoryStats = async () => {
    if (!activeProject) return
    
    try {
      const supabase = createClient()
      const { data: items, error } = await supabase
        .from('inventory_items')
        .select('estimated_price, sale_price')
        .eq('project_id', activeProject.id)

      if (error) {
        console.error('Error loading inventory stats:', error)
        return
      }

      const totalItems = items?.length || 0
      const totalValue = items?.reduce((sum, item) => {
        const price = item.estimated_price || item.sale_price || 0
        return sum + Number(price)
      }, 0) || 0

      setStats({
        totalItems,
        totalValue,
        isLoading: false
      })
    } catch (error) {
      console.error('Error loading stats:', error)
      setStats(prev => ({ ...prev, isLoading: false }))
    }
  }

  // Si no hay proyecto activo, redirigir a selección de proyecto
  useEffect(() => {
    if (!isLoading && !activeProject) {
      router.push('/select-project')
    }
  }, [activeProject, isLoading, router])

  // Cargar estadísticas cuando el proyecto cambie
  useEffect(() => {
    if (activeProject) {
      loadInventoryStats()
    }
  }, [activeProject])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando proyecto...</p>
        </div>
      </div>
    )
  }

  if (!activeProject) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ProjectHeader />
      
      <main className="p-6">
        {/* Header del Proyecto */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {activeProject.name}
          </h1>
          {activeProject.description && (
            <p className="text-gray-600 text-lg">{activeProject.description}</p>
          )}
          <div className="flex items-center space-x-4 mt-4 text-sm text-gray-500">
            <span>Miembros: {activeProject.member_count}</span>
            <span>•</span>
            <span>Tu rol: {activeProject.members?.[0]?.role || 'Usuario'}</span>
          </div>
        </div>

        {/* Estadísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.isLoading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                ) : (
                  stats.totalItems
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Items en este proyecto
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.isLoading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                ) : (
                  `$${stats.totalValue.toLocaleString()}`
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Valor estimado del inventario
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Miembros</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeProject.member_count}</div>
              <p className="text-xs text-muted-foreground">
                Personas en el proyecto
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Acciones Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <span>Agregar Item</span>
              </CardTitle>
              <CardDescription>
                Añade un nuevo objeto o producto al inventario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => router.push('/inventory/add')}
                className="w-full"
                size="lg"
              >
                Agregar Item
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FolderOpen className="w-5 h-5 text-green-600" />
                <span>Ver Inventario</span>
              </CardTitle>
              <CardDescription>
                Explora y gestiona todos los items del proyecto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline"
                onClick={() => router.push('/inventory')}
                className="w-full"
                size="lg"
              >
                Ver Inventario
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Items Recientes */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-blue-600" />
              <span>Items Recientes</span>
            </CardTitle>
            <CardDescription>
              Los últimos items añadidos al inventario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentItems projectId={activeProject.id} />
          </CardContent>
        </Card>

        {/* Configuración del Proyecto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-gray-600" />
              <span>Configuración del Proyecto</span>
            </CardTitle>
            <CardDescription>
              Gestiona la configuración y miembros del proyecto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline"
              onClick={() => router.push('/projects')}
              className="w-full"
            >
              Gestionar Proyecto
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
