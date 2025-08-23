import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_INVAPPSUPABASE_URL!,
    process.env.NEXT_PUBLIC_INVAPPSUPABASE_ANON_KEY!,
  )
}
