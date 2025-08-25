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

    // Redirect unauthenticated users to login (except for public routes)
    if (request.nextUrl.pathname !== "/" && !user && !request.nextUrl.pathname.startsWith("/auth")) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
    }

    // For authenticated users, check if they need to select a project
    if (user && !request.nextUrl.pathname.startsWith("/auth")) {
      const pathname = request.nextUrl.pathname
      
      // Routes that require an active project
      const projectRequiredRoutes = ['/dashboard', '/inventory']
      
      // Routes that are always accessible
      const alwaysAccessibleRoutes = ['/projects', '/select-project', '/auth']
      
      if (projectRequiredRoutes.some(route => pathname.startsWith(route))) {
        // Check if user has any projects
        const { data: projects, error } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', user.id)
          .limit(1)
        
        if (!error && projects && projects.length === 0) {
          // User has no projects, redirect to project selection
          if (pathname !== '/select-project') {
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
