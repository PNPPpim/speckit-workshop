/**
 * Frontend API client tests
 */

// Mock API module
const createApiMock = () => {
  const BASE_URL = '/api'

  const fetchAlbums = async () => {
    try {
      const response = await fetch(`${BASE_URL}/albums`)
      if (!response.ok) throw new Error('Failed to fetch albums')
      return response.json()
    } catch (err) {
      throw new Error(`Albums fetch error: ${err.message}`)
    }
  }

  const createAlbum = async (title, date) => {
    try {
      const response = await fetch(`${BASE_URL}/albums`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date })
      })
      if (!response.ok) throw new Error('Failed to create album')
      return response.json()
    } catch (err) {
      throw new Error(`Album creation error: ${err.message}`)
    }
  }

  const updateAlbum = async (id, title, date) => {
    try {
      const response = await fetch(`${BASE_URL}/albums/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date })
      })
      if (!response.ok) throw new Error('Failed to update album')
      return response.json()
    } catch (err) {
      throw new Error(`Album update error: ${err.message}`)
    }
  }

  const deleteAlbum = async (id) => {
    try {
      const response = await fetch(`${BASE_URL}/albums/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete album')
      return response.json()
    } catch (err) {
      throw new Error(`Album deletion error: ${err.message}`)
    }
  }

  const reorderAlbums = async (albumIds) => {
    try {
      const response = await fetch(`${BASE_URL}/albums/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumIds })
      })
      if (!response.ok) throw new Error('Failed to reorder albums')
      return response.json()
    } catch (err) {
      throw new Error(`Album reorder error: ${err.message}`)
    }
  }

  const fetchPhotos = async (albumId) => {
    try {
      const response = await fetch(`${BASE_URL}/photos/album/${albumId}`)
      if (!response.ok) throw new Error('Failed to fetch photos')
      return response.json()
    } catch (err) {
      throw new Error(`Photos fetch error: ${err.message}`)
    }
  }

  const uploadPhoto = async (albumId, file, title) => {
    try {
      const formData = new FormData()
      formData.append('albumId', albumId)
      formData.append('file', file)
      formData.append('title', title)
      
      const response = await fetch(`${BASE_URL}/photos`, {
        method: 'POST',
        body: formData
      })
      if (!response.ok) throw new Error('Failed to upload photo')
      return response.json()
    } catch (err) {
      throw new Error(`Photo upload error: ${err.message}`)
    }
  }

  const deletePhoto = async (id) => {
    try {
      const response = await fetch(`${BASE_URL}/photos/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete photo')
      return response.json()
    } catch (err) {
      throw new Error(`Photo deletion error: ${err.message}`)
    }
  }

  return {
    fetchAlbums,
    createAlbum,
    updateAlbum,
    deleteAlbum,
    reorderAlbums,
    fetchPhotos,
    uploadPhoto,
    deletePhoto
  }
}

describe('Frontend API Client', () => {
  let api

  beforeEach(() => {
    api = createApiMock()
  })

  describe('Album Operations', () => {
    it('should fetch albums', async () => {
      const mockAlbums = [
        { id: '1', title: 'Album 1' },
        { id: '2', title: 'Album 2' }
      ]
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAlbums)
      })

      const result = await api.fetchAlbums()
      expect(result).toEqual(mockAlbums)
    })

    it('should create album', async () => {
      const newAlbum = { id: '1', title: 'New Album', date: '2024-11-17' }
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newAlbum)
      })

      const result = await api.createAlbum('New Album', '2024-11-17')
      expect(result).toEqual(newAlbum)
    })

    it('should update album', async () => {
      const updated = { id: '1', title: 'Updated Album', date: '2024-11-17' }
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updated)
      })

      const result = await api.updateAlbum('1', 'Updated Album', '2024-11-17')
      expect(result).toEqual(updated)
    })

    it('should delete album', async () => {
      const response = { success: true }
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(response)
      })

      const result = await api.deleteAlbum('1')
      expect(result.success).toBe(true)
    })

    it('should reorder albums', async () => {
      const response = { success: true }
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(response)
      })

      const result = await api.reorderAlbums(['3', '1', '2'])
      expect(result.success).toBe(true)
    })
  })

  describe('Photo Operations', () => {
    it('should fetch photos for album', async () => {
      const mockPhotos = [
        { id: 'p1', filename: 'photo1.jpg' },
        { id: 'p2', filename: 'photo2.jpg' }
      ]
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPhotos)
      })

      const result = await api.fetchPhotos('album1')
      expect(result).toEqual(mockPhotos)
    })

    it('should upload photo', async () => {
      const newPhoto = { id: 'p1', filename: 'photo.jpg' }
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newPhoto)
      })

      const file = new File(['content'], 'photo.jpg')
      const result = await api.uploadPhoto('album1', file, 'Photo')
      expect(result).toEqual(newPhoto)
    })

    it('should delete photo', async () => {
      const response = { success: true }
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(response)
      })

      const result = await api.deletePhoto('photo1')
      expect(result.success).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle fetch albums error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false
      })

      await expect(api.fetchAlbums()).rejects.toThrow('Albums fetch error')
    })

    it('should handle create album error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false
      })

      await expect(api.createAlbum('Album', '2024-11-17')).rejects.toThrow('Album creation error')
    })

    it('should handle network error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(api.fetchAlbums()).rejects.toThrow('Albums fetch error')
    })

    it('should handle update album error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false
      })

      await expect(api.updateAlbum('1', 'Album', '2024-11-17')).rejects.toThrow('Album update error')
    })

    it('should handle delete album error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false
      })

      await expect(api.deleteAlbum('1')).rejects.toThrow('Album deletion error')
    })

    it('should handle reorder error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false
      })

      await expect(api.reorderAlbums(['1', '2'])).rejects.toThrow('Album reorder error')
    })

    it('should handle fetch photos error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false
      })

      await expect(api.fetchPhotos('album1')).rejects.toThrow('Photos fetch error')
    })

    it('should handle upload photo error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false
      })

      const file = new File(['content'], 'photo.jpg')
      await expect(api.uploadPhoto('album1', file, 'Photo')).rejects.toThrow('Photo upload error')
    })

    it('should handle delete photo error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false
      })

      await expect(api.deletePhoto('photo1')).rejects.toThrow('Photo deletion error')
    })
  })

  describe('Request Headers', () => {
    it('should set correct content-type for album creation', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      })

      await api.createAlbum('Album', '2024-11-17')

      const call = global.fetch.mock.calls[0]
      expect(call[1].headers['Content-Type']).toBe('application/json')
    })

    it('should use FormData for photo upload', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      })

      const file = new File(['content'], 'photo.jpg')
      await api.uploadPhoto('album1', file, 'Photo')

      const call = global.fetch.mock.calls[0]
      expect(call[1].body).toBeInstanceOf(FormData)
    })
  })

  describe('URL Construction', () => {
    it('should construct correct album fetch URL', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      })

      await api.fetchAlbums()
      expect(global.fetch).toHaveBeenCalledWith('/api/albums', expect.anything())
    })

    it('should construct correct photos fetch URL', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      })

      await api.fetchPhotos('album123')
      expect(global.fetch).toHaveBeenCalledWith('/api/photos/album/album123', expect.anything())
    })

    it('should construct correct delete album URL', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      })

      await api.deleteAlbum('album123')
      expect(global.fetch).toHaveBeenCalledWith('/api/albums/album123', expect.anything())
    })

    it('should construct correct delete photo URL', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      })

      await api.deletePhoto('photo123')
      expect(global.fetch).toHaveBeenCalledWith('/api/photos/photo123', expect.anything())
    })
  })

  describe('Request Methods', () => {
    it('should use GET for fetch operations', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      })

      await api.fetchAlbums()
      expect(global.fetch.mock.calls[0][1].method).toBeUndefined() // GET is default
    })

    it('should use POST for create operations', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      })

      await api.createAlbum('Album', '2024-11-17')
      expect(global.fetch.mock.calls[0][1].method).toBe('POST')
    })

    it('should use PUT for update operations', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      })

      await api.updateAlbum('1', 'Album', '2024-11-17')
      expect(global.fetch.mock.calls[0][1].method).toBe('PUT')
    })

    it('should use DELETE for delete operations', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      })

      await api.deleteAlbum('1')
      expect(global.fetch.mock.calls[0][1].method).toBe('DELETE')
    })
  })
})
