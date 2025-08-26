import { Resend } from 'resend'
import { InvitationEmail } from '@/lib/email-templates/invitation'

const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

export async function sendInvitationEmail({
  to,
  projectName,
  inviterName,
  inviterEmail,
  role,
  invitationId,
}: {
  to: string
  projectName: string
  inviterName: string
  inviterEmail: string
  role: string
  invitationId: string
}) {
  try {
    console.log('📧 === SEND INVITATION EMAIL START ===')
    console.log('📧 To:', to)
    console.log('📧 Project:', projectName)
    console.log('📧 Inviter:', inviterName)
    console.log('📧 Role:', role)
    console.log('📧 Invitation ID:', invitationId)
    
    // Check if Resend is configured
    if (!resend) {
      console.log('❌ Resend not configured, skipping email send')
      return { success: false, reason: 'Resend not configured' }
    }
    
    console.log('✅ Resend client available')

            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const joinUrl = `${baseUrl}/invitations/${invitationId}/join`
        const signupUrl = `${baseUrl}/auth/sign-up-invitation?email=${encodeURIComponent(to)}&invitation=${invitationId}`

    console.log('📧 Preparing email with URL:', joinUrl)
    
            const { data, error } = await resend.emails.send({
          from: 'Art Inventory <onboarding@resend.dev>',
          to: [to],
          subject: `Invitación para unirse al proyecto ${projectName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>¡Has sido invitado a un proyecto!</h2>
              <p>Hola,</p>
              <p><strong>${inviterName}</strong> (${inviterEmail}) te ha invitado a unirte al proyecto <strong>${projectName}</strong> en Art Inventory.</p>
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Proyecto:</strong> ${projectName}</p>
                <p><strong>Rol asignado:</strong> ${role === 'owner' ? 'Propietario' : role === 'manager' ? 'Administrador' : role === 'member' ? 'Miembro' : 'Solo Lectura'}</p>
                <p><strong>Invitado por:</strong> ${inviterName}</p>
              </div>
              
              <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #d97706; margin-top: 0;">⚠️ IMPORTANTE: Debes crear una cuenta primero</h3>
                <p style="margin-bottom: 10px;"><strong>Antes de unirte al proyecto, necesitas crear una cuenta en Art Inventory.</strong></p>
                <p style="margin-bottom: 0;">Si ya tienes una cuenta, simplemente inicia sesión y luego haz clic en "Unirse al Proyecto".</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${signupUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-right: 10px;">
                  📝 Crear Cuenta Nueva
                </a>
                <a href="${joinUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  🚀 Unirse al Proyecto
                </a>
              </div>
              
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin-top: 0;">📋 Pasos para unirte al proyecto:</h4>
                <ol style="margin: 0; padding-left: 20px;">
                  <li><strong>Crear cuenta:</strong> Si no tienes una cuenta, haz clic en "Crear Cuenta Nueva"</li>
                  <li><strong>Iniciar sesión:</strong> Si ya tienes cuenta, inicia sesión en Art Inventory</li>
                  <li><strong>Unirse al proyecto:</strong> Una vez autenticado, haz clic en "Unirse al Proyecto"</li>
                </ol>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; text-align: center;">
                Esta invitación expira en 7 días. No podrás acceder al proyecto sin crear una cuenta primero.
              </p>
            </div>
          `,
        })

    if (error) {
      console.error('❌ Error sending invitation email:', error)
      throw error
    }

    console.log('✅ Invitation email sent successfully:', data)
    return data
  } catch (error) {
    console.error('Failed to send invitation email:', error)
    throw error
  }
}

export async function sendAccessNotificationEmail({
  to,
  projectName,
  grantedBy,
  role,
}: {
  to: string
  projectName: string
  grantedBy: string
  role: string
}) {
  try {
    console.log('📧 === SEND ACCESS NOTIFICATION EMAIL START ===')
    console.log('📧 To:', to)
    console.log('📧 Project:', projectName)
    console.log('📧 Granted by:', grantedBy)
    console.log('📧 Role:', role)
    
    // Check if Resend is configured
    if (!resend) {
      console.log('❌ Resend not configured, skipping email send')
      return { success: false, reason: 'Resend not configured' }
    }
    
    console.log('✅ Resend client available')

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const loginUrl = `${baseUrl}/auth/login`
    const signupUrl = `${baseUrl}/auth/sign-up`

    console.log('📧 Preparing access notification email')
    
    const { data, error } = await resend.emails.send({
      from: 'Art Inventory <onboarding@resend.dev>',
      to: [to],
      subject: `Acceso concedido al proyecto ${projectName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>¡Tienes acceso a un proyecto!</h2>
          <p>Hola,</p>
          <p><strong>${grantedBy}</strong> te ha concedido acceso al proyecto <strong>${projectName}</strong> en Art Inventory.</p>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Proyecto:</strong> ${projectName}</p>
            <p><strong>Rol asignado:</strong> ${role === 'owner' ? 'Propietario' : role === 'manager' ? 'Administrador' : role === 'member' ? 'Miembro' : 'Solo Lectura'}</p>
            <p><strong>Acceso concedido por:</strong> ${grantedBy}</p>
          </div>
          
          <div style="background-color: #dbeafe; border: 1px solid #3b82f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1d4ed8; margin-top: 0;">🎉 ¡Acceso inmediato disponible!</h3>
            <p style="margin-bottom: 10px;"><strong>Ya tienes acceso al proyecto. Solo necesitas crear una cuenta o iniciar sesión.</strong></p>
            <p style="margin-bottom: 0;">Una vez que accedas, verás el proyecto automáticamente en tu dashboard.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${signupUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-right: 10px;">
              📝 Crear Cuenta Nueva
            </a>
            <a href="${loginUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              🔑 Iniciar Sesión
            </a>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0;">📋 Cómo acceder al proyecto:</h4>
            <ol style="margin: 0; padding-left: 20px;">
              <li><strong>Crear cuenta:</strong> Si no tienes una cuenta, haz clic en "Crear Cuenta Nueva"</li>
              <li><strong>Iniciar sesión:</strong> Si ya tienes cuenta, inicia sesión en Art Inventory</li>
              <li><strong>Acceso automático:</strong> Una vez autenticado, verás el proyecto en tu dashboard</li>
            </ol>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; text-align: center;">
            Tu acceso está activo y listo para usar. No necesitas aceptar ninguna invitación.
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('❌ Error sending access notification email:', error)
      throw error
    }

    console.log('✅ Access notification email sent successfully:', data)
    return data
  } catch (error) {
    console.error('Failed to send access notification email:', error)
    throw error
  }
}
