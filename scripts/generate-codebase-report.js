/*
  Generate a comprehensive PDF report explaining the codebase structure,
  technologies, and how the app works — aimed at early-stage engineers.

  Usage: node scripts/generate-codebase-report.js
  Output: CODEBASE_OVERVIEW_REPORT.pdf in project root
*/

const fs = require('fs')
const path = require('path')
const PDFDocument = require('pdfkit')

const OUTPUT = path.join(process.cwd(), 'CODEBASE_OVERVIEW_REPORT.pdf')

function heading(doc, text, level = 1) {
  const sizes = { 1: 20, 2: 16, 3: 13, 4: 12 }
  const size = sizes[level] || 12
  doc.moveDown(level === 1 ? 0.6 : 0.4)
  doc.font('Helvetica-Bold').fontSize(size).fillColor('#111').text(text)
  doc.moveDown(0.2)
  doc.font('Helvetica').fillColor('#222')
}

function para(doc, text) {
  doc.font('Helvetica').fontSize(11).fillColor('#222').text(text, { align: 'left' })
  doc.moveDown(0.3)
}

function bullet(doc, lines) {
  lines.forEach(l => doc.list([l], { bulletRadius: 2 }))
  doc.moveDown(0.2)
}

function hr(doc) {
  const x = doc.x
  const y = doc.y + 4
  doc.moveTo(x, y).lineTo(doc.page.width - doc.page.margins.right, y).strokeColor('#ddd').lineWidth(1).stroke()
  doc.moveDown(0.6)
}

function scanDir(dir, ignore = new Set(['node_modules', '.git', '.next', '.vercel'])) {
  const results = []
  function walk(current, depth = 0) {
    const base = path.basename(current)
    if (ignore.has(base)) return
    const stat = fs.statSync(current)
    if (stat.isDirectory()) {
      const children = fs.readdirSync(current).sort()
      results.push({ type: 'dir', path: current, depth })
      children.forEach(c => walk(path.join(current, c), depth + 1))
    } else {
      results.push({ type: 'file', path: current, depth })
    }
  }
  walk(dir)
  return results
}

function formatTree(doc, rootDir) {
  const entries = scanDir(rootDir)
  entries.forEach(e => {
    const rel = path.relative(rootDir, e.path) || path.basename(rootDir)
    if (!rel) return
    const indent = '  '.repeat(Math.max(0, e.depth - 1))
    const label = e.type === 'dir' ? `📁 ${path.basename(e.path)}` : `📄 ${path.basename(e.path)}`
    doc.font('Helvetica').fontSize(10).fillColor('#333').text(`${indent}${label}`)
    if (doc.y > doc.page.height - doc.page.margins.bottom - 50) doc.addPage()
  })
}

function sectionFileSummaries(doc) {
  heading(doc, 'Key Files and What They Do', 2)
  hr(doc)
  const items = [
    ['package.json', 'Project metadata and dependencies (Next.js 15, React 18, Tailwind v4, shadcn/ui, Supabase).'],
    ['next.config.mjs', 'Next.js configuration: images, headers for dev CORS, external packages.'],
    ['vercel.json', 'Vercel function limits and production CORS headers for /api routes.'],
    ['middleware.ts', 'Request-time auth: creates Supabase SSR client, enforces profile and project checks, redirects unauthenticated users.'],
    ['app/layout.tsx', 'App shell: fonts, global styles, Theme + Project + Achievements providers, toaster.'],
    ['app/page.tsx', 'Landing page: redirects authenticated users to dashboard or project selection.'],
    ['app/dashboard/page.tsx', 'Dashboard UI with stats, engagement widgets (streak, weekly goal, trophies).'],
    ['app/inventory/page.tsx', 'Inventory screen: filters, stats, grid of items; now with “Volver al Dashboard” button.'],
    ['app/inventory/add/page.tsx', 'Add new item flow with InventoryForm.'],
    ['app/inventory/edit/[id]/page.tsx', 'Edit existing item; guards to avoid losing uploads.'],
    ['components/inventory-form.tsx', 'Form for creating/editing items with robust photo upload (Vercel Blob) and mobile guards.'],
    ['components/inventory-search.tsx', 'Search bar and filters (tipo, ubicación, estado, precio) hooked into list filtering.'],
    ['components/inventory-grid.tsx', 'Cards view of items with status badges, actions (editar, borrar).'],
    ['components/inventory-stats.tsx', 'Summary stats and values for the inventory list.'],
    ['components/project-header.tsx', 'Top header: project switch, profile menu, sign-out.'],
    ['contexts/ProjectContext.tsx', 'Global state: active project, switching, and upload-in-progress protection.'],
    ['contexts/AchievementsContext.tsx', 'Engagement: streaks, weekly goal, trophies, confetti, and reset function.'],
    ['lib/supabase/client.ts', 'Browser Supabase client (uses NEXT_PUBLIC_ vars).'],
    ['lib/supabase/server.ts', 'Server Supabase client (SSR + cookies).'],
    ['lib/supabase/api-client.ts', 'Service-role Supabase client for API routes (bypass RLS with checks).'],
    ['lib/engagement/confetti.ts', 'Lightweight confetti utility respecting reduced motion.'],
    ['app/api/upload/route.ts', 'Photo upload API: validates auth and file, uploads to Vercel Blob.'],
    ['app/api/delete-item/route.ts', 'Deletes item after verifying project membership.'],
    ['app/api/projects/*.ts', 'APIs for listing/creating projects and per-project analytics, categories, export.'],
    ['scripts/*.sql', 'Database migrations (inventory, projects, RLS, categories, etc.).'],
  ]
  items.forEach(([f, d]) => bullet(doc, [`${f}: ${d}`]))
}

