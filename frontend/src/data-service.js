/**
 * Data Organization Service
 * Handles photo grouping, date processing, and data transformation
 */

/**
 * Group photos by date
 * @param {Array} photos - Photos to group
 * @param {Object} options - Grouping options
 *   - timezone: Timezone for date grouping (default: user's local)
 *   - sortOrder: 'DESC' or 'ASC' (default: 'DESC')
 * @returns {Array} Grouped albums with photos
 */
export function groupPhotosByDate(photos, options = {}) {
  const { timezone = 'local', sortOrder = 'DESC' } = options

  // Group photos by date
  const groups = new Map()

  photos.forEach((photo) => {
    try {
      const dateStr = extractDateFromPhoto(photo, timezone)
      if (!groups.has(dateStr)) {
        groups.set(dateStr, [])
      }
      groups.get(dateStr).push(photo)
    } catch (err) {
      console.warn(`Failed to group photo ${photo.id}:`, err)
      // Put undated photos in "Undated" group
      if (!groups.has('Undated')) {
        groups.set('Undated', [])
      }
      groups.get('Undated').push(photo)
    }
  })

  // Convert to array of albums
  const albums = Array.from(groups.entries()).map(([date, groupPhotos]) => ({
    date,
    photos: groupPhotos,
    count: groupPhotos.length,
    oldestPhoto: groupPhotos[groupPhotos.length - 1],
    newestPhoto: groupPhotos[0]
  }))

  // Sort albums
  if (sortOrder === 'DESC') {
    albums.sort((a, b) => compareDate(b.date, a.date))
  } else {
    albums.sort((a, b) => compareDate(a.date, b.date))
  }

  return albums
}

/**
 * Extract date string from photo (YYYY-MM-DD)
 * @param {Object} photo
 * @param {string} timezone
 * @returns {string}
 */
export function extractDateFromPhoto(photo, timezone = 'local') {
  let dateObj

  // Try various date fields
  if (photo.date_taken) {
    dateObj = new Date(photo.date_taken)
  } else if (photo.uploaded_at) {
    dateObj = new Date(photo.uploaded_at)
  } else if (photo.created_at) {
    dateObj = new Date(photo.created_at)
  } else {
    throw new Error('No date field found in photo')
  }

  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date')
  }

  // Format as YYYY-MM-DD
  return formatDateToISO(dateObj, timezone)
}

/**
 * Format date to ISO format with timezone consideration
 * @param {Date} date
 * @param {string} timezone
 * @returns {string}
 */
export function formatDateToISO(date, timezone = 'local') {
  if (timezone === 'local') {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } else {
    // UTC format
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
}

/**
 * Compare two date strings (YYYY-MM-DD)
 * @param {string} dateA
 * @param {string} dateB
 * @returns {number} -1, 0, or 1
 */
function compareDate(dateA, dateB) {
  if (dateA === 'Undated') return 1
  if (dateB === 'Undated') return -1
  return dateA.localeCompare(dateB)
}

/**
 * Sort photos within a group by timestamp
 * @param {Array} photos
 * @param {string} order - 'ASC' or 'DESC'
 * @returns {Array}
 */
export function sortPhotos(photos, order = 'DESC') {
  const sorted = [...photos]
  sorted.sort((a, b) => {
    const timeA = new Date(a.uploaded_at || a.created_at || 0).getTime()
    const timeB = new Date(b.uploaded_at || b.created_at || 0).getTime()
    return order === 'DESC' ? timeB - timeA : timeA - timeB
  })
  return sorted
}

/**
 * Format album date for display
 * @param {string} dateStr - ISO date string (YYYY-MM-DD) or date key
 * @param {Object} options
 *   - locale: Language locale (default: 'en-US')
 *   - format: 'long', 'short', 'narrow', 'numeric' (default: 'long')
 * @returns {string}
 */
export function formatAlbumDate(dateStr, options = {}) {
  const { locale = 'en-US', format = 'long' } = options

  if (dateStr === 'Undated') {
    return 'Undated'
  }

  try {
    const date = new Date(dateStr + 'T00:00:00Z')
    if (isNaN(date.getTime())) {
      return dateStr
    }

    const formatter = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: format,
      day: 'numeric'
    })
    return formatter.format(date)
  } catch (err) {
    console.warn(`Failed to format date ${dateStr}:`, err)
    return dateStr
  }
}

/**
 * Get relative date string (e.g., "Today", "Yesterday", "2 days ago")
 * @param {string} dateStr - ISO date string
 * @returns {string}
 */
export function getRelativeDateString(dateStr) {
  if (dateStr === 'Undated') {
    return 'Undated'
  }

  try {
    const date = new Date(dateStr + 'T00:00:00Z')
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const photoDate = new Date(date)
    photoDate.setHours(0, 0, 0, 0)

    const diffTime = today.getTime() - photoDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  } catch (err) {
    return dateStr
  }
}

/**
 * Get date range string (e.g., "November 10 - November 17, 2024")
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @param {string} locale
 * @returns {string}
 */
export function getDateRangeString(startDate, endDate, locale = 'en-US') {
  if (startDate === endDate) {
    return formatAlbumDate(startDate, { locale })
  }

  const start = formatAlbumDate(startDate, { locale, format: 'short' })
  const end = formatAlbumDate(endDate, { locale })
  return `${start} - ${end}`
}

/**
 * Check if two dates are consecutive days
 * @param {string} dateA - ISO date string
 * @param {string} dateB - ISO date string
 * @returns {boolean}
 */
export function areConsecutiveDays(dateA, dateB) {
  try {
    const a = new Date(dateA + 'T00:00:00Z').getTime()
    const b = new Date(dateB + 'T00:00:00Z').getTime()
    const dayMs = 24 * 60 * 60 * 1000
    return Math.abs(a - b) === dayMs
  } catch {
    return false
  }
}

/**
 * Filter photos by date range
 * @param {Array} photos
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {Array}
 */
export function filterPhotosByDateRange(photos, startDate, endDate) {
  return photos.filter((photo) => {
    try {
      const photoDate = extractDateFromPhoto(photo)
      return photoDate >= startDate && photoDate <= endDate
    } catch {
      return false
    }
  })
}

/**
 * Get photo statistics
 * @param {Array} photos
 * @returns {Object}
 */
export function getPhotoStats(photos) {
  if (photos.length === 0) {
    return {
      total: 0,
      dateRange: null,
      oldestPhoto: null,
      newestPhoto: null,
      averagePhotosPerDay: 0
    }
  }

  let oldestDate = null
  let newestDate = null

  photos.forEach((photo) => {
    try {
      const date = extractDateFromPhoto(photo)
      if (!oldestDate || date < oldestDate) oldestDate = date
      if (!newestDate || date > newestDate) newestDate = date
    } catch {
      // Skip photos without valid dates
    }
  })

  const uniqueDates = new Set()
  photos.forEach((photo) => {
    try {
      uniqueDates.add(extractDateFromPhoto(photo))
    } catch {
      // Skip
    }
  })

  return {
    total: photos.length,
    dateRange: oldestDate && newestDate ? { start: oldestDate, end: newestDate } : null,
    uniqueDates: uniqueDates.size,
    averagePhotosPerDay: uniqueDates.size > 0 ? (photos.length / uniqueDates.size).toFixed(1) : 0
  }
}
