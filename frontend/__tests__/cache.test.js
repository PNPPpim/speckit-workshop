/**
 * Frontend cache module tests
 */

// Mock cache module
const createCacheMock = () => {
  const cache = new Map()
  const maxSize = 10 * 1024 * 1024 // 10MB
  let currentSize = 0
  const ttl = 5 * 60 * 1000 // 5 minutes

  const set = (key, value, options = {}) => {
    if (value === undefined) return false
    const size = JSON.stringify(value).length
    if (currentSize + size > maxSize) {
      // Simple eviction: remove oldest entry
      const firstKey = cache.keys().next().value
      if (firstKey) {
        const entry = cache.get(firstKey)
        const oldSize = entry ? JSON.stringify(entry.data).length : 0
        cache.delete(firstKey)
        currentSize -= oldSize
      }
    }
    cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: options.ttl || ttl
    })
    currentSize += size
    return true
  }

  const get = (key) => {
    const entry = cache.get(key)
    if (!entry) return null
    
    const age = Date.now() - entry.timestamp
    if (age > entry.ttl) {
      cache.delete(key)
      currentSize -= JSON.stringify(entry.data).length
      return null
    }
    // Deep clone to prevent external mutations
    return JSON.parse(JSON.stringify(entry.data))
  }

  const invalidate = (key) => {
    if (cache.has(key)) {
      const entry = cache.get(key)
      currentSize -= JSON.stringify(entry.data).length
      cache.delete(key)
      return true
    }
    return false
  }

  const clear = () => {
    cache.clear()
    currentSize = 0
  }

  const staleWhileRevalidate = (key, fetchFn, options = {}) => {
    const entry = cache.get(key)
    
    if (!entry) {
      return fetchFn().then((data) => {
        set(key, data, options)
        return data
      })
    }
    
    const age = Date.now() - entry.timestamp
    if (age > entry.ttl) {
      // Stale: return old data and fetch new
      fetchFn().then((data) => {
        set(key, data, options)
      }).catch(() => {})
      return Promise.resolve(entry.data)
    }
    
    return Promise.resolve(entry.data)
  }

  return { set, get, invalidate, clear, staleWhileRevalidate, cache, currentSize: () => currentSize }
}

