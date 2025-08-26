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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error("Error exchanging code for session:", error)
      return NextResponse.redirect(`${origin}/auth/auth-code-error`)
    }

    // CRITICAL: Ensure user profile is created
    if (data.user) {
      console.log("User authenticated, ensuring profile exists:", data.user.id)
      
      try {
        // Check if profile already exists
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single()

        if (profileError && profileError.code === 'PGRST116') {
          // Profile doesn't exist, create it
          console.log("Profile doesn't exist, creating profile for user:", data.user.id)
          
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email,
              full_name: data.user.user_metadata?.full_name || '',
            })
            .select()
            .single()

          if (insertError) {
            console.error("Error creating profile:", insertError)
          } else {
            console.log("Profile created successfully:", newProfile)
          }
        } else if (existingProfile) {
          console.log("Profile already exists:", existingProfile.id)
        } else {
          console.error("Unexpected error checking profile:", profileError)
        }
      } catch (profileCreationError) {
        console.error("Error in profile creation process:", profileCreationError)
      }
    }

    // Successful authentication, redirect to dashboard
    console.log("Authentication successful, redirecting to:", next)
    return NextResponse.redirect(`${origin}${next}`)
    
  } catch (error) {
    console.error("Unexpected error in auth callback:", error)
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }
}
