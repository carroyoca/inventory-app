# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Art Inventory Management Application - a modern, full-stack web application built with Next.js 15 for managing art collections through a project-based system. The application features user authentication, multi-project support, photo management, and collaborative access management.

## Architecture & Tech Stack

### Core Technologies
- **Frontend Framework**: Next.js 15 (App Router), React 18, TypeScript 5
- **Styling**: Tailwind CSS v4 with PostCSS, shadcn/ui component system
- **Backend**: Supabase (PostgreSQL + Row Level Security + Auth + Realtime)
- **State Management**: React Context API (`ProjectContext`), React hooks
- **File Storage**: Vercel Blob for photo uploads and management
- **Email Service**: Resend with React Email templates (`@react-email/components`)
- **Form Handling**: React Hook Form with Zod validation
- **UI Components**: Radix UI primitives via shadcn/ui
- **Icons**: Lucide React icon library
- **Deployment**: Vercel with custom CORS configuration and environment variables
- **Package Manager**: npm with lock file integrity
- **Development**: TypeScript strict mode, ESLint configuration

### Key Architecture Patterns
- **Project-based Multi-tenancy**: Users can belong to multiple projects with different roles
- **Row Level Security (RLS)**: Database-level access control for all tables
- **Context-based State Management**: `ProjectContext` manages active project state
- **Middleware Authentication**: Next.js middleware handles auth flows and project access
- **Component-based UI**: shadcn/ui component library with consistent design system

## Development Commands

```bash
# Development
npm run dev          # Start development server on localhost:3000
npm run build        # Build production application
npm run start        # Start production server
npm run lint         # Run ESLint

# Database management (run these in order for new setups)
# Scripts are in /scripts/ folder - run in Supabase SQL editor
001_create_inventory_schema.sql     # Core inventory tables
002_create_profiles.sql             # User profiles extending auth
003_seed_sample_data.sql            # Sample data for testing
004_create_projects_schema.sql      # Multi-tenant project system
005_migrate_existing_data.sql       # Data migration from single to multi-tenant
006_create_project_areas.sql        # Project areas and zones
007_create_invitations_schema.sql   # User invitation system
008_create_project_categories.sql   # Inventory categorization
009_fix_missing_rls_policies.sql    # Critical RLS security policies
010_database_security_audit.sql     # Database security validation
011_fix_rls_circular_dependency.sql # Fix RLS circular reference issues

# Database utilities (Node.js scripts)
node scripts/check-db-structure.js  # Validate database structure
node scripts/monitor-logs.js         # Monitor database logs
node scripts/test-email-direct.js    # Test email system
node scripts/cleanup-invitations.js  # Clean up invitation data
```

## Database Schema

### Core Tables
- `inventory_items`: Main inventory data with photos (JSONB), pricing, status
- `projects`: Project containers with metadata
- `project_members`: User-project relationships with roles (owner/manager/member/viewer)
- `pending_project_access`: Pending access grants for users who haven't signed up yet
- `profiles`: User profile information extending Supabase auth
- `project_areas`: Organizational zones within projects (house zones, rooms)
- `inventory_types`: Categorization system for items

### Key Relationships
- Users can belong to multiple projects via `project_members`
- Each `inventory_item` belongs to one project
- `pending_project_access` stores access grants for non-existent users
- Automatic trigger processes pending access when users sign up
- All tables use UUID primary keys and have RLS policies
- Foreign key constraints ensure data integrity

### Access Management System
- **Active Access**: Users with accounts stored in `project_members`
- **Pending Access**: Non-users stored in `pending_project_access` with expiration
- **Automatic Enrollment**: Database trigger (`process_pending_access_on_signup`) automatically adds users to projects when they create accounts
- **Email Notifications**: System can send emails to both existing and non-existing users

## Project Context & State Management

### ProjectContext Architecture (`/contexts/ProjectContext.tsx`)

The application uses a centralized `ProjectContext` that provides:

**State Management:**
- `activeProject`: Currently selected project object (with member info)
- `isLoading`: Boolean indicating project operations in progress
- `setActiveProject()`: Direct project setter
- `clearProjectState()`: Clears all project state (used on logout)

**Core Operations:**
- `getActiveProject()`: Fetches user's most recent project automatically
- `switchToProject(projectId)`: Changes to specific project with validation
- `refreshActiveProject()`: Reloads current project data

**Advanced Features:**
- **Automatic Authentication Sync**: Listens to Supabase auth state changes
- **Error Handling**: Comprehensive error logging and graceful fallbacks  
- **Loading States**: Proper loading management during async operations
- **Member Count Integration**: Fetches and displays accurate project member counts
- **Security Validation**: RLS policy compliance and access verification

