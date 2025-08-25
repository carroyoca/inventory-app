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
              <div style="text-align: center; margin: 30px 0;">
                <a href="${joinUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-right: 10px;">
                  🚀 Unirse al Proyecto
                </a>
                <a href="${signupUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  📝 Crear Cuenta Nueva
                </a>
              </div>
              <p style="font-size: 14px; color: #6b7280; text-align: center;">
                Haz clic en "Unirse al Proyecto" para acceder inmediatamente. Esta invitación expira en 7 días.
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
