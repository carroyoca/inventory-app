import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // Check if user has any projects
    const { data: projects, error } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id)
      .limit(1)
    
    if (!error && projects && projects.length > 0) {
      // User has projects, redirect to dashboard
      redirect("/dashboard")
    } else {
      // User has no projects, redirect to project selection
      redirect("/select-project")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-900">Art Inventory</CardTitle>
            <CardDescription className="text-lg text-gray-600">Manage your art collections with ease</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 text-center">
              Keep track of your art pieces, their locations, pricing, and photos all in one place.
            </p>
            <div className="flex flex-col gap-3">
              <Button asChild className="w-full">
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
  )
}
