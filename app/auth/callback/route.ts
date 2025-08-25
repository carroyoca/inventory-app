import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get("code")
    const next = searchParams.get("next") ?? "/dashboard"

    if (!code) {
      console.error("No code provided in callback")
      return NextResponse.redirect(`${origin}/auth/auth-code-error`)
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_INVAPPSUPABASE_URL!,
      process.env.NEXT_PUBLIC_INVAPPSUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              console.error("Error setting cookie:", error)
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.delete({ name, ...options })
            } catch (error) {
              console.error("Error removing cookie:", error)
            }
          },
        },
      },
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error("Error exchanging code for session:", error)
      return NextResponse.redirect(`${origin}/auth/auth-code-error`)
    }

    // Successful authentication, redirect to dashboard
    console.log("Authentication successful, redirecting to:", next)
    return NextResponse.redirect(`${origin}${next}`)
    
  } catch (error) {
    console.error("Unexpected error in auth callback:", error)
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }
}
