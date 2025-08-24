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

/**
 * Create an authenticated Supabase client using a user's access token
 */
export function createAuthenticatedApiClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_INVAPPSUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_INVAPPSUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables")
  }
  
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  // Set the user's session
  client.auth.setSession({
    access_token: accessToken,
    refresh_token: '',
    expires_in: 3600,
    token_type: 'bearer'
  })
  
  return client
}
