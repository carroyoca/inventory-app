"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/lib/types/projects'

interface ProjectContextType {
  activeProject: Project | null
  setActiveProject: (project: Project | null) => void
  isLoading: boolean
  refreshActiveProject: () => Promise<void>
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Función para obtener el proyecto activo del usuario
  const getActiveProject = async () => {
    console.log('🔄 ProjectContext: getActiveProject called')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      console.log('🔄 ProjectContext: Session check:', !!session?.user)
      
      if (!session?.user) {
        console.log('🔄 ProjectContext: No session, setting loading false')
        setIsLoading(false)
        setActiveProject(null)
        return
      }

      // Obtener el primer proyecto del usuario
      const { data: projects, error } = await supabase
        .from('project_members')
        .select(`
          project_id,
          role,
          joined_at,
          projects (
            id,
            name,
            description,
            created_by,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', session.user.id)
        .order('joined_at', { ascending: false })
        .limit(1)

      console.log('🔄 ProjectContext: Projects query result:', { projects: projects?.length || 0, error })

      if (error) {
        console.error('Error fetching active project:', error)
        setIsLoading(false)
        setActiveProject(null)
        return
      }

      if (projects && projects.length > 0) {
        const projectData = projects[0]
        const project: Project = {
          ...projectData.projects,
          members: [{
            id: projectData.project_id,
            user_id: session.user.id,
            role: projectData.role,
            joined_at: projectData.joined_at
          }],
          member_count: 1
        }
        console.log('🔄 ProjectContext: Setting active project:', project.name)
        setActiveProject(project)
      } else {
        console.log('🔄 ProjectContext: No projects found, setting activeProject to null')
        setActiveProject(null)
      }
    } catch (error) {
      console.error('Error in getActiveProject:', error)
      setActiveProject(null)
    } finally {
      console.log('🔄 ProjectContext: Setting isLoading to false')
      setIsLoading(false)
    }
  }

  // Función para refrescar el proyecto activo
  const refreshActiveProject = async () => {
    console.log('🔄 ProjectContext: refreshActiveProject called')
    setIsLoading(true)
    await getActiveProject()
  }

  // Cargar proyecto activo solo una vez al montar
  useEffect(() => {
    console.log('🔄 ProjectContext: Initial useEffect triggered')
    console.log('🔄 ProjectContext: Component mounted, calling getActiveProject')
    
    // Usar setTimeout para asegurar que el componente esté completamente montado
    const timer = setTimeout(() => {
      console.log('🔄 ProjectContext: Timer fired, calling getActiveProject')
      getActiveProject()
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  console.log('🔄 ProjectContext: Rendering with state:', { activeProject: !!activeProject, isLoading })

  const value: ProjectContextType = {
    activeProject,
    setActiveProject,
    isLoading,
    refreshActiveProject
  }

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider')
  }
  return context
}
