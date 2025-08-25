"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProject } from '@/contexts/ProjectContext'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { 
  FolderOpen, 
  Settings, 
  Plus, 
  ChevronDown, 
  LogOut,
  User
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function ProjectHeader() {
  const { activeProject, setActiveProject, refreshActiveProject, clearProjectState } = useProject()
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      // Clear the project state first
      clearProjectState()
      // Sign out from Supabase
      await supabase.auth.signOut()
      // Redirect to home page
      router.push('/')
      // Force a page reload to clear any cached state
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleProjectSelect = (projectId: string) => {
    // Por ahora, solo refrescamos el proyecto activo
    // En el futuro, aquí se cambiaría el proyecto activo
    refreshActiveProject()
  }

  if (!activeProject) {
    return null
  }

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-6 py-4 sticky top-0 z-50">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo y Título */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl">
              <FolderOpen className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Inventory App</h1>
          </div>
          
          {/* Separador */}
          <div className="w-px h-8 bg-gray-300"></div>
          
          {/* Proyecto Activo */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Proyecto:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto p-2 hover:bg-purple-50">
                  <span className="font-medium text-gray-900">
                    {activeProject.name}
                  </span>
                  <ChevronDown className="ml-2 w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-56">
                    <div className="px-2 py-1.5 text-sm text-gray-500">
                      Proyecto actual
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => router.push('/projects')}
                      className="cursor-pointer"
                    >
                      <Settings className="mr-2 w-4 h-4" />
                      Gestionar Proyectos
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => router.push('/projects')}
                      className="cursor-pointer"
                    >
                      <Plus className="mr-2 w-4 h-4" />
                      Crear Nuevo Proyecto
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => router.push('/inventory')}
                      className="cursor-pointer"
                    >
                      <FolderOpen className="mr-2 w-4 h-4" />
                      Ver Inventario
                    </DropdownMenuItem>
                  </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Acciones del Usuario */}
        <div className="flex items-center space-x-4">
          {/* Usuario */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-auto p-2">
                <User className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">
                  {activeProject.members?.[0]?.role || 'Usuario'}
                </span>
                <ChevronDown className="ml-2 w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                onClick={handleSignOut}
                disabled={isLoading}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 w-4 h-4" />
                {isLoading ? 'Cerrando...' : 'Cerrar Sesión'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
