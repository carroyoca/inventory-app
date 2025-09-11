import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/api-client'

type ApplyRequest = {
  itemId: string
  imageUrls: string[]
  listing_title?: string
  listing_description?: string
  analysis_text?: string
  sources?: { title?: string; url?: string }[]
  updateListingFields?: boolean
}

function buildNotesAppend({ listing_title, listing_description, analysis_text, sources }: { listing_title?: string; listing_description?: string; analysis_text?: string; sources?: { title?: string; url?: string }[] }) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 16)
  const lines: string[] = []
  lines.push('—')
  lines.push(`[${ts}] AI analysis (humkio)`) // English notes block
  if (listing_title) lines.push(`Title: ${listing_title.trim()}`)
  if (listing_description) lines.push(`Description:\n${listing_description.trim()}`)
  if (analysis_text) lines.push(analysis_text.trim())
  if (sources && sources.length) {
    lines.push('Sources:')
    for (const s of sources) {
      const t = s.title?.trim() || s.url?.trim() || 'Fuente'
      const u = s.url?.trim() ? ` (${s.url.trim()})` : ''
      lines.push(`- ${t}${u}`)
    }
  }
  return lines.join('\n')
}

async function ensureUploadedUrls(urls: string[]) {
  const hasBlob = !!process.env.BLOB_READ_WRITE_TOKEN
  if (!hasBlob) return urls
  const out: string[] = []
  for (const u of urls) {
    if (u.startsWith('data:image/')) {
      try {
        const b64 = u.split(',')[1]
        const bin = Buffer.from(b64, 'base64')
        const { put } = await import('@vercel/blob')
        const filename = `ai/applied/${Date.now()}-${Math.random().toString(36).slice(2)}.png`
        const blob = await put(filename, bin, { access: 'public', contentType: 'image/png' })
        out.push(blob.url)
        continue
      } catch {
        // fall through and keep original
      }
    }
    out.push(u)
  }
  return out
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    const token = authHeader.slice('Bearer '.length)

    const supabase = createServiceRoleClient()
    const { data: auth, error: authError } = await supabase.auth.getUser(token)
    if (authError || !auth?.user) return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    const user = auth.user

    const body = (await request.json()) as ApplyRequest
    if (!body?.itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 })

    const { data: item, error: itemErr } = await supabase
      .from('inventory_items')
      .select('id, project_id, photos, notes, listing_title, listing_description')
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

    const currentPhotos: string[] = Array.isArray(item.photos) ? item.photos : []
    const uploaded = await ensureUploadedUrls(body.imageUrls || [])
    const newPhotos = [...currentPhotos, ...uploaded]
    const notesAppend = buildNotesAppend({ listing_title: body.listing_title, listing_description: body.listing_description, analysis_text: body.analysis_text, sources: body.sources })
    const newNotes = item.notes ? `${item.notes}\n\n${notesAppend}` : notesAppend

    const updatePayload: any = {
      photos: newPhotos,
      notes: newNotes,
    }
    if (body.updateListingFields) {
      if (body.listing_title != null) updatePayload.listing_title = body.listing_title
      if (body.listing_description != null) updatePayload.listing_description = body.listing_description
    }

    const { data: updated, error: updErr } = await supabase
      .from('inventory_items')
      .update(updatePayload)
      .eq('id', body.itemId)
      .eq('project_id', item.project_id)
      .select()
    if (updErr) return NextResponse.json({ error: 'Failed to update item', details: updErr.message }, { status: 500 })

    return NextResponse.json({ success: true, item: updated?.[0] || null })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Apply failed', details: msg }, { status: 500 })
  }
}
