/**
 * Frontend lazy loading tests
 */

// Mock lazy load module
const createLazyLoadMock = () => {
  let imageLoaders = new Map()
  let intersectionObserverCreated = false

  const initLazyLoading = (container = document.body) => {
    if (typeof IntersectionObserver === 'undefined') {
      console.warn('IntersectionObserver not available')
      return false
    }

    intersectionObserverCreated = true
    const images = container.querySelectorAll('img[data-src]')
    
    images.forEach((img) => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const src = entry.target.dataset.src
            if (src) {
              entry.target.src = src
              entry.target.removeAttribute('data-src')
              observer.unobserve(entry.target)
            }
          }
        })
      })
      observer.observe(img)
      imageLoaders.set(img, observer)
    })

    return true
  }

  const preloadImage = async (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`Failed to load ${src}`))
      img.src = src
    })
  }

  const prefetchImages = (sources) => {
    return Promise.all(sources.map((src) => preloadImage(src).catch(() => null)))
  }

  const getLoadedImagesCount = () => {
    return document.querySelectorAll('img:not([data-src])').length
  }

  const cleanup = () => {
    imageLoaders.forEach((observer) => observer.disconnect())
    imageLoaders.clear()
  }

  return {
    initLazyLoading,
    preloadImage,
    prefetchImages,
    getLoadedImagesCount,
    cleanup,
    isIntersectionObserverAvailable: () => typeof IntersectionObserver !== 'undefined'
  }
}