### Context Integration Pattern

```typescript
const { activeProject, isLoading, switchToProject } = useProject()

// Safe project switching with error handling
try {
  await switchToProject(newProjectId)
  // Success - project switched
} catch (error) {
  // Handle specific error types (RLS, access denied, etc.)
}
```

### Loading and Error States

**Loading Management:**
- Context sets `isLoading: true` during all async operations
- Components can show loading spinners based on `isLoading` state
- Loading state is always properly reset on completion/error

**Error Scenarios:**
- **RLS Policy Violations**: User doesn't have access to requested project
- **Network Errors**: Database connection issues
- **Invalid Project IDs**: Project doesn't exist or user not authorized
- **Authentication Issues**: User session expired during operation

## Authentication & Authorization

### Comprehensive Auth Flow
1. **Initial Authentication**: Supabase handles authentication (email/password, magic links, OAuth)
2. **Middleware Processing**: `/middleware.ts` runs on every request (except static files)
   - Checks environment variables availability
   - Creates Supabase client with cookie management
   - Verifies user authentication status
3. **Profile Validation**: For authenticated users, middleware checks:
   - User has complete profile in `profiles` table
   - Profile includes required fields: `email`, `full_name`
   - Redirects to profile completion if incomplete
4. **Project Access Control**: For protected routes, middleware verifies:
   - User belongs to at least one project
   - Redirects to project selection if no projects
5. **Route-Specific Logic**: Special handling for invitation routes and public routes

### Middleware Architecture (`/middleware.ts`)

**Route Classification:**
- **Public Routes**: `/`, `/auth/*` - No authentication required
- **Invitation Routes**: `/invitations/*` - Requires complete authentication and profile
- **Project-Required Routes**: `/dashboard`, `/inventory` - Requires active project membership
- **Always Accessible**: `/projects`, `/select-project`, `/profile` - Authenticated users only

**Error Handling:**
- Invalid sessions are cleared automatically
- Authentication errors fall back gracefully
- Extensive logging for debugging auth flows

### Access Control Layers

1. **Database Level**: Row Level Security (RLS) policies on all tables
2. **Route Level**: Next.js middleware protection for authenticated routes  
3. **Component Level**: `<AuthGuard>` components and role-based rendering
4. **API Level**: Server-side auth verification with service role client
5. **Context Level**: `ProjectContext` manages project access state

### Key Auth Routes
- `/auth/login` - Sign in page with redirect support
- `/auth/sign-up` - Account creation 
- `/auth/sign-up-invitation` - Profile completion for invitations (special handling)
- `/auth/sign-up-success` - Post-registration success page
- `/auth/callback` - OAuth callback handling
- `/auth/auth-code-error` - Authentication error handling
- `/auth/signout` - Logout endpoint

## API Structure

All API routes are in `/app/api/`:

### Projects API (`/api/projects/`)
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create new project
- `GET /api/projects/[id]` - Get project details
- `PUT /api/projects/[id]` - Update project
- `GET /api/projects/[id]/members` - List project members
- `GET /api/projects/[id]/members/me` - Get current user's membership info
- `GET /api/projects/[id]/stats` - Project analytics
- `GET /api/projects/[id]/analytics` - Detailed project analytics
- `GET /api/projects/[id]/areas` - List project areas/zones
- `GET /api/projects/[id]/house-zones` - List house zones for organization
- `GET /api/projects/[id]/inventory-types` - List inventory categories/types
- `GET /api/projects/[id]/export` - Export project data

### Inventory Management API
- `DELETE /api/delete-item` - Remove inventory item
- `POST /api/upload` - Handle photo uploads to Vercel Blob
- `DELETE /api/delete-photo` - Remove photo from inventory item

### Access Management API (`/api/project-access/`)
- `GET /api/project-access?project_id={id}` - List project access (active and pending)
- `POST /api/project-access` - Grant project access (creates pending access for non-users)
- `DELETE /api/project-access?access_id={id}` - Remove project access (handles both active and pending)
- `POST /api/project-access/notify` - Send access notification emails to any user

### API Response Formats

