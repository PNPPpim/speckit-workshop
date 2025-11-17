// Album Component
// Displays a single album with its photos in a grid layout

import { photoTile } from './photo-tile.js'
import { api } from './api.js'

export const album = {
  /**
   * Create an album view element showing photo grid
   * @param {Object} albumData - Album object {id, date, title, photo_count, photos}
   * @param {Object} handlers - Event handlers {onPhotoDelete, onPhotosChange}
   * @returns {HTMLElement} The album view element
   */
  createAlbumView(albumData, handlers = {}) {
    const albumView = document.createElement('div')
    albumView.className = 'album-view'
    albumView.dataset.albumId = albumData.id

    // Album header
    const header = this.createAlbumHeader(albumData)
    albumView.appendChild(header)

    // Photos grid
    const gridContainer = document.createElement('div')
    gridContainer.className = 'album-grid-container'
    gridContainer.dataset.loading = 'true'

    albumView.appendChild(gridContainer)

    // Load photos for this album
    this.loadAndDisplayPhotos(albumData.id, gridContainer, handlers)

    return albumView
  },

  /**
   * Create album header with date and title
   * @param {Object} album - Album object
   * @returns {HTMLElement} Header element
   */
  createAlbumHeader(album) {
    const header = document.createElement('div')
    header.className = 'album-header'

    const info = document.createElement('div')
    info.className = 'album-header-info'

    const title = document.createElement('h2')
    title.className = 'album-title'
    
    // Format date
    const dateObj = new Date(album.date + 'T00:00:00')
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    
    title.textContent = album.title || formattedDate

    const subtitle = document.createElement('p')
    subtitle.className = 'album-subtitle'
    subtitle.textContent = `${album.photo_count || 0} photo${(album.photo_count || 0) !== 1 ? 's' : ''}`

    info.appendChild(title)
    info.appendChild(subtitle)
    header.appendChild(info)

    return header
  },

  /**
   * Load photos and display them in the grid
   * @param {string} albumId - Album ID
   * @param {HTMLElement} container - Container to render photos into
   * @param {Object} handlers - Event handlers
   */
  async loadAndDisplayPhotos(albumId, container, handlers) {
    try {
      // Show loading state
      container.innerHTML = '<div class="album-loading">Loading photos...</div>'

      // Fetch photos for this album
      const response = await fetch(`/api/photos/album/${albumId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch photos')
      }
      const photos = await response.json()

      // Create and render photo grid
      if (photos && photos.length > 0) {
        const grid = photoTile.createGrid(photos, {
          onDelete: (photoId) => this.handlePhotoDelete(photoId, albumId, container, handlers),
          onSelect: handlers.onPhotoSelect
        })
        container.innerHTML = ''
        container.appendChild(grid)
      } else {
        container.innerHTML = '<div class="album-empty-photos">No photos in this album yet</div>'
      }

      container.dataset.loading = 'false'
    } catch (error) {
      console.error('Error loading photos:', error)
      container.innerHTML = `<div class="album-error">Error loading photos: ${error.message}</div>`
      container.dataset.loading = 'false'
    }
  },

  /**
   * Handle photo deletion
   * @param {string} photoId - Photo ID to delete
   * @param {string} albumId - Album ID (for refresh)
   * @param {HTMLElement} container - Container to refresh
   * @param {Object} handlers - Event handlers
   */
  async handlePhotoDelete(photoId, albumId, container, handlers) {
    try {
      // Call API to delete photo
      const response = await fetch(`/api/photos/${photoId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete photo')
      }

      // Refresh the album view
      await this.loadAndDisplayPhotos(albumId, container, handlers)

      // Notify parent if handler provided
      if (handlers.onPhotosChange) {
        handlers.onPhotosChange()
      }
    } catch (error) {
      console.error('Error deleting photo:', error)
      alert(`Failed to delete photo: ${error.message}`)
    }
  },

  /**
   * Refresh album display (after upload, delete, etc.)
   * @param {string} albumId - Album ID to refresh
   * @param {HTMLElement} albumElement - Album element to refresh
   */
  async refresh(albumId, albumElement) {
    const gridContainer = albumElement.querySelector('.album-grid-container')
    if (gridContainer) {
      await this.loadAndDisplayPhotos(albumId, gridContainer, {})
    }
  }
}
