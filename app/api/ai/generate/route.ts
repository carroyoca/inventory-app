import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/api-client'
import { put } from '@vercel/blob'

type GenerateRequest = {
  itemId: string
  photoUrls?: string[]
  maxCount?: number
  extraDescription?: string
  locale?: string
}

async function fetchAsBase64(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)
  const ab = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') || 'image/jpeg'
  const base64 = Buffer.from(ab).toString('base64')
  return { base64, mimeType: contentType }
}

async function callGeminiImageTransform({
  base64,
  mimeType,
  apiKey,
}: { base64: string; mimeType: string; apiKey: string }) {
  // Use image-capable preview model
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`
  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { data: base64, mimeType } },
          {
            text:
              'Eres un fotógrafo profesional de catálogo. Mantén el marco original si existiera; no alteres la obra. Si no hay marco, fondo limpio tipo galería. Iluminación suave y enfoque nítido. Devuelve una fotografía realista del objeto en formato PNG.',
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
    },
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gemini image gen error: ${res.status} ${text}`)
  }
  const data = await res.json()
  // Find first inlineData image
  const parts = data?.candidates?.[0]?.content?.parts || []
  const imgPart = parts.find((p: any) => p.inlineData && p.inlineData.data)
  if (!imgPart) throw new Error('Gemini did not return image data')
  return imgPart.inlineData.data as string
}

async function callGeminiListing({
  apiKey,
  description,
}: {
  apiKey: string
  description: string
}) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
  const prompt = `You are an expert art appraiser and marketplace copywriter. Generate ONLY a valid JSON object in English with keys:
{
  "listing_title": "SEO-ready marketplace listing title (include artist, style, medium)",
  "listing_description": "Professional, persuasive multi-paragraph listing body in English",
  "analysis_text": "Concise internal notes in English: estimated price range and reasoning based on comparable works and signals",
  "sources": [ {"title": "string", "url": "string"}, ... ]
}
Use web research with explicit sources. If data is insufficient, be clear. Input facts from the item: ${description}`

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    tools: [{ googleSearch: {} }],
    generationConfig: { temperature: 0.6 },
  }
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gemini listing error: ${res.status} ${text}`)
  }
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Gemini listing response did not contain JSON')
  const parsed = JSON.parse(match[0])
  return parsed
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

    const body = (await request.json()) as GenerateRequest
    if (!body?.itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 })

    const { data: item, error: itemErr } = await supabase
      .from('inventory_items')
      .select('id, project_id, product_name, description, photos, product_id')
      .eq('id', body.itemId)
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

    const photos: string[] = Array.isArray(body.photoUrls) && body.photoUrls.length > 0 ? body.photoUrls : Array.isArray(item.photos) ? item.photos : []
    if (!photos.length) return NextResponse.json({ error: 'This item has no photos' }, { status: 400 })
    const maxCount = Math.max(1, Math.min(body.maxCount ?? photos.length, photos.length, 6))
    const selected = photos.slice(0, maxCount)

    const base64s = await Promise.all(
      selected.map(async (url) => {
        const { base64, mimeType } = await fetchAsBase64(url)
        return { base64, mimeType }
      }),
    )

    // Generate one image per input
    const generated = await Promise.all(
      base64s.map(async (img) => {
        const b64 = await callGeminiImageTransform({ base64: img.base64, mimeType: img.mimeType, apiKey })
        const dataUrl = `data:image/png;base64,${b64}`
        if (!blobConfigured) {
          // Fallback: return data URL in dev when Blob token is missing
          return dataUrl
        }
        try {
          // Upload to Blob
          const binary = Buffer.from(b64, 'base64')
          const filename = `ai/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.png`
          const blob = await put(filename, binary, { access: 'public', contentType: 'image/png' })
          return blob.url
        } catch (e) {
          console.error('Blob upload failed, returning data URL fallback:', e)
          return dataUrl
        }
      }),
    )

    const productIdVal = (item as any).product_id ?? ''
    const desc = `product_name: ${item.product_name || ''}; description: ${item.description || ''}; product_id: ${productIdVal}; ${body.extraDescription || ''}`.trim()
    const listing = await callGeminiListing({ apiKey, description: desc })

    return NextResponse.json({
      success: true,
      imageUrls: generated,
      listing_title: listing.listing_title || '',
      listing_description: listing.listing_description || '',
      analysis_text: listing.analysis_text || '',
      sources: Array.isArray(listing.sources) ? listing.sources : [],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('AI generation failed:', msg)
    return NextResponse.json({ error: 'AI generation failed', details: msg }, { status: 500 })
  }
}

export const maxDuration = 60
