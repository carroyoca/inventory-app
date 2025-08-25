"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Download, FileJson, FileSpreadsheet, Loader2, AlertTriangle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useProject } from "@/contexts/ProjectContext"
import { useRouter } from "next/navigation"

export function ProjectSettings() {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()
  const { activeProject, clearProjectState } = useProject()
  const router = useRouter()

  const handleDeleteProject = async () => {
    if (!activeProject) return

    const confirmMessage = `¿Estás seguro de que quieres eliminar el proyecto "${activeProject.name}"?\n\nEsta acción NO se puede deshacer y eliminará:\n- Todos los items del inventario\n- Todas las fotos\n- Todos los miembros del proyecto\n- Todas las invitaciones\n- Todas las configuraciones\n\nEscribe "ELIMINAR" para confirmar:`
    
    const userInput = prompt(confirmMessage)
    if (userInput !== 'ELIMINAR') {
      toast({
        title: "Cancelado",
        description: "La eliminación del proyecto fue cancelada",
      })
      return
    }

    setIsDeleting(true)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No authenticated session')
      }

      const response = await fetch(`/api/projects?projectId=${activeProject.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Proyecto eliminado",
          description: "El proyecto y todos sus datos han sido eliminados exitosamente",
        })
        
        // Clear project state and redirect
        clearProjectState()
        router.push('/select-project')
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al eliminar el proyecto",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      toast({
        title: "Error",
        description: "Error de conexión al eliminar el proyecto",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleExportJSON = async () => {
    if (!activeProject) return

    setIsExporting(true)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No authenticated session')
      }

      const response = await fetch(`/api/projects/${activeProject.id}/export?format=json`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        // Create and download JSON file
        const jsonString = JSON.stringify(data.data, null, 2)
        const blob = new Blob([jsonString], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        
        const a = document.createElement('a')
        a.href = url
        a.download = `${activeProject.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast({
          title: "Exportación completada",
          description: "Los datos del proyecto han sido exportados exitosamente",
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al exportar los datos",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error exporting project:', error)
      toast({
        title: "Error",
        description: "Error de conexión al exportar los datos",
        variant: "destructive"
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportCSV = async () => {
    if (!activeProject) return

    setIsExporting(true)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No authenticated session')
      }

      const response = await fetch(`/api/projects/${activeProject.id}/export?format=csv`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const csvData = await response.text()
        
        // Create and download CSV file
        const blob = new Blob([csvData], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        
        const a = document.createElement('a')
        a.href = url
        a.download = `${activeProject.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_inventory.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast({
          title: "Exportación completada",
          description: "El inventario ha sido exportado a CSV exitosamente",
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Error al exportar el inventario",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error exporting CSV:', error)
      toast({
        title: "Error",
        description: "Error de conexión al exportar el inventario",
        variant: "destructive"
      })
    } finally {
      setIsExporting(false)
    }
  }

  if (!activeProject) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-gray-500">No hay proyecto activo</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Datos
          </CardTitle>
          <CardDescription>
            Exporta la información del proyecto en diferentes formatos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={handleExportJSON}
              disabled={isExporting}
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              {isExporting ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <FileJson className="h-6 w-6" />
              )}
              <div className="text-center">
                <div className="font-medium">Exportar Proyecto Completo</div>
                <div className="text-sm text-gray-500">JSON con todos los datos</div>
              </div>
            </Button>
            
            <Button 
              onClick={handleExportCSV}
              disabled={isExporting}
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              {isExporting ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-6 w-6" />
              )}
              <div className="text-center">
                <div className="font-medium">Exportar Inventario</div>
                <div className="text-sm text-gray-500">CSV solo items</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Zona de Peligro
          </CardTitle>
          <CardDescription>
            Acciones irreversibles que afectan permanentemente al proyecto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border border-red-200 rounded-lg bg-red-50">
              <h4 className="font-medium text-red-800 mb-2">Eliminar Proyecto</h4>
              <p className="text-sm text-red-600 mb-4">
                Esta acción eliminará permanentemente el proyecto "{activeProject.name}" y todos sus datos asociados. 
                No se puede deshacer.
              </p>
              <Button 
                onClick={handleDeleteProject}
                disabled={isDeleting}
                variant="destructive"
                className="w-full md:w-auto"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Proyecto Permanentemente
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
