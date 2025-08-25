"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FolderOpen, Users, Calendar, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { ProjectWithMembers } from "@/lib/types/projects"
import { ProjectForm } from "./project-form"

interface ProjectsListProps {
  onProjectSelect: (project: ProjectWithMembers) => void
}

export function ProjectsList({ onProjectSelect }: ProjectsListProps) {
  const [projects, setProjects] = useState<ProjectWithMembers[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const fetchProjects = async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        throw new Error("Authentication required")
      }

      const response = await fetch("/api/projects", {
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch projects")
      }

      const result = await response.json()
      setProjects(result.projects)

    } catch (error) {
      console.error("Error fetching projects:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch projects")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleProjectCreated = () => {
    setShowCreateForm(false)
    fetchProjects() // Refresh the list
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-red-100 text-red-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'member': return 'bg-green-100 text-green-800'
      case 'viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando proyectos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="w-full bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p className="mb-4">{error}</p>
            <Button onClick={fetchProjects} variant="outline">
              Intentar de nuevo
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {/* Create Project Button */}
      <div className="flex justify-center">
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          Crear Nuevo Proyecto
        </Button>
      </div>

      {/* Create Project Form */}
      {showCreateForm && (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-8">
            <ProjectForm onProjectCreated={handleProjectCreated} />
          </CardContent>
        </Card>
      )}

      {/* Projects List */}
      {projects.length === 0 ? (
        <Card className="w-full bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="pt-12 pb-12">
            <div className="text-center text-gray-600">
              <div className="p-6 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full w-fit mx-auto mb-6">
                <FolderOpen className="h-12 w-12 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No hay proyectos aún</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Crea tu primer proyecto de inventario para comenzar
              </p>
              <Button 
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Crear Tu Primer Proyecto
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card 
              key={project.id} 
              className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
              onClick={() => onProjectSelect(project)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg group-hover:scale-110 transition-transform duration-300">
                        <FolderOpen className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">{project.name}</h3>
                    </div>
                    {project.description && (
                      <p className="text-gray-600 line-clamp-2 mb-4">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <Badge className={`${
                    getRoleBadgeColor(
                      project.members.find(m => m.user_id === project.created_by)?.role || 'member'
                    )
                  } text-xs font-medium`}>
                    {project.members.find(m => m.user_id === project.created_by)?.role || 'member'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span>{project.member_count} miembro{project.member_count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <span>{formatDate(project.created_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
