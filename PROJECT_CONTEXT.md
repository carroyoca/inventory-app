# Inventory App - Complete Project Context

## Project Overview

**Project Name**: Art Inventory Management System  
**Technology Stack**: Next.js 15, React 18, TypeScript, Supabase, Vercel  
**Current Status**: Production-ready with project-centric architecture and invitation system  
**Live URL**: https://inventory-lazzwltqt-carlos-arroyos-projects.vercel.app

## Development Journey Summary

### Phase 1: Initial Setup and Basic Inventory System
- **Goal**: Create a basic inventory management system for art pieces
- **Features Implemented**:
  - User authentication with Supabase
  - Basic CRUD operations for inventory items
  - Photo upload functionality using Vercel Blob
  - Mobile-responsive design
  - Dashboard with statistics

### Phase 2: Mobile Optimization and Bug Fixes
- **Issues Resolved**:
  - Photo upload issues on iOS Chrome
  - Delete and edit button functionality
  - Mobile camera behavior optimization
  - Form validation and error handling

### Phase 3: Project-Centric Architecture (Major Refactor)
- **Architectural Change**: Transformed from user-centric to project-centric system
- **New Features**:
  - Projects management (create, join, switch)
  - Project-specific inventory
  - Project members and roles (owner, manager, member, readonly)
  - Project areas management
  - Project-aware navigation and middleware

### Phase 4: Invitation System (Sprint 2)
- **Features Implemented**:
  - Email invitations using Resend
  - Invitation management (send, accept, delete)
  - Role-based permissions
  - Automatic project membership upon invitation acceptance

### Phase 5: Security Hardening (Critical)
- **Security Issues Fixed**:
  - Unauthorized access prevention
  - Authentication guards on all protected routes
  - Middleware improvements
  - Project-specific access control

## Current Architecture

### Database Schema

#### Core Tables
```sql
-- User profiles
profiles (id, full_name, email, created_at, updated_at)

-- Projects
projects (id, name, description, created_by, created_at, updated_at)

-- Project members with roles
project_members (id, project_id, user_id, role, joined_at)

-- Project areas
project_areas (id, name, description, project_id, created_by, created_at, updated_at)

-- Inventory items (project-specific)
inventory_items (id, project_id, product_type, house_zone, product_name, description, estimated_price, sale_price, status, photos, created_at, updated_at)

-- Invitations
project_invitations (id, project_id, inviter_id, invitee_email, role, status, token, expires_at, created_at, updated_at)
```

### Key Components

#### Authentication & Authorization
- **Supabase Auth**: Email/password authentication
- **Row Level Security (RLS)**: Database-level access control
- **Middleware**: Route protection and project redirection
- **AuthGuard**: Component-level authentication checks

#### Project Management
- **ProjectContext**: Global state management for active project
- **ProjectHeader**: Navigation with project switcher
- **ProjectForm**: Create new projects
- **ProjectsList**: Display user's projects

#### Inventory Management
- **InventoryForm**: Add/edit items with photo upload
- **InventoryGrid**: Display items with actions
- **InventorySearch**: Filter and search functionality
- **InventoryStats**: Project statistics

#### Invitation System
- **InvitationForm**: Send invitations
- **InvitationsList**: Manage pending invitations
- **Email Service**: Resend integration for notifications

## Security Implementation

### Authentication Flow
1. **Middleware Check**: Every request verified for authentication
2. **Project Validation**: Users can only access projects they're members of
3. **Role-Based Access**: Different permissions based on user role
4. **Session Management**: Secure token handling

### Protected Routes
- `/dashboard` - Requires authentication + active project
- `/inventory/*` - Requires authentication + active project
- `/projects/*` - Requires authentication
- `/api/*` - Server-side authentication checks

### Public Routes
- `/` - Landing page
- `/auth/login` - Login page
- `/auth/sign-up` - Registration page
- `/auth/sign-up-invitation` - Invitation-based registration
- `/auth/callback` - Auth callback

## Environment Variables

```env
# Supabase Configuration
NEXT_PUBLIC_INVAPPSUPABASE_URL=https://xwfbunljlevcwazzpmlj.supabase.co
NEXT_PUBLIC_INVAPPSUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Vercel Blob for file uploads
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_1234567890abcdef

# Resend for email notifications
RESEND_API_KEY=re_tu_api_key_aqui

# App URL for email links
NEXT_PUBLIC_APP_URL=https://inventory-lazzwltqt-carlos-arroyos-projects.vercel.app
```

## Key Files and Their Purpose

### Core Configuration
- `middleware.ts` - Route protection and authentication
- `next.config.mjs` - Next.js configuration with CORS
- `vercel.json` - Vercel deployment settings

### Authentication
- `lib/supabase/client.ts` - Client-side Supabase client
- `lib/supabase/server.ts` - Server-side Supabase client
- `lib/supabase/api-client.ts` - API route Supabase client