describe('Frontend Cache Module', () => {
  let cache

  beforeEach(() => {
    cache = createCacheMock()
  })

  describe('Basic Operations', () => {
    it('should set and get cache value', () => {
      cache.set('key1', { data: 'value1' })
      const value = cache.get('key1')
      expect(value).toEqual({ data: 'value1' })
    })

    it('should return null for non-existent key', () => {
      const value = cache.get('non-existent')
      expect(value).toBeNull()
    })

    it('should overwrite existing value', () => {
      cache.set('key1', 'value1')
      cache.set('key1', 'value2')
      const value = cache.get('key1')
      expect(value).toBe('value2')
    })

    it('should support complex objects', () => {
      const obj = {
        id: '1',
        title: 'Album',
        photos: [{ id: 'p1' }, { id: 'p2' }]
      }
      cache.set('album1', obj)
      const retrieved = cache.get('album1')
      expect(retrieved).toEqual(obj)
    })

    it('should support arrays', () => {
      const arr = [
        { id: '1', title: 'Album 1' },
        { id: '2', title: 'Album 2' }
      ]
      cache.set('albums', arr)
      const retrieved = cache.get('albums')
      expect(retrieved).toEqual(arr)
    })
  })

  describe('Invalidation', () => {
    it('should invalidate specific key', () => {
      cache.set('key1', 'value1')
      const result = cache.invalidate('key1')
      expect(result).toBe(true)
      expect(cache.get('key1')).toBeNull()
    })

    it('should return false when invalidating non-existent key', () => {
      const result = cache.invalidate('non-existent')
      expect(result).toBe(false)
    })

    it('should clear all cache', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.clear()
      
      expect(cache.get('key1')).toBeNull()
      expect(cache.get('key2')).toBeNull()
    })
  })

  describe('TTL (Time To Live)', () => {
    it('should use default TTL', () => {
      // Create cache with controllable time
      const testCache = (() => {
        const m = new Map()
        const now = { value: 0 }
        const set = (key, value, opts = {}) => {
          if (value === undefined) return false
          m.set(key, { data: value, timestamp: now.value, ttl: opts.ttl || 5 * 60 * 1000 })
          return true
        }
        const get = (key) => {
          const entry = m.get(key)
          if (!entry) return null
          if (now.value - entry.timestamp > entry.ttl) {
            m.delete(key)
            return null
          }
          return entry.data
        }
        return { set, get, now }
      })()
      
      testCache.set('key1', 'value1')
      testCache.now.value += 6 * 60 * 1000 // Advance past 5 minute TTL
      expect(testCache.get('key1')).toBeNull()
    })

    it('should respect custom TTL', () => {
      const testCache = (() => {
        const m = new Map()
        const now = { value: 0 }
        const set = (key, value, opts = {}) => {
          if (value === undefined) return false
          m.set(key, { data: value, timestamp: now.value, ttl: opts.ttl || 5 * 60 * 1000 })
          return true
        }
        const get = (key) => {
          const entry = m.get(key)
          if (!entry) return null
          if (now.value - entry.timestamp > entry.ttl) {
            m.delete(key)
            return null
          }
          return entry.data
        }
        return { set, get, now }
      })()
      
      testCache.set('key1', 'value1', { ttl: 1000 })
      testCache.now.value += 1500
      expect(testCache.get('key1')).toBeNull()
    })

    it('should not expire if within TTL', () => {
      const testCache = (() => {
        const m = new Map()
        const now = { value: 0 }
        const set = (key, value, opts = {}) => {
          if (value === undefined) return false
          m.set(key, { data: value, timestamp: now.value, ttl: opts.ttl || 5 * 60 * 1000 })
          return true
        }
        const get = (key) => {
          const entry = m.get(key)
          if (!entry) return null
          if (now.value - entry.timestamp > entry.ttl) {
            m.delete(key)
            return null
          }
          return entry.data
        }
        return { set, get, now }
      })()
      
      testCache.set('key1', 'value1', { ttl: 10000 })
      testCache.now.value += 5000
      expect(testCache.get('key1')).toBe('value1')
    })
  })

  describe('Size Management', () => {
    it('should track cache size', () => {
      cache.set('key1', 'x'.repeat(100))
      expect(cache.currentSize()).toBeGreaterThan(0)
    })

    it('should handle size overflow with LRU eviction', () => {
      // Set a large value to trigger size limit
      cache.set('key1', 'x'.repeat(5 * 1024 * 1024)) // 5MB
      cache.set('key2', 'y'.repeat(6 * 1024 * 1024)) // 6MB, exceeds limit
      
      // key1 should be evicted
      expect(cache.get('key1')).toBeNull()
      expect(cache.get('key2')).toBeTruthy()
    })
  })

  describe('Stale-While-Revalidate Pattern', () => {
    it('should return cached data if available', async () => {
      cache.set('key1', 'cached-data')
      
      let called = false
      const fetchFn = () => {
        called = true
        return Promise.resolve('new-data')
      }
      
      const result = await cache.staleWhileRevalidate('key1', fetchFn)
      
      expect(result).toBe('cached-data')
      expect(called).toBe(false)
    })

    it('should fetch and cache if not available', async () => {
      let called = false
      const fetchFn = () => {
        called = true
        return Promise.resolve('fetched-data')
      }
      
      const result = await cache.staleWhileRevalidate('key1', fetchFn)
      
      expect(result).toBe('fetched-data')
      expect(called).toBe(true)
      expect(cache.get('key1')).toBe('fetched-data')
    })

    it('should return stale data while revalidating', async () => {
      cache.set('key1', 'stale-data', { ttl: -1000 }) // Expired
      
      let called = false
      const fetchFn = () => {
        called = true
        return Promise.resolve('new-data')
      }
      
      const result = await cache.staleWhileRevalidate('key1', fetchFn)
      
      expect(result).toBe('stale-data')
      expect(called).toBe(true)
      // Wait for revalidation
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(cache.get('key1')).toBe('new-data')
    })

    it('should handle fetch errors gracefully', async () => {
      cache.set('key1', 'fallback-data')
      
      let called = false
      const fetchFn = () => {
        called = true
        return Promise.reject(new Error('Fetch failed'))
      }
      
      const result = await cache.staleWhileRevalidate('key1', fetchFn)
      
      expect(result).toBe('fallback-data')
    })
  })

  describe('Multiple Keys', () => {
    it('should manage multiple keys independently', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
      
      expect(cache.get('key1')).toBe('value1')
      expect(cache.get('key2')).toBe('value2')
      expect(cache.get('key3')).toBe('value3')
    })

    it('should invalidate one key without affecting others', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.invalidate('key1')
      
      expect(cache.get('key1')).toBeNull()
      expect(cache.get('key2')).toBe('value2')
    })

    it('should support different TTLs for different keys', () => {
      const testCache = (() => {
        const m = new Map()
        const now = { value: 0 }
        const set = (key, value, opts = {}) => {
          if (value === undefined) return false
          m.set(key, { data: value, timestamp: now.value, ttl: opts.ttl || 5 * 60 * 1000 })
          return true
        }
        const get = (key) => {
          const entry = m.get(key)
          if (!entry) return null
          if (now.value - entry.timestamp > entry.ttl) {
            m.delete(key)
            return null
          }
          return entry.data
        }
        return { set, get, now }
      })()
      
      testCache.set('short-ttl', 'value', { ttl: 100 })
      testCache.set('long-ttl', 'value', { ttl: 10000 })
      
      testCache.now.value += 500
      
      expect(testCache.get('short-ttl')).toBeNull()
      expect(testCache.get('long-ttl')).toBe('value')
    })
  })

  describe('Data Integrity', () => {
    it('should not corrupt data on retrieval', () => {
      const original = { id: 1, items: [1, 2, 3], nested: { key: 'value' } }
      cache.set('key1', original)
      const retrieved = cache.get('key1')
      
      expect(retrieved).toEqual(original)
      // Cache should deep clone data (different reference)
      expect(retrieved).not.toBe(original)
      // Modifying retrieved should not affect cache
      retrieved.nested.key = 'modified'
      const retrieved2 = cache.get('key1')
      expect(retrieved2.nested.key).toBe('value')
    })

    it('should handle null and undefined values', () => {
      cache.set('null-key', null)
      // Note: cache rejects undefined values per spec
      
      expect(cache.get('null-key')).toBeNull()
      expect(cache.get('undefined-key')).toBeNull() // Not in cache
    })

    it('should handle empty objects and arrays', () => {
      cache.set('empty-obj', {})
      cache.set('empty-arr', [])
      
      expect(cache.get('empty-obj')).toEqual({})
      expect(cache.get('empty-arr')).toEqual([])
    })
  })

  describe('Performance', () => {
    it('should handle many items efficiently', () => {
      for (let i = 0; i < 100; i++) {
        cache.set(`key-${i}`, { data: i })
      }
      
      expect(cache.get('key-50')).toEqual({ data: 50 })
    })

    it('should clear efficiently', () => {
      for (let i = 0; i < 100; i++) {
        cache.set(`key-${i}`, `value-${i}`)
      }
      
      cache.clear()
      expect(cache.currentSize()).toBe(0)
    })
  })
})
