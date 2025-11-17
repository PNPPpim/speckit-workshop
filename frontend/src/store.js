/**
 * Centralized State Store
 * Manages application state with event-based updates and listeners
 */

// State listener callbacks
const listeners = new Set()

// Application state
let appState = {
  albums: [],
  photos: {}, // albumId -> photos[]
  loading: false,
  error: null,
  selectedAlbumId: null,
  cache: {
    albums: null,
    albumsTimestamp: null,
    ttl: 5 * 60 * 1000 // 5 minutes
  }
}

/**
 * Get current state
 * @returns {Object} Current state snapshot
 */
export function getState() {
  return JSON.parse(JSON.stringify(appState))
}

/**
 * Update state with partial changes
 * Triggers all listeners with old and new state
 * @param {Object} updates - Partial state updates
 * @returns {Object} Updated state
 */
export function setState(updates) {
  const oldState = JSON.parse(JSON.stringify(appState))

  // Merge updates
  appState = {
    ...appState,
    ...updates
  }

  // Notify all listeners
  notifyListeners(oldState, appState)

  return appState
}

/**
 * Subscribe to state changes
 * @param {Function} listener - Callback called with (oldState, newState)
 * @returns {Function} Unsubscribe function
 */
export function subscribe(listener) {
  if (typeof listener !== 'function') {
    throw new Error('Listener must be a function')
  }

  listeners.add(listener)

  // Return unsubscribe function
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Notify all listeners of state changes
 * @param {Object} oldState - Previous state
 * @param {Object} newState - New state
 */
function notifyListeners(oldState, newState) {
  listeners.forEach((listener) => {
    try {
      listener(oldState, newState)
    } catch (err) {
      console.error('Error in state listener:', err)
    }
  })
}

/**
 * Set loading state
 * @param {boolean} isLoading
 */
export function setLoading(isLoading) {
  setState({ loading: isLoading })
}

/**
 * Set error state
 * @param {string|null} error
 */
export function setError(error) {
  setState({ error })
}

/**
 * Clear error state
 */
export function clearError() {
  setState({ error: null })
}

/**
 * Update albums list
 * @param {Array} albums
 */
export function updateAlbums(albums) {
  setState({
    albums,
    cache: {
      albums,
      albumsTimestamp: Date.now(),
      ttl: appState.cache.ttl
    }
  })
}

/**
 * Add album to state
 * @param {Object} album
 */
export function addAlbum(album) {
  const albums = [...appState.albums, album]
  updateAlbums(albums)
}

/**
 * Remove album from state
 * @param {string} albumId
 */
export function removeAlbum(albumId) {
  const albums = appState.albums.filter((a) => a.id !== albumId)
  const photos = { ...appState.photos }
  delete photos[albumId]
  setState({
    albums,
    photos
  })
}

/**
 * Update single album
 * @param {string} albumId
 * @param {Object} updates
 */
export function updateAlbum(albumId, updates) {
  const albums = appState.albums.map((a) =>
    a.id === albumId ? { ...a, ...updates } : a
  )
  updateAlbums(albums)
}

/**
 * Reorder albums
 * @param {Array} albumIds - New album order
 */
export function reorderAlbums(albumIds) {
  const albumMap = new Map(appState.albums.map((a) => [a.id, a]))
  const albums = albumIds
    .map((id) => albumMap.get(id))
    .filter((a) => a !== undefined)
  updateAlbums(albums)
}

/**
 * Update photos for an album
 * @param {string} albumId
 * @param {Array} photos
 */
export function updatePhotos(albumId, photos) {
  setState({
    photos: {
      ...appState.photos,
      [albumId]: photos
    }
  })
}

/**
 * Add photo to album
 * @param {string} albumId
 * @param {Object} photo
 */
export function addPhoto(albumId, photo) {
  const albumPhotos = appState.photos[albumId] || []
  updatePhotos(albumId, [photo, ...albumPhotos])
}

/**
 * Remove photo from album
 * @param {string} albumId
 * @param {string} photoId
 */
export function removePhoto(albumId, photoId) {
  const albumPhotos = appState.photos[albumId] || []
  const filtered = albumPhotos.filter((p) => p.id !== photoId)
  updatePhotos(albumId, filtered)
}

/**
 * Invalidate cache
 */
export function invalidateCache() {
  setState({
    cache: {
      albums: null,
      albumsTimestamp: null,
      ttl: appState.cache.ttl
    }
  })
}

/**
 * Check if cache is valid
 * @returns {boolean}
 */
export function isCacheValid() {
  if (!appState.cache.albums) return false
  const age = Date.now() - appState.cache.albumsTimestamp
  return age < appState.cache.ttl
}

/**
 * Get cached albums if valid
 * @returns {Array|null}
 */
export function getCachedAlbums() {
  return isCacheValid() ? appState.cache.albums : null
}

/**
 * Set selected album
 * @param {string|null} albumId
 */
export function selectAlbum(albumId) {
  setState({ selectedAlbumId: albumId })
}

/**
 * Get derived state: selected album
 * @returns {Object|null}
 */
export function getSelectedAlbum() {
  const { selectedAlbumId, albums } = appState
  if (!selectedAlbumId) return null
  return albums.find((a) => a.id === selectedAlbumId)
}

/**
 * Get derived state: selected album photos
 * @returns {Array}
 */
export function getSelectedAlbumPhotos() {
  const { selectedAlbumId, photos } = appState
  return selectedAlbumId ? photos[selectedAlbumId] || [] : []
}

/**
 * Get album photo count
 * @param {string} albumId
 * @returns {number}
 */
export function getAlbumPhotoCount(albumId) {
  return (appState.photos[albumId] || []).length
}

/**
 * Get total photo count
 * @returns {number}
 */
export function getTotalPhotoCount() {
  return Object.values(appState.photos).reduce((sum, photos) => sum + photos.length, 0)
}

/**
 * Perform optimistic update with rollback
 * @param {Function} updateFn - Function that updates state
 * @param {Function} rollbackFn - Function that rolls back on error
 * @param {Function} confirmFn - Async function that confirms the update
 */
export async function optimisticUpdate(updateFn, rollbackFn, confirmFn) {
  try {
    // Apply optimistic update
    const oldState = JSON.parse(JSON.stringify(appState))
    updateFn()

    // Confirm with server
    await confirmFn()

    return true
  } catch (err) {
    // Rollback on error
    if (rollbackFn) {
      rollbackFn()
    }
    throw err
  }
}

/**
 * Reset state to initial
 */
export function resetState() {
  appState = {
    albums: [],
    photos: {},
    loading: false,
    error: null,
    selectedAlbumId: null,
    cache: {
      albums: null,
      albumsTimestamp: null,
      ttl: 5 * 60 * 1000
    }
  }
  notifyListeners({}, appState)
}

// Export store as default object for easier importing
export const store = {
  getState,
  setState,
  subscribe,
  updateAlbums,
  addPhoto,
  removePhoto,
  removeAlbum,
  selectAlbum,
  isCacheValid,
  invalidateCache,
  optimisticUpdate,
  resetState
}
