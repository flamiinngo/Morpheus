// ============================================
// MORPHEUS VISION — Screenshot Processing
// 
// Handles image upload, conversion, resizing,
// and preparation for the vision model.
// ============================================

/**
 * Convert a File object to base64 string
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
 * Resize and compress image aggressively
 * Vision models don't need huge images — 1024px max is plenty
 * We also compress to JPEG quality 0.7 to keep payload small
 */
export function resizeImage(file, maxDimension = 1024) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      try {
        let { width, height } = img

        // Guard against zero-dimension images
        if (width === 0 || height === 0) {
          reject(new Error('Image has zero dimensions'))
          return
        }

        const ratio = Math.min(maxDimension / width, maxDimension / height, 1)
        const newWidth = Math.round(width * ratio)
        const newHeight = Math.round(height * ratio)

        const canvas = document.createElement('canvas')
        canvas.width = newWidth
        canvas.height = newHeight

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas 2D context'))
          return
        }

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, newWidth, newHeight)

        // Use toBlob with a fallback to toDataURL
        try {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                // Fallback: use toDataURL if toBlob fails
                try {
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
                  const base64 = dataUrl.split(',')[1]
                  if (!base64) {
                    reject(new Error('Failed to convert image to base64'))
                    return
                  }
                  resolve(base64)
                } catch (e) {
                  reject(new Error('Failed to encode image: ' + e.message))
                }
                return
              }

              const reader = new FileReader()
              reader.onloadend = () => {
                const base64 = reader.result.split(',')[1]
                if (!base64) {
                  reject(new Error('Failed to read blob as base64'))
                  return
                }
                resolve(base64)
              }
              reader.onerror = () => reject(new Error('Failed to read blob'))
              reader.readAsDataURL(blob)
            },
            'image/jpeg',
            0.7
          )
        } catch (blobErr) {
          // Final fallback: toDataURL
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
          const base64 = dataUrl.split(',')[1]
          if (!base64) {
            reject(new Error('Failed to convert image'))
            return
          }
          resolve(base64)
        }
      } catch (err) {
        reject(new Error('Failed to process image: ' + err.message))
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image. The file may be corrupt or unsupported.'))
    }

    img.src = url
  })
}

/**
 * Create a thumbnail for display in the UI
 */
export function createThumbnail(file, maxDimension = 300) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      try {
        let { width, height } = img
        if (width === 0 || height === 0) {
          reject(new Error('Image has zero dimensions'))
          return
        }

        const ratio = Math.min(maxDimension / width, maxDimension / height, 1)
        const newWidth = Math.round(width * ratio)
        const newHeight = Math.round(height * ratio)

        const canvas = document.createElement('canvas')
        canvas.width = newWidth
        canvas.height = newHeight

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'medium'
        ctx.drawImage(img, 0, 0, newWidth, newHeight)

        resolve(canvas.toDataURL('image/jpeg', 0.6))
      } catch (err) {
        reject(new Error('Failed to create thumbnail: ' + err.message))
      }
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
 */
export function validateImage(file) {
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
  const maxSize = 20 * 1024 * 1024

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

  if (file.size === 0) {
    return { valid: false, error: 'File is empty (0 bytes).' }
  }

  return { valid: true }
}

/**
 * Get image dimensions
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
 * Handle image from URL
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
