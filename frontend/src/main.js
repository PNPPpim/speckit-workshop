import { api } from './api.js'
import { albumList } from './album-list.js'
import { setupDragDrop } from './drag-drop.js'

// Import styles
import './styles/main.css'
import './styles/album-list.css'
import './styles/photo-tile.css'

// State management
let appState = {
  albums: [],
  loading: false,
  error: null
}

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
    const albumElement = albumList.createAlbumElement(album, index, {
      onReorder: handleReorderDrop,
      onDelete: handleDeleteAlbum,
      onUpload: handleUploadToAlbum,
      onPhotosChange: handlePhotosChanged
    })
    elements.albumListContainer.appendChild(albumElement)
  })

  // Re-enable drag and drop after rendering
  setupDragDrop(handleReorderDrop)
}

// Handle album reordering from drag and drop
async function handleReorderDrop(draggedIndex, targetIndex) {
  if (draggedIndex === targetIndex) return

  // Reorder in local state
  const newAlbums = [...appState.albums]
  const [draggedAlbum] = newAlbums.splice(draggedIndex, 1)
  newAlbums.splice(targetIndex, 0, draggedAlbum)

  appState.albums = newAlbums
  render()

  // Persist to backend
  try {
    const albumIds = appState.albums.map(a => a.id)
    await api.reorderAlbums(albumIds)
  } catch (err) {
    setError(`Failed to save album order: ${err.message}`)
    loadAlbums()
  }
}

// Handle album deletion
async function handleDeleteAlbum(albumId) {
  if (!confirm('Delete this album? This cannot be undone.')) return

  try {
    await api.deleteAlbum(albumId)
    appState.albums = appState.albums.filter(a => a.id !== albumId)
    render()
  } catch (err) {
    setError(`Failed to delete album: ${err.message}`)
  }
}

// Handle upload to album
async function handleUploadToAlbum(albumId) {
  elements.fileInput.dataset.albumId = albumId
  elements.fileInput.click()
}

// Handle photos changed (deletion, upload within album)
async function handlePhotosChanged() {
  // Reload albums to update photo counts
  await loadAlbums()
}
// Handle file input change
elements.fileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files)
  if (files.length === 0) return

  const albumId = e.target.dataset.albumId
  setLoading(true)

  try {
    const uploadedPhotos = await api.uploadPhotos(albumId, files)
    await loadAlbums()
  } catch (err) {
    setError(`Failed to upload photos: ${err.message}`)
  } finally {
    setLoading(false)
    elements.fileInput.value = ''
  }
})

// Load albums from API
async function loadAlbums() {
  setLoading(true)
  try {
    const albums = await api.getAlbums()
    appState.albums = albums
    clearError()
    render()
  } catch (err) {
    setError(`Failed to load albums: ${err.message}`)
  } finally {
    setLoading(false)
  }
}

// State setters
function setLoading(isLoading) {
  appState.loading = isLoading
  render()
}

function setError(message) {
  appState.error = message
  render()
}

function clearError() {
  appState.error = null
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
  loadAlbums()
}

// Start the app
init()
