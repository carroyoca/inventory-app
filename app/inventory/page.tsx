"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useProject } from "@/contexts/ProjectContext"
import { ProjectHeader } from "@/components/project-header"
import { AuthGuard } from "@/components/auth-guard"
import { createClient } from "@/lib/supabase/client"
import { InventoryGrid } from "@/components/inventory-grid"
import { InventoryStats } from "@/components/inventory-stats"
import { InventorySearch } from "@/components/inventory-search"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Plus, ArrowLeft, Loader2, Search, Filter } from "lucide-react"
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
  const router = useRouter()
  const { activeProject, isLoading: projectLoading } = useProject()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch inventory items
  useEffect(() => {
    if (!activeProject) return

    async function fetchItems() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("inventory_items")
          .select("*")
          .eq("project_id", activeProject!.id)
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
  }, [activeProject])

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
    if (filters.productType && filters.productType !== 'all') {
      filtered = filtered.filter((item) => item.product_type === filters.productType)
    }

    // House zone filter
    if (filters.houseZone && filters.houseZone !== 'all') {
      filtered = filtered.filter((item) => item.house_zone === filters.houseZone)
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
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

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando proyecto...</p>
        </div>
      </div>
    )
  }

  if (!activeProject) {
    router.push('/select-project')
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando inventario...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error cargando inventario</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Intentar de nuevo</Button>
        </div>
      </div>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Background Blur Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/30 to-blue-400/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/30 to-purple-400/30 rounded-full blur-3xl"></div>
      </div>

      <ProjectHeader />

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Botón volver al Dashboard */}
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard')}
            className="border-purple-200 text-purple-600 hover:bg-purple-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
        </div>

        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Inventario</h1>
              <p className="text-xl text-gray-600">
                Gestiona el inventario del proyecto <span className="font-semibold text-purple-600">{activeProject.name}</span>
              </p>
            </div>
            <Button 
              onClick={() => router.push('/inventory/add')}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Plus className="h-5 w-5 mr-2" />
              Agregar Item
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Stats Overview */}
          <InventoryStats items={items} />

          {/* Search and Filters */}
          <InventorySearch onFiltersChange={handleFiltersChange} totalResults={filteredItems.length} />

          {/* Inventory Grid */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    {filteredItems.length === items.length
                      ? `Todos los Items (${items.length})`
                      : `Resultados Filtrados (${filteredItems.length} de ${items.length})`}
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Gestiona tu colección de arte
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Search className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Filter className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredItems.length > 0 ? (
                <InventoryGrid items={filteredItems} onItemDeleted={handleItemDeleted} />
              ) : items.length === 0 ? (
                <div className="text-center py-16">
                  <div className="p-6 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full w-fit mx-auto mb-6">
                    <Package className="h-12 w-12 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">No hay items en el inventario</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Comienza agregando tu primera pieza de arte a la colección del proyecto.
                  </p>
                  <Button 
                    onClick={() => router.push('/inventory/add')}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Agregar Primer Item
                  </Button>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="p-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-fit mx-auto mb-6">
                    <Search className="h-12 w-12 text-gray-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">No hay items que coincidan</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Intenta ajustar tus criterios de búsqueda o limpiar los filtros.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      </div>
    </AuthGuard>
  )
}
