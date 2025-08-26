import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/api-client"

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
    
    // Log user agent for mobile debugging
    const userAgent = request.headers.get('user-agent') || 'Unknown'
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    const isAndroid = /Android/.test(userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(userAgent)
    
    console.log("📱 Device detection:", { 
      userAgent: userAgent.substring(0, 100) + "...",
      isMobile,
      isAndroid,
      isIOS
    })
    
    // Get authorization header and verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Authorization header required" }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createServiceRoleClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication" }, { status: 401 })
    }

    console.log("✅ User authenticated:", user.id)
    
    const formData = await request.formData()
    console.log("Form data received:", formData)
    
    // Enhanced file extraction for mobile devices
    let file = formData.get("file") as File
    
    // For mobile devices, try alternative extraction methods
    if (!file && isMobile) {
      console.log("📱 Mobile device detected, trying alternative file extraction")
      
      // Try different possible field names
      const possibleFieldNames = ["file", "image", "photo", "upload"]
      for (const fieldName of possibleFieldNames) {
        const potentialFile = formData.get(fieldName) as File
        if (potentialFile && potentialFile.size > 0) {
          file = potentialFile
          console.log(`📱 Found file using field name: ${fieldName}`)
          break
        }
      }
    }
    
    console.log("File extracted:", file ? {
      name: file.name,
      size: file.size,
      type: file.type,
      device: isMobile ? (isAndroid ? 'Android' : 'iOS') : 'Desktop'
    } : "No file")

    if (!file) {
      console.log("No file provided")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type (only allow images)
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 })
    }

    // Validate file size with mobile-specific limits
    const MAX_FILE_SIZE = isMobile ? (15 * 1024 * 1024) : (10 * 1024 * 1024) // 15MB for mobile, 10MB for desktop
    if (file.size > MAX_FILE_SIZE) {
      const maxSizeMB = isMobile ? 15 : 10
      return NextResponse.json({ 
        error: `File size too large. Maximum ${maxSizeMB}MB allowed.` 
      }, { status: 400 })
    }

    // Create a unique filename with user ID and timestamp to avoid conflicts
    const timestamp = Date.now()
    const filename = `inventory/${user.id}/${timestamp}-${file.name}`
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
