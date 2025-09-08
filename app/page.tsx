"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // Check if user has any projects
          const { data: projects, error } = await supabase
            .from('project_members')
            .select('project_id')
            .eq('user_id', user.id)
            .limit(1)
          
          if (!error && projects && projects.length > 0) {
            // User has projects, redirect to dashboard
            router.push("/dashboard")
          } else {
            // User has no projects, redirect to project selection
            router.push("/select-project")
          }
        }
      } catch (error) {
        console.error('HomePage auth check error:', error)
      }
    }

    checkAuth()
  }, [router])

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Left: Landing content */}
      <div className="flex items-center justify-center p-6 md:p-10 bg-white">
        <div className="w-full max-w-md">
          <Card className="shadow-lg">
            <CardHeader className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 rounded-xl overflow-hidden shadow-sm">
                <Image src="/humkio.png" alt="humkio logo" width={64} height={64} className="w-16 h-16 object-cover" />
              </div>
              <CardTitle className="text-3xl font-bold text-gray-900">humkio</CardTitle>
              <CardDescription className="text-lg text-gray-600">Manage your inventory with ease</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 text-center">
                Keep track of your items, their locations, pricing, and photos all in one place.
              </p>
              <div className="flex flex-col gap-3">
                <Button asChild variant="brand" className="w-full">
                  <Link href="/auth/login">Sign In</Link>
                </Button>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/auth/sign-up">Create Account</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right: Brand panel with big logo and gradient matching logo */}
      <div className="relative hidden md:block overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, #532F6E 0%, #C4599D 100%)',
          }}
        />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, white 2px, transparent 0), radial-gradient(circle at 80% 40%, white 2px, transparent 0)",
          backgroundSize: '40px 40px',
          backgroundPosition: '0 0, 20px 20px'
        }} />
        <div className="relative h-full w-full flex items-center justify-center p-10">
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-10 shadow-2xl flex flex-col items-center">
            <div className="relative w-[380px] h-[380px] rounded-2xl overflow-hidden shadow-xl border border-white/20">
              <Image src="/humkio.png" alt="humkio" fill sizes="380px" className="object-cover" />
            </div>
            <p className="mt-6 text-white text-2xl font-semibold tracking-tight">Sistema de inventario basado en proyectos</p>
          </div>
        </div>
      </div>
    </div>
  )
}
