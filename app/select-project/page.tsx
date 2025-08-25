"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProject } from '@/contexts/ProjectContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FolderOpen, Plus, ArrowRight } from 'lucide-react'

export default function SelectProjectPage() {
  const { activeProject, isLoading } = useProject()
  const router = useRouter()

  // Si ya hay un proyecto activo, redirigir al dashboard
  useEffect(() => {
    if (!isLoading && activeProject) {
      router.push('/dashboard')
    }
  }, [activeProject, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando proyectos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Bienvenido a tu Inventario
          </h1>
          <p className="text-lg text-gray-600">
            Para comenzar, necesitas crear un proyecto o unirte a uno existente
          </p>
        </div>

        {/* Opciones */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Crear Nuevo Proyecto */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Crear Nuevo Proyecto</CardTitle>
              <CardDescription>
                Crea un nuevo proyecto desde cero para organizar tu inventario
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                onClick={() => router.push('/projects')}
                className="w-full"
                size="lg"
              >
                Crear Proyecto
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Unirse a Proyecto */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <FolderOpen className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-xl">Unirse a Proyecto</CardTitle>
              <CardDescription>
                Únete a un proyecto existente mediante invitación
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                variant="outline"
                onClick={() => router.push('/projects')}
                className="w-full"
                size="lg"
              >
                Ver Proyectos
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Información Adicional */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-900 mb-2">¿Qué es un Proyecto?</h3>
            <p className="text-blue-800 text-sm">
              Un proyecto es como una "casa" o "ubicación" donde organizas tu inventario. 
              Puede ser tu casa personal, una oficina, un almacén, o cualquier espacio 
              donde quieras gestionar objetos y productos.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
