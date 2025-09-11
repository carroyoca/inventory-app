"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useProject } from "@/contexts/ProjectContext"
import { ProjectHeader } from "@/components/project-header"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Plus, 
  FolderOpen, 
  Package, 
  BarChart3, 
  Users, 
  ArrowRight,
  Sparkles,
  TrendingUp,
  DollarSign,
  Calendar,
  MapPin,
  Settings,
  X
} from "lucide-react"
import { RecentItems } from "@/components/recent-items"
import { ProjectCategoriesManager } from "@/components/project-categories-manager"
import { ProjectAnalytics } from "@/components/project-analytics"
import { ProjectSettings } from "@/components/project-settings"
import { createClient } from "@/lib/supabase/client"
import { WeeklyGoal } from "@/components/engagement/WeeklyGoal"
import { TrophyShelf } from "@/components/engagement/TrophyShelf"
import { StreakCounter } from "@/components/engagement/StreakCounter"

interface InventoryStats {
  totalItems: number
  totalValue: number
  isLoading: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const { activeProject, isLoading: projectLoading } = useProject()
  const [stats, setStats] = useState<InventoryStats>({
    totalItems: 0,
    totalValue: 0,
    isLoading: true
  })
  const [selectedAction, setSelectedAction] = useState<string | null>(null)

  useEffect(() => {
    if (activeProject) {
      fetchStats()
    }
  }, [activeProject])

  const fetchStats = async () => {
    if (!activeProject) return

    try {
      // Get the session token for authentication
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.error('No access token available for stats fetch')
        setStats(prev => ({ ...prev, isLoading: false }))
        return
      }

      console.log('📊 Fetching stats for project:', activeProject.id)
      const response = await fetch(`/api/projects/${activeProject.id}/stats`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      console.log('📊 Stats response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📊 Stats data received:', data)
        setStats({
          totalItems: data.totalItems || 0,
          totalValue: data.totalValue || 0,
          isLoading: false
        })
      } else {
        console.error('📊 Stats fetch failed:', response.status, response.statusText)
        const errorData = await response.text()
        console.error('📊 Error details:', errorData)
        setStats(prev => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      console.error('📊 Error fetching stats:', error)
      setStats(prev => ({ ...prev, isLoading: false }))
    }
  }

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando proyecto...</p>
        </div>
      </div>
    )
  }

  if (!activeProject) {
    router.push('/select-project')
    return null
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Background Blur Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/30 to-blue-400/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/30 to-purple-400/30 rounded-full blur-3xl"></div>
      </div>

      <ProjectHeader />
      
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Sección de bienvenida */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Bienvenido a tu Dashboard
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Gestiona el inventario del proyecto <span className="font-semibold text-purple-600">{activeProject.name}</span>
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total de ítems</p>
                  <div className="text-3xl font-bold text-gray-900">
                    {stats.isLoading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                    ) : (
                      stats.totalItems
                    )}
                  </div>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Package className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Valor total</p>
                  <div className="text-3xl font-bold text-gray-900">
                    {stats.isLoading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                    ) : (
                      `$${stats.totalValue.toLocaleString()}`
                    )}
                  </div>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Miembros</p>
                  <div className="text-3xl font-bold text-gray-900">
                    {(activeProject as any).member_count || 1}
                  </div>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Engagement: Streak + Weekly Goal + Trophies */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StreakCounter />
          <WeeklyGoal />
          <TrophyShelf />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer"
                 onClick={() => router.push('/inventory/add')}>
            <CardContent className="p-8">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <Plus className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Agregar Item</h3>
                  <p className="text-gray-600 mb-4">Añade un nuevo objeto o producto al inventario</p>
                  <div className="flex items-center text-purple-600 font-medium">
                    <span>Crear nuevo item</span>
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer"
                 onClick={() => router.push('/ai')}>
            <CardContent className="p-8">
              <div className="flex items-center space-x-4">
                <div className="p-4 rounded-2xl bg-brand-gradient group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Studio</h3>
                  <p className="text-gray-600 mb-4">Genera fotos listas para vender y textos en inglés</p>
                  <div className="flex items-center text-pink-600 font-medium">
                    <span>Abrir AI Studio</span>
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer"
                 onClick={() => router.push('/inventory')}>
            <CardContent className="p-8">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <FolderOpen className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Ver Inventario</h3>
                  <p className="text-gray-600 mb-4">Explora y gestiona todos los items del proyecto</p>
                  <div className="flex items-center text-green-600 font-medium">
                    <span>Explorar inventario</span>
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Items */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900">Items Recientes</CardTitle>
                <CardDescription className="text-gray-600">
                  Los últimos items añadidos al inventario
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                onClick={() => router.push('/inventory')}
                className="border-purple-200 text-purple-600 hover:bg-purple-50"
              >
                Ver todos
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <RecentItems projectId={activeProject.id} />
          </CardContent>
        </Card>

        {/* Project Actions */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Acciones del Proyecto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card 
              className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
              onClick={() => setSelectedAction('categories')}
            >
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-blue-100 rounded-xl w-fit mx-auto mb-4">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Categorías</h3>
                <p className="text-sm text-gray-600">Gestionar tipos y áreas</p>
              </CardContent>
            </Card>

            <Card 
              className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
              onClick={() => router.push(`/projects/${activeProject.id}/access`)}
            >
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-green-100 rounded-xl w-fit mx-auto mb-4">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Acceso</h3>
                <p className="text-sm text-gray-600">Gestionar acceso</p>
              </CardContent>
            </Card>

            <Card 
              className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
              onClick={() => setSelectedAction('analytics')}
            >
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-purple-100 rounded-xl w-fit mx-auto mb-4">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Analíticas</h3>
                <p className="text-sm text-gray-600">Métricas del proyecto</p>
              </CardContent>
            </Card>

            <Card 
              className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
              onClick={() => setSelectedAction('settings')}
            >
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-red-100 rounded-xl w-fit mx-auto mb-4">
                  <Settings className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Configuración</h3>
                <p className="text-sm text-gray-600">Exportar y eliminar</p>
              </CardContent>
            </Card>

            <Card 
              className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
              onClick={() => router.push('/projects')}
            >
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-orange-100 rounded-xl w-fit mx-auto mb-4">
                  <FolderOpen className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Proyectos</h3>
                <p className="text-sm text-gray-600">Cambiar proyecto</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      {/* Action Modal */}
      {selectedAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold">
                {selectedAction === 'categories' && 'Gestión de Categorías'}
                {selectedAction === 'analytics' && 'Analíticas del Proyecto'}
                {selectedAction === 'settings' && 'Configuración del Proyecto'}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAction(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              {selectedAction === 'categories' && <ProjectCategoriesManager />}
              {selectedAction === 'analytics' && <ProjectAnalytics />}
              {selectedAction === 'settings' && <ProjectSettings />}
            </div>
          </div>
        </div>
      )}
      </div>
    </AuthGuard>
  )
}
