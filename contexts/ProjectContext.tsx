"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/lib/types/projects'

interface ProjectContextType {
  activeProject: Project | null
  setActiveProject: (project: Project | null) => void
  isLoading: boolean
  refreshActiveProject: () => Promise<void>
  clearProjectState: () => void
  switchToProject: (projectId: string) => Promise<void>
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
        const project = {
          ...projectData.projects,
          members: [{
            id: projectData.project_id,
            project_id: projectData.project_id,
            user_id: session.user.id,
            role: projectData.role,
            joined_at: projectData.joined_at
          }],
          member_count: 1
        } as any
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

  // Función para cambiar a un proyecto específico
  const switchToProject = async (projectId: string) => {
    console.log('🔄 ProjectContext: switchToProject called with projectId:', projectId)
    try {
      setIsLoading(true)
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        throw new Error("No authenticated user")
      }

      console.log('🔄 ProjectContext: Session validated, fetching project data...')

      // Obtener el proyecto específico
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
        .eq('project_id', projectId)
        .single()

      console.log('🔄 ProjectContext: Database query result:', { projects: !!projects, error })

      if (error) {
        console.error('❌ ProjectContext: Database error:', error)
        throw new Error(`Failed to access project: ${error.message}`)
      }

      if (!projects) {
        throw new Error("Project not found or you don't have access to it")
      }

      if (!projects.projects) {
        throw new Error("Project data is incomplete")
      }

      const project = {
        ...projects.projects,
        members: [{
          id: projects.project_id,
          project_id: projects.project_id,
          user_id: session.user.id,
          role: projects.role,
          joined_at: projects.joined_at
        }],
        member_count: 1
      } as any

      console.log('✅ ProjectContext: Successfully prepared project data:', project.name)
      setActiveProject(project)
      
    } catch (error) {
      console.error('❌ ProjectContext: Error in switchToProject:', error)
      setIsLoading(false) // Ensure loading is set to false on error
      throw error
    } finally {
      console.log('🔄 ProjectContext: switchToProject completed, setting isLoading to false')
      setIsLoading(false)
    }
  }

  // Función para limpiar el estado (útil para logout)
  const clearProjectState = () => {
    console.log('🔄 ProjectContext: clearProjectState called')
    setActiveProject(null)
    setIsLoading(false)
  }

  // Cargar proyecto activo y escuchar cambios de autenticación
  useEffect(() => {
    console.log('🔄 ProjectContext: Initial useEffect triggered')
    
    // Add a small delay to ensure the component is fully mounted
    const timer = setTimeout(() => {
      getActiveProject()
    }, 100)

    // Listen to auth changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 ProjectContext: Auth state changed:', event, !!session?.user)
        
        if (event === 'SIGNED_OUT') {
          console.log('🔄 ProjectContext: User signed out, clearing state')
          setActiveProject(null)
          setIsLoading(false)
        } else if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔄 ProjectContext: User signed in, refreshing project')
          getActiveProject()
        }
      }
    )

    return () => {
      console.log('🔄 ProjectContext: Cleaning up auth listener')
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [])

  console.log('🔄 ProjectContext: Rendering with state:', { activeProject: !!activeProject, isLoading })

  const value: ProjectContextType = {
    activeProject,
    setActiveProject,
    isLoading,
    refreshActiveProject,
    clearProjectState,
    switchToProject
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
