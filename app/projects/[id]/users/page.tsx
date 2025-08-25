"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { ProjectHeader } from "@/components/project-header"
import { useProject } from "@/contexts/ProjectContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Plus, ArrowLeft, Mail, Users } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { InvitationForm } from "@/components/invitation-form"
import { InvitationsList } from "@/components/invitations-list"

export default function ProjectUsersPage() {
  const params = useParams()
  const { activeProject } = useProject()
  const [members, setMembers] = useState<any[]>([])
  const [userRole, setUserRole] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("members")

  useEffect(() => {
    if (activeProject) {
      fetchMembers()
      fetchUserRole()
    }
  }, [activeProject])

  const fetchMembers = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      if (!token) {
        console.error('No authentication token found')
        return
      }

      const response = await fetch(`/api/projects/${activeProject!.id}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMembers(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUserRole = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      if (!token) {
        console.error('No authentication token found')
        return
      }

      const response = await fetch(`/api/projects/${activeProject!.id}/members/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUserRole(data.data?.role || "")
      }
    } catch (error) {
      console.error('Error fetching user role:', error)
    }
  }

  const handleInvitationSent = () => {
    // Refresh invitations list
    setActiveTab("invitations")
  }

  const handleInvitationUpdated = () => {
    // Refresh members list when invitation is accepted
    fetchMembers()
  }

  if (!activeProject) {
    return <div>Cargando proyecto...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <ProjectHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/projects" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Proyectos
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Usuarios</h1>
          <p className="text-gray-600">Administra los miembros del proyecto {activeProject.name}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Miembros
            </TabsTrigger>
            <TabsTrigger value="invitations" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Invitaciones
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-6">
            {/* Members list */}
            <Card className="backdrop-blur-sm bg-white/70 border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Miembros del Proyecto
                </CardTitle>
                <CardDescription>
                  Lista de todos los usuarios que tienen acceso a este proyecto
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Cargando miembros...</p>
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No hay miembros en este proyecto</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg bg-white/50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {member.user?.full_name ? member.user.full_name.charAt(0).toUpperCase() : member.user?.email?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-medium">{member.user?.full_name || 'Sin nombre'}</p>
                            <p className="text-sm text-muted-foreground">{member.user?.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Se unió el {new Date(member.joined_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                            {member.role === 'owner' ? 'Propietario' : 
                             member.role === 'manager' ? 'Administrador' : 
                             member.role === 'member' ? 'Miembro' : 'Solo Lectura'}
                          </Badge>
                          {member.role !== 'owner' && ['owner', 'manager'].includes(userRole) && (
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                              Remover
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations" className="space-y-6">
            {/* Invitation form */}
            {['owner', 'manager'].includes(userRole) && (
              <InvitationForm 
                projectId={activeProject.id} 
                userRole={userRole}
                onInvitationSent={handleInvitationSent}
              />
            )}

            {/* Invitations list */}
            <InvitationsList 
              projectId={activeProject.id}
              userRole={userRole}
              onInvitationUpdated={handleInvitationUpdated}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
