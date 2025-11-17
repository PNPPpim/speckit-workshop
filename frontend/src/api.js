// API client for Photo Album Organizer
const API_BASE = '/api'

export const api = {
  // Albums
  getAlbums: () => fetch(`${API_BASE}/albums`).then(r => r.json()),
  getAlbum: (id) => fetch(`${API_BASE}/albums/${id}`).then(r => r.json()),
  createAlbum: (data) =>
    fetch(`${API_BASE}/albums`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  updateAlbum: (id, data) =>
    fetch(`${API_BASE}/albums/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  reorderAlbums: (albumIds) =>
    fetch(`${API_BASE}/albums/order/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ albumIds })
    }).then(r => r.json()),
  deleteAlbum: (id) =>
    fetch(`${API_BASE}/albums/${id}`, { method: 'DELETE' }).then(r => r.json()),

  // Photos
  getPhotos: (albumId) =>
    fetch(`${API_BASE}/photos/album/${albumId}`).then(r => r.json()),
  uploadPhotos: (albumId, files) => {
    const formData = new FormData()
    formData.append('albumId', albumId)
    files.forEach((file) => formData.append('photos', file))
    return fetch(`${API_BASE}/photos/upload`, {
      method: 'POST',
      body: formData
    }).then(r => r.json())
  },
  deletePhoto: (id) =>
    fetch(`${API_BASE}/photos/${id}`, { method: 'DELETE' }).then(r => r.json())
}

export async function handleApiError(error) {
  console.error('API Error:', error)
  throw new Error(error.message || 'API request failed')
}
