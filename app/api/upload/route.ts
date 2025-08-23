import { put } from "@vercel/blob"
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

    const response = NextResponse.json({
      url: blob.url,
      filename: file.name,
      size: file.size,
      type: file.type,
    })

    // Add CORS headers to the response
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    return response
  } catch (error) {
    console.error("Upload error:", error)
    const errorResponse = NextResponse.json({ 
      error: "Upload failed", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
    
    // Add CORS headers to error response as well
    errorResponse.headers.set('Access-Control-Allow-Origin', '*')
    errorResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return errorResponse
  }
}
