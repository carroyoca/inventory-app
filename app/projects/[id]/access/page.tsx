"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Plus, Mail, Trash2, UserPlus } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ProjectAccess {
  id: string
  user_email: string
  role: string
  granted_at: string
  granted_by: {
    full_name: string
    email: string
  }
}

export default function ProjectAccessPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [project, setProject] = useState<any>(null)
  const [accessList, setAccessList] = useState<ProjectAccess[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGranting, setIsGranting] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState<string | null>(null)
  const [isRemoving, setIsRemoving] = useState<string | null>(null)
  
  const [newAccess, setNewAccess] = useState({
    email: "",
    role: "member"
  })

  const projectId = params.id as string

  useEffect(() => {
    loadProjectData()
  }, [projectId])

  const loadProjectData = async () => {
    try {
      const supabase = createClient()
      
      // Get project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectError) throw projectError
      setProject(projectData)

      // Get current project members
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select(`
          *,
          user:profiles(full_name, email)
        `)
        .eq('project_id', projectId)
        .order('joined_at', { ascending: false })

      if (membersError) throw membersError
      
      // Transform members data to match the expected format
      const transformedData = membersData?.map(member => ({
        id: member.id,
        user_email: member.user?.email || 'Unknown',
        role: member.role,
        granted_at: member.joined_at,
        granted_by: {
          full_name: member.user?.full_name || 'Unknown',
          email: member.user?.email || 'Unknown'
        }
      })) || []
      
      setAccessList(transformedData)

    } catch (error) {
      console.error('Error loading project data:', error)
      toast({
        title: "Error",
        description: "Failed to load project data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const grantAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAccess.email.trim()) return

    setIsGranting(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) throw new Error('No session')

      const response = await fetch('/api/project-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          project_id: projectId,
          user_email: newAccess.email.trim(),
          role: newAccess.role
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to grant access')
      }

      toast({
        title: "Success",
        description: "Access granted successfully"
      })

      // Reset form and reload data
      setNewAccess({ email: "", role: "member" })
      loadProjectData()

    } catch (error) {
      console.error('Error granting access:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to grant access",
        variant: "destructive"
      })
    } finally {
      setIsGranting(false)
    }
  }

  const sendNotificationEmail = async (userEmail: string) => {
    setIsSendingEmail(userEmail)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) throw new Error('No session')

      const response = await fetch('/api/project-access/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          project_id: projectId,
          user_email: userEmail
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send notification')
      }

      toast({
        title: "Success",
        description: "Notification email sent successfully"
      })

    } catch (error) {
      console.error('Error sending notification:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send notification",
        variant: "destructive"
      })
    } finally {
      setIsSendingEmail(null)
    }
  }

  const removeAccess = async (accessId: string) => {
    setIsRemoving(accessId)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) throw new Error('No session')

      const response = await fetch(`/api/project-access?access_id=${accessId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove access')
      }

      toast({
        title: "Success",
        description: "Access removed successfully"
      })

      loadProjectData()

    } catch (error) {
      console.error('Error removing access:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove access",
        variant: "destructive"
      })
    } finally {
      setIsRemoving(null)
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Propietario'
      case 'manager': return 'Administrador'
      case 'member': return 'Miembro'
      case 'viewer': return 'Solo Lectura'
      default: return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-red-100 text-red-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'member': return 'bg-green-100 text-green-800'
      case 'viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        
        <h1 className="text-3xl font-bold">Gestión de Acceso</h1>
        <p className="text-muted-foreground">
          Gestiona quién tiene acceso al proyecto "{project?.name}"
        </p>
      </div>

      <div className="grid gap-6">
        {/* Grant Access Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Conceder Acceso
            </CardTitle>
            <CardDescription>
              Añade usuarios al proyecto por email. Tendrán acceso inmediato cuando creen una cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={grantAccess} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="email">Email del usuario</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@ejemplo.com"
                    value={newAccess.email}
                    onChange={(e) => setNewAccess(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="role">Rol</Label>
                  <Select
                    value={newAccess.role}
                    onValueChange={(value) => setNewAccess(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Miembro</SelectItem>
                      <SelectItem value="manager">Administrador</SelectItem>
                      <SelectItem value="viewer">Solo Lectura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={isGranting} className="w-full">
                    {isGranting ? "Concediendo..." : "Conceder Acceso"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Access List */}
        <Card>
          <CardHeader>
            <CardTitle>Usuarios con Acceso</CardTitle>
            <CardDescription>
              Lista de usuarios que tienen acceso al proyecto
            </CardDescription>
          </CardHeader>
          <CardContent>
            {accessList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay usuarios con acceso al proyecto</p>
                <p className="text-sm">Añade usuarios usando el formulario de arriba</p>
              </div>
            ) : (
              <div className="space-y-4">
                {accessList.map((access) => (
                  <div
                    key={access.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium">{access.user_email}</p>
                        <p className="text-sm text-muted-foreground">
                          Concedido por {access.granted_by.full_name || access.granted_by.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(access.granted_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={getRoleColor(access.role)}>
                        {getRoleLabel(access.role)}
                      </Badge>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendNotificationEmail(access.user_email)}
                        disabled={isSendingEmail === access.user_email}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        {isSendingEmail === access.user_email ? "Enviando..." : "Notificar"}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeAccess(access.id)}
                        disabled={isRemoving === access.id}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {isRemoving === access.id ? "Eliminando..." : "Eliminar"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
