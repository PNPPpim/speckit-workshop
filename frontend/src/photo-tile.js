// Photo Tile Component
// Individual photo tile with image preview, title, and delete button

export const photoTile = {
  /**
   * Create a photo tile element
   * @param {Object} photo - Photo object with id, filename, title, width, height
   * @param {Object} handlers - Event handlers {onDelete, onSelect}
   * @returns {HTMLElement} The photo tile DOM element
   */
  createTile(photo, handlers = {}) {
    const tileDiv = document.createElement('div')
    tileDiv.className = 'photo-tile'
    tileDiv.dataset.photoId = photo.id

    // Image container with aspect ratio
    const imageContainer = document.createElement('div')
    imageContainer.className = 'photo-image-container'

    // Image element with lazy loading
    const img = document.createElement('img')
    img.className = 'photo-image'
    img.alt = photo.title || 'Photo'
    img.src = `/uploads/${photo.filename}`
    img.loading = 'lazy'
    img.onload = () => {
      img.classList.add('loaded')
    }
    img.onerror = () => {
      img.classList.add('error')
      imageContainer.innerHTML = '<div class="photo-error">Failed to load</div>'
    }

    imageContainer.appendChild(img)

    // Hover overlay with actions
    const overlay = document.createElement('div')
    overlay.className = 'photo-overlay'

    // Title display
    const titleDiv = document.createElement('div')
    titleDiv.className = 'photo-title'
    titleDiv.textContent = photo.title || 'Untitled'

    // Actions
    const actionsDiv = document.createElement('div')
    actionsDiv.className = 'photo-actions'

    // Delete button
    if (handlers.onDelete) {
      const deleteBtn = document.createElement('button')
      deleteBtn.className = 'photo-delete-btn'
      deleteBtn.innerHTML = '🗑️'
      deleteBtn.title = 'Delete photo'
      deleteBtn.onclick = (e) => {
        e.stopPropagation()
        if (confirm('Delete this photo? This cannot be undone.')) {
          handlers.onDelete(photo.id)
        }
      }
      actionsDiv.appendChild(deleteBtn)
    }

    overlay.appendChild(titleDiv)
    overlay.appendChild(actionsDiv)

    // Info display (on hover shows dimensions)
    const infoDiv = document.createElement('div')
    infoDiv.className = 'photo-info'
    if (photo.width && photo.height) {
      infoDiv.innerHTML = `
        <span class="photo-size">${photo.width}×${photo.height}</span>
        ${photo.size ? `<span class="photo-filesize">${formatFileSize(photo.size)}</span>` : ''}
      `
    }

    tileDiv.appendChild(imageContainer)
    tileDiv.appendChild(overlay)
    tileDiv.appendChild(infoDiv)

    // Click handler for selection (if provided)
    if (handlers.onSelect) {
      tileDiv.style.cursor = 'pointer'
      tileDiv.onclick = (e) => {
        if (e.target !== deleteBtn) {
          handlers.onSelect(photo.id)
        }
      }
    }

    return tileDiv
  },

  /**
   * Create a grid of photo tiles
   * @param {Array} photos - Array of photo objects
   * @param {Object} handlers - Event handlers
   * @returns {HTMLElement} Grid container with photo tiles
   */
  createGrid(photos, handlers = {}) {
    const grid = document.createElement('div')
    grid.className = 'photo-grid'

    if (!photos || photos.length === 0) {
      grid.innerHTML = '<div class="photo-grid-empty">No photos in this album</div>'
      return grid
    }

    photos.forEach((photo) => {
      const tile = this.createTile(photo, handlers)
      grid.appendChild(tile)
    })

    return grid
  }
}

/**
 * Format file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
