export interface ProjectInvitation {
  id: string
  project_id: string
  inviter_id: string
  invitee_email: string
  role: 'owner' | 'manager' | 'member' | 'viewer'
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  token: string
  expires_at: string
  created_at: string
  updated_at: string
  accepted_at?: string
  rejected_at?: string
}

export interface ProjectInvitationWithDetails extends ProjectInvitation {
  project: {
    id: string
    name: string
    description?: string
  }
  inviter: {
    id: string
    full_name?: string
    email: string
  }
}

export interface CreateInvitationData {
  project_id: string
  invitee_email: string
  role: 'owner' | 'manager' | 'member' | 'viewer'
}

export interface UpdateInvitationData {
  status: 'accepted' | 'rejected'
}

export interface InvitationResponse {
  success: boolean
  data?: ProjectInvitation | ProjectInvitationWithDetails
  error?: string
  message?: string
}

export interface InvitationsListResponse {
  success: boolean
  data?: ProjectInvitationWithDetails[]
  error?: string
}

export interface InvitationStats {
  pending: number
  accepted: number
  rejected: number
  expired: number
  total: number
}
