"use client"

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
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
  const [applyListingFields, setApplyListingFields] = useState(false)

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

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemId: selectedItem.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.details || json.error || 'Generation failed')
      const gen = json as GenerateResponse
      setResult(gen)
      // initialize selections and drafts
      const sel: Record<string, boolean> = {}
      for (const u of gen.imageUrls) sel[u] = true
      setSelectedImages(sel)
      setTitleDraft(gen.listing_title || '')
      setDescDraft(gen.listing_description || '')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
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
          updateListingFields: applyListingFields,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.details || json.error || 'Apply failed')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">AI Studio</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white border rounded-xl p-4">
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

          <div className="lg:col-span-2 bg-white border rounded-xl p-4">
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
                <div className="pt-2 flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={applyListingFields} onChange={(e) => setApplyListingFields(e.target.checked)} />
                    Also update listing_title and listing_description fields
                  </label>
                </div>
                <div className="pt-2">
                  <Button onClick={handleApply} disabled={applying}>
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
