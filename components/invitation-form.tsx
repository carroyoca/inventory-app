"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { UserPlus, Send, Loader2 } from "lucide-react"
import { getRoleDisplayName, getRoleDescription, canInviteToRole } from "@/lib/utils/invitations"
import { createClient } from "@/lib/supabase/client"
import type { CreateInvitationData } from "@/lib/types/invitations"

interface InvitationFormProps {
  projectId: string
  userRole: string
  onInvitationSent?: () => void
}

export function InvitationForm({ projectId, userRole, onInvitationSent }: InvitationFormProps) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<CreateInvitationData['role']>("member")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const availableRoles = [
    { value: "member", label: "Miembro" },
    { value: "viewer", label: "Solo Lectura" },
    ...(userRole === "owner" ? [{ value: "manager", label: "Administrador" }] : []),
    ...(userRole === "owner" ? [{ value: "owner", label: "Propietario" }] : [])
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un email válido",
        variant: "destructive"
      })
      return
    }

    if (!canInviteToRole(userRole, role)) {
      toast({
        title: "Error",
        description: "No tienes permisos para invitar a este rol",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

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

      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          project_id: projectId,
          invitee_email: email.trim(),
          role
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "¡Invitación enviada!",
          description: `Se ha enviado una invitación a ${email}`,
        })
        setEmail("")
        setRole("member")
        onInvitationSent?.()
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al enviar la invitación",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error sending invitation:', error)
      toast({
        title: "Error",
        description: "Error de conexión. Intenta de nuevo.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Invitar Usuario
        </CardTitle>
        <CardDescription>
          Envía una invitación para que alguien se una a este proyecto
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email del usuario</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rol en el proyecto</Label>
            <Select value={role} onValueChange={(value: CreateInvitationData['role']) => setRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((roleOption) => (
                  <SelectItem key={roleOption.value} value={roleOption.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{roleOption.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {getRoleDescription(roleOption.value)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar Invitación
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
