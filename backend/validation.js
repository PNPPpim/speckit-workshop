/**
 * Validation helpers for Photo Album Organizer API
 */

/**
 * Validate album creation data
 * @param {Object} data - Data to validate
 * @returns {Object} {valid: boolean, errors: string[]}
 */
export function validateAlbumCreate(data) {
  const errors = []

  if (!data.date) {
    errors.push('date is required')
  } else if (typeof data.date !== 'string') {
    errors.push('date must be a string (YYYY-MM-DD format)')
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    errors.push('date must be in YYYY-MM-DD format')
  }

  if (!data.title) {
    errors.push('title is required')
  } else if (typeof data.title !== 'string') {
    errors.push('title must be a string')
  } else if (data.title.length > 255) {
    errors.push('title must not exceed 255 characters')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate album update data
 * @param {Object} data - Data to validate
 * @returns {Object} {valid: boolean, errors: string[]}
 */
export function validateAlbumUpdate(data) {
  const errors = []

  if (!data.title) {
    errors.push('title is required')
  } else if (typeof data.title !== 'string') {
    errors.push('title must be a string')
  } else if (data.title.length > 255) {
    errors.push('title must not exceed 255 characters')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate album reorder data
 * @param {Object} data - Data to validate
 * @returns {Object} {valid: boolean, errors: string[]}
 */
export function validateAlbumReorder(data) {
  const errors = []

  if (!data.albumIds) {
    errors.push('albumIds is required')
  } else if (!Array.isArray(data.albumIds)) {
    errors.push('albumIds must be an array')
  } else if (data.albumIds.length === 0) {
    errors.push('albumIds must not be empty')
  } else if (!data.albumIds.every(id => typeof id === 'string')) {
    errors.push('all albumIds must be strings')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate ID parameter
 * @param {string} id - ID to validate
 * @returns {boolean}
 */
export function validateId(id) {
  return typeof id === 'string' && id.length > 0
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(message, status = 500) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}
