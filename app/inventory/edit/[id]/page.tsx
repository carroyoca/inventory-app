"use client"

import { useEffect, useState, useCallback } from 'react'
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
  year_of_purchase?: number | null
  purchase_currency?: 'USD' | 'EUR' | 'ARS' | null
  purchase_price?: number | null
  price_eur_at_purchase?: number | null
  weight_kg?: number | null
  length_cm?: number | null
  width_cm?: number | null
  height_cm?: number | null
}

export default function EditInventoryPage() {
  const router = useRouter()
  const params = useParams()
  const { activeProject, isLoading: projectLoading } = useProject()
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUploadInProgress, setIsUploadInProgress] = useState(false)

  const itemId = params.id as string

  // UPLOAD GUARD: Prevent navigation during uploads
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isUploadInProgress) {
        console.log('🚨 UPLOAD GUARD: Preventing page unload during upload')
        event.preventDefault()
        event.returnValue = 'Photo upload is in progress. Are you sure you want to leave?'
        return 'Photo upload is in progress. Are you sure you want to leave?'
      }
    }

    const handlePopState = (event: PopStateEvent) => {
      if (isUploadInProgress) {
        console.log('🚨 UPLOAD GUARD: Preventing navigation during upload')
        event.preventDefault()
        // Push the current state back to prevent navigation
        window.history.pushState(null, '', window.location.href)
        alert('Photo upload is in progress. Please wait for it to complete.')
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [isUploadInProgress])

  // UPLOAD GUARD: Monitor upload progress from child component
  const handleUploadProgressChange = useCallback((inProgress: boolean) => {
    console.log('🔄 UPLOAD GUARD: Upload progress changed', {
      timestamp: new Date().toISOString(),
      inProgress,
      previousState: isUploadInProgress
    })
    setIsUploadInProgress(inProgress)
  }, [isUploadInProgress])

  // RELOAD DETECTION: Component mount/unmount logging
  useEffect(() => {
    const timestamp = new Date().toISOString()
    console.log('🔄 RELOAD DETECTION: EditInventoryPage component mounted', {
      timestamp,
      itemId,
      hasActiveProject: !!activeProject,
      projectId: activeProject?.id,
      projectLoading
    })

    return () => {
      console.log('🔄 RELOAD DETECTION: EditInventoryPage component unmounting', {
        timestamp: new Date().toISOString(),
        itemId,
        reason: 'Component cleanup'
      })
    }
  }, []) // Empty dependency array - only runs on mount/unmount

  // RELOAD DETECTION: Track activeProject changes
  useEffect(() => {
    console.log('🔄 RELOAD DETECTION: activeProject changed', {
      timestamp: new Date().toISOString(),
      activeProject: activeProject ? {
        id: activeProject.id,
        name: activeProject.name
      } : null,
      projectLoading,
      itemId
    })
  }, [activeProject, projectLoading])

  // RELOAD DETECTION: Track item loading state changes
  useEffect(() => {
    console.log('🔄 RELOAD DETECTION: Item loading state changed', {
      timestamp: new Date().toISOString(),
      isLoading,
      hasItem: !!item,
      itemId,
      itemPhotoCount: item?.photos?.length || 0
    })
  }, [isLoading, item])

  useEffect(() => {
    const loadItem = async () => {
      console.log('🔄 RELOAD DETECTION: loadItem called', {
        timestamp: new Date().toISOString(),
        itemId,
        activeProjectId: activeProject?.id,
        hasActiveProject: !!activeProject,
        isUploadInProgress,
        hasExistingItem: !!item,
        reason: 'useEffect dependency change'
      })

      if (!itemId || !activeProject) {
        console.log('🔄 RELOAD DETECTION: loadItem skipped - missing dependencies', {
          hasItemId: !!itemId,
          hasActiveProject: !!activeProject
        })
        return
      }

      // CRITICAL FIX: Don't reload item from database during upload - this prevents photo loss
      if (isUploadInProgress) {
        console.log('🚨 CRITICAL FIX: Preventing database item reload during upload')
        console.log('📱 Upload in progress - maintaining current item state to preserve uploaded photos')
        return
      }

      // CRITICAL FIX: Don't reload item if we already have the same item loaded
      // This prevents unnecessary database calls during auth events
      if (item && item.id === itemId) {
        console.log('🔄 RELOAD DETECTION: Item already loaded, skipping database reload to prevent disruption')
        return
      }

      try {
        console.log('🔄 RELOAD DETECTION: Starting item load from database', {
          timestamp: new Date().toISOString(),
          itemId,
          projectId: activeProject.id
        })
        
        setIsLoading(true)
        const supabase = createClient()
        
        const { data, error } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('id', itemId)
          .eq('project_id', activeProject.id)
          .single()

        if (error) {
          console.error('🔄 RELOAD DETECTION: Database load error:', error)
          setError('Error loading item')
          return
        }

        if (!data) {
          console.log('🔄 RELOAD DETECTION: Item not found in database')
          setError('Item not found')
          return
        }

        console.log('🔄 RELOAD DETECTION: Item loaded successfully from database', {
          timestamp: new Date().toISOString(),
          itemId: data.id,
          productName: data.product_name,
          photosInDatabase: data.photos?.length || 0,
          allPhotos: data.photos || []
        })

        setItem(data)
      } catch (error) {
        console.error('🔄 RELOAD DETECTION: Exception during item load:', error)
        setError('Error loading item')
      } finally {
        console.log('🔄 RELOAD DETECTION: Item loading completed', {
          timestamp: new Date().toISOString(),
          success: !error
        })
        setIsLoading(false)
      }
    }

    if (activeProject) {
      console.log('🔄 RELOAD DETECTION: activeProject exists, calling loadItem')
      loadItem()
    } else {
      console.log('🔄 RELOAD DETECTION: No activeProject, skipping loadItem')
    }
  }, [itemId, activeProject, isUploadInProgress, item])

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
              onUploadProgressChange={handleUploadProgressChange}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
