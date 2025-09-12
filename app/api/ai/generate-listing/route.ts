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

async function callCompsWithSearch({ apiKey, facts, itemCategory }: { apiKey: string; facts: string; itemCategory: string }): Promise<{ comps: Comp[]; meta: { sculptor?: string; issue_year?: number; retire_year?: number } }>
{
  const { GoogleGenAI } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey })
  
  // Build specialized search prompt based on item category
  const searchFocus = itemCategory === 'collectible' 
    ? 'Focus on: manufacturer catalog numbers, series info, condition grading, collector market prices, discontinued dates'
    : itemCategory === 'artwork'
    ? 'Focus on: artist name, medium, period/era, gallery sales, auction results, provenance details'
    : itemCategory === 'sculpture'
    ? 'Focus on: sculptor/artist, material composition, casting info, edition size, installation context'
    : 'Focus on: comparable items by type, condition, size, and market pricing'
    
  const prompt = `Task: Conduct comprehensive market research for this ${itemCategory} item using multi-phase search strategy.

${searchFocus}

PHASE 1: SPECIFIC IDENTIFICATION
- Search exact product IDs/catalog numbers (highest priority)
- Include manufacturer variants and international naming
- Use quotation marks for exact matches

PHASE 2: COMPARATIVE MARKET ANALYSIS  
- Search similar items by manufacturer + type + size/era
- Include condition-specific terms (mint, excellent, good, fair)
- Focus on SOLD/COMPLETED listings (not active)

PHASE 3: MARKET VALIDATION
- Cross-reference pricing across multiple platforms
- Verify authenticity through expert sources when possible
- Check recent trends vs historical data

TRUSTED SOURCES (prioritize):
- Auction houses: Christie's, Sotheby's, LiveAuctioneers, Heritage Auctions
- Certified dealers: Replacements Ltd, WorthPoint, specialized dealers
- Verified marketplaces: eBay sold listings, Etsy (verified sellers)

QUALITY REQUIREMENTS:
- Minimum 3 comparable items with clear pricing
- Include date/year of sale for trend analysis  
- Verify condition matches or note differences
- Flag any uncertain or estimated values

Item Details: ${facts}

Conduct thorough research and return verified market data:`

  console.log('🔍 SEARCH PROMPT:', prompt.substring(0, 300) + '...')

  const enhancedPrompt = `${prompt}

CRITICAL: Return your response as valid JSON only, following this exact structure:
{
  "comps": [
    {
      "site": "website name",
      "title": "item title", 
      "date": "sale date",
      "year": 2024,
      "condition": "condition grade",
      "price_usd": 150,
      "url": "source url",
      "confidence": "high"
    }
  ],
  "meta": {
    "artist": "sculptor name",
    "manufacturer": "maker",
    "series": "collection name",
    "issue_year": 1985,
    "retire_year": 2010,
    "material": "porcelain"
  },
  "market_insights": {
    "price_trend": "stable",
    "market_activity": "active", 
    "collector_interest": "high",
    "authenticity_concerns": false
  }
}

Provide 2-6 comparable items with accurate pricing and source information.`

  const resp = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [{ text: enhancedPrompt }] },
    config: {
      temperature: 0.1,
      tools: [{ googleSearch: {} }]
    },
  })
  
  console.log('🔍 SEARCH RAW RESPONSE:', {
    responseText: (resp as any)?.text?.substring(0, 500) + '...',
    candidates: (resp as any)?.candidates?.length || 0,
    groundingMetadata: (resp as any)?.candidates?.[0]?.groundingMetadata ? 'Present' : 'Missing'
  })
  
  const textOut = (resp as any)?.text || '{}'
  const parsed = parseJsonLenient<{ comps: Comp[]; meta?: any }>(textOut)
  
  console.log('🔍 PARSED SEARCH RESULTS:', {
    compsCount: Array.isArray(parsed.comps) ? parsed.comps.length : 0,
    hasValidComps: parsed.comps?.some(c => c.title && c.price_usd),
    metaKeys: parsed.meta ? Object.keys(parsed.meta) : []
  })
  
  return { comps: Array.isArray(parsed.comps) ? parsed.comps : [], meta: parsed.meta || {} }
}

