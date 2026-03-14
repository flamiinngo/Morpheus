// ============================================
// MORPHEUS VISION — Screenshot Processing
// 
// Handles image upload, conversion, resizing,
// and preparation for the vision model.
// No mock data. Real image processing.
// ============================================

/**
 * Convert a File object to base64 string
 * Strips the data URL prefix — returns pure base64
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(file)
  })
}

/**
 * Resize an image to fit within max dimensions
 * Vision models have token limits — large images waste tokens
 * We resize to max 1568px on longest side (optimal for most vision models)
 */
export function resizeImage(file, maxDimension = 1568) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img

      // Only resize if needed
      if (width <= maxDimension && height <= maxDimension) {
        // No resize needed — just convert to base64
        fileToBase64(file).then(resolve).catch(reject)
        return
      }

      // Calculate new dimensions maintaining aspect ratio
      const ratio = Math.min(maxDimension / width, maxDimension / height)
      const newWidth = Math.round(width * ratio)
      const newHeight = Math.round(height * ratio)

      // Draw to canvas at new size
      const canvas = document.createElement('canvas')
      canvas.width = newWidth
      canvas.height = newHeight

      const ctx = canvas.getContext('2d')
      
      // High quality resize
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, newWidth, newHeight)

      // Convert to base64 PNG
      const dataUrl = canvas.toDataURL('image/png', 0.92)
      const base64 = dataUrl.split(',')[1]
      resolve(base64)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

/**
 * Create a thumbnail for display in the UI
 * Small version for the sidebar — doesn't need to be high res
 */
export function createThumbnail(file, maxDimension = 400) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img
      const ratio = Math.min(maxDimension / width, maxDimension / height)
      const newWidth = Math.round(width * ratio)
      const newHeight = Math.round(height * ratio)

      const canvas = document.createElement('canvas')
      canvas.width = newWidth
      canvas.height = newHeight

      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'medium'
      ctx.drawImage(img, 0, 0, newWidth, newHeight)

      resolve(canvas.toDataURL('image/png', 0.8))
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to create thumbnail'))
    }

    img.src = url
  })
}

/**
 * Validate that a file is a valid image
 * Returns { valid: boolean, error?: string }
 */
export function validateImage(file) {
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
  const maxSize = 20 * 1024 * 1024 // 20MB

  if (!file) {
    return { valid: false, error: 'No file provided' }
  }

  if (!validTypes.includes(file.type)) {
    return { valid: false, error: `Invalid file type: ${file.type}. Use PNG, JPEG, or WebP.` }
  }

  if (file.size > maxSize) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    return { valid: false, error: `File too large: ${sizeMB}MB. Maximum is 20MB.` }
  }

  return { valid: true }
}

/**
 * Extract image dimensions without loading the full image
 */
export function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.width, height: img.height })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to read image dimensions'))
    }

    img.src = url
  })
}

/**
 * Handle paste from clipboard
 * Returns a File object if an image was pasted, null otherwise
 */
export function getImageFromClipboard(clipboardEvent) {
  const items = clipboardEvent.clipboardData?.items
  if (!items) return null

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) return file
    }
  }

  return null
}

/**
 * Handle image from URL — fetch and convert to base64
 * Useful for "paste URL" feature
 */
export async function fetchImageAsBase64(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)

    const blob = await response.blob()
    
    if (!blob.type.startsWith('image/')) {
      throw new Error('URL did not return an image')
    }

    const file = new File([blob], 'screenshot.png', { type: blob.type })
    return await resizeImage(file)
  } catch (error) {
    throw new Error(`Could not load image from URL: ${error.message}`)
  }
}
