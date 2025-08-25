"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, DollarSign, ExternalLink, Edit, Trash2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

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

interface InventoryGridProps {
  items: InventoryItem[]
  onItemDeleted?: (id: string) => void
}

const statusColors = {
  available: "bg-green-100 text-green-800",
  sold: "bg-blue-100 text-blue-800",
  reserved: "bg-orange-100 text-orange-800",
  not_for_sale: "bg-gray-100 text-gray-800",
}

export function InventoryGrid({ items, onItemDeleted }: InventoryGridProps) {
  const { toast } = useToast()
  const router = useRouter()

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return

    try {
      console.log("=== DELETE OPERATION START ===")
      console.log("Attempting to delete item:", id)
      console.log("Current URL:", window.location.href)
      
      // Get the user's session token
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error("Session error:", sessionError)
        throw new Error("Failed to get user session")
      }
      
      if (!session?.access_token) {
        console.error("No access token found")
        throw new Error("User not authenticated")
      }
      
      console.log("Session token obtained, length:", session.access_token.length)
      
      const requestBody = { id }
      console.log("Request body:", requestBody)
      
      const response = await fetch("/api/delete-item", {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify(requestBody),
      })

      console.log("Delete response status:", response.status)
      console.log("Delete response headers:", response.headers)
      console.log("Delete response ok:", response.ok)
      
      if (!response.ok) {
        let errorMessage = `Delete failed with status: ${response.status}`
        try {
          const errorData = await response.json()
          console.error("Delete response error data:", errorData)
          errorMessage = errorData.error || errorData.details || errorMessage
        } catch (parseError) {
          console.error("Could not parse error response:", parseError)
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log("Delete successful:", result)

      // Call the callback to update the parent component
      if (onItemDeleted) {
        onItemDeleted(id)
      }

      console.log("Item deleted successfully:", id)
      console.log("=== DELETE OPERATION SUCCESS ===")
    } catch (error) {
      console.error("=== DELETE OPERATION FAILED ===")
      console.error("Error deleting item:", error)
      console.error("Error type:", typeof error)
      console.error("Error message:", error instanceof Error ? error.message : "Unknown error")
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack")
      toast({
        title: "Delete Error",
        description: `Error deleting item: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive"
      })
    }
  }

  const handleEdit = (item: InventoryItem) => {
    // Navigate to the dedicated edit page
    router.push(`/inventory/edit/${item.id}`)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {items.map((item) => (
        <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
          {/* Image */}
          <div className="aspect-square relative bg-gray-100">
            {item.photos && item.photos.length > 0 ? (
              <Image src={item.photos[0] || "/placeholder.svg"} alt={item.product_name} fill className="object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full">
                <span className="text-gray-400 text-sm">No photo</span>
              </div>
            )}
            {item.photos && item.photos.length > 1 && (
              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                +{item.photos.length - 1} more
              </div>
            )}
          </div>

          <CardContent className="p-3 sm:p-4">
            <div className="space-y-2 sm:space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">{item.product_name}</h3>
                  <p className="text-xs sm:text-sm text-gray-500">{item.product_type}</p>
                </div>
                <Badge className={statusColors[item.status as keyof typeof statusColors] || statusColors.available}>
                  {item.status.replace("_", " ")}
                </Badge>
              </div>

              {/* Location */}
              <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                <MapPin className="h-3 w-3" />
                {item.house_zone}
              </div>

              {/* Product ID */}
              {item.product_id && <div className="text-xs text-gray-500">ID: {item.product_id}</div>}

              {/* Description */}
              <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{item.description}</p>

              {/* Pricing */}
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600">Est:</span>
                  <span className="font-medium">
                    {item.estimated_price ? `$${item.estimated_price.toLocaleString()}` : "N/A"}
                  </span>
                </div>
                {item.sale_price && (
                  <div className="text-green-600 font-medium text-xs sm:text-sm">
                    Sale: ${item.sale_price.toLocaleString()}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" className="flex-1 h-9 text-xs sm:text-sm bg-transparent" onClick={() => handleEdit(item)}>
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                {item.listing_link && (
                  <Button asChild variant="outline" size="sm" className="h-9 px-2 bg-transparent">
                    <Link href={item.listing_link} target="_blank">
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                  className="text-red-600 hover:text-red-700 h-9 px-2"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
