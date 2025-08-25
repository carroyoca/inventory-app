"use client"

import { useRouter } from 'next/navigation'
import { useProject } from '@/contexts/ProjectContext'
import { ProjectHeader } from '@/components/project-header'
import { InventoryForm } from '@/components/inventory-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

export default function AddInventoryPage() {
  const router = useRouter()
  const { activeProject, isLoading: projectLoading } = useProject()

  if (projectLoading) {
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
    router.push('/select-project')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ProjectHeader />
      <main className="p-6">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/inventory')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Inventario
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Añadir Nuevo Item</h1>
          <p className="text-gray-600 mt-2">Añade un nuevo objeto o producto al inventario del proyecto "{activeProject.name}"</p>
        </div>

        {/* Add Form */}
        <Card>
          <CardHeader>
            <CardTitle>Formulario de Nuevo Item</CardTitle>
            <CardDescription>
              Completa la información del nuevo item del inventario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InventoryForm 
              mode="create"
              onSuccess={() => router.push('/inventory')}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