**Project Access List Response:**
```json
{
  "accessList": [
    {
      "id": "member_id",
      "user_email": "user@example.com",
      "role": "member",
      "granted_at": "2024-01-01T00:00:00Z",
      "granted_by": { "full_name": "Granter Name", "email": "granter@example.com" },
      "status": "active"
    },
    {
      "id": "pending_uuid",
      "user_email": "pending@example.com", 
      "role": "member",
      "granted_at": "2024-01-01T00:00:00Z",
      "granted_by": { "full_name": "Granter Name", "email": "granter@example.com" },
      "status": "pending",
      "expires_at": "2024-02-01T00:00:00Z"
    }
  ],
  "summary": {
    "active": 5,
    "pending": 2,
    "total": 7
  }
}
```

**Error Response Format:**
```json
{
  "error": "Error message",
  "alreadyMember": true  // Optional flag for duplicate member errors
}
```

## Environment Variables

### Required Environment Variables

```bash
# Supabase Configuration (Note: Using custom naming convention)
NEXT_PUBLIC_INVAPPSUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_INVAPPSUPABASE_ANON_KEY=your_supabase_anon_key

# Email Service (Resend) - Required for notifications and invitations
RESEND_API_KEY=your_resend_api_key

# File Storage (Vercel Blob) - Required for photo uploads
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

# Application URLs
NEXT_PUBLIC_APP_URL=https://your-production-domain.vercel.app  # Used in emails and callbacks
```

### Development vs Production

**Development (.env.local):**
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
# All other variables remain the same
```

**Production (Vercel Environment Variables):**
- Set all variables in Vercel Dashboard → Project Settings → Environment Variables
- Use production URLs for NEXT_PUBLIC_APP_URL
- Ensure RESEND_API_KEY is configured for email functionality
- BLOB_READ_WRITE_TOKEN must be set for photo uploads to work

### Configuration Notes

- **Custom Supabase Naming**: This project uses `INVAPPSUPABASE` prefix instead of standard `SUPABASE` 
- **Email Service**: Without RESEND_API_KEY, email notifications will fail silently
- **File Storage**: BLOB_READ_WRITE_TOKEN is required for photo upload functionality
- **URL Configuration**: NEXT_PUBLIC_APP_URL is used in email templates and OAuth callbacks

## File Storage & Photos

- **Service**: Vercel Blob
- **Implementation**: `/api/upload` handles photo uploads
- **Storage**: Photos stored as JSONB array in `inventory_items.photos`
- **Pattern**: Upload to blob → Save URL in database → Display via Next.js Image

## Email System

### Resend Integration (`/lib/services/email.ts`)

**Email Types:**
- **Invitation Emails**: `sendInvitationEmail()` - For traditional invitation flow with signup links
- **Access Notification Emails**: `sendAccessNotificationEmail()` - For direct access grants (existing or new users)

**Template Features:**
- **Responsive HTML Design**: Mobile-optimized email layouts
- **Spanish Language Support**: All emails in Spanish with proper formatting
- **Multiple Call-to-Actions**: Different buttons for signup vs. login vs. project joining
- **Role Display**: Proper Spanish role translations (owner → Propietario, etc.)
- **Expiration Notices**: Clear expiration information for time-sensitive emails

**Email Configuration:**
- **From Address**: `Art Inventory <onboarding@resend.dev>`
- **Template Engine**: Pure HTML strings with variable interpolation
- **URL Generation**: Dynamic URLs based on `NEXT_PUBLIC_APP_URL` environment variable
- **Error Handling**: Graceful fallback when RESEND_API_KEY is missing
- **Logging**: Comprehensive logging for debugging email delivery issues

**Key Functions:**
```typescript
// For invitation-based access
await sendInvitationEmail({
  to: 'user@example.com',
  projectName: 'My Art Project',
  inviterName: 'John Doe',
  inviterEmail: 'john@example.com',
  role: 'member',
  invitationId: 'uuid'
})