async function composeListing({ apiKey, facts, comps, meta, itemCategory }: { apiKey: string; facts: string; comps: Comp[]; meta: any; itemCategory: string }): Promise<ListingOut> {
  const { GoogleGenAI } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey })
  
  // Product-type-specific writing guidelines
  const categoryGuidance = itemCategory === 'collectible' 
    ? `COLLECTIBLE ITEM GUIDELINES:
- Lead with manufacturer, catalog/model number, and official name
- Emphasize authenticity marks, condition grading, and rarity
- Include production dates, retirement status if known
- Mention original packaging, certificates if applicable
- Use collector terminology and condition standards`
    : itemCategory === 'artwork'
    ? `ARTWORK GUIDELINES:
- Lead with artist name (if known), medium, and dimensions
- Describe style, period, subject matter professionally
- Include provenance, exhibition history if available
- Mention frame, mounting, condition details
- Use art market terminology and condition standards`
    : itemCategory === 'sculpture'
    ? `SCULPTURE GUIDELINES:
- Lead with sculptor/artist, material, and dimensions
- Describe technique (cast, carved, etc.) and finish
- Include edition information, mounting requirements
- Mention patina, condition, and display considerations
- Use sculpture-specific terminology`
    : `GENERAL ITEM GUIDELINES:
- Lead with clear item identification and key features
- Emphasize condition, authenticity, and notable characteristics
- Include relevant historical or technical context
- Use appropriate market terminology`

  const prompt = `Compose a professional marketplace listing based on research data.

${categoryGuidance}

WRITING REQUIREMENTS:
- Title: 60-80 characters, SEO optimized, include key identifiers
- Description: 150-250 words, professional but engaging tone
- Analysis: Pricing rationale with specific comparable references [1], [2], etc.
- Use bracketed citations [n] that correspond to the comp array order
- Include uncertainty indicators when data is limited
- Avoid unverifiable claims about rarity or investment value

Item Facts: ${facts}
Metadata: ${JSON.stringify(meta, null, 2)}
Comparable Sales: ${JSON.stringify(comps, null, 2)}

Compose compelling, accurate marketplace content:

CRITICAL: Return only valid JSON in this format:
{
  "listing_title": "SEO-friendly title here",
  "listing_description": "Professional marketplace description with citations [1], [2]",
  "analysis_text": "Price analysis: $MIN-$MAX range. Comparables: [1] Site - $price, [2] Site - $price. Rationale: explanation."
}`

  const resp = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [{ text: prompt }] },
    config: {
      temperature: 0.2
    },
  })
  const textOut = (resp as any)?.text || '{}'
  return parseJsonLenient<ListingOut>(textOut)
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
    const useSearch = body?.useSearch !== false
    let listing: ListingOut
    let mode: 'search+compose' | 'quick' = 'search+compose'
    if (useSearch) {
      console.log('🔍 SEARCH MODE: Attempting to use web search for listing generation')
      console.log('🔍 Item category:', itemCategory)
      console.log('🔍 Item facts:', desc.substring(0, 200) + '...')
      
      try {
        const { comps, meta } = await withTimeout(callCompsWithSearch({ apiKey, facts: desc, itemCategory }), 18000, 'listing comps (search)')
        
        console.log('🔍 SEARCH RESULTS:', {
          compsFound: Array.isArray(comps) ? comps.length : 0,
          compsData: comps,
          metaData: meta
        })
        
        if (Array.isArray(comps) && comps.length > 0) {
          console.log('✅ Using search results for listing composition')
          listing = await withTimeout(composeListing({ apiKey, facts: desc, comps, meta, itemCategory }), 7000, 'listing compose')
          const sources = comps
            .filter((c) => c && (c.url || c.title || c.site))
            .map((c) => ({ title: c.title || c.site || '', url: c.url || '' }))
          listing.sources = Array.isArray(sources) ? sources : []
        } else {
          console.log('⚠️ No search results found, falling back to quick mode')
          mode = 'quick'
          listing = await withTimeout(callGeminiListingQuick({ apiKey, description: desc, itemCategory }), 8000, 'listing generate (quick)')
        }
      } catch (e) {
        console.log('❌ SEARCH ERROR:', e)
        console.log('⚠️ Falling back to quick mode due to search error')
        mode = 'quick'
        listing = await withTimeout(callGeminiListingQuick({ apiKey, description: desc, itemCategory }), 8000, 'listing generate (quick)')
      }
    } else {
      console.log('🔍 QUICK MODE: Using offline generation (no search)')
      mode = 'quick'
      listing = await withTimeout(callGeminiListingQuick({ apiKey, description: desc, itemCategory }), 12000, 'listing generate (quick)')
    }

    // Validate listing fields; if missing/too short and we were in search mode, try quick fallback once
    const isEmpty = (s?: string) => !s || !String(s).trim()
    const tooShort = (s?: string, n = 60) => !s || String(s).trim().length < n
    if (mode === 'search+compose' && (isEmpty(listing?.listing_title) || tooShort(listing?.listing_description))) {
      try {
        const rescue = await withTimeout(callGeminiListingQuick({ apiKey, description: desc, itemCategory }), 8000, 'listing rescue (quick)')
        // Prefer rescue fields if they are more complete
        if (!isEmpty(rescue.listing_title)) listing.listing_title = rescue.listing_title
        if (!tooShort(rescue.listing_description)) listing.listing_description = rescue.listing_description
        if (isEmpty(listing.analysis_text) && !isEmpty(rescue.analysis_text)) listing.analysis_text = rescue.analysis_text
      } catch {}
    }
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

    // Apply quality control
    const contentValidation = validateListingContent(listing)
    const sourceValidation = validateSources(listing?.sources || [])
    const compsData = mode === 'search+compose' ? (listing as any).comps : undefined
    const confidenceScore = calculateConfidenceScore(listing, item, sourceValidation.validSources, compsData)
    
    // Use validated sources
    listing.sources = sourceValidation.validSources
    
    // Log quality metrics for monitoring
    console.log('Quality Control Results:', {
      contentValid: contentValidation.isValid,
      contentScore: contentValidation.score,
      sourceScore: sourceValidation.score,
      confidenceScore,
      mode,
      itemCategory,
      issues: [...contentValidation.issues, ...sourceValidation.issues]
    })

    const res = NextResponse.json({
      success: true,
      listing_title: listing?.listing_title || '',
      listing_description: listing?.listing_description || '',
      analysis_text: listing?.analysis_text || '',
      sources: Array.isArray(listing?.sources) ? listing.sources : [],
      mode,
      quality_metrics: {
        content_score: contentValidation.score,
        source_score: sourceValidation.score,
        confidence_score: confidenceScore,
        is_validated: contentValidation.isValid,
        issues: contentValidation.issues.length > 0 ? contentValidation.issues : undefined
      }
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