### Context and State
- `contexts/ProjectContext.tsx` - Global project state management
- `components/auth-guard.tsx` - Authentication wrapper component

### API Routes
- `app/api/projects/route.ts` - Project CRUD operations
- `app/api/invitations/route.ts` - Invitation management
- `app/api/upload/route.ts` - File upload handling
- `app/api/delete-item/route.ts` - Item deletion

### Pages
- `app/dashboard/page.tsx` - Main dashboard with project stats
- `app/inventory/page.tsx` - Inventory management
- `app/projects/page.tsx` - Project management
- `app/invitations/[id]/join/page.tsx` - Invitation acceptance

## Recent Security Fixes

### Critical Issues Resolved
1. **Unauthorized Access**: Users could access without authentication
2. **Project Isolation**: Users could see all projects instead of just invited ones
3. **Missing Auth Guards**: Protected routes weren't properly secured

### Security Measures Implemented
1. **Enhanced Middleware**: Strict authentication checks
2. **AuthGuard Component**: Component-level protection
3. **Project Validation**: Ensure users only access their projects
4. **Session Verification**: Proper token validation

## User Roles and Permissions

### Owner
- Full project control
- Can invite users
- Can delete project
- Can manage all settings

### Manager
- Can invite users
- Can manage inventory
- Can edit project settings
- Cannot delete project

### Member
- Can view and edit inventory
- Can view project settings
- Cannot invite users

### Readonly
- Can only view inventory
- Cannot make any changes

## Invitation Flow

### Sending Invitations
1. Project owner/manager sends invitation via email
2. Email contains project details and role
3. Invitation expires in 7 days
4. Duplicate invitations are prevented

### Accepting Invitations
1. User clicks invitation link
2. If not registered, redirected to sign-up
3. If registered, automatically accepts invitation
4. User becomes project member with specified role
5. Redirected to project dashboard

## Mobile Optimization

### Photo Upload
- iOS Chrome compatibility
- Camera and gallery options
- Multiple photo support
- Progress indicators

### Responsive Design
- Mobile-first approach
- Touch-friendly interfaces
- Optimized navigation
- Adaptive layouts

## Deployment and CI/CD

### Vercel Deployment
- Automatic deployments on git push
- Environment variable management
- Custom domain support
- Function timeout configuration

### Environment Setup
- Development: localhost:3000
- Production: Vercel deployment
- Staging: Separate Vercel project (if needed)

## Known Issues and Limitations

### Resolved Issues
- ✅ Photo upload on mobile devices
- ✅ Authentication flow
- ✅ Project switching
- ✅ Invitation system
- ✅ Security vulnerabilities

### Current Limitations
- Email service requires Resend API key
- File uploads limited to Vercel Blob
- No offline functionality
- No advanced search filters

## Future Enhancements (Sprint 3)

### Planned Features
- Customizable room types
- Advanced inventory categories
- Export functionality
- Analytics dashboard
- Mobile app (React Native)

### Technical Improvements
- Performance optimization
- Caching strategies
- Advanced search
- Bulk operations
- API rate limiting

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel --prod

# Check deployment status
vercel ls
```

## Database Migrations

### Executed Scripts
1. `001_create_inventory_schema.sql` - Initial inventory table
2. `002_create_profiles.sql` - User profiles
3. `003_seed_sample_data.sql` - Sample data
4. `004_create_projects_schema.sql` - Projects and members
5. `006_create_project_areas.sql` - Project areas
6. `007_create_invitations_schema.sql` - Invitation system

### Manual Execution Required
- All SQL scripts must be executed manually in Supabase dashboard
- CLI migrations were problematic and abandoned

## Testing Strategy

### Manual Testing
- Authentication flow
- Project creation and switching
- Invitation system
- Photo upload
- Mobile responsiveness

### Security Testing
- Unauthorized access attempts
- Cross-project access prevention
- Role-based permission validation
- Session management

## Monitoring and Logging

### Vercel Logs
- Function execution logs
- Error tracking
- Performance monitoring
- Real-time debugging

### Application Logs
- Authentication events
- Project operations
- Invitation activities
- Error handling

## Support and Maintenance

### Current Status
- ✅ Production ready
- ✅ Security hardened
- ✅ Mobile optimized
- ✅ Invitation system working

### Maintenance Tasks
- Monitor Vercel logs for errors
- Check Supabase usage limits
- Update dependencies regularly
- Backup database periodically

## Contact and Support

### Development Team
- Primary Developer: Carlos Arroyo
- Repository: https://github.com/carroyoca/inventory-app
- Deployment: Vercel

### Technical Stack
- Frontend: Next.js 15 + React 18 + TypeScript
- Backend: Supabase (PostgreSQL + Auth + Storage)
- Deployment: Vercel
- Email: Resend
- File Storage: Vercel Blob

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Status**: Production Ready with Security Hardening
