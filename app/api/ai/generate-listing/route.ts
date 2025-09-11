import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/api-client'

async function withTimeout<T>(p: Promise<T>, ms: number, label = 'operation'): Promise<T> {
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

async function callGeminiListing({ apiKey, description }: { apiKey: string; description: string }) {
  const { GoogleGenAI } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey })
  const prompt = `You are an expert appraiser and marketplace copywriter. Use Google Search to research artist/work and comps. Return ONLY a valid JSON in English with keys:\n{\n  \"listing_title\": \"SEO-ready marketplace listing title (include artist, style, medium)\",\n  \"listing_description\": \"Professional, persuasive multi-paragraph listing body in English\",\n  \"analysis_text\": \"Concise internal notes in English: estimated price range and reasoning based on comparable works and signals\",\n  \"sources\": [ {\"title\": \"string\", \"url\": \"string\"} ]\n}\nBe explicit if data is insufficient. Facts from the item: ${description}`
  const resp = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [{ text: prompt }] },
    config: { temperature: 0.6, tools: [{ googleSearch: {} }] },
  })
  const textOut = (resp as any)?.text || ''
  const match = textOut.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Gemini listing response did not contain JSON')
  const parsed = JSON.parse(match[0])
  const chunks = (resp as any)?.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  const sources = chunks
    .map((c: any) => c?.web)
    .filter((w: any) => w && (w.uri || w.title))
    .map((w: any) => ({ title: w.title || '', url: w.uri || '' }))
  return { ...parsed, sources: parsed.sources?.length ? parsed.sources : sources }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    const token = authHeader.slice('Bearer '.length)

    const supabase = createServiceRoleClient()
    const { data: auth, error: authError } = await supabase.auth.getUser(token)
    if (authError || !auth?.user) return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    const user = auth.user

    const body = await request.json()
    const itemId = body?.itemId as string
    const extraDescription = body?.extraDescription as string | undefined
    if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 })

    const { data: item, error: itemErr } = await supabase
      .from('inventory_items')
      .select('id, project_id, product_name, description, product_id')
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

    const desc = `product_name: ${item.product_name || ''}; description: ${item.description || ''}; product_id: ${(item as any).product_id ?? ''}; ${extraDescription || ''}`.trim()
    // Allow more time for search-enabled calls but keep under 30s
    const listing = await withRetry(() => withTimeout(callGeminiListing({ apiKey, description: desc }), 20000, 'listing generate'), 1, 500)
    return NextResponse.json({
      success: true,
      listing_title: listing?.listing_title || '',
      listing_description: listing?.listing_description || '',
      analysis_text: listing?.analysis_text || '',
      sources: Array.isArray(listing?.sources) ? listing.sources : [],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Generate listing failed', details: msg }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const maxDuration = 30
