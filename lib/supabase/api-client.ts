import { createClient } from "@supabase/supabase-js"

/**
 * Supabase client for API routes that doesn't rely on cookies
 * This is used when we need to authenticate users in API routes
 */
export function createApiClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_INVAPPSUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_INVAPPSUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables")
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
