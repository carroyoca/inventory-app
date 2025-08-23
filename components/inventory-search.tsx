"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Filter, X, SlidersHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface SearchFilters {
  search: string
  productType: string
  houseZone: string
  status: string
  minPrice: string
  maxPrice: string
}

interface InventorySearchProps {
  onFiltersChange: (filters: SearchFilters) => void
  totalResults: number
}

const PRODUCT_TYPES = [
  "Painting",
  "Sculpture",
  "Ceramic",
  "Photography",
  "Drawing",
  "Print",
  "Mixed Media",
  "Textile",
  "Jewelry",
  "Other",
]

const HOUSE_ZONES = [
  "Living Room",
  "Bedroom",
  "Kitchen",
  "Dining Room",
  "Study",
  "Hallway",
  "Basement",
  "Attic",
  "Garden",
  "Garage",
  "Storage",
]

const STATUS_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "sold", label: "Sold" },
  { value: "reserved", label: "Reserved" },
  { value: "not_for_sale", label: "Not for Sale" },
]

export function InventorySearch({ onFiltersChange, totalResults }: InventorySearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    search: "",
    productType: "all",
    houseZone: "all",
    status: "all",
    minPrice: "",
    maxPrice: "",
  })
  const [showFilters, setShowFilters] = useState(false)

  const updateFilters = (newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    onFiltersChange(updatedFilters)
  }

  const clearFilters = () => {
    const clearedFilters: SearchFilters = {
      search: "",
      productType: "all",
      houseZone: "all",
      status: "all",
      minPrice: "",
      maxPrice: "",
    }
    setFilters(clearedFilters)
    onFiltersChange(clearedFilters)
  }

  const activeFiltersCount = Object.values(filters).filter((value) => value !== "").length

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, description, or ID..."
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="pl-10 h-11 sm:h-10"
          />
        </div>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="h-11 sm:h-10 px-3">
          <SlidersHorizontal className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Filters</span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {totalResults} item{totalResults !== 1 ? "s" : ""} found
        </span>
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2">
            <X className="h-3 w-3 mr-1" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Product Type Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Product Type</Label>
                <Select value={filters.productType} onValueChange={(value) => updateFilters({ productType: value })}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {PRODUCT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* House Zone Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Location</Label>
                <Select value={filters.houseZone} onValueChange={(value) => updateFilters({ houseZone: value })}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    {HOUSE_ZONES.map((zone) => (
                      <SelectItem key={zone} value={zone}>
                        {zone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <Select value={filters.status} onValueChange={(value) => updateFilters({ status: value })}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Price Range ($)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min price"
                  value={filters.minPrice}
                  onChange={(e) => updateFilters({ minPrice: e.target.value })}
                  className="h-10"
                />
                <Input
                  type="number"
                  placeholder="Max price"
                  value={filters.maxPrice}
                  onChange={(e) => updateFilters({ maxPrice: e.target.value })}
                  className="h-10"
                />
              </div>
            </div>

            {/* Active Filters */}
            {activeFiltersCount > 0 && (
              <div className="pt-4 border-t">
                <div className="flex flex-wrap gap-2">
                  {filters.search && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Search: "{filters.search}"
                      <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilters({ search: "" })} />
                    </Badge>
                  )}
                  {filters.productType !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Type: {filters.productType}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilters({ productType: "all" })} />
                    </Badge>
                  )}
                  {filters.houseZone !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Location: {filters.houseZone}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilters({ houseZone: "all" })} />
                    </Badge>
                  )}
                  {filters.status !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Status: {STATUS_OPTIONS.find((s) => s.value === filters.status)?.label}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilters({ status: "all" })} />
                    </Badge>
                  )}
                  {(filters.minPrice || filters.maxPrice) && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Price: ${filters.minPrice || "0"} - ${filters.maxPrice || "∞"}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => updateFilters({ minPrice: "", maxPrice: "" })}
                      />
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
