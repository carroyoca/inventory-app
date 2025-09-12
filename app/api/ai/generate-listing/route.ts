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
  const trim = (s: string) => s
    .replace(/^\uFEFF/, '') // BOM
    .replace(/[\u200B\u200C\u200D]/g, '') // zero-width spaces
    .replace(/^```(json)?/i, '')
    .replace(/```\s*$/, '')
    .trim()
  const tryParse = (s: string) => {
    try { return { ok: true as const, value: JSON.parse(s) } } catch (e) { return { ok: false as const, err: e as Error } }
  }
  // First try raw
  let attempt = tryParse(raw)
  if (attempt.ok) {
    const v = attempt.value
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') return v[0]
    return v
  }
  // Remove code fences
  attempt = tryParse(trim(raw))
  if (attempt.ok) {
    const v = attempt.value
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') return v[0]
    return v
  }
  // Extract first JSON object block
  const match = raw.match(/\{[\s\S]*\}/)
  if (match) {
    // sanitize trailing commas
    const cleaned = match[0].replace(/,\s*([}\]])/g, '$1')
    attempt = tryParse(cleaned)
    if (attempt.ok) return attempt.value
  }
  // Escape control characters globally to avoid "Bad control character" errors
  const escaped = (match ? match[0] : trim(raw))
    .replace(/\r?\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/[\u0000-\u0019]/g, ' ')
    .replace(/,\s*([}\]])/g, '$1')
  attempt = tryParse(escaped)
  if (attempt.ok) {
    const v = attempt.value
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') return v[0]
    return v
  }
  // Last resort: manual field extraction to avoid total failure
  const title = /"listing_title"\s*:\s*"([\s\S]*?)"\s*(,|})/.exec(raw)?.[1]
  const desc = /"listing_description"\s*:\s*"([\s\S]*?)"\s*(,|})/.exec(raw)?.[1]
  const analysis = /"analysis_text"\s*:\s*"([\s\S]*?)"\s*(,|})/.exec(raw)?.[1]
  if (title || desc || analysis) {
    return {
      listing_title: title ? title.replace(/\r?\n/g, ' ') : '',
      listing_description: desc ? desc.replace(/\r?\n/g, '\n') : '',
      analysis_text: analysis ? analysis.replace(/\r?\n/g, '\n') : '',
      sources: [],
    } as unknown as T
  }
  throw new Error(`Failed to parse JSON from model output: ${String((attempt.err as any)?.message || attempt.err)}\nSnippet: ${raw.slice(0, 300)}`)
}

type ListingOut = { listing_title?: string; listing_description?: string; analysis_text?: string; sources?: { title?: string; url?: string }[] }
type Comp = { site?: string; title?: string; date?: string; year?: number; condition?: string; price_usd?: number; url?: string }

// Streamlined single function that mimics browser Gemini approach
async function generateListingDirect({ apiKey, facts, itemCategory }: { apiKey: string; facts: string; itemCategory: string }): Promise<ListingOut> {
  console.log('🔍 STREAMLINED: Direct Gemini call (browser-style approach)')
  
  const { GoogleGenAI } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey })
  
  const prompt = `You are an expert ${itemCategory} appraiser and marketplace copywriter.
  
Analyze this item and use Google Search to find comparable sales data:
${facts}

Based on your web search, create a professional marketplace listing.

Return ONLY a valid JSON object:
{
  "listing_title": "Professional marketplace title (Lladro 5073 Country Flowers Girl - Retired Porcelain Figurine)",
  "listing_description": "Clean professional description focusing on item details, condition, authenticity, dimensions. Write naturally like a knowledgeable dealer. NO price mentions in description.",
  "analysis_text": "Market analysis with price range $X-Y based on comparable sales found in search. Reference specific sources.",
  "sources": [{"title": "Source name", "url": "source url"}]
}`

  try {
    console.log('🔍 Making direct Gemini search call...')
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: prompt }] },
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2
      },
    })

    console.log('🔍 Response received, extracting JSON...')
    const text = response.text.trim()
    console.log('🔍 Response length:', text.length)
    console.log('🔍 First 200 chars:', text.substring(0, 200))
    
    // Extract JSON like the working browser example
    const jsonMatch = text.match(/{[\s\S]*}/)
    if (!jsonMatch) {
      throw new Error('No JSON object found in response')
    }
    
    const jsonText = jsonMatch[0]
    const listing = JSON.parse(jsonText) as ListingOut
    
    console.log('✅ JSON extracted successfully')
    console.log('✅ Title length:', listing.listing_title?.length || 0)
    console.log('✅ Description length:', listing.listing_description?.length || 0)
    console.log('✅ Sources count:', Array.isArray(listing.sources) ? listing.sources.length : 0)
    
    return listing
    
  } catch (error) {
    console.log('❌ Direct search failed:', error)
    throw new Error(`Listing generation failed: ${error}`)
  }
}

