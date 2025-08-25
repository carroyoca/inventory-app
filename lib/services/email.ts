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
    // Check if Resend is configured
    if (!resend) {
      console.log('Resend not configured, skipping email send')
      return { success: false, reason: 'Resend not configured' }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const acceptUrl = `${baseUrl}/invitations/${invitationId}/accept`
    const rejectUrl = `${baseUrl}/invitations/${invitationId}/reject`

    const { data, error } = await resend.emails.send({
      from: 'Art Inventory <noreply@artinventory.com>',
      to: [to],
      subject: `Invitación para unirse al proyecto ${projectName}`,
      react: InvitationEmail({
        projectName,
        inviterName,
        inviterEmail,
        role,
        acceptUrl,
        rejectUrl,
      }),
    })

    if (error) {
      console.error('Error sending invitation email:', error)
      throw error
    }

    console.log('Invitation email sent successfully:', data)
    return data
  } catch (error) {
    console.error('Failed to send invitation email:', error)
    throw error
  }
}
