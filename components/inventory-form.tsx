"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
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
import { useProject } from "@/contexts/ProjectContext"

interface ProjectCategory {
  id: string
  name: string
  description?: string
}

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
  project_id: string
}

interface InventoryFormProps {
  mode?: 'create' | 'edit'
  initialData?: InventoryItem
  onSuccess?: () => void
}

export function InventoryForm({ mode = 'create', initialData, onSuccess }: InventoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState<boolean[]>([])
  const [inventoryTypes, setInventoryTypes] = useState<ProjectCategory[]>([])
  const [houseZones, setHouseZones] = useState<ProjectCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { activeProject } = useProject()

  // Load project categories
  useEffect(() => {
    const loadCategories = async () => {
      if (!activeProject) return
      
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.access_token) return

        // Load inventory types and house zones in parallel
        const [typesResponse, zonesResponse] = await Promise.all([
          fetch(`/api/projects/${activeProject.id}/inventory-types`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          }),
          fetch(`/api/projects/${activeProject.id}/house-zones`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          })
        ])

        if (typesResponse.ok) {
          const typesData = await typesResponse.json()
          setInventoryTypes(typesData.data || [])
        }

        if (zonesResponse.ok) {
          const zonesData = await zonesResponse.json()
          setHouseZones(zonesData.data || [])
        }
      } catch (error) {
        console.error('Error loading project categories:', error)
      } finally {
        setLoadingCategories(false)
      }
    }

    loadCategories()
  }, [activeProject])

  // Initialize form with existing data in edit mode
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      // Convert existing photo URLs to UploadedPhoto format
      const existingPhotos: UploadedPhoto[] = initialData.photos.map((url, index) => ({
        url,
        filename: `existing-photo-${index}.jpg`,
        size: 0,
        type: 'image/jpeg'
      }))
      setUploadedPhotos(existingPhotos)
    }
  }, [mode, initialData])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    console.log("Starting photo upload for", files.length, "files")
    console.log("User Agent:", navigator.userAgent)
    console.log("Is Mobile:", /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    console.log("Is iOS:", /iPad|iPhone|iPod/.test(navigator.userAgent))
    console.log("Is Chrome:", /Chrome/.test(navigator.userAgent))
    console.log("Event type:", e.type)
    console.log("Event target:", e.target)
    console.log("Files array:", files)

    // iOS-specific file validation
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      console.log("File details:", {
        name: file.name,
        size: file.size,
        type: file.type,
        sizeInMB: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        lastModified: file.lastModified,
        webkitRelativePath: (file as any).webkitRelativePath,
        mozFullPath: (file as any).mozFullPath
      })
      
      // Check if file is valid
      if (!file.name || file.size === 0) {
        console.error("Invalid file detected:", file)
        alert(`File ${file.name || 'Unknown'} appears to be invalid. Please try selecting a different photo.`)
        continue
      }
    }

    // Add files to display immediately
    setPhotos((prev) => [...prev, ...files])

    // Initialize uploading states for new files
    const newUploadingStates = new Array(files.length).fill(true)
    setUploadingPhotos((prev) => [...prev, ...newUploadingStates])

    // Upload each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      console.log("Processing file for upload:", {
        index: i,
        name: file.name,
        size: file.size,
        type: file.type,
        sizeInMB: (file.size / (1024 * 1024)).toFixed(2) + " MB"
      })
      
      // Check file size for mobile
      const fileSizeMB = file.size / (1024 * 1024)
      if (fileSizeMB > 50) {
        console.warn("Large file detected:", fileSizeMB.toFixed(2) + " MB")
        alert(`File ${file.name} is very large (${fileSizeMB.toFixed(2)} MB). This might cause issues on mobile.`)
      }
      
      // Try alternative upload method for iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      let uploadSuccess = false
      
      if (isIOS) {
        console.log("iOS detected, trying alternative upload method")
        try {
          uploadSuccess = await uploadFileIOS(file)
        } catch (error) {
          console.log("iOS alternative upload failed, falling back to standard method")
        }
      }
      
      if (!uploadSuccess) {
        // Standard upload method
        try {
          await uploadFileStandard(file)
        } catch (error) {
          console.error("Standard upload also failed:", error)
          alert(`Failed to upload ${file.name}. Please try again or contact support.`)
        }
      }
      
      // Mark this photo as done uploading
      setUploadingPhotos((prev) => {
        const newStates = [...prev]
        // Calculate the correct index for this file
        const currentPhotosLength = prev.length
        const fileIndex = currentPhotosLength - files.length + i
        if (fileIndex >= 0 && fileIndex < newStates.length) {
          newStates[fileIndex] = false
        }
        return newStates
      })
    }
  }

  const uploadFileIOS = async (file: File): Promise<boolean> => {
    try {
      console.log("Attempting iOS-specific upload for:", file.name)
      
      // Create a new FormData for iOS
      const formData = new FormData()
      formData.append("file", file, file.name) // Explicitly set filename
      
      // Add additional headers that might help with iOS
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        headers: {
          // Don't set Content-Type for FormData on iOS
        }
      })
      
      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`)
      }
      
      const uploadedPhoto: UploadedPhoto = await response.json()
      console.log("iOS upload successful:", uploadedPhoto)
      setUploadedPhotos((prev) => [...prev, uploadedPhoto])
      return true
      
    } catch (error) {
      console.error("iOS upload failed:", error)
      return false
    }
  }

  const uploadFileStandard = async (file: File): Promise<void> => {
    console.log("Using standard upload method for:", file.name)
    
    const formData = new FormData()
    formData.append("file", file)
    
    // Log FormData contents for debugging
    console.log("FormData created with file:", file.name)
    for (let [key, value] of formData.entries()) {
      console.log("FormData entry:", key, value)
    }

    // Add timeout for mobile uploads
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout
    
    try {
      console.log("Sending upload request to /api/upload")
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      console.log("Upload response status:", response.status)
      console.log("Upload response headers:", response.headers)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Upload failed with error data:", errorData)
        throw new Error(errorData.error || `Upload failed with status: ${response.status}`)
      }

      const uploadedPhoto: UploadedPhoto = await response.json()
      console.log("Upload successful:", uploadedPhoto)
      setUploadedPhotos((prev) => [...prev, uploadedPhoto])
    } catch (error) {
      console.error("Upload error in uploadFileStandard:", error)
      throw error
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
    
    // Form validation
    const formData = new FormData(e.currentTarget)
    const requiredFields = {
      product_type: "Product Type",
      house_zone: "House Zone", 
      product_name: "Product Name",
      description: "Description"
    }
    
    const missingFields = []
    for (const [field, label] of Object.entries(requiredFields)) {
      if (!formData.get(field) || formData.get(field)?.toString().trim() === '') {
        missingFields.push(label)
      }
    }
    
    if (missingFields.length > 0) {
      alert(`Please fill in the following required fields:\n${missingFields.join('\n')}`)
      return
    }
    
    // Check if at least one photo is uploaded
    if (uploadedPhotos.length === 0) {
      alert("Please upload at least one photo before submitting.")
      return
    }
    
    setIsSubmitting(true)

    try {
      const supabase = createClient()

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error("You must be logged in to add inventory items")
      }

      // Check if user has an active project
      if (!activeProject) {
        throw new Error("You must select a project before adding inventory items")
      }

      // Use uploaded photo URLs
      const photoUrls = uploadedPhotos.map((photo) => photo.url)

      const itemData = {
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
        project_id: activeProject.id,
      }

      let error
      if (mode === 'edit' && initialData) {
        // Update existing item
        const { error: updateError } = await supabase
          .from("inventory_items")
          .update(itemData)
          .eq('id', initialData.id)
          .eq('project_id', activeProject.id)
        
        error = updateError
      } else {
        // Insert new item
        const { error: insertError } = await supabase
          .from("inventory_items")
          .insert({
            ...itemData,
            created_by: user.id,
          })
        
        error = insertError
      }

      if (error) {
        console.error("Database error:", error)
        if (error.code === '42P01') {
          throw new Error("Database table not found. Please contact support.")
        } else if (error.code === '23505') {
          throw new Error("An item with this ID already exists.")
        } else {
          throw new Error(`Database error: ${error.message}`)
        }
      }

      // Reset form safely
      if (e.currentTarget && typeof e.currentTarget.reset === 'function') {
        e.currentTarget.reset()
      }
      
      // Reset state
      setPhotos([])
      setUploadedPhotos([])
      setUploadingPhotos([])

      // Show success message
      const successMessage = mode === 'edit' 
        ? "Inventory item updated successfully!" 
        : "Inventory item added successfully!"
      alert(successMessage)
      
      // Call onSuccess callback or redirect
      if (onSuccess) {
        onSuccess()
      } else {
        // Default redirect to dashboard (project-specific)
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("Error adding item:", error)
      alert(error instanceof Error ? error.message : "Failed to add inventory item")
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
            Tipo de Inventario *
          </Label>
          <Select name="product_type" defaultValue={initialData?.product_type} required disabled={loadingCategories}>
            <SelectTrigger className="h-11 sm:h-10">
              <SelectValue placeholder={loadingCategories ? "Cargando tipos..." : "Seleccionar tipo"} />
            </SelectTrigger>
            <SelectContent>
              {inventoryTypes.map((type) => (
                <SelectItem key={type.id} value={type.name} className="py-3 sm:py-2">
                  {type.name}
                  {type.description && (
                    <span className="text-xs text-gray-500 ml-2">- {type.description}</span>
                  )}
                </SelectItem>
              ))}
              {inventoryTypes.length === 0 && !loadingCategories && (
                <SelectItem value="" disabled className="py-3 sm:py-2 text-gray-400">
                  No hay tipos configurados. Configure en Acciones del Proyecto.
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* House Zone */}
        <div className="space-y-2">
          <Label htmlFor="house_zone" className="text-sm font-medium">
            Área del Proyecto *
          </Label>
          <Select name="house_zone" defaultValue={initialData?.house_zone} required disabled={loadingCategories}>
            <SelectTrigger className="h-11 sm:h-10">
              <SelectValue placeholder={loadingCategories ? "Cargando áreas..." : "Seleccionar área"} />
            </SelectTrigger>
            <SelectContent>
              {houseZones.map((zone) => (
                <SelectItem key={zone.id} value={zone.name} className="py-3 sm:py-2">
                  {zone.name}
                  {zone.description && (
                    <span className="text-xs text-gray-500 ml-2">- {zone.description}</span>
                  )}
                </SelectItem>
              ))}
              {houseZones.length === 0 && !loadingCategories && (
                <SelectItem value="" disabled className="py-3 sm:py-2 text-gray-400">
                  No hay áreas configuradas. Configure en Acciones del Proyecto.
                </SelectItem>
              )}
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
            defaultValue={initialData?.product_name}
            required
            className="h-11 sm:h-10"
          />
        </div>

        {/* Product ID */}
        <div className="space-y-2">
          <Label htmlFor="product_id" className="text-sm font-medium">
            Product ID / Serial Number
          </Label>
          <Input 
            id="product_id" 
            name="product_id" 
            placeholder="e.g., AOP-001" 
            defaultValue={initialData?.product_id || ''} 
            className="h-11 sm:h-10" 
          />
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
          defaultValue={initialData?.description}
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
          defaultValue={initialData?.notes || ''}
          rows={2}
          className="resize-none"
        />
      </div>

      {/* Photos */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Photos</Label>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            {/* Hidden Photo Upload Input */}
            <div className="hidden">
              <Input
                ref={fileInputRef}
                id="photos"
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                className="h-11 sm:h-10"
                disabled={isSubmitting}
              />
            </div>
            
            {/* Add Photos Button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.click()
                } else {
                  console.error("File input ref not found")
                  alert("Error: File input not found. Please refresh the page.")
                }
              }}
              className="h-11 sm:h-10 w-full sm:w-auto"
              disabled={isSubmitting}
            >
              <Upload className="h-4 w-4 mr-2" />
              Add Photos
            </Button>
            
            <span className="text-sm text-gray-500 text-center sm:text-left">
              {photos.length} photo{photos.length !== 1 ? "s" : ""} selected
            </span>
          </div>
          
          <p className="text-xs text-gray-500 text-center sm:text-left">
            Click "Add Photos" to upload photos of your art piece. Supported formats: JPG, PNG, GIF, WebP. Max size: 50MB per photo.
          </p>

          {/* Mobile Photo Picker */}
          <div className="sm:hidden">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute("capture")
                    fileInputRef.current.click()
                  }
                }}
                className="flex-1"
              >
                📁 Gallery
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute("capture", "environment")
                    fileInputRef.current.click()
                  }
                }}
                className="flex-1"
              >
                📷 Camera
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Choose how to add photos on mobile
            </p>
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
            defaultValue={initialData?.estimated_price?.toString() || ''}
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
            defaultValue={initialData?.sale_price?.toString() || ''}
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
          <Select name="status" defaultValue={initialData?.status || "available"} required>
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
          <Input 
            id="listing_link" 
            name="listing_link" 
            type="url" 
            placeholder="https://..." 
            defaultValue={initialData?.listing_link || ''} 
            className="h-11 sm:h-10" 
          />
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
              {mode === 'edit' ? 'Updating...' : 'Adding...'}
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              {mode === 'edit' ? 'Update Item' : 'Add Item'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