async function callGeminiListingWithSearch({ apiKey, description, itemCategory }: { apiKey: string; description: string; itemCategory: string }): Promise<ListingOut> {
  const { GoogleGenAI } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey })
  
  // Category-specific research strategies
  const researchStrategy = itemCategory === 'collectible'
    ? `COLLECTIBLE RESEARCH STRATEGY:
- Prioritize manufacturer + catalog/model numbers (e.g., "Lladró 4882", "Hummel 141")
- Search for series name, sculptor/designer, production years
- Look for condition standards, original packaging, authenticity marks
- Focus on completed sales: eBay sold listings, auction results, dealer sales
- Include Spanish/international variants for European collectibles`
    : itemCategory === 'artwork'
    ? `ARTWORK RESEARCH STRATEGY:
- Search artist name + medium + dimensions
- Look for gallery representations, exhibition history, similar period works
- Research art movement, style period, technique details
- Check auction databases, gallery listings, art market reports
- Verify attribution, signature, provenance when possible`
    : itemCategory === 'sculpture'
    ? `SCULPTURE RESEARCH STRATEGY:
- Research sculptor/artist + material + approximate size
- Look for casting information, edition details, foundry marks
- Search public art databases, museum collections, gallery shows
- Check bronze/stone/ceramic specific marketplaces
- Include installation, display, conservation considerations`
    : `GENERAL RESEARCH STRATEGY:
- Use all available identifiers: brand, model, type, dimensions
- Research manufacturer, designer, production period
- Look for comparable items by type, size, condition, age
- Check multiple marketplaces and auction results`

  const prompt = `ROLE: Expert marketplace researcher and copywriter specializing in ${itemCategory} items.

TASK: Research and compose a professional marketplace listing with web-verified information.

${researchStrategy}

SEARCH PRIORITIES:
1. Use specific product IDs/catalog numbers first
2. Search manufacturer + model combinations  
3. Include condition-specific terms
4. Prioritize sold/completed listings over active ones
5. Focus on reputable sources (auction houses, established dealers, certified platforms)

QUALITY STANDARDS:
- Verify facts through multiple sources when possible
- Indicate uncertainty levels for unconfirmed information
- Use proper industry terminology and grading standards
- Include relevant historical/technical context

Item Details: ${description}

Research thoroughly and create accurate marketplace content with proper source attribution.`

  const resp = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [{ text: prompt }] },
    config: { 
      temperature: 0.15, 
      tools: [{ googleSearch: {} }], 
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        propertyOrdering: ['listing_title', 'listing_description', 'analysis_text', 'sources'],
        properties: {
          listing_title: { 
            type: 'string',
            description: 'SEO-optimized marketplace title',
            minLength: 20,
            maxLength: 100
          },
          listing_description: { 
            type: 'string',
            description: 'Professional marketplace description with citations',
            minLength: 150,
            maxLength: 800
          },
          analysis_text: { 
            type: 'string',
            description: 'Market analysis with price range and comparable references',
            minLength: 80,
            maxLength: 400
          },
          sources: { 
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                url: { type: 'string' }
              },
              required: ['title']
            }
          }
        },
        required: ['listing_title', 'listing_description', 'analysis_text']
      }
    },
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

