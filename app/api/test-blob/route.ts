import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check if Blob token is available
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN
    
    return NextResponse.json({
      status: "ok",
      hasBlobToken,
      blobTokenLength: process.env.BLOB_READ_WRITE_TOKEN ? process.env.BLOB_READ_WRITE_TOKEN.length : 0,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
