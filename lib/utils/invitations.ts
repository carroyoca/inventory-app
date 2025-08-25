import { randomBytes } from 'crypto'

export function generateInvitationToken(): string {
  return randomBytes(32).toString('hex')
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function formatInvitationExpiryDate(expiresAt: string): string {
  const date = new Date(expiresAt)
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays <= 0) {
    return 'Expirada'
  } else if (diffDays === 1) {
    return 'Expira mañana'
  } else {
    return `Expira en ${diffDays} días`
  }
}

export function getRoleDisplayName(role: string): string {
  const roleNames = {
    owner: 'Propietario',
    manager: 'Administrador',
    member: 'Miembro',
    viewer: 'Solo Lectura'
  }
  return roleNames[role as keyof typeof roleNames] || role
}

export function getRoleDescription(role: string): string {
  const roleDescriptions = {
    owner: 'Control total del proyecto, puede gestionar miembros y configuraciones',
    manager: 'Puede gestionar inventario y miembros, pero no puede eliminar el proyecto',
    member: 'Puede añadir y editar items del inventario',
    viewer: 'Solo puede ver el inventario, no puede hacer cambios'
  }
  return roleDescriptions[role as keyof typeof roleDescriptions] || ''
}

export function getStatusDisplayName(status: string): string {
  const statusNames = {
    pending: 'Pendiente',
    accepted: 'Aceptada',
    rejected: 'Rechazada',
    expired: 'Expirada'
  }
  return statusNames[status as keyof typeof statusNames] || status
}

export function getStatusColor(status: string): string {
  const statusColors = {
    pending: 'text-yellow-600 bg-yellow-50',
    accepted: 'text-green-600 bg-green-50',
    rejected: 'text-red-600 bg-red-50',
    expired: 'text-gray-600 bg-gray-50'
  }
  return statusColors[status as keyof typeof statusColors] || 'text-gray-600 bg-gray-50'
}

export function canManageInvitations(userRole: string): boolean {
  return ['owner', 'manager'].includes(userRole)
}

export function canInviteToRole(inviterRole: string, targetRole: string): boolean {
  // Owners can invite anyone to any role
  if (inviterRole === 'owner') return true
  
  // Managers can invite members and viewers, but not owners or managers
  if (inviterRole === 'manager') {
    return ['member', 'viewer'].includes(targetRole)
  }
  
  return false
}
