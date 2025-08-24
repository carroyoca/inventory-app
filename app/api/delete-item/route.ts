import { createServiceRoleClient } from "@/lib/supabase/api-client"
import { type NextRequest, NextResponse } from "next/server"

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function DELETE(request: NextRequest) {
  try {
    console.log("=== DELETE API ROUTE START ===")
    console.log("Delete item API called")
    
    const { id } = await request.json()
    console.log("Delete request for item ID:", id)

    if (!id) {
      console.log("No ID provided")
      return NextResponse.json({ error: "No ID provided" }, { status: 400 })
    }

    // Get authorization header
    const authHeader = request.headers.get('authorization')
    console.log("Auth header present:", !!authHeader)
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("No valid authorization header")
      return NextResponse.json({ error: "Authorization header required" }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log("Token extracted, length:", token.length)

    // Create service role client (bypasses RLS)
    let supabase
    try {
      supabase = createServiceRoleClient()
      console.log("✅ Service role Supabase client created successfully")
    } catch (clientError) {
      console.error("❌ Failed to create service role client:", clientError)
      return NextResponse.json({ 
        error: "Database connection failed", 
        details: clientError instanceof Error ? clientError.message : "Unknown error"
      }, { status: 500 })
    }

    // Verify the user's authentication using the token
    console.log("🔍 Verifying user authentication...")
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    console.log("Auth check result:", { user: !!user, error: authError })
    
    if (authError) {
      console.error("❌ Auth error:", authError)
      return NextResponse.json({ error: "Authentication error", details: authError.message }, { status: 401 })
    }
    
    if (!user) {
      console.log("❌ No user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("✅ User authenticated:", user.id)

    // First, let's check if the item exists and belongs to the user
    console.log("🔍 Checking if item exists and belongs to user...")
    const { data: existingItem, error: checkError } = await supabase
      .from("inventory_items")
      .select("id, created_by")
      .eq("id", id)
      .single()

    if (checkError) {
      console.error("❌ Error checking item:", checkError)
      return NextResponse.json({ error: "Failed to check item", details: checkError.message }, { status: 500 })
    }

    if (!existingItem) {
      console.log("❌ Item not found")
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    if (existingItem.created_by !== user.id) {
      console.log("❌ Item does not belong to user. Item created_by:", existingItem.created_by, "User ID:", user.id)
      return NextResponse.json({ error: "Unauthorized to delete this item" }, { status: 403 })
    }

    console.log("✅ Item verified, proceeding with deletion...")

    // Delete the inventory item
    console.log("🗑️ Attempting to delete item from database...")
    const { data: deleteResult, error: deleteError } = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", id)
      .eq("created_by", user.id) // Double-check user ownership
      .select() // Return the deleted item to confirm

    if (deleteError) {
      console.error("❌ Database delete error:", deleteError)
      return NextResponse.json({ error: "Failed to delete item", details: deleteError.message }, { status: 500 })
    }

    console.log("✅ Delete result:", deleteResult)
    console.log("✅ Item deleted successfully from database")
    console.log("=== DELETE API ROUTE SUCCESS ===")
    
    const response = NextResponse.json({ 
      success: true, 
      deletedItem: deleteResult?.[0] || null,
      message: "Item deleted successfully"
    })
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response
  } catch (error) {
    console.error("=== DELETE API ROUTE ERROR ===")
    console.error("Delete item error:", error)
    const errorResponse = NextResponse.json({ 
      error: "Delete failed", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
    
    errorResponse.headers.set('Access-Control-Allow-Origin', '*')
    errorResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return errorResponse
  }
}
