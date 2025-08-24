// Sprint 1: Tipos para el sistema de proyectos

export type ProjectRole = 'owner' | 'manager' | 'member' | 'viewer';

export interface Project {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  joined_at: string;
  // Campos adicionales que se pueden expandir
  user?: {
    email: string;
    full_name?: string;
  };
}

export interface ProjectWithMembers extends Project {
  members: ProjectMember[];
  member_count: number;
}

export interface CreateProjectData {
  name: string;
  description?: string;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
}

export interface ProjectInvitation {
  id: string;
  project_id: string;
  email: string;
  role: ProjectRole;
  invited_by: string;
  invited_at: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'expired';
}

// Tipos para las respuestas de la API
export interface ProjectsResponse {
  projects: ProjectWithMembers[];
  total: number;
}

export interface ProjectResponse {
  project: ProjectWithMembers;
}

export interface CreateProjectResponse {
  project: Project;
  message: string;
}

export interface UpdateProjectResponse {
  project: Project;
  message: string;
}

export interface DeleteProjectResponse {
  message: string;
  deleted_project_id: string;
}