async function callGeminiListingQuick({ apiKey, description, itemCategory }: { apiKey: string; description: string; itemCategory: string }): Promise<ListingOut> {
  const { GoogleGenAI } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey })
  
  // Category-specific guidance for offline mode
  const categoryGuidance = itemCategory === 'collectible' 
    ? `Focus on manufacturer details, model/catalog numbers, condition assessment, and typical collector market ranges for this type.`
    : itemCategory === 'artwork'
    ? `Focus on artistic medium, style, dimensions, condition, and typical art market ranges for similar works.`
    : itemCategory === 'sculpture'
    ? `Focus on material, technique, size, condition, and typical sculpture market ranges.`
    : `Focus on item type, condition, notable features, and general market positioning.`

  const prompt = `ROLE: Expert appraiser and marketplace copywriter (offline mode - no web search).
  
TASK: Create professional marketplace listing using only the provided item information.

CATEGORY GUIDANCE: ${categoryGuidance}

CONSTRAINTS:
- Use ONLY the facts provided - no external research
- Indicate uncertainty with phrases like "appears to be" or "typical of"
- Provide conservative price estimates based on item characteristics
- Be honest about limitations of offline assessment

Item Details: ${description}

Create accurate marketplace content based solely on available information:`

  const resp = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [{ text: prompt }] },
    config: { 
      temperature: 0.3,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        propertyOrdering: ['listing_title', 'listing_description', 'analysis_text', 'sources'],
        properties: {
          listing_title: { 
            type: 'string',
            description: 'Marketplace title based on available facts',
            minLength: 15,
            maxLength: 100
          },
          listing_description: { 
            type: 'string',
            description: 'Item description using provided information only',
            minLength: 100,
            maxLength: 600
          },
          analysis_text: { 
            type: 'string',
            description: 'Price analysis based on item characteristics',
            minLength: 50,
            maxLength: 300
          },
          sources: { 
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                url: { type: 'string' }
              },
              required: ['title']
            }
          }
        },
        required: ['listing_title', 'listing_description', 'analysis_text']
      }
    },
  })
  const textOut = (resp as any)?.text || ''
  const parsed = parseJsonLenient<ListingOut>(textOut)
  return { ...parsed, sources: Array.isArray(parsed.sources) ? parsed.sources : [] }
}

// Quality control functions
function validateListingContent(listing: ListingOut): { isValid: boolean; score: number; issues: string[] } {
  const issues: string[] = []
  let score = 100

  // Validate title
  if (!listing.listing_title || listing.listing_title.length < 10) {
    issues.push('Title too short')
    score -= 20
  } else if (listing.listing_title.length > 120) {
    issues.push('Title too long')
    score -= 10
  }

  // Validate description
  if (!listing.listing_description || listing.listing_description.length < 50) {
    issues.push('Description too short')
    score -= 25
  } else if (listing.listing_description.length > 1000) {
    issues.push('Description too long')
    score -= 10
  }

  // Check for placeholder content
  const placeholderTerms = ['not available', 'unknown', 'n/a', 'tbd', 'placeholder', 'lorem ipsum']
  const allText = `${listing.listing_title} ${listing.listing_description} ${listing.analysis_text}`.toLowerCase()
  const placeholderCount = placeholderTerms.filter(term => allText.includes(term)).length
  if (placeholderCount > 0) {
    issues.push(`Contains ${placeholderCount} placeholder terms`)
    score -= placeholderCount * 10
  }

  // Validate price analysis
  if (!listing.analysis_text || listing.analysis_text.length < 30) {
    issues.push('Price analysis missing or too short')
    score -= 20
  }

  // Check for suspicious pricing (common hallucination pattern)
  const priceMatches = listing.analysis_text?.match(/\$[\d,]+/g) || []
  const suspiciouslyRoundPrices = priceMatches.filter(price => {
    const num = parseInt(price.replace(/[$,]/g, ''))
    return num > 0 && num % 100 === 0 && num > 1000 // Round hundreds over $1000 are often hallucinated
  })
  if (suspiciouslyRoundPrices.length > 2) {
    issues.push('Suspiciously round pricing values detected')
    score -= 15
  }

  return {
    isValid: score >= 60,
    score: Math.max(0, score),
    issues
  }
}

