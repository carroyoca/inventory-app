"use client"

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useProject } from '@/contexts/ProjectContext'
import { ProjectHeader } from '@/components/project-header'
import { InventoryForm } from '@/components/inventory-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface InventoryItem {
  id: string
  product_type: string
  house_zone: string
  product_name: string
  product_id: string | null
  description: string
  notes: string | null
  estimated_price: number | null
  sale_price: number | null
  status: string
  listing_link: string | null
  photos: string[]
  created_at: string
  project_id: string
}

export default function EditInventoryPage() {
  const router = useRouter()
  const params = useParams()
  const { activeProject, isLoading: projectLoading } = useProject()
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const itemId = params.id as string

  useEffect(() => {
    const loadItem = async () => {
      if (!itemId || !activeProject) return

      try {
        setIsLoading(true)
        const supabase = createClient()
        
        const { data, error } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('id', itemId)
          .eq('project_id', activeProject.id)
          .single()

        if (error) {
          console.error('Error loading item:', error)
          setError('Error loading item')
          return
        }

        if (!data) {
          setError('Item not found')
          return
        }

        setItem(data)
      } catch (error) {
        console.error('Error loading item:', error)
        setError('Error loading item')
      } finally {
        setIsLoading(false)
      }
    }

    if (activeProject) {
      loadItem()
    }
  }, [itemId, activeProject])

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ProjectHeader />
        <main className="p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando item...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ProjectHeader />
        <main className="p-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Error</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/inventory')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al Inventario
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ProjectHeader />
        <main className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Item no encontrado</CardTitle>
              <CardDescription>El item que buscas no existe o no tienes permisos para editarlo.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/inventory')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al Inventario
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
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
          <h1 className="text-3xl font-bold text-gray-900">Editar Item</h1>
          <p className="text-gray-600 mt-2">Modifica los detalles del item "{item.product_name}"</p>
        </div>

        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle>Formulario de Edición</CardTitle>
            <CardDescription>
              Actualiza la información del item del inventario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InventoryForm 
              mode="edit" 
              initialData={item}
              onSuccess={() => router.push('/inventory')}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
