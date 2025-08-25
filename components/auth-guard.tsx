"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
}

export function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Since middleware handles redirects, we just need to verify session exists
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        setIsAuthenticated(!!session?.user)
      } catch (error) {
        console.error('AuthGuard: Error checking session:', error)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    // Minimal delay to prevent flash
    const timer = setTimeout(checkAuth, 50)
    return () => clearTimeout(timer)
  }, [])

  // Show loading only briefly to prevent flash
  if (isLoading && requireAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Cargando...</span>
        </div>
      </div>
    )
  }

  // Middleware handles redirects, so we trust it did its job
  return <>{children}</>
}
