import { createApiClient } from "@/lib/supabase/api-client"
import { type NextRequest, NextResponse } from "next/server"

export async function DELETE(request: NextRequest) {
  try {
    console.log("=== SIMPLE DELETE TEST ===")
    
    const { id } = await request.json()
    console.log("Delete request for item ID:", id)

    if (!id) {
      return NextResponse.json({ error: "No ID provided" }, { status: 400 })
    }

    // Create simple anon client
    const supabase = createApiClient()
    console.log("✅ Anon client created")

    // Try to delete directly (this will fail with RLS)
    console.log("🗑️ Attempting delete with anon key...")
    const { data, error } = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", id)
      .select()

    if (error) {
      console.error("❌ Delete error:", error)
      return NextResponse.json({ 
        error: "Delete failed", 
        details: error.message,
        code: error.code,
        hint: "This is likely an RLS policy issue"
      }, { status: 500 })
    }

    console.log("✅ Delete successful:", data)
    return NextResponse.json({ success: true, deletedItem: data?.[0] })

  } catch (error) {
    console.error("❌ Unexpected error:", error)
    return NextResponse.json({ 
      error: "Unexpected error", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