function sectionOverview(doc) {
  heading(doc, 'humkio — Engineering Overview', 1)
  para(doc, 'humkio is a modern inventory app built with Next.js 15, React 18, TypeScript, Tailwind v4, and Supabase. It supports multi-project organization, secure authentication, photo uploads via Vercel Blob, and collaborative access management. The UI is component-driven using shadcn/ui and Radix primitives, with a project context managing cross-page state.')
  hr(doc)
}

function sectionStack(doc) {
  heading(doc, 'Tech Stack', 2)
  bullet(doc, [
    'Frontend: Next.js 15 (App Router), React 18, TypeScript 5',
    'Styling: Tailwind CSS v4, shadcn/ui, Radix UI, lucide icons',
    'Backend: Supabase (PostgreSQL, Auth, Row Level Security)',
    'Storage: Vercel Blob for image uploads',
    'Email: Mailgun (with mock fallback)',
    'Deploy: Vercel, with custom CORS for /api routes',
  ])
}

function sectionStructure(doc) {
  heading(doc, 'Project Structure (Folders)', 2)
  para(doc, 'High-level layout of the repository:')
  bullet(doc, [
    'app/: Routes (pages, layouts, API routes) using Next.js App Router',
    'components/: Reusable UI and feature components (inventory, projects, engagement)',
    'contexts/: Global React contexts (Project, Achievements)',
    'lib/: Supabase clients, utilities, engagement helpers',
    'hooks/: Custom hooks (e.g., useIsMobile, toast)',
    'scripts/: SQL migrations and small utilities',
    'public/: Static assets',
  ])
  hr(doc)
  heading(doc, 'Directory Tree (selected)', 3)
  formatTree(doc, process.cwd())
}

function sectionAuth(doc) {
  heading(doc, 'Authentication, Authorization, and RLS', 2)
  para(doc, 'Authentication is handled by Supabase. The Next.js middleware creates a per-request Supabase SSR client, checks that the user is signed in, and enforces profile completion. For protected routes, it also verifies that the user belongs to at least one project and redirects accordingly.')
  bullet(doc, [
    'Database: Row Level Security policies safeguard tables, limiting access to a user’s data or project membership.',
    'Project membership: Roles include owner, manager, member, viewer.',
    'API routes: Use a service-role client to perform server-side operations after validating the caller’s membership by token.',
  ])
}

function sectionProjects(doc) {
  heading(doc, 'Projects and State Management', 2)
  para(doc, 'The app is multi-tenant. A user may belong to several projects via project_members. ProjectContext loads the latest project, stores it as active, and offers a safe switch operation with upload-in-progress guards to avoid disrupting photo workflows.')
  bullet(doc, [
    'Active project drives queries (inventory items, categories, stats).',
    'Upload guard prevents reloading context during photo uploads to avoid losing state.',
    'Member counts and analytics are fetched through dedicated API routes.',
  ])
}

