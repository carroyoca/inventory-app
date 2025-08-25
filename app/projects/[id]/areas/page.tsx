"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useProject } from '@/contexts/ProjectContext'
import { ProjectHeader } from '@/components/project-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, MapPin, Edit, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Area {
  id: string
  name: string
  description?: string
  project_id: string
  created_at: string
  updated_at: string
}

export default function ProjectAreasPage() {
  const router = useRouter()
  const params = useParams()
  const { activeProject, isLoading: projectLoading } = useProject()
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newAreaName, setNewAreaName] = useState('')
  const [newAreaDescription, setNewAreaDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const projectId = params.id as string

  useEffect(() => {
    if (projectId && activeProject) {
      fetchAreas()
    }
  }, [projectId, activeProject])

  const fetchAreas = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('project_areas')
        .select('*')
        .eq('project_id', projectId)
        .order('name', { ascending: true })

      if (error) {
        throw error
      }

      setAreas(data || [])
    } catch (error) {
      console.error('Error fetching areas:', error)
      setError('Failed to load areas')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newAreaName.trim()) {
      alert('Area name is required')
      return
    }

    try {
      setIsCreating(true)
      const supabase = createClient()
      
      const { error } = await supabase
        .from('project_areas')
        .insert({
          name: newAreaName.trim(),
          description: newAreaDescription.trim() || null,
          project_id: projectId
        })

      if (error) {
        throw error
      }

      // Reset form and refresh
      setNewAreaName('')
      setNewAreaDescription('')
      setShowCreateForm(false)
      await fetchAreas()
    } catch (error) {
      console.error('Error creating area:', error)
      alert('Failed to create area')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteArea = async (areaId: string) => {
    if (!confirm('Are you sure you want to delete this area? This action cannot be undone.')) {
      return
    }

    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('project_areas')
        .delete()
        .eq('id', areaId)
        .eq('project_id', projectId)

      if (error) {
        throw error
      }

      await fetchAreas()
    } catch (error) {
      console.error('Error deleting area:', error)
      alert('Failed to delete area')
    }
  }

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

  if (!activeProject || activeProject.id !== projectId) {
    router.push('/projects')
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
            onClick={() => router.push(`/projects`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Proyectos
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Areas del Proyecto</h1>
          <p className="text-gray-600 mt-2">Gestiona las zonas y habitaciones del proyecto "{activeProject.name}"</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Areas List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      Areas Configuradas
                    </CardTitle>
                    <CardDescription>
                      {areas.length} area{areas.length !== 1 ? 's' : ''} en este proyecto
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => setShowCreateForm(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Nueva Area
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Cargando areas...</span>
                  </div>
                ) : error ? (
                  <div className="text-center py-8 text-red-600">
                    <p>{error}</p>
                    <Button onClick={fetchAreas} variant="outline" className="mt-2">
                      Intentar de nuevo
                    </Button>
                  </div>
                ) : areas.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium mb-2">No hay areas configuradas</h3>
                    <p className="mb-4">Crea tu primera area para organizar el inventario</p>
                    <Button onClick={() => setShowCreateForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Primera Area
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {areas.map((area) => (
                      <div 
                        key={area.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{area.name}</h4>
                          {area.description && (
                            <p className="text-sm text-gray-500 mt-1">{area.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {new Date(area.created_at).toLocaleDateString()}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteArea(area.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Create Area Form */}
          {showCreateForm && (
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Nueva Area</CardTitle>
                  <CardDescription>
                    Añade una nueva zona o habitación al proyecto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateArea} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="area-name">Nombre del Area *</Label>
                      <Input
                        id="area-name"
                        value={newAreaName}
                        onChange={(e) => setNewAreaName(e.target.value)}
                        placeholder="e.g., Sala de estar, Cocina, Dormitorio principal"
                        disabled={isCreating}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="area-description">Descripción (Opcional)</Label>
                      <Input
                        id="area-description"
                        value={newAreaDescription}
                        onChange={(e) => setNewAreaDescription(e.target.value)}
                        placeholder="Descripción adicional del area..."
                        disabled={isCreating}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        disabled={isCreating || !newAreaName.trim()}
                        className="flex-1"
                      >
                        {isCreating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creando...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Crear Area
                          </>
                        )}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setShowCreateForm(false)}
                        disabled={isCreating}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