function validateSources(sources: any[]): { validSources: any[]; score: number; issues: string[] } {
  if (!Array.isArray(sources)) return { validSources: [], score: 0, issues: ['No sources provided'] }
  
  const issues: string[] = []
  let score = 100
  const validSources = []

  for (const source of sources) {
    if (!source || typeof source !== 'object') {
      issues.push('Invalid source object')
      score -= 10
      continue
    }

    let sourceScore = 100
    const sourceIssues: string[] = []

    // Validate URL if present
    if (source.url) {
      try {
        const url = new URL(source.url)
        // Check for suspicious domains (common hallucination targets)
        const suspiciousDomains = ['example.com', 'placeholder.com', 'test.com', 'fake.com']
        if (suspiciousDomains.some(domain => url.hostname.includes(domain))) {
          sourceIssues.push('Suspicious domain detected')
          sourceScore -= 50
        }
        // Check for realistic auction/marketplace domains
        const trustworthyDomains = ['ebay.com', 'liveauctioneers.com', 'worthpoint.com', 'replacements.com', 'christies.com', 'sothebys.com']
        if (trustworthyDomains.some(domain => url.hostname.includes(domain))) {
          sourceScore += 10 // Bonus for trustworthy sources
        }
      } catch {
        sourceIssues.push('Invalid URL format')
        sourceScore -= 30
      }
    }

    // Title validation
    if (!source.title || source.title.length < 5) {
      sourceIssues.push('Title missing or too short')
      sourceScore -= 20
    }

    if (sourceScore >= 50) { // Only include sources with reasonable quality
      validSources.push(source)
    } else {
      issues.push(`Source removed: ${sourceIssues.join(', ')}`)
      score -= 15
    }
  }

  return {
    validSources,
    score: Math.max(0, score),
    issues
  }
}

