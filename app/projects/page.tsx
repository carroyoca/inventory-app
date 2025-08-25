"use client"

import { useState } from "react"
import { ProjectsList } from "@/components/projects-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Plus, Check, MapPin, Users, Package, Settings, BarChart3, FileText, FolderOpen } from "lucide-react"
import { useRouter } from "next/navigation"
import { useProject } from "@/contexts/ProjectContext"
import { ProjectHeader } from "@/components/project-header"
import type { ProjectWithMembers } from "@/lib/types/projects"

export default function ProjectsPage() {
  const [selectedProject, setSelectedProject] = useState<ProjectWithMembers | null>(null)
  const router = useRouter()
  const { activeProject, switchToProject, isLoading: projectLoading } = useProject()

  const handleProjectSelect = (project: ProjectWithMembers) => {
    setSelectedProject(project)
  }

  const handleSwitchToProject = async (project: ProjectWithMembers) => {
    try {
      await switchToProject(project.id)
      router.push('/dashboard')
    } catch (error) {
      console.error('Error switching to project:', error)
      alert('Error switching to project. Please try again.')
    }
  }

  const handleBackToProjects = () => {
    setSelectedProject(null)
  }

  const handleGoToDashboard = () => {
    router.push("/dashboard")
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Background Blur Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/30 to-blue-400/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/30 to-purple-400/30 rounded-full blur-3xl"></div>
      </div>

      <ProjectHeader />

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {selectedProject ? (
          <div className="space-y-8">
            {/* Project Header */}
            <div className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl p-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl">
                      <FolderOpen className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">{selectedProject.name}</h2>
                  </div>
                  {selectedProject.description && (
                    <p className="text-xl text-gray-600 mb-4">{selectedProject.description}</p>
                  )}
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <span>Creado: {new Date(selectedProject.created_at).toLocaleDateString()}</span>
                    <span>{selectedProject.member_count} miembro{selectedProject.member_count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleBackToProjects}
                  className="border-purple-200 text-purple-600 hover:bg-purple-50"
                >
                  Volver a Proyectos
                </Button>
              </div>
            </div>

            {/* Project Actions */}
            <div className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Acciones del Proyecto</h3>
                  <p className="text-gray-600">Gestiona este proyecto y su inventario</p>
                </div>
                <div className="flex gap-4">
                  {activeProject?.id === selectedProject.id ? (
                    <Button disabled className="flex items-center gap-2 bg-green-100 text-green-700">
                      <Check className="h-4 w-4" />
                      Proyecto Actual
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleSwitchToProject(selectedProject)}
                      className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    >
                      Cambiar a Este Proyecto
                    </Button>
                  )}
                  <Button 
                    variant="outline"
                    onClick={() => router.push('/dashboard')}
                    className="border-purple-200 text-purple-600 hover:bg-purple-50"
                  >
                    Ir al Dashboard
                  </Button>
                </div>
              </div>

              {/* Project Management Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Areas Management */}
                <Card 
                  className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
                  onClick={() => router.push(`/projects/${selectedProject.id}/areas`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                        <MapPin className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-lg">Areas</h4>
                        <p className="text-gray-600">Gestionar zonas y habitaciones</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Users Management */}
                <Card 
                  className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
                  onClick={() => router.push(`/projects/${selectedProject.id}/users`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-lg">Usuarios</h4>
                        <p className="text-gray-600">Gestionar miembros del proyecto</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Inventory Types */}
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                        <Package className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-lg">Tipos de Inventario</h4>
                        <p className="text-gray-600">Personalizar categorías de productos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Project Settings */}
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                        <Settings className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-lg">Configuración</h4>
                        <p className="text-gray-600">Configuración del proyecto</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Analytics */}
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                        <BarChart3 className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-lg">Analíticas</h4>
                        <p className="text-gray-600">Informes e insights del proyecto</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Export */}
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                        <FileText className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-lg">Exportar</h4>
                        <p className="text-gray-600">Exportar datos del inventario</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Header Section */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Mis Proyectos</h1>
              <p className="text-xl text-gray-600">
                Gestiona todos tus proyectos de inventario
              </p>
            </div>
            
            <ProjectsList onProjectSelect={handleProjectSelect} />
          </div>
        )}
      </main>
    </div>
  )
}
