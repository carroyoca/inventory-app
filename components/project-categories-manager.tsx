"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Plus, Edit, Trash2, Loader2, Package, MapPin } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useProject } from "@/contexts/ProjectContext"

interface ProjectCategory {
  id: string
  name: string
  description?: string
  created_at: string
}

interface CategoryFormData {
  name: string
  description: string
}

export function ProjectCategoriesManager() {
  const [inventoryTypes, setInventoryTypes] = useState<ProjectCategory[]>([])
  const [houseZones, setHouseZones] = useState<ProjectCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingType, setEditingType] = useState<ProjectCategory | null>(null)
  const [editingZone, setEditingZone] = useState<ProjectCategory | null>(null)
  const { toast } = useToast()
  const { activeProject } = useProject()

  useEffect(() => {
    if (activeProject) {
      loadCategories()
    }
  }, [activeProject])

  const loadCategories = async () => {
    if (!activeProject) return

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) return

      const [typesResponse, zonesResponse] = await Promise.all([
        fetch(`/api/projects/${activeProject.id}/inventory-types`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }),
        fetch(`/api/projects/${activeProject.id}/house-zones`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
      ])

      if (typesResponse.ok) {
        const typesData = await typesResponse.json()
        setInventoryTypes(typesData.data || [])
      }

      if (zonesResponse.ok) {
        const zonesData = await zonesResponse.json()
        setHouseZones(zonesData.data || [])
      }
    } catch (error) {
      console.error('Error loading categories:', error)
      toast({
        title: "Error",
        description: "Error al cargar las categorías",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitInventoryType = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!activeProject) return

    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const categoryData: CategoryFormData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string
    }

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) return

      const url = `/api/projects/${activeProject.id}/inventory-types`
      const method = editingType ? 'PUT' : 'POST'
      const body = editingType 
        ? { ...categoryData, id: editingType.id }
        : categoryData

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Éxito",
          description: data.message,
        })
        e.currentTarget.reset()
        setEditingType(null)
        loadCategories()
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al procesar la solicitud",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitHouseZone = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!activeProject) return

    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const categoryData: CategoryFormData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string
    }

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) return

      const url = `/api/projects/${activeProject.id}/house-zones`
      const method = editingZone ? 'PUT' : 'POST'
      const body = editingZone 
        ? { ...categoryData, id: editingZone.id }
        : categoryData

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Éxito",
          description: data.message,
        })
        e.currentTarget.reset()
        setEditingZone(null)
        loadCategories()
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al procesar la solicitud",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteInventoryType = async (typeId: string) => {
    if (!activeProject || !confirm('¿Estás seguro de que quieres eliminar este tipo de inventario?')) return

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) return

      const response = await fetch(`/api/projects/${activeProject.id}/inventory-types?typeId=${typeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Éxito",
          description: data.message,
        })
        loadCategories()
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al eliminar el tipo",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive"
      })
    }
  }

  const handleDeleteHouseZone = async (zoneId: string) => {
    if (!activeProject || !confirm('¿Estás seguro de que quieres eliminar esta área?')) return

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) return

      const response = await fetch(`/api/projects/${activeProject.id}/house-zones?zoneId=${zoneId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Éxito",
          description: data.message,
        })
        loadCategories()
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al eliminar el área",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive"
      })
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Cargando categorías...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Gestión de Categorías
        </CardTitle>
        <CardDescription>
          Configure los tipos de inventario y áreas disponibles para este proyecto
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="inventory-types" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inventory-types" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Tipos de Inventario
            </TabsTrigger>
            <TabsTrigger value="house-zones" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Áreas del Proyecto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory-types" className="space-y-6">
            <form onSubmit={handleSubmitInventoryType} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type-name">Nombre del Tipo *</Label>
                  <Input
                    id="type-name"
                    name="name"
                    placeholder="ej. Pintura, Escultura, Fotografía"
                    defaultValue={editingType?.name || ''}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type-description">Descripción</Label>
                  <Textarea
                    id="type-description"
                    name="description"
                    placeholder="Descripción opcional del tipo"
                    defaultValue={editingType?.description || ''}
                    rows={1}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {editingType ? 'Actualizar' : 'Agregar'} Tipo
                </Button>
                {editingType && (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setEditingType(null)}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </form>

            <div className="space-y-2">
              <h4 className="font-medium">Tipos Existentes ({inventoryTypes.length})</h4>
              {inventoryTypes.length === 0 ? (
                <p className="text-sm text-gray-500">No hay tipos de inventario configurados</p>
              ) : (
                <div className="grid gap-2">
                  {inventoryTypes.map((type) => (
                    <div key={type.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h5 className="font-medium">{type.name}</h5>
                        {type.description && (
                          <p className="text-sm text-gray-500">{type.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingType(type)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteInventoryType(type.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="house-zones" className="space-y-6">
            <form onSubmit={handleSubmitHouseZone} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zone-name">Nombre del Área *</Label>
                  <Input
                    id="zone-name"
                    name="name"
                    placeholder="ej. Sala Principal, Almacén, Estudio"
                    defaultValue={editingZone?.name || ''}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zone-description">Descripción</Label>
                  <Textarea
                    id="zone-description"
                    name="description"
                    placeholder="Descripción opcional del área"
                    defaultValue={editingZone?.description || ''}
                    rows={1}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {editingZone ? 'Actualizar' : 'Agregar'} Área
                </Button>
                {editingZone && (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setEditingZone(null)}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </form>

            <div className="space-y-2">
              <h4 className="font-medium">Áreas Existentes ({houseZones.length})</h4>
              {houseZones.length === 0 ? (
                <p className="text-sm text-gray-500">No hay áreas configuradas</p>
              ) : (
                <div className="grid gap-2">
                  {houseZones.map((zone) => (
                    <div key={zone.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h5 className="font-medium">{zone.name}</h5>
                        {zone.description && (
                          <p className="text-sm text-gray-500">{zone.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingZone(zone)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteHouseZone(zone.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
