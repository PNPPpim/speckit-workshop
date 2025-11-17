/**
 * Client-Side Caching Module
 * Implements caching with TTL, invalidation, and stale-while-revalidate
 */

/**
 * Cache store
 */
const caches = new Map()

/**
 * Cache entry structure
 * @typedef {Object} CacheEntry
 * @property {*} data - Cached data
 * @property {number} timestamp - When data was cached
 * @property {number} ttl - Time to live in milliseconds
 * @property {number} size - Approximate size in bytes
 */

const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_SIZE = 10 * 1024 * 1024 // 10MB
let totalCacheSize = 0

/**
 * Get approximate size of an object in bytes
 * @param {*} obj
 * @returns {number}
 */
function getObjectSize(obj) {
  return JSON.stringify(obj).length * 2 // Approximate: 2 bytes per character
}

/**
 * Evict least recently used items if cache is too large
 */
function evictIfNeeded() {
  if (totalCacheSize > MAX_CACHE_SIZE) {
    const entries = Array.from(caches.entries())
      .map(([key, entry]) => ({
        key,
        score: entry.timestamp + entry.ttl
      }))
      .sort((a, b) => a.score - b.score)

    // Remove oldest entries until we're under limit
    for (let i = 0; i < entries.length && totalCacheSize > MAX_CACHE_SIZE; i++) {
      const { key } = entries[i]
      const entry = caches.get(key)
      if (entry) {
        totalCacheSize -= entry.size
        caches.delete(key)
      }
    }
  }
}

/**
 * Set cache entry
 * @param {string} key - Cache key
 * @param {*} data - Data to cache
 * @param {number} ttl - Time to live in ms (default: 5 min)
 */
export function set(key, data, ttl = DEFAULT_TTL) {
  const size = getObjectSize(data)

  // Remove old entry if exists
  const oldEntry = caches.get(key)
  if (oldEntry) {
    totalCacheSize -= oldEntry.size
  }

  // Add new entry
  const entry = {
    data,
    timestamp: Date.now(),
    ttl,
    size
  }

  caches.set(key, entry)
  totalCacheSize += size

  // Evict if needed
  evictIfNeeded()
}

/**
 * Get cache entry
 * @param {string} key
 * @returns {*|null}
 */
export function get(key) {
  const entry = caches.get(key)

  if (!entry) return null

  // Check if expired
  const age = Date.now() - entry.timestamp
  if (age > entry.ttl) {
    // Remove expired entry
    totalCacheSize -= entry.size
    caches.delete(key)
    return null
  }

  return entry.data
}

/**
 * Check if cache is fresh (not stale)
 * @param {string} key
 * @returns {boolean}
 */
export function isFresh(key) {
  const entry = caches.get(key)
  if (!entry) return false

  const age = Date.now() - entry.timestamp
  return age < entry.ttl
}

/**
 * Check if cache exists but may be stale
 * Used for stale-while-revalidate pattern
 * @param {string} key
 * @returns {boolean}
 */
export function exists(key) {
  return caches.has(key)
}

/**
 * Invalidate cache entry
 * @param {string} key
 */
export function invalidate(key) {
  const entry = caches.get(key)
  if (entry) {
    totalCacheSize -= entry.size
    caches.delete(key)
  }
}

/**
 * Invalidate all cache entries matching pattern
 * @param {string|RegExp} pattern
 */
export function invalidatePattern(pattern) {
  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern)

  for (const key of caches.keys()) {
    if (regex.test(key)) {
      invalidate(key)
    }
  }
}

/**
 * Clear all cache
 */
export function clear() {
  caches.clear()
  totalCacheSize = 0
}

/**
 * Get cache statistics
 * @returns {Object}
 */
export function getStats() {
  return {
    entries: caches.size,
    size: totalCacheSize,
    maxSize: MAX_CACHE_SIZE,
    percentUsed: Math.round((totalCacheSize / MAX_CACHE_SIZE) * 100)
  }
}

/**
 * Stale-while-revalidate pattern
 * Returns cached data immediately if available, fetches fresh data in background
 * @param {string} key
 * @param {Function} fetchFn - Async function to fetch fresh data
 * @returns {Promise<*>} Cached data or fresh data
 */
export async function staleWhileRevalidate(key, fetchFn) {
  // Return cached data if available
  if (exists(key)) {
    const cached = get(key)
    if (cached) {
      // Fetch fresh data in background if stale
      if (!isFresh(key)) {
        fetchFn()
          .then((data) => {
            set(key, data)
          })
          .catch((err) => {
            console.warn(`Failed to refresh cache for ${key}:`, err)
          })
      }
      return cached
    }
  }

  // No cache, fetch fresh data
  const data = await fetchFn()
  set(key, data)
  return data
}

/**
 * Memoize async function result
 * @param {string} key
 * @param {Function} asyncFn - Async function to memoize
 * @param {number} ttl - Cache TTL
 * @returns {Promise}
 */
export async function memoize(key, asyncFn, ttl = DEFAULT_TTL) {
  const cached = get(key)
  if (cached !== null) {
    return cached
  }

  const result = await asyncFn()
  set(key, result, ttl)
  return result
}

/**
 * Cache albums with smart expiration
 * @param {Array} albums
 * @param {number} ttl
 */
export function cacheAlbums(albums, ttl = DEFAULT_TTL) {
  set('albums:all', albums, ttl)

  // Also cache individual albums
  albums.forEach((album) => {
    set(`album:${album.id}`, album, ttl)
  })
}

/**
 * Get cached albums
 * @returns {Array|null}
 */
export function getCachedAlbums() {
  return get('albums:all')
}

/**
 * Get cached album by ID
 * @param {string} albumId
 * @returns {Object|null}
 */
export function getCachedAlbum(albumId) {
  return get(`album:${albumId}`)
}

/**
 * Cache photos for album
 * @param {string} albumId
 * @param {Array} photos
 * @param {number} ttl
 */
export function cachePhotos(albumId, photos, ttl = DEFAULT_TTL) {
  set(`photos:${albumId}`, photos, ttl)
}

/**
 * Get cached photos for album
 * @param {string} albumId
 * @returns {Array|null}
 */
export function getCachedPhotos(albumId) {
  return get(`photos:${albumId}`)
}

/**
 * Invalidate album cache
 * @param {string} albumId - Optional, invalidate specific album
 */
export function invalidateAlbumCache(albumId) {
  if (albumId) {
    invalidate(`album:${albumId}`)
    invalidate(`photos:${albumId}`)
  } else {
    invalidatePattern(/^(albums|album|photos):/)
  }
}

// Export cache as object for easier importing
export const cache = {
  set,
  get,
  isFresh,
  invalidate,
  invalidatePattern,
  staleWhileRevalidate,
  memoize,
  cacheAlbums,
  getCachedAlbums,
  cachePhotos,
  getCachedPhotos,
  invalidateAlbumCache,
  getStats
}
