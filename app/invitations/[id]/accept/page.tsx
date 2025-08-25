"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, Loader2, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function AcceptInvitationPage() {
  const params = useParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const acceptInvitation = async () => {
      try {
        const invitationId = params.id as string
        const supabase = createClient()
        
        // Get current session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user) {
          setStatus('error')
          setMessage('Debes iniciar sesión para aceptar la invitación')
          return
        }

        // Accept the invitation
        const response = await fetch(`/api/invitations/${invitationId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ status: 'accepted' })
        })

        const data = await response.json()

        if (response.ok) {
          setStatus('success')
          setMessage('¡Invitación aceptada exitosamente!')
        } else {
          setStatus('error')
          setMessage(data.error || 'Error al aceptar la invitación')
        }
      } catch (error) {
        console.error('Error accepting invitation:', error)
        setStatus('error')
        setMessage('Error de conexión')
      }
    }

    acceptInvitation()
  }, [params.id])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {status === 'loading' && 'Procesando invitación...'}
            {status === 'success' && '¡Invitación Aceptada!'}
            {status === 'error' && 'Error'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Estamos procesando tu invitación'}
            {status === 'success' && 'Ya puedes acceder al proyecto'}
            {status === 'error' && 'No se pudo procesar la invitación'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'loading' && (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}
          
          {status === 'success' && (
            <div className="flex justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
          )}
          
          {status === 'error' && (
            <div className="flex justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          )}
          
          <p className="text-gray-600">{message}</p>
          
          <div className="flex gap-2 justify-center">
            <Button onClick={() => router.push('/dashboard')}>
              Ir al Dashboard
            </Button>
            <Button variant="outline" onClick={() => router.push('/projects')}>
              Ver Proyectos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
