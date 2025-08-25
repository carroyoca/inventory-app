"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useProject } from '@/contexts/ProjectContext'
import { ProjectHeader } from '@/components/project-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, Users, Mail, Crown, Shield, User, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ProjectMember {
  id: string
  user_id: string
  project_id: string
  role: 'owner' | 'manager' | 'member' | 'viewer'
  joined_at: string
  user: {
    email: string
    full_name?: string
  }
}

export default function ProjectUsersPage() {
  const router = useRouter()
  const params = useParams()
  const { activeProject, isLoading: projectLoading } = useProject()
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'manager' | 'member' | 'viewer'>('member')
  const [isInviting, setIsInviting] = useState(false)

  const projectId = params.id as string

  useEffect(() => {
    if (projectId && activeProject) {
      fetchMembers()
    }
  }, [projectId, activeProject])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          id,
          user_id,
          project_id,
          role,
          joined_at,
          user:profiles!project_members_user_id_fkey (
            email,
            full_name
          )
        `)
        .eq('project_id', projectId)
        .order('joined_at', { ascending: true })

      if (error) {
        throw error
      }

      setMembers(data || [])
    } catch (error) {
      console.error('Error fetching members:', error)
      setError('Failed to load project members')
    } finally {
      setLoading(false)
    }
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inviteEmail.trim()) {
      alert('Email is required')
      return
    }

    try {
      setIsInviting(true)
      const supabase = createClient()
      
      // For now, we'll just show a placeholder message
      // In Sprint 2, this will integrate with the invitation system
      alert(`Invitation system coming in Sprint 2!\n\nEmail: ${inviteEmail}\nRole: ${inviteRole}`)
      
      // Reset form
      setInviteEmail('')
      setInviteRole('member')
      setShowInviteForm(false)
    } catch (error) {
      console.error('Error inviting user:', error)
      alert('Failed to invite user')
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from this project?`)) {
      return
    }

    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId)
        .eq('project_id', projectId)

      if (error) {
        throw error
      }

      await fetchMembers()
    } catch (error) {
      console.error('Error removing member:', error)
      alert('Failed to remove member')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-yellow-600" />
      case 'manager': return <Shield className="h-4 w-4 text-blue-600" />
      case 'member': return <User className="h-4 w-4 text-green-600" />
      case 'viewer': return <User className="h-4 w-4 text-gray-600" />
      default: return <User className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-yellow-100 text-yellow-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'member': return 'bg-green-100 text-green-800'
      case 'viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando proyecto...</p>
        </div>
      </div>
    )
  }

  if (!activeProject || activeProject.id !== projectId) {
    router.push('/projects')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ProjectHeader />
      <main className="p-6">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.push(`/projects`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Proyectos
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Usuarios del Proyecto</h1>
          <p className="text-gray-600 mt-2">Gestiona los miembros del proyecto "{activeProject.name}"</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Members List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-600" />
                      Miembros del Proyecto
                    </CardTitle>
                    <CardDescription>
                      {members.length} miembro{members.length !== 1 ? 's' : ''} en este proyecto
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => setShowInviteForm(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Invitar Usuario
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Cargando miembros...</span>
                  </div>
                ) : error ? (
                  <div className="text-center py-8 text-red-600">
                    <p>{error}</p>
                    <Button onClick={fetchMembers} variant="outline" className="mt-2">
                      Intentar de nuevo
                    </Button>
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium mb-2">No hay miembros en el proyecto</h3>
                    <p className="mb-4">Invita usuarios para colaborar en este proyecto</p>
                    <Button onClick={() => setShowInviteForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Invitar Primer Usuario
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div 
                        key={member.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            {getRoleIcon(member.role)}
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {member.user.full_name || 'Usuario sin nombre'}
                              </h4>
                              <p className="text-sm text-gray-500 flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {member.user.email}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getRoleBadgeColor(member.role)}>
                            {member.role}
                          </Badge>
                          <Badge variant="secondary">
                            {new Date(member.joined_at).toLocaleDateString()}
                          </Badge>
                          {member.role !== 'owner' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMember(member.id, member.user.email)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Invite User Form */}
          {showInviteForm && (
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Invitar Usuario</CardTitle>
                  <CardDescription>
                    Invita a alguien a colaborar en este proyecto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleInviteUser} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email del Usuario *</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="usuario@ejemplo.com"
                        disabled={isInviting}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="invite-role">Rol *</Label>
                      <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-blue-600" />
                              Manager
                            </div>
                          </SelectItem>
                          <SelectItem value="member">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-green-600" />
                              Member
                            </div>
                          </SelectItem>
                          <SelectItem value="viewer">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-600" />
                              Viewer
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        disabled={isInviting || !inviteEmail.trim()}
                        className="flex-1"
                      >
                        {isInviting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Invitando...
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4 mr-2" />
                            Enviar Invitación
                          </>
                        )}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setShowInviteForm(false)}
                        disabled={isInviting}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
