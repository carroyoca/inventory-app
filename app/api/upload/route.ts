import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("Upload API called")
    
    const formData = await request.formData()
    console.log("Form data received:", formData)
    
    const file = formData.get("file") as File
    console.log("File extracted:", file ? {
      name: file.name,
      size: file.size,
      type: file.type
    } : "No file")

    if (!file) {
      console.log("No file provided")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Create a unique filename with timestamp to avoid conflicts
    const timestamp = Date.now()
    const filename = `inventory/${timestamp}-${file.name}`
    console.log("Uploading to filename:", filename)

    // Check if Blob token is available
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("BLOB_READ_WRITE_TOKEN not found")
      return NextResponse.json({ error: "Blob configuration missing" }, { status: 500 })
    }

    console.log("Blob token found, attempting upload...")

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: "public",
    })

    console.log("Upload successful:", {
      url: blob.url,
      filename: file.name,
      size: file.size,
      type: file.type,
    })

    return NextResponse.json({
      url: blob.url,
      filename: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ 
      error: "Upload failed", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
