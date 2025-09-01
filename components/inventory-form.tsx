"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X, Plus, Loader2, ImageIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useProject } from "@/contexts/ProjectContext"
import { useToast } from "@/hooks/use-toast"

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
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState<boolean[]>([])
  const [isUploadingAny, setIsUploadingAny] = useState(false)
  const [inventoryTypes, setInventoryTypes] = useState<ProjectCategory[]>([])
  const [houseZones, setHouseZones] = useState<ProjectCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { activeProject } = useProject()

  // Load project categories
  useEffect(() => {
    const loadCategories = async () => {
      console.log('📂 Loading categories for project:', activeProject?.id)
      if (!activeProject) return
      
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.access_token) {
          console.log('❌ No access token for categories loading')
          return
        }

        console.log('🔑 Loading categories with token')
        
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

        console.log('📊 Categories API responses:', {
          types: typesResponse.status,
          zones: zonesResponse.status
        })

        if (typesResponse.ok) {
          const typesData = await typesResponse.json()
          console.log('📦 Inventory types loaded:', typesData.data?.length || 0)
          setInventoryTypes(typesData.data || [])
        } else {
          console.log('❌ Types response failed:', await typesResponse.text())
        }

        if (zonesResponse.ok) {
          const zonesData = await zonesResponse.json()
          console.log('🏠 House zones loaded:', zonesData.data?.length || 0)
          setHouseZones(zonesData.data || [])
        } else {
          console.log('❌ Zones response failed:', await zonesResponse.text())
        }
      } catch (error) {
        console.error('❌ Error loading project categories:', error)
      } finally {
        console.log('✅ Categories loading completed')
        setLoadingCategories(false)
      }
    }

    loadCategories()
  }, [activeProject])

  // Initialize form with existing data in edit mode (only once)
  useEffect(() => {
    if (mode === 'edit' && initialData && uploadedPhotos.length === 0) {
      // Convert existing photo URLs to UploadedPhoto format
      const existingPhotos: UploadedPhoto[] = initialData.photos.map((url, index) => ({
        url,
        filename: `existing-photo-${index}.jpg`,
        size: 0,
        type: 'image/jpeg'
      }))
      setUploadedPhotos(existingPhotos)
    }
  }, [mode, initialData, uploadedPhotos.length])

  const handlePhotoUpload = async (files: FileList) => {
    console.log("Photo upload started with", files.length, "files")
    
    // Detect device type for better handling
    const isAndroid = /Android/.test(navigator.userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isMobile = isAndroid || isIOS
    
    console.log("Device detection:", { isAndroid, isIOS, isMobile })
    
    // Convert FileList to Array for better mobile handling
    const fileArray = Array.from(files)
    
    // Add new photos to the list (don't replace existing ones)
    setPhotos((prev) => [...prev, ...fileArray])
    
    // Initialize upload states for new photos
    const newUploadStates = new Array(fileArray.length).fill(true)
    setUploadingPhotos((prev) => [...prev, ...newUploadStates])
    setIsUploadingAny(true)

    // Upload each file sequentially to avoid race conditions
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i]
      console.log("Processing file for upload:", {
        index: i,
        name: file.name,
        size: file.size,
        type: file.type,
        sizeInMB: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        device: isMobile ? (isAndroid ? 'Android' : 'iOS') : 'Desktop'
      })
      
      // Check file size for mobile
      const fileSizeMB = file.size / (1024 * 1024)
      if (fileSizeMB > 50) {
        console.warn("Large file detected:", fileSizeMB.toFixed(2) + " MB")
        toast({
          title: "Large File Warning",
          description: `File ${file.name} is very large (${fileSizeMB.toFixed(2)} MB). This might cause issues on mobile.`,
          variant: "default"
        })
      }
      
      // Use unified upload method for all devices
      try {
        console.log(`Uploading file for ${isMobile ? (isAndroid ? 'Android' : 'iOS') : 'Desktop'}: ${file.name}`)
        await uploadFileUnified(file)
        console.log(`✅ Successfully uploaded: ${file.name}`)
      } catch (error) {
        console.error(`❌ Upload failed for ${file.name}:`, error)
        toast({
          title: "Upload Failed",
          description: `Failed to upload ${file.name}. Please try again.`,
          variant: "destructive"
        })
      }
      
      // Mark this specific photo upload as complete
      const currentUploadIndex = uploadedPhotos.length + i
      setUploadingPhotos((prev) => {
        const newStates = [...prev]
        if (currentUploadIndex >= 0 && currentUploadIndex < newStates.length) {
          newStates[currentUploadIndex] = false
        }
        return newStates
      })
    }

    // All uploads complete
    setIsUploadingAny(false)
  }

  const uploadFileUnified = async (file: File) => {
    const supabase = createClient()
    
    // Get authentication token with automatic retry for mobile
    let session = null
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount < maxRetries) {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.warn(`Session error on attempt ${retryCount + 1}:`, error)
      }
      
      if (currentSession?.access_token) {
        session = currentSession
        console.log(`✅ Got valid session token on attempt ${retryCount + 1}`)
        break
      }
      
      console.log(`⚠️ No valid session token, attempt ${retryCount + 1}/${maxRetries}`)
      retryCount++
      
      if (retryCount < maxRetries) {
        // Try to refresh the session
        const { data: { session: refreshedSession } } = await supabase.auth.refreshSession()
        if (refreshedSession?.access_token) {
          session = refreshedSession
          console.log("✅ Successfully refreshed session")
          break
        }
        await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second before retry
      }
    }
    
    if (!session?.access_token) {
      throw new Error("Unable to authenticate. Please try logging in again.")
    }
    
    // Create FormData with explicit filename to ensure compatibility
    const formData = new FormData()
    formData.append("file", file, file.name)
    
    // Add timeout for all uploads (especially important for mobile)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minute timeout
    
    try {
      console.log("Sending unified upload request:", {
        filename: file.name,
        size: file.size,
        type: file.type
      })
      
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${session.access_token}`
          // Don't set Content-Type - let browser set it for FormData
        },
        body: formData,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        console.error("Upload failed:", errorData)
        throw new Error(errorData.error || `Upload failed with status: ${response.status}`)
      }

      const uploadedPhoto: UploadedPhoto = await response.json()
      console.log("Upload successful:", uploadedPhoto)
      
      // Update state atomically to prevent race conditions
      setUploadedPhotos((prev) => {
        const newPhotos = [...prev, uploadedPhoto]
        console.log(`Updated uploadedPhotos: ${prev.length} -> ${newPhotos.length}`)
        return newPhotos
      })
      
    } catch (error) {
      clearTimeout(timeoutId)
      console.error("Upload error:", error)
      throw error
    }
  }

  const removePhoto = async (index: number) => {
    console.log(`Removing photo at index ${index}. Uploaded photos: ${uploadedPhotos.length}, Pending photos: ${photos.length}`)
    
    // Check if this index refers to an uploaded photo or a pending photo
    if (index < uploadedPhotos.length) {
      // This is an uploaded photo
      const uploadedPhoto = uploadedPhotos[index]
      console.log(`Removing uploaded photo: ${uploadedPhoto.url}`)
      try {
        await fetch("/api/delete-photo", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: uploadedPhoto.url }),
        })
        setUploadedPhotos((prev) => prev.filter((_, i) => i !== index))
        console.log("✅ Uploaded photo removed successfully")
      } catch (error) {
        console.error("Error deleting uploaded photo:", error)
        toast({
          title: "Error",
          description: "Failed to delete photo",
          variant: "destructive"
        })
      }
    } else {
      // This is a pending photo (not yet uploaded)
      const photoIndex = index - uploadedPhotos.length
      console.log(`Removing pending photo at photoIndex: ${photoIndex}`)
      if (photoIndex >= 0 && photoIndex < photos.length) {
        setPhotos((prev) => prev.filter((_, i) => i !== photoIndex))
        setUploadingPhotos((prev) => prev.filter((_, i) => i !== photoIndex))
        console.log("✅ Pending photo removed successfully")
      } else {
        console.error("Invalid photo index for removal:", { index, photoIndex, photosLength: photos.length })
      }
    }
  }


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Detect device for better error handling
    const isAndroid = /Android/.test(navigator.userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isMobile = isAndroid || isIOS
    
    console.log('🚀 Form submission started')
    
    console.log('📊 Current state:', {
      inventoryTypes: inventoryTypes.length,
      houseZones: houseZones.length,
      uploadedPhotos: uploadedPhotos.length,
      photos: photos.length,
      isUploadingAny,
      activeProject: !!activeProject,
      device: isMobile ? (isAndroid ? 'Android' : 'iOS') : 'Desktop',
      mode: mode
    })
    
    // Add mobile-specific logging for edit mode
    if (mode === 'edit' && isMobile) {
      console.log('📱 Mobile edit mode detected')
      console.log('📱 Initial data:', initialData)
      console.log('📱 Current uploaded photos:', uploadedPhotos.length)
    }
    
    // Check if categories are properly configured first
    if (inventoryTypes.length === 0) {
      console.log('❌ Validation failed: No inventory types')
      toast({
        title: "⚠️ Configuration Required",
        description: "No inventory types are configured for this project. Go to Dashboard → Categorías to add types first.",
        variant: "destructive"
      })
      return
    }
    
    if (houseZones.length === 0) {
      console.log('❌ Validation failed: No house zones')
      toast({
        title: "⚠️ Configuration Required", 
        description: "No house zones are configured for this project. Go to Dashboard → Categorías to add areas first.",
        variant: "destructive"
      })
      return
    }

    // Form validation with mobile-friendly handling
    const formData = new FormData(e.currentTarget)
    
    // For mobile devices, ensure form data is properly captured
    if (isMobile) {
      console.log('📱 Mobile device detected, using enhanced form handling')
      
      // Manually capture form values for mobile
      const form = e.currentTarget
      const formElements = form.elements
      
      for (let i = 0; i < formElements.length; i++) {
        const element = formElements[i] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        if (element.name && element.value) {
          console.log(`📱 Mobile form field: ${element.name} = ${element.value}`)
        }
      }
    }
    
    const requiredFields = {
      product_type: "Product Type",
      house_zone: "House Zone", 
      product_name: "Product Name",
      description: "Description"
    }
    
    console.log('📝 Form data validation:')
    const missingFields = []
    for (const [field, label] of Object.entries(requiredFields)) {
      const fieldValue = formData.get(field)?.toString().trim()
      console.log(`   ${field}:`, fieldValue)
      if (!fieldValue || fieldValue === '' || 
          fieldValue === 'no-types-configured' || 
          fieldValue === 'no-zones-configured') {
        missingFields.push(label)
      }
    }
    
    if (missingFields.length > 0) {
      console.log('❌ Validation failed: Missing fields:', missingFields)
      toast({
        title: "⚠️ Required Fields Missing",
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: "destructive"
      })
      return
    }
    
    console.log('✅ Form validation passed')
    
    // Check if there are pending photo uploads
    if (isUploadingAny || (photos.length > 0 && uploadedPhotos.length < photos.length)) {
      toast({
        title: "⏳ Photos Still Uploading",
        description: `Please wait for all ${photos.length} photos to finish uploading before submitting.`,
        variant: "destructive"
      })
      return
    }
    
    // Warn if no photos but allow submission
    if (uploadedPhotos.length === 0 && mode === 'create') {
      const confirmWithoutPhotos = window.confirm("No photos have been uploaded. Are you sure you want to create this item without photos?")
      if (!confirmWithoutPhotos) {
        return
      }
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

      // Use current uploadedPhotos state (reflects all additions and deletions)
      const photoUrls = uploadedPhotos.map((photo) => photo.url)
      console.log('📝 Using current photo state:', {
        uploadedPhotosCount: uploadedPhotos.length,
        photoUrls: photoUrls.length,
        mode: mode
      })

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
          // Enhanced error message for mobile users
          const errorMsg = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            ? `Database error: ${error.message}. Please check your internet connection and try again.`
            : `Database error: ${error.message}`
          throw new Error(errorMsg)
        }
      }

      // Reset form safely with mobile-specific handling
      // Don't reset form in edit mode to preserve user experience
      if (mode !== 'edit' && e.currentTarget && typeof e.currentTarget.reset === 'function') {
        // For mobile devices, add a small delay before reset
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
          setTimeout(() => {
            e.currentTarget.reset()
          }, 1000) // 1 second delay for mobile
        } else {
          e.currentTarget.reset()
        }
      }
      
      // Reset state only for create mode
      if (mode !== 'edit') {
        setPhotos([])
        setUploadedPhotos([])
        setUploadingPhotos([])
      }

      // Show success message with mobile-specific handling
      const successMessage = mode === 'edit' 
        ? "Inventory item updated successfully!" 
        : "Inventory item added successfully!"
      
      // For mobile devices, show a more prominent success message
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        console.log('📱 Mobile success: Item saved successfully')
        // Add a small delay for mobile to ensure the user sees the success
        setTimeout(() => {
          toast({
            title: "✅ Success",
            description: successMessage,
            variant: "default"
          })
        }, 500)
      } else {
        toast({
          title: "Success",
          description: successMessage,
          variant: "default"
        })
      }
      
      // Call onSuccess callback or redirect
      if (onSuccess) {
        onSuccess()
      } else {
        // Default redirect to dashboard (project-specific)
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("Error adding item:", error)
      console.error("Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: typeof error
      })
      
      let errorMessage = "Failed to add inventory item"
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage
      } else if (typeof error === 'string') {
        errorMessage = error || errorMessage
      }
      
      toast({
        title: "❌ Error Creating Product",
        description: errorMessage,
        variant: "destructive"
      })
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
                <SelectItem value="no-types-configured" disabled className="py-3 sm:py-2 text-gray-400">
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
                <SelectItem value="no-zones-configured" disabled className="py-3 sm:py-2 text-gray-400">
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
                onChange={(e) => {
                  if (e.target.files) {
                    handlePhotoUpload(e.target.files)
                  }
                }}
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
                  toast({
                    title: "Error",
                    description: "File input not found. Please refresh the page.",
                    variant: "destructive"
                  })
                }
              }}
              className="h-11 sm:h-10 w-full sm:w-auto"
              disabled={isSubmitting}
            >
              <Upload className="h-4 w-4 mr-2" />
              Add Photos
            </Button>
            
            <span className="text-sm text-gray-500 text-center sm:text-left">
              {uploadedPhotos.length + photos.length} photo{(uploadedPhotos.length + photos.length) !== 1 ? "s" : ""} {uploadedPhotos.length + photos.length > 0 ? "ready" : "selected"}
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

          {(uploadedPhotos.length > 0 || photos.length > 0) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {/* Render uploaded photos first */}
              {uploadedPhotos.map((uploadedPhoto, index) => {
                console.log(`Rendering uploaded photo ${index}:`, uploadedPhoto.url)
                return (
                <Card key={`uploaded-${index}`} className="relative">
                  <CardContent className="p-2">
                    <div className="aspect-square bg-gray-100 rounded flex items-center justify-center relative overflow-hidden">
                      <Image
                        src={uploadedPhoto.url || "/placeholder.svg"}
                        alt={uploadedPhoto.filename}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          console.error('Image load failed for:', uploadedPhoto.url, e)
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully:', uploadedPhoto.url)
                        }}
                      />
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
              
              {/* Render pending uploads */}
              {photos.map((photo, photoIndex) => {
                const uploadIndex = uploadedPhotos.length + photoIndex
                const isUploading = uploadingPhotos[uploadIndex]

                return (
                  <Card key={`pending-${photoIndex}`} className="relative">
                    <CardContent className="p-2">
                      <div className="aspect-square bg-gray-100 rounded flex items-center justify-center relative overflow-hidden">
                        {isUploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                            <span className="text-xs text-gray-500">Uploading...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-center">
                            <ImageIcon className="h-6 w-6 text-gray-400" />
                            <span className="text-xs text-gray-500 px-2">{photo.name}</span>
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-1 -right-1 h-7 w-7 sm:h-6 sm:w-6 rounded-full p-0"
                          onClick={() => removePhoto(uploadedPhotos.length + photoIndex)}
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
