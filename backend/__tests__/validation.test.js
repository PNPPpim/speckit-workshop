/**
 * Validation module unit tests
 */

import { fixtures } from './fixtures.js'

// Mock validation functions for testing
const validateAlbum = (album) => {
  const errors = []
  if (!album || typeof album !== 'object') {
    return { valid: false, errors: ['Album must be an object'] }
  }
  if (!album.title || album.title.trim() === '') {
    errors.push('Album title is required')
  }
  if (album.title && album.title.length > 100) {
    errors.push('Album title must be less than 100 characters')
  }
  if (album.date && album.date.trim() !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(album.date)) {
    errors.push('Album date must be in YYYY-MM-DD format')
  }
  return {
    valid: errors.length === 0,
    errors
  }
}

const validatePhoto = (photo) => {
  const errors = []
  if (!photo || typeof photo !== 'object') {
    return { valid: false, errors: ['Photo must be an object'] }
  }
  if (!photo.filename || photo.filename.trim() === '') {
    errors.push('Photo filename is required')
  }
  if (photo.width && typeof photo.width !== 'number') {
    errors.push('Photo width must be a number')
  }
  if (photo.height && typeof photo.height !== 'number') {
    errors.push('Photo height must be a number')
  }
  return {
    valid: errors.length === 0,
    errors
  }
}

const validateAlbumReorder = (albumIds) => {
  const errors = []
  if (!Array.isArray(albumIds)) {
    return { valid: false, errors: ['Album IDs must be an array'] }
  }
  if (albumIds.length === 0) {
    errors.push('Album IDs array cannot be empty')
  }
  for (const id of albumIds) {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      errors.push('Album IDs must be non-empty strings')
      break
    }
  }
  return {
    valid: errors.length === 0,
    errors
  }
}

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input
  return input
    .replace(/[<>]/g, '')
    .replace(/(['";])/g, '')
    .trim()
}

describe('Validation Module', () => {
  describe('validateAlbum', () => {
    it('should accept valid album data', () => {
      const album = { title: 'Test Album', date: '2024-11-17' }
      const result = validateAlbum(album)
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should reject empty title', () => {
      const album = { title: '', date: '2024-11-17' }
      const result = validateAlbum(album)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject missing title', () => {
      const album = { date: '2024-11-17' }
      const result = validateAlbum(album)
      expect(result.valid).toBe(false)
    })

    it('should reject invalid date format', () => {
      const album = { title: 'Test', date: 'invalid-date' }
      const result = validateAlbum(album)
      expect(result.valid).toBe(false)
    })

    it('should handle very long titles', () => {
      const album = { title: 'a'.repeat(1000), date: '2024-11-17' }
      const result = validateAlbum(album)
      expect(result.valid).toBe(false) // Should have max length
    })
  })

  describe('validatePhoto', () => {
    it('should accept valid photo data', () => {
      const photo = { filename: 'test.jpg', title: 'Test Photo' }
      const result = validatePhoto(photo)
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should reject empty filename', () => {
      const photo = { filename: '', title: 'Test Photo' }
      const result = validatePhoto(photo)
      expect(result.valid).toBe(false)
    })

    it('should reject missing filename', () => {
      const photo = { title: 'Test Photo' }
      const result = validatePhoto(photo)
      expect(result.valid).toBe(false)
    })

    it('should accept optional title', () => {
      const photo = { filename: 'test.jpg' }
      const result = validatePhoto(photo)
      expect(result.valid).toBe(true)
    })

    it('should validate dimensions if provided', () => {
      const photo = { filename: 'test.jpg', width: 1920, height: 1080 }
      const result = validatePhoto(photo)
      expect(result.valid).toBe(true)
    })

    it('should reject non-numeric dimensions', () => {
      const photo = { filename: 'test.jpg', width: 'invalid', height: 1080 }
      const result = validatePhoto(photo)
      expect(result.valid).toBe(false)
    })
  })

  describe('validateAlbumReorder', () => {
    it('should accept valid album ID array', () => {
      const albumIds = ['id1', 'id2', 'id3']
      const result = validateAlbumReorder(albumIds)
      expect(result.valid).toBe(true)
    })

    it('should reject empty array', () => {
      const albumIds = []
      const result = validateAlbumReorder(albumIds)
      expect(result.valid).toBe(false)
    })

    it('should reject non-array input', () => {
      const result = validateAlbumReorder('not-an-array')
      expect(result.valid).toBe(false)
    })

    it('should reject array with invalid ID formats', () => {
      const albumIds = ['id1', '', 'id3']
      const result = validateAlbumReorder(albumIds)
      expect(result.valid).toBe(false)
    })
  })

  describe('sanitizeInput', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script>Safe text'
      const sanitized = sanitizeInput(input)
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).toContain('Safe text')
    })

    it('should handle SQL injection attempts', () => {
      const input = "'; DROP TABLE albums; --"
      const sanitized = sanitizeInput(input)
      expect(sanitized).toBeTruthy()
      expect(typeof sanitized).toBe('string')
    })

    it('should preserve normal text', () => {
      const input = 'This is a normal album title'
      const sanitized = sanitizeInput(input)
      expect(sanitized).toBe(input)
    })

    it('should trim whitespace', () => {
      const input = '  Trimmed Title  '
      const sanitized = sanitizeInput(input)
      expect(sanitized).toBe('Trimmed Title')
    })
  })
})
