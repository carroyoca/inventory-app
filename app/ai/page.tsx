"use client"

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { useToast } from '@/hooks/use-toast'
import { useProject } from '@/contexts/ProjectContext'

type InventoryItem = {
  id: string
  product_name: string
  description: string
  photos: string[]
}

type GenerateResponse = {
  success: boolean
  imageUrls: string[]
  listing_title: string
  listing_description: string
  analysis_text: string
  sources: { title?: string; url?: string }[]
}

export default function AIStudioPage() {
  const supabase = createClient()
  const { activeProject } = useProject()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [selectedItemId, setSelectedItemId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [applying, setApplying] = useState(false)
  const [selectedImages, setSelectedImages] = useState<Record<string, boolean>>({})
  const [titleDraft, setTitleDraft] = useState('')
  const [descDraft, setDescDraft] = useState('')
  // Listing fields are now always applied on server by default
  const { toast } = useToast()
  const [imagesPerRun, setImagesPerRun] = useState(1)

  useEffect(() => {
    const load = async () => {
      if (!activeProject) return
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, product_name, description, photos')
        .eq('project_id', activeProject.id)
        .order('updated_at', { ascending: false })
        .limit(100)
      if (!error) setItems((data || []) as InventoryItem[])
    }
    load()
  }, [activeProject, supabase])

  const selectedItem = useMemo(() => items.find(i => i.id === selectedItemId) || null, [items, selectedItemId])

  const handleGenerate = async () => {
    try {
      setError(null)
      setLoading(true)
      setResult(null)
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) throw new Error('No auth token')

      if (!selectedItem) throw new Error('Select an item')

      // Generate images per-photo via API to avoid serverless timeouts
      const targets = (selectedItem.photos || []).slice(0, imagesPerRun)
      const urls: string[] = []
      for (const photoUrl of targets) {
        const r = await fetch('/api/ai/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ itemId: selectedItem.id, photoUrl }),
        })
        let j: any
        try { j = await r.json() } catch { j = { error: await r.text() } }
        if (!r.ok) throw new Error(j.details || j.error || 'Image generation failed')
        urls.push(j.url)
      }

      // Generate listing separately
      const r2 = await fetch('/api/ai/generate-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemId: selectedItem.id }),
      })
      let j2: any
      try { j2 = await r2.json() } catch { j2 = { error: await r2.text() } }
      if (!r2.ok) throw new Error(j2.details || j2.error || 'Listing generation failed')

      const gen: GenerateResponse = {
        success: true,
        imageUrls: urls,
        listing_title: j2.listing_title || '',
        listing_description: j2.listing_description || '',
        analysis_text: j2.analysis_text || '',
        sources: j2.sources || [],
      }
      setResult(gen)
      const sel: Record<string, boolean> = {}
      for (const u of urls) sel[u] = true
      setSelectedImages(sel)
      setTitleDraft(gen.listing_title)
      setDescDraft(gen.listing_description)
      toast({ title: 'AI generated', description: 'Preview images and texts are ready.' })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      toast({ title: 'Generation failed', description: String(e), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    try {
      if (!result || !selectedItem) return
      setApplying(true)
      setError(null)
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) throw new Error('No auth token')

      const images = Object.entries(selectedImages).filter(([, v]) => v).map(([u]) => u)
      const res = await fetch('/api/ai/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          itemId: selectedItem.id,
          imageUrls: images,
          listing_title: titleDraft,
          listing_description: descDraft,
          analysis_text: result.analysis_text,
          sources: result.sources,
          // updateListingFields intentionally omitted; server defaults to true
        }),
      })
      let json: any
      try {
        json = await res.json()
      } catch {
        const text = await res.text()
        throw new Error(text || 'Apply failed (non-JSON response)')
      }
      if (!res.ok) throw new Error(json.details || json.error || 'Apply failed')
      toast({ title: 'Applied', description: 'Images and listing saved to item.' })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      toast({ title: 'Apply failed', description: String(e), variant: 'destructive' })
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">AI Studio</h1>
          <p className="text-gray-600 mt-2">Generate ready-to-sell images and English listings. Select what to keep and apply to your item.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl p-5">
            <label className="block text-sm font-medium mb-2">Selecciona un ítem</label>
            <select
              className="w-full border rounded-md p-2"
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
            >
              <option value="">— Elegir —</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.product_name}
                </option>
              ))}
            </select>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Images per run</label>
              <select
                className="w-full border rounded-md p-2"
                value={imagesPerRun}
                onChange={(e) => setImagesPerRun(Number(e.target.value))}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Use 1–2 to avoid timeouts. Run multiple times for more.</p>
            </div>
            {selectedItem && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-600">Fotos ({selectedItem.photos?.length || 0})</p>
                <div className="grid grid-cols-3 gap-2">
                  {(selectedItem.photos || []).slice(0, 6).map((url, i) => (
                    <div key={i} className="relative w-full aspect-square overflow-hidden rounded-md border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`photo-${i}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <Button onClick={handleGenerate} variant="brand" disabled={!selectedItemId || loading}>
                {loading ? 'Generando…' : 'Generar'}
              </Button>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>

          <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl p-5">
            {!result ? (
              <div className="text-gray-500 text-sm">Resultados aparecerán aquí.</div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="font-semibold mb-2">Generated Images</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {result.imageUrls.map((u, idx) => (
                      <label key={idx} className="relative w-full aspect-square overflow-hidden rounded-md border block cursor-pointer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u} alt={`gen-${idx}`} className="w-full h-full object-cover" />
                        <input
                          type="checkbox"
                          className="absolute top-2 left-2 h-5 w-5"
                          checked={!!selectedImages[u]}
                          onChange={(e) => setSelectedImages((s) => ({ ...s, [u]: e.target.checked }))}
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="font-semibold mb-2">Listing Title (English)</h2>
                  <textarea className="w-full border rounded-md p-2" rows={2} value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} />
                </div>
                <div>
                  <h2 className="font-semibold mb-2">Listing Description (English)</h2>
                  <textarea className="w-full border rounded-md p-2" rows={6} value={descDraft} onChange={(e) => setDescDraft(e.target.value)} />
                </div>
                <div>
                  <h2 className="font-semibold mb-2">Analysis (for Notes)</h2>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">{result.analysis_text}</p>
                  {!!result.sources?.length && (
                    <div className="mt-2">
                      <h3 className="text-sm font-medium">Sources</h3>
                      <ul className="list-disc list-inside text-sm text-gray-600">
                        {result.sources.map((s, i) => (
                          <li key={i}>
                            {s.title || s.url}
                            {s.url && (
                              <a className="text-blue-600 ml-1 underline" href={s.url} target="_blank" rel="noreferrer">
                                enlace
                              </a>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {/* Listing fields are always updated; no toggle needed */}
                <div className="pt-2">
                  <Button onClick={handleApply} variant="brand" disabled={applying}>
                    {applying ? 'Applying…' : 'Apply to Item'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
