"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Mail, 
  Clock, 
  Check, 
  X, 
  Trash2, 
  User, 
  Calendar,
  Loader2,
  RefreshCw
} from "lucide-react"
import { 
  getStatusDisplayName, 
  getStatusColor, 
  getRoleDisplayName, 
  formatInvitationExpiryDate 
} from "@/lib/utils/invitations"
import { createClient } from "@/lib/supabase/client"
import type { ProjectInvitationWithDetails } from "@/lib/types/invitations"

interface InvitationsListProps {
  projectId?: string
  userRole: string
  onInvitationUpdated?: () => void
}

export function InvitationsList({ projectId, userRole, onInvitationUpdated }: InvitationsListProps) {
  const [invitations, setInvitations] = useState<ProjectInvitationWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  const fetchInvitations = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      if (!token) {
        console.error('No authentication token found')
        return
      }

      const url = projectId 
        ? `/api/invitations?project_id=${projectId}`
        : '/api/invitations'
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        setInvitations(data.data || [])
      } else {
        console.error('Error fetching invitations:', data.error)
        toast({
          title: "Error",
          description: "No se pudieron cargar las invitaciones",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error fetching invitations:', error)
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchInvitations()
  }, [projectId])

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      console.log('🔍 === ACCEPT INVITATION START ===')
      console.log('🔍 Invitation ID:', invitationId)
      
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      console.log('🔍 Session exists:', !!session)
      console.log('🔍 Token exists:', !!token)
      console.log('🔍 Token preview:', token ? token.substring(0, 20) + '...' : 'No token')
      
      if (!token) {
        console.log('❌ No authentication token found')
        toast({
          title: "Error",
          description: "No se pudo obtener el token de autenticación",
          variant: "destructive"
        })
        return
      }

      console.log('🔍 Making PATCH request to:', `/api/invitations/${invitationId}`)
      
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'accepted' })
      })

      console.log('🔍 Response status:', response.status)
      console.log('🔍 Response headers:', Object.fromEntries(response.headers.entries()))

      const data = await response.json()
      console.log('🔍 Response data:', data)

      if (response.ok) {
        console.log('✅ Invitation accepted successfully')
        toast({
          title: "¡Invitación aceptada!",
          description: "Ya puedes acceder al proyecto",
        })
        fetchInvitations()
        onInvitationUpdated?.()
      } else {
        console.log('❌ Error accepting invitation:', data.error)
        toast({
          title: "Error",
          description: data.error || "Error al aceptar la invitación",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('❌ Error accepting invitation:', error)
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive"
      })
    }
    console.log('🔍 === ACCEPT INVITATION END ===')
  }



  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta invitación?')) {
      return
    }

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      if (!token) {
        toast({
          title: "Error",
          description: "No se pudo obtener el token de autenticación",
          variant: "destructive"
        })
        return
      }

      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Invitación eliminada",
          description: "La invitación ha sido eliminada",
        })
        fetchInvitations()
        onInvitationUpdated?.()
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al eliminar la invitación",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error deleting invitation:', error)
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive"
      })
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Cargando invitaciones...</span>
        </CardContent>
      </Card>
    )
  }

  if (invitations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Mail className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay invitaciones</h3>
          <p className="text-muted-foreground mb-4">
            {projectId 
              ? "No hay invitaciones pendientes para este proyecto"
              : "No tienes invitaciones pendientes"
            }
          </p>
          <Button 
            onClick={() => { setIsRefreshing(true); fetchInvitations(); }}
            variant="outline"
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Actualizar
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Invitaciones</h3>
        <Button 
          onClick={() => { setIsRefreshing(true); fetchInvitations(); }}
          variant="outline"
          size="sm"
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="grid gap-4">
        {invitations.map((invitation) => (
          <Card key={invitation.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {invitation.invitee_email}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Proyecto: <strong>{invitation.project.name}</strong>
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(invitation.status)}>
                  {getStatusDisplayName(invitation.status)}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Rol:</span>
                  <div className="font-medium">{getRoleDisplayName(invitation.role)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Invitado por:</span>
                  <div className="font-medium">
                    {invitation.inviter.full_name || invitation.inviter.email}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Fecha:</span>
                  <div className="font-medium">
                    {new Date(invitation.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Expira:</span>
                  <div className="font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatInvitationExpiryDate(invitation.expires_at)}
                  </div>
                </div>
              </div>

                                {/* Action buttons */}
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    {invitation.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleAcceptInvitation(invitation.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Aceptar Invitación
                      </Button>
                    )}
                
                {/* Only owners/managers can delete invitations */}
                {['owner', 'manager'].includes(userRole) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteInvitation(invitation.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
