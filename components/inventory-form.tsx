"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X, Plus, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Image from "next/image"

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

interface UploadedPhoto {
  url: string
  filename: string
  size: number
  type: string
}

export function InventoryForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState<boolean[]>([])
  const router = useRouter()

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Add files to display immediately
    setPhotos((prev) => [...prev, ...files])

    // Initialize uploading states
    const newUploadingStates = new Array(files.length).fill(true)
    setUploadingPhotos((prev) => [...prev, ...newUploadingStates])

    // Upload each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append("file", file)

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) throw new Error("Upload failed")

        const uploadedPhoto: UploadedPhoto = await response.json()
        setUploadedPhotos((prev) => [...prev, uploadedPhoto])
      } catch (error) {
        console.error("Error uploading photo:", error)
        alert(`Failed to upload ${file.name}`)
      } finally {
        // Mark this photo as done uploading
        setUploadingPhotos((prev) => {
          const newStates = [...prev]
          const photoIndex = photos.length - files.length + i
          newStates[photoIndex] = false
          return newStates
        })
      }
    }
  }

  const removePhoto = async (index: number) => {
    const uploadedPhoto = uploadedPhotos[index]

    // Remove from uploaded photos if it exists
    if (uploadedPhoto) {
      try {
        await fetch("/api/delete-photo", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: uploadedPhoto.url }),
        })
        setUploadedPhotos((prev) => prev.filter((_, i) => i !== index))
      } catch (error) {
        console.error("Error deleting photo:", error)
      }
    }

    // Remove from local files
    setPhotos((prev) => prev.filter((_, i) => i !== index))
    setUploadingPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData(e.currentTarget)
      const supabase = createClient()

      // Use uploaded photo URLs
      const photoUrls = uploadedPhotos.map((photo) => photo.url)

      // Insert inventory item
      const { error } = await supabase.from("inventory_items").insert({
        product_type: formData.get("product_type"),
        house_zone: formData.get("house_zone"),
        product_name: formData.get("product_name"),
        product_id: formData.get("product_id"),
        description: formData.get("description"),
        notes: formData.get("notes"),
        estimated_price: Number.parseFloat(formData.get("estimated_price") as string) || null,
        sale_price: Number.parseFloat(formData.get("sale_price") as string) || null,
        status: formData.get("status"),
        listing_link: formData.get("listing_link"),
        photos: photoUrls,
      })

      if (error) throw error

      // Reset form
      e.currentTarget.reset()
      setPhotos([])
      setUploadedPhotos([])
      setUploadingPhotos([])

      // Show success and refresh
      alert("Inventory item added successfully!")
      router.refresh()
    } catch (error) {
      console.error("Error adding inventory item:", error)
      alert("Error adding item. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Product Type */}
        <div className="space-y-2">
          <Label htmlFor="product_type" className="text-sm font-medium">
            Product Type *
          </Label>
          <Select name="product_type" required>
            <SelectTrigger className="h-11 sm:h-10">
              <SelectValue placeholder="Select product type" />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_TYPES.map((type) => (
                <SelectItem key={type} value={type} className="py-3 sm:py-2">
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* House Zone */}
        <div className="space-y-2">
          <Label htmlFor="house_zone" className="text-sm font-medium">
            House Zone *
          </Label>
          <Select name="house_zone" required>
            <SelectTrigger className="h-11 sm:h-10">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {HOUSE_ZONES.map((zone) => (
                <SelectItem key={zone} value={zone} className="py-3 sm:py-2">
                  {zone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Product Name */}
        <div className="space-y-2">
          <Label htmlFor="product_name" className="text-sm font-medium">
            Product Name *
          </Label>
          <Input
            id="product_name"
            name="product_name"
            placeholder="e.g., Abstract Oil Painting"
            required
            className="h-11 sm:h-10"
          />
        </div>

        {/* Product ID */}
        <div className="space-y-2">
          <Label htmlFor="product_id" className="text-sm font-medium">
            Product ID / Serial Number
          </Label>
          <Input id="product_id" name="product_id" placeholder="e.g., AOP-001" className="h-11 sm:h-10" />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Description *
        </Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Detailed description of the art piece..."
          rows={3}
          required
          className="resize-none"
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes" className="text-sm font-medium">
          Notes / Annotations
        </Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Additional notes, condition, history..."
          rows={2}
          className="resize-none"
        />
      </div>

      {/* Photos */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Photos</Label>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
              id="photo-upload"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById("photo-upload")?.click()}
              className="h-11 sm:h-10 w-full sm:w-auto"
            >
              <Upload className="h-4 w-4 mr-2" />
              Add Photos
            </Button>
            <span className="text-sm text-gray-500 text-center sm:text-left">
              {photos.length} photo{photos.length !== 1 ? "s" : ""} selected
            </span>
          </div>

          {photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {photos.map((photo, index) => {
                const uploadedPhoto = uploadedPhotos[index]
                const isUploading = uploadingPhotos[index]

                return (
                  <Card key={index} className="relative">
                    <CardContent className="p-2">
                      <div className="aspect-square bg-gray-100 rounded flex items-center justify-center relative overflow-hidden">
                        {uploadedPhoto ? (
                          <Image
                            src={uploadedPhoto.url || "/placeholder.svg"}
                            alt={uploadedPhoto.filename}
                            fill
                            className="object-cover"
                          />
                        ) : isUploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                            <span className="text-xs text-gray-500">Uploading...</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 text-center px-2">{photo.name}</span>
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-1 -right-1 h-7 w-7 sm:h-6 sm:w-6 rounded-full p-0"
                          onClick={() => removePhoto(index)}
                        >
                          <X className="h-4 w-4 sm:h-3 sm:w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Estimated Price */}
        <div className="space-y-2">
          <Label htmlFor="estimated_price" className="text-sm font-medium">
            Estimated Price ($)
          </Label>
          <Input
            id="estimated_price"
            name="estimated_price"
            type="number"
            step="0.01"
            placeholder="0.00"
            className="h-11 sm:h-10"
          />
        </div>

        {/* Sale Price */}
        <div className="space-y-2">
          <Label htmlFor="sale_price" className="text-sm font-medium">
            Sale Price ($)
          </Label>
          <Input
            id="sale_price"
            name="sale_price"
            type="number"
            step="0.01"
            placeholder="0.00"
            className="h-11 sm:h-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status" className="text-sm font-medium">
            Status *
          </Label>
          <Select name="status" defaultValue="available" required>
            <SelectTrigger className="h-11 sm:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="py-3 sm:py-2">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Listing Link */}
        <div className="space-y-2">
          <Label htmlFor="listing_link" className="text-sm font-medium">
            Listing Link
          </Label>
          <Input id="listing_link" name="listing_link" type="url" placeholder="https://..." className="h-11 sm:h-10" />
        </div>
      </div>

      <div className="pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto sm:min-w-32 h-12 sm:h-10 text-base sm:text-sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
