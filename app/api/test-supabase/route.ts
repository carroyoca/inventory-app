import { createApiClient } from "@/lib/supabase/api-client"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("Testing Supabase configuration...")
    
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_INVAPPSUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_INVAPPSUPABASE_ANON_KEY
    
    console.log("Environment variables check:")
    console.log("- Supabase URL:", supabaseUrl ? "✅ Set" : "❌ Missing")
    console.log("- Supabase Key:", supabaseKey ? "✅ Set" : "❌ Missing")
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        error: "Missing Supabase environment variables",
        details: {
          url: !!supabaseUrl,
          key: !!supabaseKey
        }
      }, { status: 500 })
    }
    
    // Try to create Supabase client with proper error handling
    let supabase
    try {
      supabase = createApiClient()
      console.log("✅ Supabase API client created successfully")
    } catch (clientError) {
      console.error("❌ Failed to create Supabase client:", clientError)
      return NextResponse.json({
        error: "Failed to create Supabase client",
        details: clientError instanceof Error ? clientError.message : "Unknown error"
      }, { status: 500 })
    }
    
    // Try to get user (this will fail if not authenticated, but should not crash)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      console.log("Auth test result:", { user: !!user, error: authError })
      
      if (authError) {
        console.log("Auth error (expected if not logged in):", authError.message)
        return NextResponse.json({
          success: true,
          message: "Supabase client working, but user not authenticated (this is normal)",
          authError: authError.message
        })
      }
      
      return NextResponse.json({
        success: true,
        message: "Supabase client working and user authenticated",
        userId: user?.id
      })
      
    } catch (authTestError) {
      console.error("Auth test failed:", authTestError)
      return NextResponse.json({
        error: "Auth test failed",
        details: authTestError instanceof Error ? authTestError.message : "Unknown error"
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error("Test endpoint error:", error)
    return NextResponse.json({
      error: "Test failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
