"use client"

import { useEffect } from 'react'
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

export default function DashboardPage() {
  const { activeProject, isLoading } = useProject()
  const router = useRouter()

  // Si no hay proyecto activo, redirigir a selección de proyecto
  useEffect(() => {
    if (!isLoading && !activeProject) {
      router.push('/select-project')
    }
  }, [activeProject, isLoading, router])

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
              <div className="text-2xl font-bold">0</div>
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
              <div className="text-2xl font-bold">$0</div>
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
                onClick={() => router.push('/inventory')}
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
