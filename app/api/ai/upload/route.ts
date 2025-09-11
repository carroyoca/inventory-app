import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/api-client'
import { put } from '@vercel/blob'

export const runtime = 'nodejs'
export const maxDuration = 20

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    const token = authHeader.slice('Bearer '.length)

    const supabase = createServiceRoleClient()
    const { data: auth, error: authError } = await supabase.auth.getUser(token)
    if (authError || !auth?.user) return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })

    const body = await request.json()
    const dataUrl = String(body?.dataUrl || '')
    if (!dataUrl.startsWith('data:image/')) return NextResponse.json({ error: 'dataUrl image required' }, { status: 400 })

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      // If blob not configured, just echo back the same data URL (no upload)
      return NextResponse.json({ url: dataUrl })
    }

    const b64 = dataUrl.split(',')[1]
    const bin = Buffer.from(b64, 'base64')
    const filename = `ai/applied/${Date.now()}-${Math.random().toString(36).slice(2)}.png`
    const blob = await put(filename, bin, { access: 'public', contentType: 'image/png' })
    return NextResponse.json({ url: blob.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Upload failed', details: msg }, { status: 500 })
  }
}

