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
  isUploadInProgress: boolean
  setUploadInProgress: (inProgress: boolean) => void
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadInProgress, setUploadInProgress] = useState(false)

  // RELOAD DETECTION: Monitor activeProject state changes
  useEffect(() => {
    console.log('🔄 PROJECT CONTEXT: activeProject state changed', {
      timestamp: new Date().toISOString(),
      hasActiveProject: !!activeProject,
      projectId: activeProject?.id,
      projectName: activeProject?.name,
      isLoading,
      isUploadInProgress
    })
  }, [activeProject, isLoading, isUploadInProgress])

  // Función para obtener el proyecto activo del usuario
  const getActiveProject = async () => {
    console.log('🔄 PROJECT CONTEXT: getActiveProject called', {
      timestamp: new Date().toISOString(),
      currentProject: activeProject?.id,
      isUploadInProgress
    })

    // UPLOAD GUARD: Don't reload project during uploads
    if (isUploadInProgress) {
      console.log('🚨 UPLOAD GUARD: Preventing project reload during upload')
      return
    }
    
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        console.log('🔄 PROJECT CONTEXT: No user session found')
        setIsLoading(false)
        setActiveProject(null)
        return
      }

      console.log('🔄 PROJECT CONTEXT: User session found, loading projects', {
        userId: session.user.id
      })

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
        
        console.log('🔄 PROJECT CONTEXT: Setting active project', {
          timestamp: new Date().toISOString(),
          projectId: project.id,
          projectName: project.name,
          memberCount: project.member_count
        })
        
        setActiveProject(project)
      } else {
        console.log('🔄 PROJECT CONTEXT: No projects found for user')
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
    console.log('🔄 PROJECT CONTEXT: switchToProject called', {
      timestamp: new Date().toISOString(),
      requestedProjectId: projectId,
      currentProjectId: activeProject?.id
    })
    
    // Skip if we're already on the requested project
    if (activeProject?.id === projectId) {
      console.log('🔄 PROJECT CONTEXT: Already on requested project, skipping switch')
      return
    }
    
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
    console.log('🔄 PROJECT CONTEXT: clearProjectState called', {
      timestamp: new Date().toISOString(),
      isUploadInProgress
    })

    setActiveProject(null)
    setIsLoading(false)
    setUploadInProgress(false) // Clear upload state on logout
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
        console.log('🔄 AUTH STATE CHANGE: Authentication event detected', {
          timestamp: new Date().toISOString(),
          event,
          hasSession: !!session,
          userId: session?.user?.id,
          previousProject: activeProject?.id
        })

        if (event === 'SIGNED_OUT') {
          console.log('🔄 AUTH STATE CHANGE: User signed out, clearing project')
          setActiveProject(null)
          setIsLoading(false)
        } else if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔄 AUTH STATE CHANGE: User signed in, checking if project reload needed')
          
          // CRITICAL FIX: Don't reload project if we already have an active project AND upload is in progress
          // The SIGNED_IN event often fires during token refresh, not actual user login
          if (activeProject && isUploadInProgress) {
            console.log('🚨 CRITICAL FIX: Preventing project reload during upload - SIGNED_IN event blocked')
            console.log('📱 Upload in progress, maintaining current project to prevent photo loss')
          } else if (activeProject && activeProject.id) {
            console.log('🔄 AUTH STATE CHANGE: Already have active project, skipping reload to prevent disruption')
          } else {
            console.log('🔄 AUTH STATE CHANGE: No active project, loading project')
            getActiveProject()
          }
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 AUTH STATE CHANGE: Token refreshed - checking if project reload needed')
          // CRITICAL FIX: Don't reload project during token refresh if we already have an active project
          // This prevents unnecessary reloads that can interrupt uploads
          if (!activeProject && session?.user) {
            console.log('🔄 AUTH STATE CHANGE: No active project during token refresh, loading project')
            getActiveProject()
          } else {
            console.log('🔄 AUTH STATE CHANGE: Token refreshed - keeping existing project to avoid interrupting uploads')
          }
        } else {
          console.log('🔄 AUTH STATE CHANGE: Other auth event', { event })
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
    switchToProject,
    isUploadInProgress,
    setUploadInProgress
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
