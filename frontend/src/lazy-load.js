/**
 * Image Lazy Loading Module
 * Uses Intersection Observer for efficient image loading
 */

// Track performance metrics
const metrics = {
  imagesLoaded: 0,
  imageFailed: 0,
  totalLoadTime: 0,
  averageLoadTime: 0,
  startTime: Date.now()
}

// Store observers by container
const observers = new WeakMap()

// Default intersection observer options
const defaultOptions = {
  root: null,
  rootMargin: '50px', // Start loading 50px before entering viewport
  threshold: 0.01
}

/**
 * Initialize lazy loading for images in a container
 * @param {HTMLElement} container - Container with images to lazy load
 * @param {Object} options - Observer options
 * @returns {IntersectionObserver}
 */
export function initLazyLoading(container, options = {}) {
  const observerOptions = { ...defaultOptions, ...options }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        loadImage(entry.target)
        observer.unobserve(entry.target)
      }
    })
  }, observerOptions)

  // Observe all images in container
  const images = container.querySelectorAll('img[data-src]')
  images.forEach((img) => {
    observer.observe(img)
  })

  // Store observer for cleanup
  observers.set(container, observer)

  return observer
}

/**
 * Load image from data-src to src
 * @param {HTMLImageElement} img
 */
async function loadImage(img) {
  const startTime = performance.now()

  try {
    // Add loading class for skeleton effect
    img.classList.add('img-loading')

    // Create new image to preload
    const newImg = new Image()

    newImg.onload = () => {
      img.src = newImg.src
      img.classList.remove('img-loading')
      img.classList.add('img-loaded')

      // Track metrics
      metrics.imagesLoaded++
      const loadTime = performance.now() - startTime
      metrics.totalLoadTime += loadTime
      metrics.averageLoadTime = metrics.totalLoadTime / metrics.imagesLoaded

      // Fire custom event
      img.dispatchEvent(
        new CustomEvent('imageloaded', {
          detail: { loadTime, success: true }
        })
      )
    }

    newImg.onerror = () => {
      img.classList.remove('img-loading')
      img.classList.add('img-failed')
      metrics.imageFailed++

      // Use fallback image
      if (img.dataset.fallback) {
        img.src = img.dataset.fallback
      }

      // Fire custom event
      img.dispatchEvent(
        new CustomEvent('imageloaded', {
          detail: { loadTime: performance.now() - startTime, success: false }
        })
      )
    }

    newImg.src = img.dataset.src
  } catch (err) {
    console.error('Error loading image:', err)
    img.classList.remove('img-loading')
    img.classList.add('img-failed')
    metrics.imageFailed++
  }
}

/**
 * Create image element with lazy loading
 * @param {Object} options
 *   - src: Image source URL
 *   - alt: Alt text
 *   - title: Title attribute
 *   - fallback: Fallback image URL (default: solid color)
 *   - className: CSS classes
 * @returns {HTMLImageElement}
 */
export function createLazyImage(options = {}) {
  const {
    src,
    alt = 'Image',
    title = '',
    fallback = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f0f0f0" width="400" height="400"/%3E%3C/svg%3E',
    className = ''
  } = options

  const img = document.createElement('img')
  img.alt = alt
  img.title = title
  img.className = `lazy-image ${className}`.trim()
  img.dataset.src = src
  img.dataset.fallback = fallback

  // Set placeholder/fallback as src
  img.src = fallback

  // Add loading class for skeleton effect
  img.classList.add('img-skeleton')

  return img
}

/**
 * Create image with srcset for responsive loading
 * @param {Object} options
 *   - srcset: Object with size -> URL mapping (e.g., { '400': url1, '800': url2 })
 *   - sizes: CSS media query sizes
 *   - alt: Alt text
 *   - fallback: Fallback image
 * @returns {HTMLImageElement}
 */
export function createResponsiveLazyImage(options = {}) {
  const { srcset = {}, sizes = '(max-width: 400px) 400px, 800px', alt = '', fallback } = options

  const img = createLazyImage({ src: Object.values(srcset)[0] || '', alt, fallback })

  // Set srcset on data attribute
  img.dataset.srcset = Object.entries(srcset)
    .map(([size, url]) => `${url} ${size}w`)
    .join(', ')

  img.dataset.sizes = sizes

  return img
}

/**
 * Cleanup lazy loading for container
 * @param {HTMLElement} container
 */
export function cleanupLazyLoading(container) {
  const observer = observers.get(container)
  if (observer) {
    observer.disconnect()
    observers.delete(container)
  }
}

/**
 * Get lazy loading metrics
 * @returns {Object}
 */
export function getMetrics() {
  return {
    ...metrics,
    uptime: Date.now() - metrics.startTime,
    successRate: metrics.imagesLoaded + metrics.imageFailed > 0
      ? ((metrics.imagesLoaded / (metrics.imagesLoaded + metrics.imageFailed)) * 100).toFixed(1)
      : 0
  }
}

/**
 * Reset metrics
 */
export function resetMetrics() {
  metrics.imagesLoaded = 0
  metrics.imageFailed = 0
  metrics.totalLoadTime = 0
  metrics.averageLoadTime = 0
  metrics.startTime = Date.now()
}

/**
 * Preload image
 * @param {string} src - Image URL
 * @returns {Promise}
 */
export function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })
}

/**
 * Preload multiple images
 * @param {Array<string>} urls - Image URLs
 * @returns {Promise<Array>}
 */
export function preloadImages(urls) {
  return Promise.all(urls.map((url) => preloadImage(url).catch(() => null)))
}
