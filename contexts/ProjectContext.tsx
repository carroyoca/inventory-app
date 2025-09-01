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
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
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

      if (error) {
        console.error('Error fetching active project:', error)
        setIsLoading(false)
        setActiveProject(null)
        return
      }

      if (projects && projects.length > 0) {
        const projectData = projects[0]
        
        // Get actual member count using API endpoint (bypasses RLS restrictions)
        let memberCount = 1 // fallback to 1 if API fails
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
            const response = await fetch(`/api/projects/${projectData.project_id}/member-count`, {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            })
            
            if (response.ok) {
              const memberData = await response.json()
              memberCount = memberData.totalMemberCount
            }
          }
        } catch (error) {
          // Silent fallback to default count
        }
        
        const project = {
          ...projectData.projects,
          members: [{
            id: projectData.project_id,
            project_id: projectData.project_id,
            user_id: session.user.id,
            role: projectData.role,
            joined_at: projectData.joined_at
          }],
          member_count: memberCount || 1
        } as any
        setActiveProject(project)
      } else {
        setActiveProject(null)
      }
    } catch (error) {
      console.error('Error in getActiveProject:', error)
      setActiveProject(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Función para refrescar el proyecto activo
  const refreshActiveProject = async () => {
    setIsLoading(true)
    await getActiveProject()
  }

  // Función para cambiar a un proyecto específico
  const switchToProject = async (projectId: string) => {
    try {
      setIsLoading(true)
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        throw new Error("No authenticated user")
      }

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

      if (error) {
        console.error('Database error in switchToProject:', error)
        
        // If it's an RLS error, try to provide more helpful information
        if (error.message?.includes('row-level security') || error.code === 'PGRST116') {
          throw new Error(`Access denied: You don't have permission to access this project. This might be due to security policies.`)
        } else {
          throw new Error(`Failed to access project: ${error.message || 'Unknown database error'}`)
        }
      }

      if (!projects) {
        throw new Error("Project not found or you don't have access to it")
      }

      if (!projects.projects) {
        throw new Error("Project data is incomplete")
      }

      // Get actual member count using API endpoint (bypasses RLS restrictions)
      let memberCount = 1 // fallback to 1 if API fails
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          const response = await fetch(`/api/projects/${projects.project_id}/member-count`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          })
          
          if (response.ok) {
            const memberData = await response.json()
            memberCount = memberData.totalMemberCount
          }
        }
      } catch (error) {
        // Silent fallback to default count
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
        member_count: memberCount || 1
      } as any

      setActiveProject(project)
      
    } catch (error) {
      console.error('Error in switchToProject:', error)
      setIsLoading(false) // Ensure loading is set to false on error
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Función para limpiar el estado (útil para logout)
  const clearProjectState = () => {
    setActiveProject(null)
    setIsLoading(false)
  }

  // Cargar proyecto activo y escuchar cambios de autenticación
  useEffect(() => {
    // Add a small delay to ensure the component is fully mounted
    const timer = setTimeout(() => {
      getActiveProject()
    }, 100)

    // Listen to auth changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          setActiveProject(null)
          setIsLoading(false)
        } else if (event === 'SIGNED_IN' && session?.user) {
          getActiveProject()
        }
      }
    )

    return () => {
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [])

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
