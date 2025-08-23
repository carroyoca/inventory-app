import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "No ID provided" }, { status: 400 })
    }

    const supabase = createClient()

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete the inventory item
    const { error } = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", id)
      .eq("created_by", user.id) // Ensure user can only delete their own items

    if (error) {
      console.error("Database delete error:", error)
      return NextResponse.json({ error: "Failed to delete item" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete item error:", error)
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}
