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

    console.log('📧 Preparing email with URL:', joinUrl)
    
    const { data, error } = await resend.emails.send({
      from: 'Art Inventory <onboarding@resend.dev>',
      to: [to],
      subject: `Invitación para unirse al proyecto ${projectName}`,
      react: InvitationEmail({
        projectName,
        inviterName,
        inviterEmail,
        role,
        acceptUrl: joinUrl,
        rejectUrl: joinUrl, // Not used anymore but keeping for compatibility
      }),
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