// For direct access notifications  
await sendAccessNotificationEmail({
  to: 'user@example.com',
  projectName: 'My Art Project',
  grantedBy: 'John Doe',
  role: 'member'
})
```

## Important File Locations

### Core Configuration
- `/next.config.mjs` - Next.js configuration with CORS setup
- `/middleware.ts` - Authentication and project access middleware  
- `/components.json` - shadcn/ui configuration
- `/vercel.json` - Vercel deployment configuration

### Key Components
- `/components/auth-guard.tsx` - Authentication wrapper
- `/components/project-switcher.tsx` - Project selection UI
- `/components/inventory-form.tsx` - Main item form
- `/contexts/ProjectContext.tsx` - Project state management

### Database Scripts
- `/scripts/` - Sequential SQL migration files
- `/scripts/check-db-structure.js` - Database validation utilities

## Development Patterns

### Component Patterns
- Use shadcn/ui components for consistency
- Implement loading states for all async operations
- Handle error states gracefully with user feedback
- Use TypeScript interfaces for type safety

### Database Patterns  
- Always use RLS policies for data security
- Use transactions for multi-table operations
- Include audit trails (created_at, updated_at)
- Use foreign key constraints for data integrity

### State Management Patterns
- Use React Context for global state (projects, auth)
- Local state for component-specific data
- Server state via Supabase realtime when needed
- Optimistic updates for better UX

## Common Tasks

### Adding New Inventory Fields
1. Update database schema in new migration file
2. Update TypeScript types in `/lib/types/`
3. Update form components in `/components/inventory-form.tsx`
4. Update display components in `/components/inventory-grid.tsx`

### Adding New Project Features
1. Update project schema if needed
2. Add API endpoints in `/app/api/projects/[id]/`
3. Update ProjectContext if state management is needed
4. Create UI components following existing patterns

### Debugging Access Issues
1. Check RLS policies in Supabase
2. Verify project membership in `project_members` table
3. Check middleware logs for auth flow issues
4. Validate environment variables are set correctly

## Deployment Notes

- **Platform**: Vercel with custom configuration
- **Database**: Supabase hosted PostgreSQL
- **File Storage**: Vercel Blob integrated
- **CORS**: Configured for production domain in vercel.json
- **Build Settings**: TypeScript and ESLint checks enabled
- **Function Timeout**: 30 seconds for API routes

## Security & Access Control

### Row Level Security (RLS) Implementation

**All Tables Protected**: Every table has RLS enabled with comprehensive policies:

**Projects Table:**
- Users can only view projects they are members of
- Only project creators can create projects
- Only owners can update project settings
- Deletion restricted to owners

**Project Members Table:**
- Users can view their own memberships
- Users can view other members of projects they belong to
- Only owners can add/remove members
- Owners and managers can update member roles
- Prevents circular dependency issues (resolved in migration 011)

**Pending Project Access Table:**
- Project managers can view/create/delete pending access for their projects
- Granters can update their own pending access grants
- Automatic cleanup via database triggers

**Inventory Items Table:**
- Users can only access items from projects they belong to
- Role-based permissions for create/update/delete operations
- Photo access controlled through project membership

### Security Layers

1. **Database Level (RLS Policies)**
   - Every query automatically filtered by user access rights
   - Prevents data leakage even if application logic fails
   - Policies handle complex multi-tenant scenarios

2. **API Level (Service Role Client)**
   - Server-side authentication verification
   - Service role bypasses RLS only when necessary
   - Explicit permission checks in API routes

3. **Middleware Level (Authentication Flow)**
   - Global authentication enforcement
   - Profile completeness validation
   - Project membership verification
   - Route-based access control

4. **Component Level (UI Security)**
   - `<AuthGuard>` components protect sensitive areas
   - Role-based rendering of UI elements
   - Context-aware access controls

5. **Network Level (CORS & Headers)**
   - Vercel-configured CORS policies
   - Environment-specific domain restrictions
   - Secure cookie handling

### Common Security Patterns

**API Authentication:**
```typescript
// Every API route starts with this pattern
const token = request.headers.get('authorization')?.replace('Bearer ', '')
const { data: { user }, error } = await supabase.auth.getUser(token)
if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

**Project Permission Check:**
```typescript
// Verify user is project owner/manager
const { data: membership } = await supabase
  .from('project_members')
  .select('role')
  .eq('project_id', projectId)
  .eq('user_id', user.id)
  .in('role', ['owner', 'manager'])
  .single()
```

**RLS Policy Example:**
```sql
-- Users can only see projects they are members of
CREATE POLICY "Users can view projects they are members of" ON public.projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_members.project_id = projects.id 
            AND project_members.user_id = auth.uid()
        )
    );
```

### Security Best Practices Implemented

- **Environment Variable Validation**: Middleware gracefully handles missing configuration
- **Session Management**: Automatic cleanup of invalid sessions
- **Input Validation**: Email format validation, role validation, UUID validation
- **Error Handling**: Security-conscious error messages (no data leakage)
- **Audit Trail**: All access grants include grantor information and timestamps
- **Expiration Management**: Pending access automatically expires (30-day default)
- **Transaction Safety**: Multi-table operations use proper error handling
- **Type Safety**: Full TypeScript coverage prevents runtime security issues

This application follows modern Next.js patterns with strong TypeScript typing, comprehensive error handling, and security-first database design with defense-in-depth architecture.