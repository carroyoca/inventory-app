'use client'

import { useEffect, useState } from 'react'
import { createClient } from "@/lib/supabase/client"
import { InventoryForm } from "@/components/inventory-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Package, LogOut, Search } from "lucide-react"
import Link from "next/link"
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }
        setUser(user)
      } catch (error) {
        console.error('Error getting user:', error)
        router.push('/auth/login')
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [supabase.auth, router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Art Inventory</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm text-gray-600 hidden sm:block">Welcome, {user.email}</span>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="h-8 px-2 sm:h-9 sm:px-3">
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="space-y-6 lg:space-y-8">
          {/* Mobile-first layout */}
          <div className="lg:hidden">
            {/* Quick Actions - Mobile First */}
            <Card className="mb-6">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild className="w-full h-12 text-base">
                  <Link href="/inventory">
                    <Package className="h-5 w-5 mr-3" />
                    View All Items
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full h-12 text-base bg-transparent">
                  <Link href="/inventory">
                    <Search className="h-5 w-5 mr-3" />
                    Search Inventory
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Add New Item Form - Mobile */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PlusCircle className="h-5 w-5" />
                  Add New Item
                </CardTitle>
                <CardDescription className="text-sm">Add a new art piece to your collection.</CardDescription>
              </CardHeader>
              <CardContent>
                <InventoryForm />
              </CardContent>
            </Card>
          </div>

          {/* Desktop layout */}
          <div className="hidden lg:grid lg:grid-cols-3 lg:gap-8">
            {/* Add New Item Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlusCircle className="h-5 w-5" />
                    Add New Inventory Item
                  </CardTitle>
                  <CardDescription>
                    Add a new art piece to your collection with photos, pricing, and location details.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <InventoryForm />
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Welcome Back!</CardTitle>
                  <CardDescription>Manage your art collection</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    You're successfully logged in. Start adding your art pieces or browse your existing collection.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild className="w-full">
                    <Link href="/inventory">
                      <Package className="h-4 w-4 mr-2" />
                      View Inventory
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/inventory">
                      <Search className="h-4 w-4 mr-2" />
                      Search Items
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
