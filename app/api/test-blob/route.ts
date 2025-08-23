import { NextResponse } from "next/server"

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

export async function GET() {
  try {
    // Check if Blob token is available
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN
    
    const response = NextResponse.json({
      status: "ok",
      hasBlobToken,
      blobTokenLength: process.env.BLOB_READ_WRITE_TOKEN ? process.env.BLOB_READ_WRITE_TOKEN.length : 0,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    })

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    return response
  } catch (error) {
    const errorResponse = NextResponse.json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })

    // Add CORS headers to error response as well
    errorResponse.headers.set('Access-Control-Allow-Origin', '*')
    errorResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    return errorResponse
  }
}
