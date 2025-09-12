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

function parseJsonLenient<T = any>(raw: string): T {
  const trim = (s: string) => s.replace(/^```(json)?/i, '').replace(/```\s*$/, '').trim()
  const tryParse = (s: string) => {
    try { return { ok: true as const, value: JSON.parse(s) } } catch (e) { return { ok: false as const, err: e as Error } }
  }
  // First try raw
  let attempt = tryParse(raw)
  if (attempt.ok) return attempt.value
  // Remove code fences
  attempt = tryParse(trim(raw))
  if (attempt.ok) return attempt.value
  // Extract first JSON object block
  const match = raw.match(/\{[\s\S]*\}/)
  if (match) {
    attempt = tryParse(match[0])
    if (attempt.ok) return attempt.value
  }
  // Escape control characters globally to avoid "Bad control character" errors
  const escaped = (match ? match[0] : trim(raw))
    .replace(/\r?\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/[\u0000-\u0019]/g, ' ')
  attempt = tryParse(escaped)
  if (attempt.ok) return attempt.value
  throw new Error(`Failed to parse JSON from model output: ${String((attempt.err as any)?.message || attempt.err)}\nSnippet: ${raw.slice(0, 300)}`)
}

type ListingOut = { listing_title?: string; listing_description?: string; analysis_text?: string; sources?: { title?: string; url?: string }[] }

async function callGeminiListingWithSearch({ apiKey, description }: { apiKey: string; description: string }): Promise<ListingOut> {
  const { GoogleGenAI } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey })
  const prompt = `Role: You are an expert appraiser and marketplace copywriter.\nGoal: Produce a professional listing backed by web research.\n\nFacts (from the item):\n${description}\n\nResearch plan (use Google Search tool):\n- Prioritize brand + catalog/model numbers when present (e.g., Lladró 4882 / Lladro 4882). Include Spanish name variants when relevant.\n- Find issued/retired years, sculptor/designer, official/market names, typical dimensions.\n- Collect 3–5 comparable SOLD or listed items with site, title, date (or year), condition, price, URL.\n- Prefer eBay sold/completed, LiveAuctioneers, Replacements, auction catalogues.\n\nReturn ONLY a JSON object with keys:\n{\n  \"listing_title\": \"[Brand] #[Model] 'Official/Market Name' — core subject — sculptor/designer (if known)\",\n  \"listing_description\": \"2–3 short paragraphs (max ~220 words). Include maker/line, sculptor/designer (if known), model/catalog number, issue/retire dates, finish/materials, approx dimensions (cm and inches when available), condition cues, authenticity marks. Integrate 1–2 bracketed citations like [1], [2] tied to Sources order.\",\n  \"analysis_text\": \"Price Range (USD): $MIN–$MAX. Key Comparables: bullet 2–3 lines with Site + Year/Date + Title + Price + Condition + [n]. Rationale: one short sentence explaining the range based on those comps and the item condition/size.\",\n  \"sources\": [ {\"title\": \"string\", \"url\": \"string\"} ]\n}\nConstraints: If unknown, write \"Not Available\". Use bracketed references [n] aligned to Sources order. Return JSON only.`
  const resp = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: { parts: [{ text: prompt }] },
    config: { temperature: 0.4, tools: [{ googleSearch: {} }], responseMimeType: 'application/json' },
  })
  const textOut = (resp as any)?.text || ''
  const parsed = parseJsonLenient<ListingOut>(textOut)
  const chunks = (resp as any)?.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  const sources = chunks
    .map((c: any) => c?.web)
    .filter((w: any) => w && (w.uri || w.title))
    .map((w: any) => ({ title: w.title || '', url: w.uri || '' }))
  return { ...parsed, sources: parsed.sources?.length ? parsed.sources : sources }
}

async function callGeminiListingQuick({ apiKey, description }: { apiKey: string; description: string }): Promise<ListingOut> {
  const { GoogleGenAI } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey })
  const prompt = `Role: Expert appraiser and marketplace copywriter.\nNo web search in this mode — use ONLY the provided facts.\n\nFacts (from the item):\n${description}\n\nReturn ONLY a JSON object with keys:\n{\n  \"listing_title\": \"[Brand] #[Model] 'Official/Market Name' — core subject\",\n  \"listing_description\": \"~150–180 words in 2 paragraphs. Incorporate model/catalog number, year/period if present, materials/finish, approx dimensions (cm and inches if available), condition, and authenticity marks.\",\n  \"analysis_text\": \"Price Range (USD): $MIN–$MAX. Rationale: one short sentence based on the provided facts (brand/size/condition/subject).\",\n  \"sources\": []\n}\nConstraints: If unknown, write \"Not Available\". Return JSON only.`
  const resp = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: { parts: [{ text: prompt }] },
    config: { temperature: 0.5, responseMimeType: 'application/json' },
  })
  const textOut = (resp as any)?.text || ''
  const parsed = parseJsonLenient<ListingOut>(textOut)
  return { ...parsed, sources: Array.isArray(parsed.sources) ? parsed.sources : [] }
}

export async function POST(request: NextRequest) {
  try {
    const t0 = Date.now()
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
      .select('id, project_id, product_name, description, product_id, length_cm, width_cm, height_cm, weight_kg')
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

    // Build enriched facts string: use dimensions (cm + inches) and weight when available
    const hasDims = [item.length_cm, item.width_cm, item.height_cm].every((v) => typeof v === 'number')
    const dimsCm = hasDims ? `${item.length_cm} × ${item.width_cm} × ${item.height_cm} cm` : ''
    const dimsIn = hasDims ? `${(item.length_cm! / 2.54).toFixed(1)} × ${(item.width_cm! / 2.54).toFixed(1)} × ${(item.height_cm! / 2.54).toFixed(1)} in` : ''
    const weight = typeof item.weight_kg === 'number' ? `${item.weight_kg} kg` : ''
    const factsParts = [
      `product_name: ${item.product_name || ''}`,
      `product_id: ${(item as any).product_id ?? ''}`,
      `description: ${item.description || ''}`,
      dimsCm && `dimensions_cm: ${dimsCm}`,
      dimsIn && `dimensions_in: ${dimsIn}`,
      weight && `weight_kg: ${weight}`,
      extraDescription && `extra: ${extraDescription}`,
    ].filter(Boolean) as string[]
    const desc = factsParts.join('; ')
    const useSearch = body?.useSearch !== false
    let listing: ListingOut
    let mode: 'search' | 'quick' = 'search'
    if (useSearch) {
      try {
        listing = await withTimeout(callGeminiListingWithSearch({ apiKey, description: desc }), 22000, 'listing generate (search)')
      } catch (e) {
        mode = 'quick'
        listing = await withTimeout(callGeminiListingQuick({ apiKey, description: desc }), 7000, 'listing generate (quick)')
      }
    } else {
      mode = 'quick'
      listing = await withTimeout(callGeminiListingQuick({ apiKey, description: desc }), 12000, 'listing generate (quick)')
    }
    const res = NextResponse.json({
      success: true,
      listing_title: listing?.listing_title || '',
      listing_description: listing?.listing_description || '',
      analysis_text: listing?.analysis_text || '',
      sources: Array.isArray(listing?.sources) ? listing.sources : [],
      mode,
    })
    res.headers.set('X-List-Duration-ms', String(Date.now() - t0))
    return res
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Generate listing failed', details: msg }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const maxDuration = 30
