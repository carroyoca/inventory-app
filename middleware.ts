import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Simple middleware that just continues the request
  // We'll handle authentication in the individual pages instead
  
  // Log the request for debugging
  console.log('Middleware processing:', request.nextUrl.pathname)
  
  return NextResponse.next()
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
