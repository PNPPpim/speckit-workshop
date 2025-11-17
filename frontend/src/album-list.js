// Album List Component
import { photoTile } from './photo-tile.js'

export const albumList = {
  createAlbumElement(album, index, handlers) {
    const div = document.createElement('div')
    div.className = 'album-item'
    div.draggable = true
    div.dataset.albumId = album.id
    div.dataset.index = index

    const headerDiv = document.createElement('div')
    headerDiv.className = 'album-header'

    const infoDiv = document.createElement('div')
    infoDiv.className = 'album-info'

    const dateEl = document.createElement('div')
    dateEl.className = 'album-date'
    dateEl.textContent = new Date(album.date + 'T00:00:00').toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const countEl = document.createElement('div')
    countEl.className = 'album-count'
    countEl.textContent = `${album.photo_count || 0} photo${(album.photo_count || 0) !== 1 ? 's' : ''}`

    infoDiv.appendChild(dateEl)
    infoDiv.appendChild(countEl)

    const actionsDiv = document.createElement('div')
    actionsDiv.className = 'album-actions'

    const uploadBtn = document.createElement('button')
    uploadBtn.className = 'icon-btn'
    uploadBtn.innerHTML = '📸'
    uploadBtn.title = 'Upload photos'
    uploadBtn.onclick = (e) => {
      e.stopPropagation()
      handlers.onUpload(album.id)
    }

    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'icon-btn'
    deleteBtn.innerHTML = '🗑️'
    deleteBtn.title = 'Delete album'
    deleteBtn.onclick = (e) => {
      e.stopPropagation()
      handlers.onDelete(album.id)
    }

    actionsDiv.appendChild(uploadBtn)
    actionsDiv.appendChild(deleteBtn)

    headerDiv.appendChild(infoDiv)
    headerDiv.appendChild(actionsDiv)

    const contentDiv = document.createElement('div')
    contentDiv.className = 'album-content'

    if (album.photo_count === 0) {
      const emptyMsg = document.createElement('div')
      emptyMsg.className = 'album-empty'
      emptyMsg.textContent = 'No photos in this album'
      contentDiv.appendChild(emptyMsg)
    } else {
      // Load and display photos in this album
      this.loadPhotos(album.id, contentDiv, handlers)
    }

    div.appendChild(headerDiv)
    div.appendChild(contentDiv)

    return div
  },

  /**
   * Load and display photos for an album
   * @param {string} albumId - Album ID
   * @param {HTMLElement} container - Container to render photos into
   * @param {Object} handlers - Event handlers
   */
  async loadPhotos(albumId, container, handlers) {
    try {
      const loadingDiv = document.createElement('div')
      loadingDiv.className = 'album-loading'
      loadingDiv.textContent = 'Loading photos...'
      container.appendChild(loadingDiv)

      const response = await fetch(`/api/photos/album/${albumId}`)
      if (!response.ok) {
        throw new Error('Failed to load photos')
      }
      const photos = await response.json()

      container.innerHTML = ''

      if (photos && photos.length > 0) {
        const gridDiv = document.createElement('div')
        gridDiv.className = 'album-grid'

        photos.forEach((photo) => {
          const tile = photoTile.createTile(photo, {
            onDelete: (photoId) => this.handlePhotoDelete(photoId, albumId, container, handlers)
          })
          gridDiv.appendChild(tile)
        })

        container.appendChild(gridDiv)
      } else {
        const emptyMsg = document.createElement('div')
        emptyMsg.className = 'album-empty'
        emptyMsg.textContent = 'No photos in this album'
        container.appendChild(emptyMsg)
      }
    } catch (error) {
      console.error('Error loading photos:', error)
      container.innerHTML = `<div class="album-error">Error loading photos</div>`
    }
  },

  /**
   * Handle photo deletion and refresh
   * @param {string} photoId - Photo ID to delete
   * @param {string} albumId - Album ID (for refresh)
   * @param {HTMLElement} container - Container to refresh
   * @param {Object} handlers - Event handlers
   */
  async handlePhotoDelete(photoId, albumId, container, handlers) {
    try {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete photo')
      }

      // Reload photos
      await this.loadPhotos(albumId, container, handlers)

      // Notify parent of changes
      if (handlers.onPhotosChange) {
        handlers.onPhotosChange()
      }
    } catch (error) {
      console.error('Error deleting photo:', error)
      alert(`Failed to delete photo: ${error.message}`)
    }
  }
}
