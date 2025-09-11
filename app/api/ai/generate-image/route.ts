import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/api-client'
import { put } from '@vercel/blob'
import { GoogleGenAI, Modality } from '@google/genai'

async function fetchAsBase64(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)
  const ab = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') || 'image/jpeg'
  const base64 = Buffer.from(ab).toString('base64')
  return { base64, mimeType: contentType }
}

function withTimeout<T>(p: Promise<T>, ms: number, label = 'operation'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    p.then((v) => { clearTimeout(t); resolve(v) }).catch((e) => { clearTimeout(t); reject(e) })
  })
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 400): Promise<T> {
  let lastErr: any
  for (let i = 0; i < attempts; i++) {
    try { return await fn() } catch (e) { lastErr = e; await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, i))) }
  }
  throw lastErr
}

async function callGeminiImageTransform({ base64, mimeType, apiKey }: { base64: string; mimeType: string; apiKey: string }) {
  const ai = new GoogleGenAI({ apiKey })
  const resp = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: {
      parts: [
        { inlineData: { data: base64, mimeType } },
        {
          text:
            'Eres un fotógrafo profesional de catálogo. Mantén el marco original si existiera; no alteres la obra. Si no hay marco, fondo limpio tipo galería. Iluminación suave y enfoque nítido. Devuelve una fotografía realista del objeto en formato PNG.',
        },
      ],
    },
    config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
  })

  const parts = resp?.candidates?.[0]?.content?.parts || []
  const imgPart = parts.find((p: any) => p.inlineData && p.inlineData.data)
  if (imgPart?.inlineData?.data) return imgPart.inlineData.data as string

  const textOut = (resp as any)?.text?.trim?.() || ''
  if (textOut) throw new Error(`Gemini returned no image. Details: ${textOut}`)
  throw new Error('Gemini did not return image data')
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
    const blobConfigured = !!process.env.BLOB_READ_WRITE_TOKEN

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    const token = authHeader.slice('Bearer '.length)

    const supabase = createServiceRoleClient()
    const { data: auth, error: authError } = await supabase.auth.getUser(token)
    if (authError || !auth?.user) return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    const user = auth.user

    const body = await request.json()
    const itemId = body?.itemId as string
    const photoUrl = body?.photoUrl as string
    if (!itemId || !photoUrl) return NextResponse.json({ error: 'itemId and photoUrl required' }, { status: 400 })

    const { data: item, error: itemErr } = await supabase
      .from('inventory_items')
      .select('id, project_id, photos')
      .eq('id', itemId)
      .single()
    if (itemErr || !item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    // Membership check
    const { data: membership } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', item.project_id)
      .eq('user_id', user.id)
      .in('role', ['owner', 'manager', 'member'])
      .maybeSingle()
    if (!membership) return NextResponse.json({ error: 'No access to this project' }, { status: 403 })

    // Optional: ensure the provided photo belongs to the item
    const photos: string[] = Array.isArray(item.photos) ? item.photos : []
    if (!photos.includes(photoUrl)) {
      // Allow anyway but log
      console.warn('Photo URL not found on item; proceeding by request')
    }

    const t0 = Date.now()
    // Keep retries bounded to fit Vercel function budget
    const { base64, mimeType } = await withRetry(() => withTimeout(fetchAsBase64(photoUrl), 10000, 'image fetch'), 2, 500)
    const b64 = await withRetry(() => withTimeout(callGeminiImageTransform({ base64, mimeType, apiKey }), 20000, 'image generate'), 2, 600)
    const dataUrl = `data:image/png;base64,${b64}`
    if (!blobConfigured) return NextResponse.json({ success: true, url: dataUrl })
    try {
      const binary = Buffer.from(b64, 'base64')
      const filename = `ai/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.png`
      const blob = await withTimeout(put(filename, binary, { access: 'public', contentType: 'image/png' }), 12000, 'blob upload')
      const res = NextResponse.json({ success: true, url: blob.url })
      res.headers.set('X-Gen-Duration-ms', String(Date.now() - t0))
      return res
    } catch (e) {
      console.error('Blob upload failed; returning data URL', e)
      const res = NextResponse.json({ success: true, url: dataUrl })
      res.headers.set('X-Gen-Duration-ms', String(Date.now() - t0))
      return res
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Generate image failed', details: msg }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const maxDuration = 60
