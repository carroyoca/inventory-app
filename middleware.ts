import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Check if environment variables are available
  const supabaseUrl = process.env.NEXT_PUBLIC_INVAPPSUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_INVAPPSUPABASE_ANON_KEY

  // If environment variables are missing, skip middleware and continue
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase environment variables not found, skipping middleware")
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    // Create Supabase client for this request
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
          },
        },
      },
    )

    // Get user authentication status
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Define public routes that don't require authentication
    const publicRoutes = ["/", "/auth/login", "/auth/sign-up", "/auth/sign-up-invitation", "/auth/callback", "/auth/auth-code-error", "/auth/sign-up-success"]
    const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route))
    
    // Special handling for invitation pages - they require authentication
    const isInvitationRoute = request.nextUrl.pathname.startsWith('/invitations/')
    
    console.log('🔍 Route analysis:', {
      pathname: request.nextUrl.pathname,
      isPublicRoute,
      isInvitationRoute,
      hasUser: !!user
    })
    
    // Redirect unauthenticated users to login (except for public routes)
    if (!user && !isPublicRoute) {
      console.log('🚫 Redirecting unauthenticated user from:', request.nextUrl.pathname)
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      // For invitation routes, preserve the original URL to redirect back after login
      if (isInvitationRoute) {
        url.searchParams.set('redirectTo', request.nextUrl.pathname)
      }
      return NextResponse.redirect(url)
    }
    
    // For invitation routes, ensure user is authenticated
    if (isInvitationRoute && !user) {
      console.log('🚫 Blocking unauthenticated access to invitation route:', request.nextUrl.pathname)
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      url.searchParams.set('redirectTo', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    // For authenticated users, check if they need to select a project
    if (user && !request.nextUrl.pathname.startsWith("/auth")) {
      const pathname = request.nextUrl.pathname
      
      // Routes that require an active project
      const projectRequiredRoutes = ['/dashboard', '/inventory']
      
      // Routes that are always accessible for authenticated users
      const alwaysAccessibleRoutes = ['/projects', '/select-project', '/auth', '/']
      
      // Skip project check for always accessible routes
      if (!alwaysAccessibleRoutes.some(route => pathname === route || pathname.startsWith(route))) {
        if (projectRequiredRoutes.some(route => pathname.startsWith(route))) {
          // Check if user has any projects
          const { data: projects, error } = await supabase
            .from('project_members')
            .select('project_id')
            .eq('user_id', user.id)
            .limit(1)
          
          if (error) {
            console.error('Middleware project check error:', error)
            // If there's an error checking projects, redirect to project selection
            const url = request.nextUrl.clone()
            url.pathname = "/select-project"
            return NextResponse.redirect(url)
          }
          
          if (!projects || projects.length === 0) {
            // User has no projects, redirect to project selection
            const url = request.nextUrl.clone()
            url.pathname = "/select-project"
            return NextResponse.redirect(url)
          }
        }
      }
    }

    // Log the request for debugging
    console.log('Middleware processing:', request.nextUrl.pathname, 'User:', user?.id || 'unauthenticated')
    
    return supabaseResponse
  } catch (error) {
    console.error("Middleware error:", error)
    // If there's an error, continue without authentication
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes (to avoid middleware conflicts)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    "/((?!_next/static|_next/image|favicon.ico|api|.*.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
