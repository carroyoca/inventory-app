"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { InventoryGrid } from "@/components/inventory-grid"
import { InventoryStats } from "@/components/inventory-stats"
import { InventorySearch } from "@/components/inventory-search"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Plus, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

interface InventoryItem {
  id: string
  product_type: string
  house_zone: string
  product_name: string
  product_id: string | null
  description: string
  notes: string | null
  estimated_price: number | null
  sale_price: number | null
  status: string
  listing_link: string | null
  photos: string[]
  created_at: string
}

interface SearchFilters {
  search: string
  productType: string
  houseZone: string
  status: string
  minPrice: string
  maxPrice: string
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch inventory items
  useEffect(() => {
    async function fetchItems() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("inventory_items")
          .select("*")
          .order("created_at", { ascending: false })

        if (error) throw error

        setItems(data || [])
        setFilteredItems(data || [])
      } catch (err) {
        console.error("Error fetching inventory:", err)
        setError("Failed to load inventory items")
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [])

  // Filter items based on search criteria
  const handleFiltersChange = (filters: SearchFilters) => {
    let filtered = [...items]

    // Text search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.product_name.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower) ||
          (item.product_id && item.product_id.toLowerCase().includes(searchLower)) ||
          (item.notes && item.notes.toLowerCase().includes(searchLower)),
      )
    }

    // Product type filter
    if (filters.productType) {
      filtered = filtered.filter((item) => item.product_type === filters.productType)
    }

    // House zone filter
    if (filters.houseZone) {
      filtered = filtered.filter((item) => item.house_zone === filters.houseZone)
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter((item) => item.status === filters.status)
    }

    // Price range filter
    if (filters.minPrice || filters.maxPrice) {
      filtered = filtered.filter((item) => {
        const price = item.estimated_price || item.sale_price || 0
        const min = filters.minPrice ? Number.parseFloat(filters.minPrice) : 0
        const max = filters.maxPrice ? Number.parseFloat(filters.maxPrice) : Number.POSITIVE_INFINITY
        return price >= min && price <= max
      })
    }

    setFilteredItems(filtered)
  }

  // Handle item deletion
  const handleItemDeleted = (deletedId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== deletedId))
    setFilteredItems(prevFiltered => prevFiltered.filter(item => item.id !== deletedId))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading inventory...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading inventory</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Button asChild variant="ghost" size="sm" className="h-8 px-2 sm:h-9 sm:px-3">
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Back</span>
                </Link>
              </Button>
              <div className="flex items-center gap-2 min-w-0">
                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Inventory</h1>
              </div>
            </div>
            <Button asChild size="sm" className="h-8 px-2 sm:h-9 sm:px-3">
              <Link href="/dashboard">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Stats Overview */}
          <InventoryStats items={items} />

          {/* Search and Filters */}
          <InventorySearch onFiltersChange={handleFiltersChange} totalResults={filteredItems.length} />

          {/* Inventory Grid */}
          <Card>
            <CardHeader>
              <CardTitle>
                {filteredItems.length === items.length
                  ? `All Items (${items.length})`
                  : `Filtered Results (${filteredItems.length} of ${items.length})`}
              </CardTitle>
              <CardDescription>Manage your art collection inventory</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredItems.length > 0 ? (
                <InventoryGrid items={filteredItems} onItemDeleted={handleItemDeleted} />
              ) : items.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No inventory items yet</h3>
                  <p className="text-gray-500 mb-4">Start by adding your first art piece to the collection.</p>
                  <Button asChild>
                    <Link href="/dashboard">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Item
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No items match your filters</h3>
                  <p className="text-gray-500 mb-4">Try adjusting your search criteria or clearing the filters.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