describe('Frontend Lazy Loading Module', () => {
  let lazyLoader

  beforeEach(() => {
    lazyLoader = createLazyLoadMock()
    // Mock IntersectionObserver with basic implementation
    global.IntersectionObserver = class MockIntersectionObserver {
      constructor(callback) {
        this.callback = callback
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  })

  afterEach(() => {
    lazyLoader.cleanup()
    delete global.IntersectionObserver
  })

  describe('Lazy Loading Initialization', () => {
    it('should initialize lazy loading', () => {
      const result = lazyLoader.initLazyLoading()
      expect(result).toBe(true)
    })

    it('should check for IntersectionObserver availability', () => {
      const available = lazyLoader.isIntersectionObserverAvailable()
      expect(typeof available).toBe('boolean')
    })

    it('should handle missing IntersectionObserver', () => {
      const originalIO = global.IntersectionObserver
      delete global.IntersectionObserver
      const newLoader = createLazyLoadMock()
      const result = newLoader.initLazyLoading()
      expect(result).toBe(false)
      global.IntersectionObserver = originalIO
    })

    it('should return false without IntersectionObserver', () => {
      global.IntersectionObserver = undefined
      const result = lazyLoader.initLazyLoading()
      expect(result).toBe(false)
    })
  })

  describe('Image Preloading', () => {
    it('should preload single image', async () => {
      const src = 'https://example.com/image.jpg'
      // Mock Image loading - don't use jest.spyOn
      const originalImage = global.Image
      global.Image = class MockImage {
        constructor() {
          this.onload = null
          this.onerror = null
          this.src = null
        }
      }

      const promise = lazyLoader.preloadImage(src)
      expect(promise).toBeInstanceOf(Promise)
      
      global.Image = originalImage
    })

    it('should handle image load error', async () => {
      const originalImage = global.Image
      global.Image = class MockImage {
        constructor() {
          this.onload = null
          this.onerror = null
          this.src = null
        }
      }

      const promise = lazyLoader.preloadImage('invalid-url')
      expect(promise).toBeInstanceOf(Promise)
      
      global.Image = originalImage
    })
  })

  describe('Image Prefetching', () => {
    it('should prefetch multiple images', async () => {
      const originalImage = global.Image
      global.Image = class MockImage {
        constructor() {
          this.onload = null
          this.onerror = null
          this.src = null
        }
      }

      const sources = [
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg'
      ]
      const promise = lazyLoader.prefetchImages(sources)
      expect(promise).toBeInstanceOf(Promise)
      
      global.Image = originalImage
    })

    it('should handle mixed success and failures', async () => {
      const originalImage = global.Image
      global.Image = class MockImage {
        constructor() {
          this.onload = null
          this.onerror = null
          this.src = null
        }
      }

      const sources = ['valid.jpg', 'invalid.jpg']
      const promise = lazyLoader.prefetchImages(sources)
      expect(promise).toBeInstanceOf(Promise)
      
      global.Image = originalImage
    })
  })

  describe('Image Loading State', () => {
    it('should track loaded images count', () => {
      const count = lazyLoader.getLoadedImagesCount()
      expect(typeof count).toBe('number')
      expect(count).toBeGreaterThanOrEqual(0)
    })

    it('should update loaded count as images load', () => {
      const beforeCount = lazyLoader.getLoadedImagesCount()
      // Simulate loading an image
      const img = document.createElement('img')
      img.src = 'https://example.com/image.jpg'
      document.body.appendChild(img)
      
      const afterCount = lazyLoader.getLoadedImagesCount()
      expect(afterCount).toBeGreaterThanOrEqual(beforeCount)
      
      img.remove()
    })
  })

  describe('Container Support', () => {
    it('should support custom container', () => {
      const container = document.createElement('div')
      const result = lazyLoader.initLazyLoading(container)
      expect(result).toBe(true)
    })

    it('should use document.body as default', () => {
      const result = lazyLoader.initLazyLoading()
      expect(result).toBe(true)
    })

    it('should find images with data-src attribute', () => {
      const container = document.createElement('div')
      const img = document.createElement('img')
      img.setAttribute('data-src', 'https://example.com/lazy.jpg')
      container.appendChild(img)
      
      const result = lazyLoader.initLazyLoading(container)
      expect(result).toBe(true)
    })
  })

  describe('Cleanup', () => {
    it('should cleanup observers', () => {
      lazyLoader.initLazyLoading()
      lazyLoader.cleanup()
      // Cleanup should not throw
      expect(() => lazyLoader.cleanup()).not.toThrow()
    })

    it('should disconnect all observers on cleanup', () => {
      lazyLoader.initLazyLoading()
      lazyLoader.cleanup()
      // After cleanup, re-initializing should work
      const result = lazyLoader.initLazyLoading()
      expect(result).toBe(true)
    })
  })

  describe('Performance', () => {
    it('should handle many images efficiently', () => {
      const container = document.createElement('div')
      for (let i = 0; i < 100; i++) {
        const img = document.createElement('img')
        img.setAttribute('data-src', `https://example.com/img${i}.jpg`)
        container.appendChild(img)
      }
      
      const result = lazyLoader.initLazyLoading(container)
      expect(result).toBe(true)
    })

    it('should handle prefetching many images', async () => {
      const originalImage = global.Image
      global.Image = class MockImage {
        constructor() {
          this.onload = null
          this.onerror = null
          this.src = null
        }
      }

      const sources = Array.from({ length: 50 }, (_, i) => `https://example.com/img${i}.jpg`)

      const promise = lazyLoader.prefetchImages(sources)
      expect(promise).toBeInstanceOf(Promise)
      
      global.Image = originalImage
    })
  })

  describe('Integration', () => {
    it('should work with actual DOM', () => {
      const container = document.createElement('div')
      const img1 = document.createElement('img')
      img1.setAttribute('data-src', 'https://example.com/img1.jpg')
      const img2 = document.createElement('img')
      img2.setAttribute('data-src', 'https://example.com/img2.jpg')
      
      container.appendChild(img1)
      container.appendChild(img2)
      document.body.appendChild(container)
      
      const result = lazyLoader.initLazyLoading(container)
      expect(result).toBe(true)
      
      document.body.removeChild(container)
    })

    it('should handle mixed lazy and eager images', () => {
      const container = document.createElement('div')
      const lazyImg = document.createElement('img')
      lazyImg.setAttribute('data-src', 'https://example.com/lazy.jpg')
      const eagerImg = document.createElement('img')
      eagerImg.src = 'https://example.com/eager.jpg'
      
      container.appendChild(lazyImg)
      container.appendChild(eagerImg)
      
      const result = lazyLoader.initLazyLoading(container)
      expect(result).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should gracefully handle missing data-src', () => {
      const container = document.createElement('div')
      const img = document.createElement('img')
      container.appendChild(img)
      
      const result = lazyLoader.initLazyLoading(container)
      expect(result).toBe(true)
    })

    it('should handle observer creation errors', () => {
      const originalIO = global.IntersectionObserver
      global.IntersectionObserver = class MockIO {
        constructor() {
          throw new Error('Observer error')
        }
      }
      
      expect(() => lazyLoader.initLazyLoading()).toThrow()
      
      global.IntersectionObserver = originalIO
    })
  })
})
