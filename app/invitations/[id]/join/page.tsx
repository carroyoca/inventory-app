"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, Loader2, AlertCircle, LogIn, UserX } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function JoinProjectPage() {
  const params = useParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'login-required' | 'registration-required'>('loading')
  const [message, setMessage] = useState('')
  const [projectName, setProjectName] = useState('')
  const [invitationEmail, setInvitationEmail] = useState('')

  useEffect(() => {
    const joinProject = async () => {
      try {
        const invitationId = params.id as string
        const supabase = createClient()
        
        // Get current session
        const { data: { session } } = await supabase.auth.getSession()
        
        console.log('🔍 Session check:', !!session)
        console.log('🔍 User check:', !!session?.user)
        
        if (!session?.user) {
          console.log('❌ No authenticated user found')
          setStatus('login-required')
          setMessage('Debes iniciar sesión para unirte al proyecto. Si no tienes cuenta, debes crear una nueva.')
          return
        }

        console.log('✅ User authenticated:', session.user.id)

        // Get invitation details to verify email match
        const { data: invitationDetails } = await supabase
          .from('project_invitations')
          .select('invitee_email, status, project_id')
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

        // Store invitation email for display
        setInvitationEmail(invitationDetails.invitee_email)

        // CRITICAL: Get complete user profile to verify registration is complete
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, full_name, created_at, updated_at')
          .eq('id', session.user.id)
          .single()

        console.log('🔍 User profile check:', !!userProfile)
        console.log('🔍 Profile error:', profileError)

        // STRICT CHECK: Require complete user profile
        if (!userProfile || profileError) {
          console.log('❌ No valid user profile found - user must complete registration first')
          setStatus('registration-required')
          setMessage('Tu cuenta no está completamente registrada. Debes completar tu perfil antes de unirte al proyecto.')
          return
        }

        // Additional check: ensure profile has required fields
        if (!userProfile.email || !userProfile.full_name) {
          console.log('❌ Incomplete profile - missing email or full_name')
          setStatus('registration-required')
          setMessage('Tu perfil está incompleto. Debes completar tu información personal antes de unirte al proyecto.')
          return
        }

        console.log('🔍 User email:', userProfile.email)
        console.log('🔍 Invitation email:', invitationDetails.invitee_email)

        // Verify email matches invitation exactly
        if (userProfile.email.toLowerCase() !== invitationDetails.invitee_email.toLowerCase()) {
          console.log('❌ Email mismatch - cannot accept invitation')
          setStatus('error')
          setMessage(`Esta invitación fue enviada a ${invitationDetails.invitee_email}, pero tu cuenta está registrada con ${userProfile.email}. Debes crear una cuenta con el email correcto para unirte al proyecto.`)
          return
        }

        console.log('✅ Profile validation passed, proceeding with invitation acceptance')

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
          setMessage(data.error || 'Error al unirse al proyecto. Debes crear una cuenta válida para acceder al sistema.')
        }
      } catch (error) {
        console.error('Error joining project:', error)
        setStatus('error')
        setMessage('Error de conexión. Debes crear una cuenta válida para acceder al sistema.')
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
            {status === 'registration-required' && 'Registro Incompleto'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Estamos procesando tu invitación'}
            {status === 'success' && `Ya eres parte de ${projectName || 'el proyecto'}`}
            {status === 'error' && 'No se pudo procesar la invitación'}
            {status === 'login-required' && 'Necesitas iniciar sesión para continuar'}
            {status === 'registration-required' && 'Debes completar tu registro'}
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
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <h3 className="text-red-800 font-medium mb-2">⚠️ Acceso Restringido</h3>
                <p className="text-red-700 text-sm">
                  No puedes acceder al sistema sin una cuenta válida. Debes crear una cuenta primero.
                </p>
              </div>
              <Button onClick={() => router.push('/auth/sign-up-invitation')}>
                Crear Cuenta
              </Button>
              <Button variant="outline" onClick={() => router.push('/auth/login')}>
                Iniciar Sesión
              </Button>
            </>
          )}
          
          {status === 'login-required' && (
            <div className="flex justify-center">
              <LogIn className="h-8 w-8 text-orange-600" />
            </div>
          )}
          
          {status === 'registration-required' && (
            <div className="flex justify-center">
              <UserX className="h-8 w-8 text-red-600" />
            </div>
          )}
          
          <p className="text-gray-600">{message}</p>
          
          {invitationEmail && (status === 'login-required' || status === 'registration-required') && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-yellow-800">Invitación enviada a:</p>
              <p className="text-yellow-700">{invitationEmail}</p>
            </div>
          )}
          
          {status === 'login-required' && (
            <div className="flex gap-2 justify-center">
              <Button onClick={() => router.push('/auth/login')}>
                Iniciar Sesión
              </Button>
              <Button variant="outline" onClick={() => router.push('/auth/sign-up-invitation')}>
                Crear Cuenta
              </Button>
            </div>
          )}
          
          {status === 'registration-required' && (
            <div className="flex gap-2 justify-center">
              <Button onClick={() => router.push('/profile')}>
                Completar Perfil
              </Button>
              <Button variant="outline" onClick={() => router.push('/auth/login')}>
                Ir a Iniciar Sesión
              </Button>
            </div>
          )}
          
          {status === 'success' && (
            <div className="flex gap-2 justify-center">
              <Button onClick={() => router.push('/dashboard')}>
                Ir al Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
