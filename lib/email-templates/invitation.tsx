import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Link,
  Preview,
  Button,
  Hr,
  Section,
} from '@react-email/components'

interface InvitationEmailProps {
  projectName: string
  inviterName: string
  inviterEmail: string
  role: string
  acceptUrl: string
  rejectUrl: string
}

export const InvitationEmail = ({
  projectName,
  inviterName,
  inviterEmail,
  role,
  acceptUrl,
  rejectUrl,
}: InvitationEmailProps) => {
  const roleDisplayName = {
    owner: 'Propietario',
    manager: 'Administrador',
    member: 'Miembro',
    viewer: 'Solo Lectura'
  }[role] || role

  return (
    <Html>
      <Head />
      <Preview>Invitación para unirse al proyecto {projectName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={logo}>humkio</Text>
          
          <Text style={heading}>¡Has sido invitado a un proyecto!</Text>
          
          <Text style={paragraph}>
            Hola,
          </Text>
          
          <Text style={paragraph}>
            <strong>{inviterName}</strong> ({inviterEmail}) te ha invitado a unirte al proyecto{' '}
            <strong>{projectName}</strong> en humkio.
          </Text>
          
          <Section style={detailsContainer}>
            <Text style={detailLabel}>Proyecto:</Text>
            <Text style={detailValue}>{projectName}</Text>
            
            <Text style={detailLabel}>Rol asignado:</Text>
            <Text style={detailValue}>{roleDisplayName}</Text>
            
            <Text style={detailLabel}>Invitado por:</Text>
            <Text style={detailValue}>{inviterName}</Text>
          </Section>
          
          <Text style={paragraph}>
            Como {roleDisplayName.toLowerCase()}, podrás:
          </Text>
          
          <ul style={permissionsList}>
            {role === 'owner' && (
              <>
                <li style={listItem}>Control total del proyecto</li>
                <li style={listItem}>Gestionar miembros y configuraciones</li>
                <li style={listItem}>Eliminar el proyecto</li>
              </>
            )}
            {role === 'manager' && (
              <>
                <li style={listItem}>Gestionar inventario y miembros</li>
                <li style={listItem}>Enviar invitaciones</li>
                <li style={listItem}>No puede eliminar el proyecto</li>
              </>
            )}
            {role === 'member' && (
              <>
                <li style={listItem}>Añadir y editar items del inventario</li>
                <li style={listItem}>Ver todos los datos del proyecto</li>
              </>
            )}
            {role === 'viewer' && (
              <>
                <li style={listItem}>Ver el inventario</li>
                <li style={listItem}>No puede hacer cambios</li>
              </>
            )}
          </ul>
          
          <Section style={buttonContainer}>
            <Button style={acceptButton} href={acceptUrl}>
              🚀 Unirse al Proyecto
            </Button>
          </Section>
          
          <Hr style={hr} />
          
          <Text style={footer}>
            Haz clic en "Unirse al Proyecto" para acceder inmediatamente. Esta invitación expira en 7 días.
          </Text>
          
          <Text style={footer}>
            Si tienes alguna pregunta, contacta a{' '}
            <Link href={`mailto:${inviterEmail}`} style={link}>
              {inviterEmail}
            </Link>
          </Text>
          
          <Text style={footer}>
            humkio - Sistema de gestión de inventario basado en proyectos
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '560px',
}

const logo = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1f2937',
  textAlign: 'center' as const,
  marginBottom: '30px',
}

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1f2937',
  textAlign: 'center' as const,
  marginBottom: '30px',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#374151',
  marginBottom: '20px',
}

const detailsContainer = {
  backgroundColor: '#f9fafb',
  padding: '20px',
  borderRadius: '8px',
  marginBottom: '30px',
}

const detailLabel = {
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#6b7280',
  marginBottom: '5px',
  marginTop: '15px',
}

const detailValue = {
  fontSize: '16px',
  color: '#1f2937',
  marginBottom: '15px',
}

const permissionsList = {
  marginBottom: '30px',
}

const listItem = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#374151',
  marginBottom: '8px',
}

const buttonContainer = {
  textAlign: 'center' as const,
  marginBottom: '30px',
}

const acceptButton = {
  backgroundColor: '#10b981',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  marginRight: '10px',
}

const rejectButton = {
  backgroundColor: '#ef4444',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
}

const footer = {
  fontSize: '14px',
  color: '#6b7280',
  textAlign: 'center' as const,
  marginBottom: '10px',
}

const link = {
  color: '#3b82f6',
  textDecoration: 'underline',
}
