"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { flushSync } from "react-dom"
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
  onUploadProgressChange?: (inProgress: boolean) => void
}

export function InventoryForm({ mode = 'create', initialData, onSuccess, onUploadProgressChange }: InventoryFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState<Map<string, boolean>>(new Map())
  const [isUploadingAny, setIsUploadingAny] = useState(false)
  const [inventoryTypes, setInventoryTypes] = useState<ProjectCategory[]>([])
  const [houseZones, setHouseZones] = useState<ProjectCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [lastUploadSource, setLastUploadSource] = useState<'camera' | 'gallery' | null>(null)
  const router = useRouter()
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  // Use ref to track photos immediately without state closure issues
  const uploadedPhotosRef = useRef<UploadedPhoto[]>([])
  const { activeProject, setUploadInProgress } = useProject()
  
  // Add render tracking to debug state loss
  console.log('🔄 InventoryForm render:', {
    mode,
    uploadedPhotosCount: uploadedPhotos.length,
    refPhotosCount: uploadedPhotosRef.current.length,
    timestamp: new Date().toISOString().split('T')[1]
  })
  
  // RELOAD DETECTION: Component mount/unmount logging for InventoryForm
  useEffect(() => {
    const timestamp = new Date().toISOString()
    console.log('🔄 INVENTORY FORM: Component mounted', {
      timestamp,
      mode,
      hasInitialData: !!initialData,
      initialDataPhotoCount: initialData?.photos?.length || 0,
      activeProjectId: activeProject?.id
    })

    return () => {
      console.log('🔄 INVENTORY FORM: Component unmounting', {
        timestamp: new Date().toISOString(),
        mode,
        uploadedPhotosCount: uploadedPhotos.length,
        refPhotosCount: uploadedPhotosRef.current.length,
        reason: 'Component cleanup'
      })
    }
  }, []) // Empty dependency array - only runs on mount/unmount

  // Monitor photo state changes to debug state loss
  useEffect(() => {
    console.log('📊 Photo state change detected:', {
      statePhotos: uploadedPhotos.length,
      refPhotos: uploadedPhotosRef.current.length,
      stateMatchesRef: uploadedPhotos.length === uploadedPhotosRef.current.length,
      timestamp: new Date().toISOString().split('T')[1]
    })
  }, [uploadedPhotos.length])

  // RELOAD DETECTION: Track activeProject changes in form
  useEffect(() => {
    console.log('🔄 INVENTORY FORM: activeProject changed', {
      timestamp: new Date().toISOString(),
      hasActiveProject: !!activeProject,
      projectId: activeProject?.id,
      mode,
      uploadedPhotosWillBeLost: uploadedPhotos.length > 0
    })
  }, [activeProject])
  
  // CRITICAL FIX: Ensure ref state survives re-renders
  useEffect(() => {
    // If ref has more photos than state, restore state from ref
    if (uploadedPhotosRef.current.length > uploadedPhotos.length) {
      console.log('🔄 CRITICAL: Ref has more photos than state, restoring from ref:', {
        refCount: uploadedPhotosRef.current.length,
        stateCount: uploadedPhotos.length,
        restoring: true
      })
      setUploadedPhotos([...uploadedPhotosRef.current])
    }
  }, [uploadedPhotos.length, uploadedPhotosRef.current.length])

  // Load project categories
  useEffect(() => {
    const loadCategories = async () => {
      console.log('📂 Loading categories for project:', activeProject?.id)
      if (!activeProject) return
      
      // CRITICAL FIX: Prevent duplicate category loading that causes photo state loss
      if (inventoryTypes.length > 0 && houseZones.length > 0 && !loadingCategories) {
        console.log('📂 Categories already loaded, skipping reload to preserve photo state')
        return
      }
      
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
    if (mode === 'edit' && initialData) {
      console.log("🔧 ENHANCED INITIALIZATION: Component initializing in edit mode", {
        hasInitialData: !!initialData,
        initialDataPhotoCount: initialData.photos?.length || 0,
        currentStatePhotoCount: uploadedPhotos.length,
        refPhotoCount: uploadedPhotosRef.current.length,
        timestamp: new Date().toISOString()
      })

      // CRITICAL FIX: Check if ref already has MORE photos than initialData (uploaded photos)
      if (uploadedPhotosRef.current.length > (initialData.photos?.length || 0)) {
        console.log("🚨 CRITICAL FIX: Ref has more photos than database - preserving uploaded photos!", {
          refCount: uploadedPhotosRef.current.length,
          databaseCount: initialData.photos?.length || 0,
          stateCount: uploadedPhotos.length,
          preservingUploads: true
        })
        // Keep the uploaded photos from ref - don't overwrite with database data
        if (uploadedPhotos.length !== uploadedPhotosRef.current.length) {
          setUploadedPhotos([...uploadedPhotosRef.current])
        }
        return
      }

      // CRITICAL FIX: Only initialize from database if state is empty AND ref doesn't have uploads
      if (uploadedPhotos.length === 0 && uploadedPhotosRef.current.length === 0) {
        // Convert existing photo URLs to UploadedPhoto format
        const existingPhotos: UploadedPhoto[] = initialData.photos.map((url, index) => ({
          url,
          filename: `existing-photo-${index}.jpg`,
          size: 0,
          type: 'image/jpeg'
        }))
        setUploadedPhotos(existingPhotos)
        // CRITICAL: Also update the ref immediately
        uploadedPhotosRef.current = existingPhotos
        console.log("🔧 Initialized photos from database:", {
          count: existingPhotos.length,
          refCount: uploadedPhotosRef.current.length,
          mode: mode
        })
      } else {
        console.log("🔧 Skipping database initialization - photos already present", {
          stateCount: uploadedPhotos.length,
          refCount: uploadedPhotosRef.current.length
        })
      }
    }
  }, [mode, initialData, uploadedPhotos.length])

  const handlePhotoUpload = async (files: FileList) => {
    console.log("📸 Photo upload started with", files.length, "files")
    
    // Enhanced device and browser detection for targeted fixes
    const isAndroid = /Android/.test(navigator.userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isMobile = isAndroid || isIOS
    const isChrome = /Chrome/.test(navigator.userAgent)
    const isEdge = /Edg/.test(navigator.userAgent)
    
    // Detect Android version for Chrome bug workaround
    const androidVersionMatch = navigator.userAgent.match(/Android (\d+)/)
    const androidVersion = androidVersionMatch ? parseInt(androidVersionMatch[1]) : 0
    const hasAndroidChromeBug = isAndroid && (isChrome || isEdge) && androidVersion >= 14
    
    console.log("📱 Enhanced device detection:", { 
      isAndroid, 
      isIOS, 
      isMobile, 
      isChrome, 
      isEdge, 
      androidVersion, 
      hasAndroidChromeBug,
      uploadSource: lastUploadSource,
      mode, 
      hasInitialData: !!initialData 
    })
    
    // CRITICAL DEBUG: Check if we're in edit mode with existing photos
    if (mode === 'edit' && initialData) {
      console.log("🔄 EDIT MODE photo upload:", {
        existingPhotos: initialData.photos?.length || 0,
        currentUploadedPhotos: uploadedPhotos.length,
        newFilesToUpload: files.length,
        uploadingStates: uploadingPhotos.size
      })
    }
    
    // Convert FileList to Array for better mobile handling
    const fileArray = Array.from(files)
    
    // Enhanced file validation for camera uploads
    if (lastUploadSource === 'camera') {
      console.log("📷 Camera file validation:", fileArray.map((file, i) => ({
        index: i,
        name: file.name || 'unnamed',
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        hasValidName: !!(file.name && file.name.length > 0),
        hasValidType: file.type.startsWith('image/'),
        hasValidSize: file.size > 0,
        androidChromeBugDetected: hasAndroidChromeBug
      })))
      
      // Check for common camera file issues
      const invalidFiles = fileArray.filter(file => 
        !file.type.startsWith('image/') || 
        file.size === 0 ||
        (!file.name && hasAndroidChromeBug)
      )
      
      if (invalidFiles.length > 0) {
        console.error("❌ Invalid camera files detected:", invalidFiles)
        toast({
          title: hasAndroidChromeBug ? "Camera Issue Detected" : "Invalid Files",
          description: hasAndroidChromeBug 
            ? "Camera capture may not work properly on this device. Please try using Gallery instead."
            : "Some files are invalid. Please try again.",
          variant: "destructive"
        })
        setIsUploadingAny(false)
        return
      }
    }
    
    // Add new photos to the list (don't replace existing ones)
    setPhotos((prev) => [...prev, ...fileArray])
    
    // UPLOAD GUARD: Notify parent about upload start
    if (onUploadProgressChange) {
      console.log('🚨 UPLOAD GUARD: Notifying parent - upload starting')
      onUploadProgressChange(true)
    }
    
    // GLOBAL UPLOAD GUARD: Set global upload state
    console.log('🚨 GLOBAL UPLOAD GUARD: Setting global upload state to true')
    setUploadInProgress(true)
    
    // Create file keys for tracking
    const fileKeys: string[] = []
    
    // Initialize upload states for new photos using Map for better tracking
    setUploadingPhotos((prev) => {
      const newMap = new Map(prev)
      fileArray.forEach((file, index) => {
        // FIXED: Generate reliable file keys even for camera files with empty names
        const safeName = file.name || `camera-${lastUploadSource || 'unknown'}-file`
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(2, 8)
        const fileKey = `${safeName}-${file.size}-${timestamp}-${random}-${index}`
        
        fileKeys.push(fileKey)
        newMap.set(fileKey, true)
        
        console.log(`📋 Generated file key for ${lastUploadSource}: ${fileKey}`)
      })
      console.log("📊 Upload states updated:", {
        previousStates: prev.size,
        newFiles: fileArray.length,
        totalStates: newMap.size,
        mode: mode,
        uploadSource: lastUploadSource,
        fileKeys: fileKeys
      })
      return newMap
    })
    setIsUploadingAny(true)

    // Upload all files in parallel using Promise.all for better completion tracking
    try {
      console.log("🚀 Starting parallel upload of", fileArray.length, "files")
      
      const uploadPromises = fileArray.map(async (file, i) => {
        const fileKey = fileKeys[i]
        
        console.log("Processing file for upload:", {
          index: i,
          fileKey,
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
        
        // Upload the file
        console.log(`Uploading file for ${isMobile ? (isAndroid ? 'Android' : 'iOS') : 'Desktop'}: ${file.name}`)
        await uploadFileUnified(file)
        console.log(`✅ Successfully uploaded: ${file.name}`)
        
        // Mark this specific photo upload as complete using Map
        setUploadingPhotos((prev) => {
          const newMap = new Map(prev)
          if (newMap.has(fileKey)) {
            newMap.set(fileKey, false)
            console.log("✅ Upload state marked complete for key", fileKey)
          }
          return newMap
        })
        
        return file.name
      })
      
      // Wait for all uploads to complete
      const completedUploads = await Promise.all(uploadPromises)
      console.log("🎉 All uploads completed successfully:", completedUploads)
      
      // Clear input values to prevent resubmission issues
      if (galleryInputRef.current) galleryInputRef.current.value = ''
      if (cameraInputRef.current) cameraInputRef.current.value = ''
      
      // All uploads complete
      setIsUploadingAny(false)
      
      // UPLOAD GUARD: Notify parent about upload completion
      if (onUploadProgressChange) {
        console.log('🚨 UPLOAD GUARD: Notifying parent - upload completed successfully')
        onUploadProgressChange(false)
      }
      
      // GLOBAL UPLOAD GUARD: Clear global upload state
      console.log('🚨 GLOBAL UPLOAD GUARD: Setting global upload state to false (success)')
      setUploadInProgress(false)
      
    } catch (error) {
      console.error("❌ Upload batch failed:", error)
      setIsUploadingAny(false)
      
      // UPLOAD GUARD: Notify parent about upload failure
      if (onUploadProgressChange) {
        console.log('🚨 UPLOAD GUARD: Notifying parent - upload failed')
        onUploadProgressChange(false)
      }
      
      // GLOBAL UPLOAD GUARD: Clear global upload state
      console.log('🚨 GLOBAL UPLOAD GUARD: Setting global upload state to false (error)')
      setUploadInProgress(false)
      
      // Enhanced error handling for camera uploads
      if (lastUploadSource === 'camera' && hasAndroidChromeBug) {
        toast({
          title: "Camera Upload Failed", 
          description: "Camera capture isn't working properly on this device. Please try using Gallery instead.",
          variant: "destructive"
        })
      } else if (lastUploadSource === 'camera') {
        toast({
          title: "Camera Upload Failed",
          description: "Camera photo upload failed. You can try again or use Gallery instead.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Upload Failed",
          description: "One or more photo uploads failed. Please try again.",
          variant: "destructive"
        })
      }
    }
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
      console.log("✅ Upload successful:", uploadedPhoto)
      
      // Detect if this was a camera or gallery upload based on how it was triggered
      const isCamera = lastUploadSource === 'camera'
      const deviceType = /Android/.test(navigator.userAgent) ? 'Android' : /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'iOS' : 'Desktop'
      
      console.log("📸 Photo upload details:", {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        deviceType,
        isCamera,
        blobUrl: uploadedPhoto.url,
        urlLength: uploadedPhoto.url?.length || 0
      })
      
      // CRITICAL FIX: Update ref immediately (no state closure issues)
      uploadedPhotosRef.current = [...uploadedPhotosRef.current, uploadedPhoto]
      
      console.log("🔄 IMMEDIATE ref update:", {
        before: uploadedPhotosRef.current.length - 1,
        after: uploadedPhotosRef.current.length,
        newPhotoUrl: uploadedPhoto.url?.substring(0, 50) + "..."
      })
      
      // Update state for UI rendering (with flushSync for mobile)
      flushSync(() => {
        setUploadedPhotos((prev) => {
          const newPhotos = [...prev, uploadedPhoto]
          console.log(`📊 State update for UI: ${prev.length} -> ${newPhotos.length}`)
          return newPhotos
        })
      })
      
      console.log("✅ Photo successfully tracked:", {
        refCount: uploadedPhotosRef.current.length,
        stateCount: uploadedPhotos.length + 1,
        refHasNewPhoto: uploadedPhotosRef.current.some(p => p.url === uploadedPhoto.url)
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
        // Update both state and ref
        setUploadedPhotos((prev) => prev.filter((_, i) => i !== index))
        uploadedPhotosRef.current = uploadedPhotosRef.current.filter((_, i) => i !== index)
        console.log("✅ Uploaded photo removed successfully", {
          newStateCount: uploadedPhotos.length - 1,
          newRefCount: uploadedPhotosRef.current.length
        })
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
        // For Map-based upload states, we need to find and remove the right key
        // This is more complex, but for now just clear all pending upload states
        setUploadingPhotos((prev) => {
          const newMap = new Map()
          // Keep only completed uploads, remove pending ones
          prev.forEach((value, key) => {
            if (value === false) { // Completed upload
              newMap.set(key, value)
            }
          })
          return newMap
        })
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
    
    console.log('🚀 FORM SUBMISSION TRIGGERED - handleSubmit called', {
      mode: mode,
      hasInitialData: !!initialData,
      deviceType: isMobile ? (isAndroid ? 'Android' : 'iOS') : 'Desktop',
      timestamp: new Date().toISOString()
    })
    
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
      const mobileFormData: Record<string, string> = {}
      
      for (let i = 0; i < formElements.length; i++) {
        const element = formElements[i] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        if (element.name && element.value) {
          mobileFormData[element.name] = element.value
          console.log(`📱 Mobile form field: ${element.name} = ${element.value}`)
        }
      }
      
      // Special check for product_name field on mobile
      if (mobileFormData.product_name) {
        console.log('📱 Mobile product_name captured:', {
          value: mobileFormData.product_name,
          length: mobileFormData.product_name.length,
          matches_formdata: formData.get("product_name") === mobileFormData.product_name
        })
        
        // If FormData extraction failed but manual capture succeeded, use manual value
        if (!formData.get("product_name") && mobileFormData.product_name) {
          console.log('📱 Fixing mobile FormData extraction for product_name')
          formData.set("product_name", mobileFormData.product_name)
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
      
      // Special debug for key fields
      if (field === 'product_name') {
        console.log('🔍 Product name field debugging:', {
          fieldValue,
          valueLength: fieldValue?.length || 0,
          isEmpty: !fieldValue || fieldValue === '',
          isConfigValue: fieldValue === 'no-types-configured' || fieldValue === 'no-zones-configured',
          mode: mode,
          initialValue: initialData?.product_name,
          deviceType: isMobile ? (isAndroid ? 'Android' : 'iOS') : 'Desktop'
        })
      }
      
      if (field === 'description') {
        console.log('🔍 Description field debugging:', {
          fieldValue,
          valueLength: fieldValue?.length || 0,
          isEmpty: !fieldValue || fieldValue === '',
          mode: mode,
          initialValue: initialData?.description,
          deviceType: isMobile ? (isAndroid ? 'Android' : 'iOS') : 'Desktop'
        })
      }
      
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
    
    // Check if there are pending photo uploads using Map
    const stillUploading = Array.from(uploadingPhotos.values()).some(uploading => uploading === true)
    if (isUploadingAny || stillUploading || (photos.length > 0 && uploadedPhotos.length < photos.length)) {
      console.log("⏳ Upload check failed:", {
        isUploadingAny,
        stillUploading,
        photosLength: photos.length,
        uploadedPhotosLength: uploadedPhotos.length,
        uploadingStates: uploadingPhotos.size
      })
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

      // CRITICAL FIX: Use ref instead of state to avoid closure issues
      const photoUrls = uploadedPhotosRef.current.map((photo) => photo.url)
      console.log('📝 Using ref for photo URLs (FIXED):', {
        refPhotosCount: uploadedPhotosRef.current.length,
        statePhotosCount: uploadedPhotos.length,
        photoUrls: photoUrls.length,
        allUrls: photoUrls.map((url, i) => `${i}: ${url?.substring(0, 50)}...`),
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
      
      console.log('📦 Item data constructed for database:', {
        product_name: itemData.product_name,
        product_name_length: itemData.product_name?.toString().length || 0,
        product_name_type: typeof itemData.product_name,
        photos_count: itemData.photos.length,
        photos_urls: itemData.photos,
        all_fields: Object.keys(itemData),
        mode: mode,
        project_id: activeProject.id
      })
      
      // Special validation for product_name in edit mode
      if (mode === 'edit' && initialData) {
        console.log('🔄 Edit mode comparison:', {
          original_product_name: initialData.product_name,
          new_product_name: itemData.product_name,
          changed: initialData.product_name !== itemData.product_name
        })
      }

      let error
      if (mode === 'edit' && initialData) {
        // Update existing item
        console.log('🔄 Updating existing item:', {
          itemId: initialData.id,
          projectId: activeProject.id,
          product_name_update: itemData.product_name,
          fieldsToUpdate: Object.keys(itemData)
        })
        
        const { error: updateError, data: updateData } = await supabase
          .from("inventory_items")
          .update(itemData)
          .eq('id', initialData.id)
          .eq('project_id', activeProject.id)
          .select() // Add select to see what was actually updated
        
        console.log('📊 Database update result:', {
          error: updateError,
          updatedData: updateData,
          success: !updateError,
          photosUpdated: updateData?.[0]?.photos?.length || 0,
          photosExpected: itemData.photos.length,
          photosSaved: updateData?.[0]?.photos || [],
          productNameSaved: updateData?.[0]?.product_name
        })
        
        // Verify critical fields were saved
        if (!updateError && updateData?.[0]) {
          const savedData = updateData[0]
          console.log('✅ Database save verification:', {
            product_name_saved: savedData.product_name === itemData.product_name,
            photos_saved_count: savedData.photos?.length || 0,
            photos_match: (savedData.photos?.length || 0) === itemData.photos.length,
            all_photos_saved: savedData.photos || []
          })
          
          if ((savedData.photos?.length || 0) !== itemData.photos.length) {
            console.error("❌ CRITICAL: Photos not saved correctly to database!")
          }
        }
        
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
        setUploadingPhotos(new Map())
        uploadedPhotosRef.current = []
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
            defaultValue={initialData?.product_name || ""}
            required
            className="h-11 sm:h-10"
            onFocus={() => {
              // Debug: Check if field has value when focused (mobile issue detection)
              const input = document.getElementById('product_name') as HTMLInputElement
              console.log('🔍 Product name field focused:', {
                value: input?.value,
                defaultValue: initialData?.product_name,
                isEmpty: !input?.value || input?.value === '',
                mode: mode
              })
            }}
            onInvalid={(e) => {
              // Catch HTML5 validation issues that block form submission
              console.log('❌ Product name field validation failed:', {
                value: (e.target as HTMLInputElement).value,
                validationMessage: (e.target as HTMLInputElement).validationMessage,
                mode: mode,
                deviceType: /Android/.test(navigator.userAgent) ? 'Android' : /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'iOS' : 'Desktop'
              })
              toast({
                title: "❌ Product Name Required",
                description: "Please enter a product name before saving.",
                variant: "destructive"
              })
            }}
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
            {/* Hidden Photo Upload Inputs - Separate for Camera/Gallery */}
            <div className="hidden">
              {/* Gallery Input */}
              <Input
                ref={galleryInputRef}
                id="photos-gallery"
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files) {
                    setLastUploadSource('gallery')
                    handlePhotoUpload(e.target.files)
                  }
                }}
                className="h-11 sm:h-10"
                disabled={isSubmitting}
              />
              
              {/* Camera Input with Android Chrome workaround */}
              <Input
                ref={cameraInputRef}
                id="photos-camera"
                type="file"
                accept="image/*,android/force-camera-workaround"
                capture="environment"
                onChange={(e) => {
                  if (e.target.files) {
                    setLastUploadSource('camera')
                    console.log("📷 Camera input triggered:", {
                      filesCount: e.target.files.length,
                      firstFile: e.target.files[0] ? {
                        name: e.target.files[0].name,
                        size: e.target.files[0].size,
                        type: e.target.files[0].type,
                        lastModified: e.target.files[0].lastModified
                      } : null
                    })
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
                if (galleryInputRef.current) {
                  galleryInputRef.current.click()
                } else {
                  console.error("Gallery input ref not found")
                  toast({
                    title: "Error",
                    description: "Gallery input not found. Please refresh the page.",
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
                  if (galleryInputRef.current) {
                    console.log("📁 Gallery button clicked")
                    galleryInputRef.current.click()
                  } else {
                    console.error("Gallery input ref not found")
                    toast({
                      title: "Error",
                      description: "Gallery input not available. Please refresh the page.",
                      variant: "destructive"
                    })
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
                  if (cameraInputRef.current) {
                    console.log("📷 Camera button clicked - triggering camera input")
                    cameraInputRef.current.click()
                  } else {
                    console.error("Camera input ref not found")
                    toast({
                      title: "Camera Unavailable", 
                      description: "Camera input not available. Please use Gallery option.",
                      variant: "destructive"
                    })
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
                console.log(`🖼️ Rendering photo ${index}:`, {
                  filename: uploadedPhoto.filename,
                  url: uploadedPhoto.url,
                  urlValid: uploadedPhoto.url && uploadedPhoto.url.length > 0,
                  isBlob: uploadedPhoto.url?.includes('blob.vercel-storage.com'),
                  fileType: uploadedPhoto.type
                })
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
                          console.error('❌ Image load failed:', {
                            url: uploadedPhoto.url,
                            filename: uploadedPhoto.filename,
                            error: e,
                            deviceType: /Android/.test(navigator.userAgent) ? 'Android' : /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'iOS' : 'Desktop'
                          })
                        }}
                        onLoad={() => {
                          console.log('✅ Image loaded successfully:', {
                            url: uploadedPhoto.url,
                            filename: uploadedPhoto.filename
                          })
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
                // For Map-based system, just check if any uploads are in progress
                const isUploading = isUploadingAny

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
          onClick={() => {
            // Debug: Track button clicks to see if form submission is being attempted
            console.log('🖱️ Submit button clicked:', {
              isSubmitting,
              mode: mode,
              timestamp: new Date().toISOString(),
              deviceType: /Android/.test(navigator.userAgent) ? 'Android' : /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'iOS' : 'Desktop'
            })
          }}
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
