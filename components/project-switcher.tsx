"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { useProject } from "@/contexts/ProjectContext"
import type { ProjectWithMembers } from "@/lib/types/projects"
import { useToast } from "@/hooks/use-toast"

interface ProjectSwitcherProps {
  selectedProject: ProjectWithMembers
  onSwitch: (project: ProjectWithMembers) => Promise<void>
}

export function ProjectSwitcher({ selectedProject, onSwitch }: ProjectSwitcherProps) {
  const { toast } = useToast()
  const { activeProject, switchToProject } = useProject()
  const router = useRouter()
  const [isSwitching, setIsSwitching] = useState(false)

  const handleSwitch = async () => {
    if (isSwitching) return
    
    setIsSwitching(true)
    try {
      console.log('🔄 ProjectSwitcher: Starting switch to project:', selectedProject.id)
      await switchToProject(selectedProject.id)
      console.log('✅ ProjectSwitcher: Successfully switched to project')
      
      // Add a small delay to ensure state is updated before navigation
      await new Promise(resolve => setTimeout(resolve, 500))
      router.push('/dashboard')
    } catch (error) {
      console.error('❌ ProjectSwitcher: Error switching to project:', error)
      toast({
        title: "Error",
        description: `Error switching to project: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive"
      })
    } finally {
      console.log('🔄 ProjectSwitcher: Setting isSwitching to false')
      setIsSwitching(false)
    }
  }

  return (
    <div className="flex gap-4">
      {activeProject?.id === selectedProject.id ? (
        <Button disabled className="flex items-center gap-2 bg-green-100 text-green-700">
          <Check className="h-4 w-4" />
          Proyecto Actual
        </Button>
      ) : (
        <Button 
          onClick={() => {
            console.log('🔄 ProjectSwitcher: Button clicked, isSwitching:', isSwitching)
            handleSwitch()
          }}
          disabled={isSwitching}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSwitching ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Cambiando...
            </>
          ) : (
            'Cambiar a Este Proyecto'
          )}
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
  )
}
