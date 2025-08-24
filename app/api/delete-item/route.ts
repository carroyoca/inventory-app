import { createClient } from "@/lib/supabase/server"
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
    console.log("Delete item API called")
    
    const { id } = await request.json()
    console.log("Delete request for item ID:", id)

    if (!id) {
      console.log("No ID provided")
      return NextResponse.json({ error: "No ID provided" }, { status: 400 })
    }

    const supabase = createClient()
    console.log("Supabase client created")

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log("Auth check result:", { user: !!user, error: authError })
    
    if (authError) {
      console.error("Auth error:", authError)
      return NextResponse.json({ error: "Authentication error" }, { status: 401 })
    }
    
    if (!user) {
      console.log("No user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("User authenticated:", user.id)

    // Delete the inventory item
    const { error: deleteError } = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", id)
      .eq("created_by", user.id) // Ensure user can only delete their own items

    if (deleteError) {
      console.error("Database delete error:", deleteError)
      return NextResponse.json({ error: "Failed to delete item", details: deleteError.message }, { status: 500 })
    }

    console.log("Item deleted successfully")
    
    const response = NextResponse.json({ success: true })
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response
  } catch (error) {
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
