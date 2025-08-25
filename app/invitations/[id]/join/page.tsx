"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, Loader2, AlertCircle, LogIn } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function JoinProjectPage() {
  const params = useParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'login-required'>('loading')
  const [message, setMessage] = useState('')
  const [projectName, setProjectName] = useState('')

  useEffect(() => {
    const joinProject = async () => {
      try {
        const invitationId = params.id as string
        const supabase = createClient()
        
        // Get current session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user) {
          setStatus('login-required')
          setMessage('Debes iniciar sesión para unirte al proyecto. Si no tienes cuenta, puedes crear una nueva.')
          return
        }

        // Get invitation details to verify email match
        const { data: invitationDetails } = await supabase
          .from('project_invitations')
          .select('invitee_email, status')
          .eq('id', invitationId)
          .single()

        if (!invitationDetails) {
          setStatus('error')
          setMessage('Invitación no encontrada')
          return
        }

        if (invitationDetails.status !== 'pending') {
          setStatus('error')
          setMessage('Esta invitación ya no está pendiente')
          return
        }

        // Verify that the user's email matches the invitation
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', session.user.id)
          .single()

        console.log('🔍 User email:', userProfile?.email)
        console.log('🔍 Invitation ID:', invitationId)

        // Accept the invitation automatically
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
          setMessage('¡Te has unido exitosamente al proyecto!')
          
          // Get project name for better UX
          if (data.data?.project?.name) {
            setProjectName(data.data.project.name)
          }
          
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
        } else {
          setStatus('error')
          setMessage(data.error || 'Error al unirse al proyecto')
        }
      } catch (error) {
        console.error('Error joining project:', error)
        setStatus('error')
        setMessage('Error de conexión')
      }
    }

    joinProject()
  }, [params.id, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {status === 'loading' && 'Uniéndote al proyecto...'}
            {status === 'success' && '¡Bienvenido!'}
            {status === 'error' && 'Error'}
            {status === 'login-required' && 'Inicio de Sesión Requerido'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Estamos procesando tu invitación'}
            {status === 'success' && `Ya eres parte de ${projectName || 'el proyecto'}`}
            {status === 'error' && 'No se pudo procesar la invitación'}
            {status === 'login-required' && 'Necesitas iniciar sesión para continuar'}
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
          
          {status === 'login-required' && (
            <div className="flex justify-center">
              <LogIn className="h-8 w-8 text-orange-600" />
            </div>
          )}
          
          <p className="text-gray-600">{message}</p>
          
          <div className="flex gap-2 justify-center">
            {status === 'login-required' && (
              <>
                <Button onClick={() => router.push('/auth/login')}>
                  Iniciar Sesión
                </Button>
                <Button variant="outline" onClick={() => router.push('/auth/sign-up-invitation')}>
                  Crear Cuenta
                </Button>
              </>
            )}
            
            {status === 'success' && (
              <Button onClick={() => router.push('/dashboard')}>
                Ir al Dashboard
              </Button>
            )}
            
            {status === 'error' && (
              <>
                <Button onClick={() => router.push('/dashboard')}>
                  Ir al Dashboard
                </Button>
                <Button variant="outline" onClick={() => router.push('/projects')}>
                  Ver Proyectos
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
