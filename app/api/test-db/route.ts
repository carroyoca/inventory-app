import { createApiClient } from "@/lib/supabase/api-client"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("=== DATABASE TEST START ===")
    
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
    
    // Try to create Supabase client
    let supabase
    try {
      supabase = createApiClient()
      console.log("✅ Supabase client created successfully")
    } catch (clientError) {
      console.error("❌ Failed to create Supabase client:", clientError)
      return NextResponse.json({
        error: "Failed to create Supabase client",
        details: clientError instanceof Error ? clientError.message : "Unknown error"
      }, { status: 500 })
    }
    
    // Test basic database connection
    try {
      console.log("🔍 Testing database connection...")
      const { data, error } = await supabase
        .from("inventory_items")
        .select("count")
        .limit(1)
      
      if (error) {
        console.error("❌ Database connection error:", error)
        return NextResponse.json({
          error: "Database connection failed",
          details: error.message,
          code: error.code
        }, { status: 500 })
      }
      
      console.log("✅ Database connection successful")
      console.log("✅ Query result:", data)
      
      // Test if we can see the table structure
      console.log("🔍 Testing table access...")
      const { data: tableData, error: tableError } = await supabase
        .from("inventory_items")
        .select("*")
        .limit(1)
      
      if (tableError) {
        console.error("❌ Table access error:", tableError)
        return NextResponse.json({
          success: true,
          message: "Database connected but table access restricted (RLS)",
          connection: "✅ Working",
          tableAccess: "❌ Restricted",
          details: tableError.message,
          code: tableError.code
        })
      }
      
      console.log("✅ Table access successful")
      console.log("✅ Table data sample:", tableData)
      
      return NextResponse.json({
        success: true,
        message: "Database fully accessible",
        connection: "✅ Working",
        tableAccess: "✅ Working",
        sampleData: tableData
      })
      
    } catch (dbTestError) {
      console.error("❌ Database test failed:", dbTestError)
      return NextResponse.json({
        error: "Database test failed",
        details: dbTestError instanceof Error ? dbTestError.message : "Unknown error"
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error("=== DATABASE TEST ERROR ===")
    console.error("Test endpoint error:", error)
    return NextResponse.json({
      error: "Test failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
