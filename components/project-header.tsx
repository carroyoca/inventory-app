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
  User,
  Menu,
  X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export function ProjectHeader() {
  const { activeProject, setActiveProject, refreshActiveProject, clearProjectState } = useProject()
  const [isLoading, setIsLoading] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
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
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-4 md:px-6 py-4 sticky top-0 z-50">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo y Título */}
        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 md:w-9 md:h-9 relative rounded-xl overflow-hidden bg-white">
              <Image src="/humkio.png" alt="humkio" fill sizes="36px" className="object-cover" />
            </div>
            <h1 className="text-lg md:text-xl font-bold text-gray-900">humkio</h1>
          </div>
          
          {/* Separador - Hidden on mobile */}
          <div className="hidden md:block w-px h-8 bg-gray-300"></div>
          
          {/* Proyecto Activo - Hidden on mobile, shown in mobile menu */}
          <div className="hidden md:flex items-center space-x-2">
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

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-auto p-2">
                <User className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">
                  {(activeProject as any).members?.[0]?.role || 'Usuario'}
                </span>
                <ChevronDown className="ml-2 w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                onClick={() => router.push('/profile')}
                className="cursor-pointer"
              >
                <User className="mr-2 w-4 h-4" />
                Mi Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden p-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200/50 shadow-lg">
          <div className="px-4 py-4 space-y-3">
            {/* Current Project */}
            <div className="pb-2 border-b border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Proyecto actual</p>
              <p className="font-medium text-gray-900">{activeProject.name}</p>
            </div>
            
            {/* Navigation Items */}
            <button
              onClick={() => {
                router.push('/inventory')
                setIsMobileMenuOpen(false)
              }}
              className="w-full flex items-center px-3 py-2 text-left rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FolderOpen className="mr-3 w-4 h-4" />
              Ver Inventario
            </button>
            
            <button
              onClick={() => {
                router.push('/projects')
                setIsMobileMenuOpen(false)
              }}
              className="w-full flex items-center px-3 py-2 text-left rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Settings className="mr-3 w-4 h-4" />
              Gestionar Proyectos
            </button>
            
            <button
              onClick={() => {
                router.push('/projects')
                setIsMobileMenuOpen(false)
              }}
              className="w-full flex items-center px-3 py-2 text-left rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus className="mr-3 w-4 h-4" />
              Crear Nuevo Proyecto
            </button>
            
            {/* User Actions */}
            <div className="pt-2 border-t border-gray-200">
              <button
                onClick={() => {
                  router.push('/profile')
                  setIsMobileMenuOpen(false)
                }}
                className="w-full flex items-center px-3 py-2 text-left rounded-lg hover:bg-gray-50 transition-colors"
              >
                <User className="mr-3 w-4 h-4" />
                Mi Perfil
              </button>
              
              <button
                onClick={() => {
                  handleSignOut()
                  setIsMobileMenuOpen(false)
                }}
                disabled={isLoading}
                className="w-full flex items-center px-3 py-2 text-left rounded-lg hover:bg-red-50 text-red-600 transition-colors disabled:opacity-50"
              >
                <LogOut className="mr-3 w-4 h-4" />
                {isLoading ? 'Cerrando...' : 'Cerrar Sesión'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
