"use client"

import { useState } from "react"
import { ProjectsList } from "@/components/projects-list"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { useProject } from "@/contexts/ProjectContext"
import type { ProjectWithMembers } from "@/lib/types/projects"

export default function ProjectsPage() {
  const [selectedProject, setSelectedProject] = useState<ProjectWithMembers | null>(null)
  const router = useRouter()
  const { activeProject, switchToProject } = useProject()

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleGoToDashboard}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-semibold text-gray-900">
                {selectedProject ? selectedProject.name : "My Projects"}
              </h1>
            </div>
            
            {!selectedProject && (
              <Button 
                onClick={() => document.getElementById('new-project-btn')?.click()}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedProject ? (
          <div className="space-y-6">
            {/* Project Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedProject.name}</h2>
                  {selectedProject.description && (
                    <p className="text-gray-600 mt-2">{selectedProject.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                    <span>Created: {new Date(selectedProject.created_at).toLocaleDateString()}</span>
                    <span>{selectedProject.member_count} member{selectedProject.member_count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <Button variant="outline" onClick={handleBackToProjects}>
                  Back to Projects
                </Button>
              </div>
            </div>

            {/* Project Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Project Actions</h3>
                  <p className="text-gray-600 mt-1">Manage this project and its inventory</p>
                </div>
                <div className="flex gap-3">
                  {activeProject?.id === selectedProject.id ? (
                    <Button disabled className="flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Current Project
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleSwitchToProject(selectedProject)}
                      className="flex items-center gap-2"
                    >
                      Switch to This Project
                    </Button>
                  )}
                  <Button 
                    variant="outline"
                    onClick={() => router.push('/dashboard')}
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ProjectsList onProjectSelect={handleProjectSelect} />
        )}
      </div>
    </div>
  )
}