function sectionInventory(doc) {
  heading(doc, 'Inventory Feature', 2)
  para(doc, 'The inventory feature covers listing, filtering, stats, add/edit flows, and deletion. Photos are uploaded to Vercel Blob. The UI is optimized for mobile, including Android/iOS quirks, and prevents accidental loss during uploads.')
  bullet(doc, [
    'List: InventoryGrid displays items with status, photos, location, and actions.',
    'Filter: InventorySearch supports free text, product type, location, status, and price range.',
    'Stats: InventoryStats summarizes counts and total values.',
    'Form: InventoryForm handles validation, upload, and persistence (insert/update) with robust logging.',
    'Delete: /api/delete-item validates auth + membership and deletes the item.',
  ])
}

function sectionUploads(doc) {
  heading(doc, 'Photos and Uploads', 2)
  para(doc, 'Uploads are handled by /api/upload, which authenticates users by bearer token, validates file type and size, and stores images in Vercel Blob as public assets. The form implements device-aware workarounds and guards to ensure a smooth mobile experience.')
}

function sectionAPIs(doc) {
  heading(doc, 'API Routes (Highlights)', 2)
  bullet(doc, [
    'GET/POST /api/projects: list and create projects (service-role, token required).',
    'GET /api/projects/[id]/stats: counts items and total estimated value.',
    'GET/POST/PUT/DELETE /api/projects/[id]/inventory-types and /house-zones: category management.',
    'GET /api/projects/[id]/export: export project data as JSON or CSV.',
    'POST /api/upload: upload photos to Vercel Blob.',
    'DELETE /api/delete-item: delete an inventory item (membership checked).',
  ])
}

function sectionDB(doc) {
  heading(doc, 'Database and Migrations', 2)
  para(doc, 'SQL scripts under scripts/ define core tables (inventory_items, projects, project_members, categories, pending access, profiles) and enforce RLS policies. Triggers keep updated_at fresh; indexes support common queries.')
}

function sectionEngagement(doc) {
  heading(doc, 'Engagement Features', 2)
  para(doc, 'A lightweight achievements system tracks user streaks, weekly goals, and trophies. Confetti and toasts celebrate key milestones. The dashboard shows a streak counter, weekly goal progress, and a trophy shelf (with reset for a specific project).')
}

function sectionConfig(doc) {
  heading(doc, 'Configuration and Environment', 2)
  bullet(doc, [
    'NEXT_PUBLIC_INVAPPSUPABASE_URL / NEXT_PUBLIC_INVAPPSUPABASE_ANON_KEY: Supabase client config.',
    'SUPABASE_SERVICE_ROLE_KEY: Server-side key for API routes (validate before privileged DB actions).',
    'BLOB_READ_WRITE_TOKEN: Vercel Blob uploads.',
    'MAILGUN_API_KEY / MAILGUN_DOMAIN: Emails (mock fallback when missing).',
    'NEXT_PUBLIC_APP_URL: Used in links and emails.',
  ])
}

function sectionSecurity(doc) {
  heading(doc, 'Security Considerations', 2)
  bullet(doc, [
    'RLS on all tables; API routes validate bearer tokens and project membership.',
    'Middleware guards access to authenticated routes and project-required pages.',
    'CORS configured in dev (Next config) and prod (vercel.json) for /api routes.',
  ])
}

function sectionExtensibility(doc) {
  heading(doc, 'Extensibility and Next Steps', 2)
  bullet(doc, [
    'Server-side filtering/pagination for very large inventories.',
    'Stronger auth on /api/delete-photo (add membership checks).',
    'AI-assisted tagging and OCR for photos.',
    'Offline/PWA support with queued uploads and sync.',
  ])
}

function build() {
  const doc = new PDFDocument({ margin: 50 })
  doc.pipe(fs.createWriteStream(OUTPUT))

  // Cover
  doc.font('Helvetica-Bold').fontSize(24).text('humkio — Codebase Overview Report')
  doc.moveDown(0.5)
  doc.font('Helvetica').fontSize(12).text('An approachable, in-depth explanation for early-stage software engineers.', { align: 'left' })
  doc.moveDown(1)
  hr(doc)

  sectionOverview(doc)
  sectionStack(doc)
  sectionStructure(doc)
  doc.addPage()
  sectionAuth(doc)
  sectionProjects(doc)
  sectionInventory(doc)
  sectionUploads(doc)
  doc.addPage()
  sectionAPIs(doc)
  sectionDB(doc)
  sectionEngagement(doc)
  sectionConfig(doc)
  sectionSecurity(doc)
  sectionExtensibility(doc)
  doc.addPage()
  sectionFileSummaries(doc)

  doc.end()
  return OUTPUT
}

if (require.main === module) {
  const out = build()
  console.log(`✅ PDF report generated: ${out}`)
}
