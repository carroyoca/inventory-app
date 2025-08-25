"use client"

import { useState, useEffect } from "react"
import { ProjectsList } from "@/components/projects-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Plus, Check, MapPin, Users, Package, Settings, BarChart3, FileText, FolderOpen } from "lucide-react"
import { useRouter } from "next/navigation"
import type { ProjectWithMembers } from "@/lib/types/projects"

// Dynamic imports to avoid SSR issues
const ProjectSwitcher = dynamic(() => import('@/components/project-switcher').then(mod => ({ default: mod.ProjectSwitcher })), {
  ssr: false,
  loading: () => <div className="flex gap-4"><div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div></div>
})

const ProjectHeader = dynamic(() => import('@/components/project-header').then(mod => ({ default: mod.ProjectHeader })), {
  ssr: false,
  loading: () => <div className="h-16 bg-gray-200 animate-pulse"></div>
})

// Import dynamic from Next.js
import dynamic from 'next/dynamic'

export default function ProjectsPage() {
  const [selectedProject, setSelectedProject] = useState<ProjectWithMembers | null>(null)
  const [mounted, setMounted] = useState(false)
  const [projectContext, setProjectContext] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    // Import ProjectContext only on client side
    import('@/contexts/ProjectContext').then(({ useProject }) => {
      // We can't use hooks conditionally, so we'll handle this differently
    })
  }, [])

  const handleProjectSelect = (project: ProjectWithMembers) => {
    setSelectedProject(project)
  }

  const handleSwitchToProject = async (project: ProjectWithMembers) => {
    try {
      // Import and use switchToProject dynamically
      const { useProject } = await import('@/contexts/ProjectContext')
      // This is a workaround - we'll handle the switching in the ProjectSwitcher component
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

  // Don't render anything until mounted to avoid SSR issues
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  // Simple version without ProjectContext for now
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Background Blur Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/30 to-blue-400/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/30 to-purple-400/30 rounded-full blur-3xl"></div>
      </div>

      {/* Simple Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl">
              <FolderOpen className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Inventory App</h1>
          </div>
          <Button 
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="border-purple-200 text-purple-600 hover:bg-purple-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </div>
      </header>

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

            {/* Project Selection Actions */}
            <div className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                ¿Cambiar al proyecto "{selectedProject.name}"?
              </h3>
              <p className="text-gray-600 mb-6">
                Accede al dashboard del proyecto para gestionar inventario y todas las configuraciones
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <ProjectSwitcher 
                  selectedProject={selectedProject}
                  onSwitch={handleSwitchToProject}
                />
                <Button 
                  variant="outline" 
                  onClick={handleBackToProjects}
                  className="border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Elegir Otro Proyecto
                </Button>
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
