import { api } from './api.js'
import { albumList } from './album-list.js'
import { setupDragDrop } from './drag-drop.js'
import { store } from './store.js'
import { initStateSync } from './state-sync.js'
import { cache } from './cache.js'
import { groupPhotosByDate, formatAlbumDate, getPhotoStats } from './data-service.js'
import { initLazyLoading } from './lazy-load.js'

// Import styles
import './styles/main.css'
import './styles/album-list.css'
import './styles/photo-tile.css'

// State reference (using centralized store)
let appState = store.getState()

// DOM elements
const elements = {
  app: document.getElementById('app'),
  albumListContainer: document.getElementById('album-list'),
  loadingSpinner: document.getElementById('loading'),
  errorMessage: document.getElementById('error'),
  uploadBtn: document.getElementById('upload-btn'),
  fileInput: document.getElementById('file-input')
}

// Update UI based on state
function render() {
  appState = store.getState()
  
  if (appState.loading) {
    elements.loadingSpinner.style.display = 'flex'
    elements.errorMessage.style.display = 'none'
    elements.albumListContainer.innerHTML = ''
  } else if (appState.error) {
    elements.loadingSpinner.style.display = 'none'
    elements.errorMessage.style.display = 'block'
    elements.errorMessage.textContent = appState.error
    elements.albumListContainer.innerHTML = ''
  } else {
    elements.loadingSpinner.style.display = 'none'
    elements.errorMessage.style.display = 'none'
    renderAlbumList()
    
    // Initialize lazy loading on newly rendered images
    setTimeout(() => {
      initLazyLoading()
    }, 100)
  }
}

// Render album list
function renderAlbumList() {
  elements.albumListContainer.innerHTML = ''

  if (appState.albums.length === 0) {
    elements.albumListContainer.innerHTML = '<div class="album-empty">No albums yet. Upload photos to create albums!</div>'
    return
  }

  appState.albums.forEach((album, index) => {
    // Fetch photos for this album from cache or create default
    const cachedPhotos = cache.get(`album_photos_${album.id}`)
    const photos = cachedPhotos || album.photos || []
    
    // Format album date with data-service
    const formattedDate = formatAlbumDate(album.date)
    
    // Group photos by date if available
    const photosByDate = photos.length > 0 ? groupPhotosByDate(photos) : {}
    
    const albumElement = albumList.createAlbumElement(
      { ...album, displayDate: formattedDate, photosByDate },
      index,
      {
        onReorder: handleReorderDrop,
        onDelete: handleDeleteAlbum,
        onUpload: handleUploadToAlbum,
        onPhotosChange: handlePhotosChanged
      }
    )
    elements.albumListContainer.appendChild(albumElement)
  })

  // Re-enable drag and drop after rendering
  setupDragDrop(handleReorderDrop)
}

// Handle album reordering from drag and drop
async function handleReorderDrop(draggedIndex, targetIndex) {
  if (draggedIndex === targetIndex) return

  const currentState = store.getState()
  const newAlbums = [...currentState.albums]
  const [draggedAlbum] = newAlbums.splice(draggedIndex, 1)
  newAlbums.splice(targetIndex, 0, draggedAlbum)

  // Optimistic update
  store.optimisticUpdate(
    () => store.setState({ albums: newAlbums }),
    () => store.setState({ albums: currentState.albums }),
    async () => {
      try {
        const albumIds = newAlbums.map(a => a.id)
        await api.reorderAlbums(albumIds)
        cache.invalidate('albums')
      } catch (err) {
        throw new Error(`Failed to save album order: ${err.message}`)
      }
    }
  )
  
  render()
}

// Handle album deletion
async function handleDeleteAlbum(albumId) {
  if (!confirm('Delete this album? This cannot be undone.')) return

  const currentState = store.getState()
  
  try {
    // Optimistic deletion
    store.removeAlbum(albumId)
    render()
    
    // Persist deletion
    await api.deleteAlbum(albumId)
    
    // Invalidate cache
    cache.invalidate('albums')
  } catch (err) {
    setError(`Failed to delete album: ${err.message}`)
    // Reload to restore previous state
    await loadAlbums()
  }
}

// Handle file input change
elements.fileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files)
  if (files.length === 0) return

  const albumId = e.target.dataset.albumId
  setLoading(true)

  try {
    const uploadedPhotos = await api.uploadPhotos(albumId, files)
    
    // Invalidate caches
    cache.invalidate('albums')
    cache.invalidate(`album_photos_${albumId}`)
    
    // Reload albums
    await loadAlbums()
  } catch (err) {
    setError(`Failed to upload photos: ${err.message}`)
  } finally {
    setLoading(false)
    elements.fileInput.value = ''
  }
})

// Handle photos changed (deletion, upload within album)
async function handlePhotosChanged() {
  // Invalidate cache and reload
  cache.invalidate('albums')
  await loadAlbums()
}

// Handle upload to album
async function handleUploadToAlbum(albumId) {
  elements.fileInput.dataset.albumId = albumId
  elements.fileInput.click()
}

// Load albums from API with caching
async function loadAlbums() {
  setLoading(true)
  try {
    // Try to get from cache first (stale-while-revalidate)
    const cachedAlbums = cache.get('albums')
    if (cachedAlbums) {
      updateAlbums(cachedAlbums)
    }
    
    // Fetch fresh data from API
    const albums = await api.getAlbums()
    
    // Cache the albums
    cache.set('albums', albums)
    
    // Update store and render
    updateAlbums(albums)
    clearError()
  } catch (err) {
    setError(`Failed to load albums: ${err.message}`)
  } finally {
    setLoading(false)
  }
}

// State setters (now use centralized store)
function setLoading(isLoading) {
  store.setState({ loading: isLoading })
  render()
}

function setError(message) {
  store.setState({ error: message })
  render()
}

function clearError() {
  store.setState({ error: null })
}

// Update store with albums
function updateAlbums(albums) {
  store.updateAlbums(albums)
  render()
}

// Upload button handler
elements.uploadBtn.addEventListener('click', () => {
  if (appState.albums.length === 0) {
    alert('Please create an album first or upload photos to create one.')
    return
  }
  // For now, show a simple prompt or create a new album
  const date = new Date().toISOString().split('T')[0]
  const title = prompt('Album title:', date) || date
  if (title) {
    createAndUploadToAlbum(title, date)
  }
})

async function createAndUploadToAlbum(title, date) {
  try {
    const album = await api.createAlbum({ title, date })
    appState.albums.push(album)
    render()
    handleUploadToAlbum(album.id)
  } catch (err) {
    setError(`Failed to create album: ${err.message}`)
  }
}

// Initialize app
function init() {
  console.log('🎬 Photo Album Organizer initialized')
  
  // Subscribe to store changes
  store.subscribe((newState, changedKeys) => {
    console.log('🔄 State changed:', changedKeys)
    render()
  })
  
  // Initialize state synchronization with debouncing
  initStateSync(store, render)
  
  // Load albums
  loadAlbums()
}

// Start the app
init()