function calculateConfidenceScore(listing: ListingOut, itemData: any, sources: any[], comps?: any[]): number {
  let confidence = 50 // Base confidence

  // Boost confidence based on available item data
  if (itemData.product_id) confidence += 15 // Model/catalog numbers are very valuable
  if (itemData.product_type) confidence += 10 // Product type helps with classification
  if (itemData.purchase_price && itemData.year_of_purchase) confidence += 15 // Historical pricing context
  if (itemData.estimated_price) confidence += 10 // Owner valuation baseline
  if (itemData.notes) confidence += 8 // Condition details
  if (itemData.photos && itemData.photos.length > 0) confidence += 12 // Visual context

  // Enhanced confidence based on comparable data quality
  if (comps && Array.isArray(comps)) {
    const highConfidenceComps = comps.filter(c => c.confidence === 'high').length
    const mediumConfidenceComps = comps.filter(c => c.confidence === 'medium').length
    
    confidence += highConfidenceComps * 8 // High confidence comparables
    confidence += mediumConfidenceComps * 4 // Medium confidence comparables
    
    // Bonus for recent sales (within 2 years)
    const recentComps = comps.filter(c => c.year && c.year >= new Date().getFullYear() - 2).length
    confidence += Math.min(recentComps * 5, 15)
    
    // Bonus for condition-matched comparables
    const conditionMatched = comps.filter(c => c.condition && 
      (c.condition.toLowerCase().includes('excellent') || 
       c.condition.toLowerCase().includes('mint') || 
       c.condition.toLowerCase().includes('good'))).length
    confidence += Math.min(conditionMatched * 3, 10)
  }

  // Boost confidence based on source quality
  const validSourcesCount = sources.filter(s => s && s.url && s.title).length
  confidence += Math.min(validSourcesCount * 6, 20) // Reduced weight in favor of comps data

  // Reduce confidence for obvious quality issues
  const validation = validateListingContent(listing)
  confidence = Math.min(confidence, validation.score)

  return Math.max(0, Math.min(100, confidence))
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
      .select('id, project_id, product_name, description, product_id, product_type, notes, year_of_purchase, purchase_price, purchase_currency, estimated_price, length_cm, width_cm, height_cm, weight_kg, photos')
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

    // Product type detection for specialized prompting
    const productType = item.product_type || ''
    const isCollectible = /ceramic|porcelain|figurine|lladró|lladro|collectible|vintage|antique|limited edition/i.test(`${productType} ${item.product_name} ${item.description}`)
    const isArtwork = /painting|canvas|oil|acrylic|watercolor|drawing|print|artwork|artist/i.test(`${productType} ${item.product_name} ${item.description}`)
    const isSculpture = /sculpture|bronze|marble|stone|carved|statue|bust/i.test(`${productType} ${item.product_name} ${item.description}`)
    
    // Build enriched facts string with all available metadata
    const hasDims = [item.length_cm, item.width_cm, item.height_cm].every((v) => typeof v === 'number')
    const dimsCm = hasDims ? `${item.length_cm} × ${item.width_cm} × ${item.height_cm} cm` : ''
    const dimsIn = hasDims ? `${(item.length_cm! / 2.54).toFixed(1)} × ${(item.width_cm! / 2.54).toFixed(1)} × ${(item.height_cm! / 2.54).toFixed(1)} in` : ''
    const weight = typeof item.weight_kg === 'number' ? `${item.weight_kg} kg` : ''
    const purchaseContext = item.year_of_purchase && item.purchase_price && item.purchase_currency 
      ? `purchased_${item.year_of_purchase}_${item.purchase_currency}_${item.purchase_price}` : ''
    const estimatedValue = item.estimated_price ? `estimated_value_USD_${item.estimated_price}` : ''
    const photoCount = Array.isArray(item.photos) ? item.photos.length : 0
    
    // Build comprehensive context
    const factsParts = [
      `product_name: ${item.product_name || ''}`,
      `product_type: ${productType}`,
      `product_id: ${item.product_id ?? ''}`,
      `description: ${item.description || ''}`,
      item.notes && `condition_notes: ${item.notes}`,
      dimsCm && `dimensions_cm: ${dimsCm}`,
      dimsIn && `dimensions_inches: ${dimsIn}`,
      weight && `weight_kg: ${weight}`,
      purchaseContext && `purchase_history: ${purchaseContext}`,
      estimatedValue && `current_valuation: ${estimatedValue}`,
      photoCount > 0 && `photos_available: ${photoCount}`,
      `item_category: ${isCollectible ? 'collectible' : isArtwork ? 'artwork' : isSculpture ? 'sculpture' : 'general'}`,
      extraDescription && `additional_context: ${extraDescription}`,
    ].filter(Boolean) as string[]
    const desc = factsParts.join('; ')
    const itemCategory = isCollectible ? 'collectible' : isArtwork ? 'artwork' : isSculpture ? 'sculpture' : 'general'
    const useSearch = body?.useSearch !== false // ignored in direct mode; kept for compatibility
    let listing: ListingOut
    let mode: 'direct' = 'direct'
    console.log('🔍 DIRECT MODE: Single-call browser-style approach')
    console.log('🔍 Item category:', itemCategory)
    console.log('🔍 Item facts:', desc.substring(0, 200) + '...')

    try {
      // Single direct call with Search tool and JSON output
      listing = await withTimeout(generateListingDirect({ apiKey, facts: desc, itemCategory }), 26000, 'listing direct')
    } catch (e) {
      console.warn('⚠️ Direct generation failed, returning minimal fallback:', e)
      listing = { listing_title: '', listing_description: '', analysis_text: '', sources: [] }
    }

    // Final validation and minimal safety fill
    const isEmpty = (s?: string) => !s || !String(s).trim()
    const tooShort = (s?: string, n = 40) => !s || String(s).trim().length < n
    // Final safety fallback if model produced empty fields
    const fallbackTitle = item.product_name || 'Listing'
    const fallbackDescBase = [
      item.product_name && `Item: ${item.product_name}`,
      (item as any).product_id && `Model/ID: ${(item as any).product_id}`,
      item.description && `Description: ${item.description}`,
    ].filter(Boolean).join('\n')
    if (!listing?.listing_title || !String(listing.listing_title).trim()) {
      listing.listing_title = fallbackTitle
    }
    if (!listing?.listing_description || !String(listing.listing_description).trim()) {
      listing.listing_description = fallbackDescBase || 'Not Available'
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
