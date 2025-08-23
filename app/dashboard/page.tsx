import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { InventoryForm } from "@/components/inventory-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Package, LogOut, Search } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
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
              <form action="/auth/signout" method="post">
                <Button variant="ghost" size="sm" type="submit" className="h-8 px-2 sm:h-9 sm:px-3">
                  <LogOut className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </form>
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
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild className="w-full">
                    <Link href="/inventory">
                      <Package className="h-4 w-4 mr-2" />
                      View All Items
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full bg-transparent">
                    <Link href="/inventory">
                      <Search className="h-4 w-4 mr-2" />
                      Search Inventory
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Collection Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Items:</span>
                      <span className="font-medium">-</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Available:</span>
                      <span className="font-medium text-green-600">-</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sold:</span>
                      <span className="font-medium text-blue-600">-</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Value:</span>
                      <span className="font-medium">$-</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
