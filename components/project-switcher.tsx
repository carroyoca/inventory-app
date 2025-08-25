"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { useProject } from "@/contexts/ProjectContext"
import type { ProjectWithMembers } from "@/lib/types/projects"

interface ProjectSwitcherProps {
  selectedProject: ProjectWithMembers
  onSwitch: (project: ProjectWithMembers) => Promise<void>
}

export function ProjectSwitcher({ selectedProject, onSwitch }: ProjectSwitcherProps) {
  const { activeProject, switchToProject } = useProject()
  const router = useRouter()
  const [isSwitching, setIsSwitching] = useState(false)

  const handleSwitch = async () => {
    if (isSwitching) return
    
    setIsSwitching(true)
    try {
      await switchToProject(selectedProject.id)
      router.push('/dashboard')
    } catch (error) {
      console.error('Error switching to project:', error)
      alert('Error switching to project. Please try again.')
    } finally {
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
          onClick={handleSwitch}
          disabled={isSwitching}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
        >
          {isSwitching ? 'Cambiando...' : 'Cambiar a Este Proyecto'}
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
