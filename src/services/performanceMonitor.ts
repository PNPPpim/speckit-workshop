/**
 * T035: Performance Profiling - Frontend Performance Monitoring
 * Measures and tracks performance metrics for critical user paths
 */

interface Measurement {
  [key: string]: number[]
}

interface MarkMap {
  [key: string]: number
}

// Performance metrics collector
export class PerformanceMetrics {
  private metrics: Map<string, number> = new Map()
  private marks: MarkMap = {}
  private measurements: Measurement = {}

  /**
   * Start measuring a performance metric
   */
  start(label: string): void {
    this.marks[label] = performance.now()
    if (typeof performance.mark === 'function') {
      performance.mark(`${label}-start`)
    }
  }

  /**
   * End measuring a performance metric
   */
  end(label: string): number {
    const startTime = this.marks[label]
    if (!startTime) {
      console.warn(`Performance measurement "${label}" was never started`)
      return 0
    }

    const endTime = performance.now()
    const duration = endTime - startTime

    if (typeof performance.mark === 'function') {
      performance.mark(`${label}-end`)
      try {
        performance.measure(label, `${label}-start`, `${label}-end`)
      } catch (e) {
        // Measurement failed, but we still have the duration
      }
    }

    // Store measurement
    if (!this.measurements[label]) {
      this.measurements[label] = []
    }
    this.measurements[label].push(duration)

    delete this.marks[label]
    return duration
  }

  /**
   * Get all measurements for a label
   */
  getMeasurements(label: string): number[] {
    return this.measurements[label] || []
  }

  /**
   * Get statistics for a label
   */
  getStats(label: string) {
    const measurements = this.getMeasurements(label)
    if (measurements.length === 0) {
      return null
    }

    const sorted = [...measurements].sort((a, b) => a - b)
    const sum = sorted.reduce((a, b) => a + b, 0)
    const avg = sum / sorted.length
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]

    return {
      label,
      count: measurements.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: Math.round(avg * 100) / 100,
      median: Math.round(median * 100) / 100,
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    }
  }

  /**
   * Get all statistics
   */
  getAllStats() {
    const allLabels = Object.keys(this.measurements)
    return allLabels.map(label => this.getStats(label)).filter(Boolean)
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.marks = {}
    this.measurements = {}
  }

  /**
   * Export metrics as JSON
   */
  export() {
    const stats = this.getAllStats()
    return {
      timestamp: new Date().toISOString(),
      metrics: stats,
      summary: {
        totalMeasurements: Object.values(this.measurements).reduce((a, b) => a + b.length, 0),
        uniqueLabels: Object.keys(this.measurements).length
      }
    }
  }
}

// Global performance metrics instance
export const metrics = new PerformanceMetrics()

/**
 * React component render tracking
 */
export class ComponentPerformanceTracker {
  private renders: Map<string, any> = new Map()
  private interactions: Map<string, number[]> = new Map()

  /**
   * Track component render
   */
  trackRender(componentName: string, renderTime: number, phase: 'mount' | 'update' = 'update'): void {
    if (!this.renders.has(componentName)) {
      this.renders.set(componentName, {
        mounts: [],
        updates: [],
        totalTime: 0,
        renderCount: 0
      })
    }

    const data = this.renders.get(componentName)
    const phaseName = phase === 'mount' ? 'mounts' : 'updates'
    data[phaseName].push(renderTime)
    data.totalTime += renderTime
    data.renderCount++
  }

  /**
   * Get render stats for a component
   */
  getRenderStats(componentName: string) {
    const data = this.renders.get(componentName)
    if (!data) return null

    const allRenders = [...data.mounts, ...data.updates]
    const avg = allRenders.length > 0
      ? Math.round((data.totalTime / allRenders.length) * 100) / 100
      : 0

    return {
      componentName,
      mountCount: data.mounts.length,
      updateCount: data.updates.length,
      averageRenderTime: avg,
      totalRenderTime: Math.round(data.totalTime * 100) / 100,
      slowestRender: Math.max(...allRenders, 0),
      fastestRender: Math.min(...allRenders, 0)
    }
  }

  /**
   * Get all component render stats
   */
  getAllRenderStats() {
    const stats: any[] = []
    this.renders.forEach((_, name) => {
      const stat = this.getRenderStats(name)
      if (stat) stats.push(stat)
    })
    return stats
  }

  /**
   * Track user interaction
   */
  trackInteraction(interactionType: string, responseTime: number): void {
    if (!this.interactions.has(interactionType)) {
      this.interactions.set(interactionType, [])
    }
    this.interactions.get(interactionType)?.push(responseTime)
  }

  /**
   * Get interaction stats
   */
  getInteractionStats(interactionType: string) {
    const times = this.interactions.get(interactionType) || []
    if (times.length === 0) return null

    const sorted = [...times].sort((a, b) => a - b)
    const sum = sorted.reduce((a, b) => a + b, 0)
    const avg = sum / times.length

    return {
      interactionType,
      count: times.length,
      averageTime: Math.round(avg * 100) / 100,
      minTime: sorted[0],
      maxTime: sorted[sorted.length - 1],
      p95Time: sorted[Math.floor(times.length * 0.95)]
    }
  }

  /**
   * Clear all tracking data
   */
  clear(): void {
    this.renders.clear()
    this.interactions.clear()
  }

  /**
   * Export tracking data
   */
  export() {
    const interactions: any[] = []
    this.interactions.forEach((_, type) => {
      const stat = this.getInteractionStats(type)
      if (stat) interactions.push(stat)
    })

    return {
      components: this.getAllRenderStats(),
      interactions
    }
  }
}

export const componentTracker = new ComponentPerformanceTracker()

/**
 * Core Web Vitals monitoring
 */
export class CoreWebVitalsMonitor {
  private vitals: any = {
    LCP: null,
    FID: null,
    CLS: null,
    TTFB: null,
    FCP: null,
    LCP_entries: [],
    FID_entries: [],
    CLS_entries: []
  }
  private listeners: Set<Function> = new Set()

  /**
   * Start monitoring Core Web Vitals
   */
  startMonitoring(): void {
    this.monitorLCP()
    this.monitorFID()
    this.monitorCLS()
    this.monitorTTFB()
    this.monitorFCP()
  }

  /**
   * Monitor Largest Contentful Paint
   */
  private monitorLCP(): void {
    if (!('PerformanceObserver' in window)) return

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as any
        this.vitals.LCP = lastEntry.renderTime || lastEntry.loadTime
        this.vitals.LCP_entries.push(lastEntry)
        this.notifyListeners('LCP', this.vitals.LCP)
      })
      observer.observe({ entryTypes: ['largest-contentful-paint'] })
    } catch (e) {
      console.debug('LCP monitoring not available')
    }
  }

  /**
   * Monitor First Input Delay
   */
  private monitorFID(): void {
    if (!('PerformanceObserver' in window)) return

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          const fid = entry.processingDuration
          if (!this.vitals.FID || fid > this.vitals.FID) {
            this.vitals.FID = fid
          }
          this.vitals.FID_entries.push(entry)
          this.notifyListeners('FID', fid)
        })
      })
      observer.observe({ entryTypes: ['first-input'] })
    } catch (e) {
      console.debug('FID monitoring not available')
    }
  }

  /**
   * Monitor Cumulative Layout Shift
   */
  private monitorCLS(): void {
    if (!('PerformanceObserver' in window)) return

    try {
      let clsValue = 0
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutEntry = entry as any
          if (!layoutEntry.hadRecentInput) {
            clsValue += layoutEntry.value
            this.vitals.CLS_entries.push(entry)
          }
        }
        this.vitals.CLS = clsValue
        this.notifyListeners('CLS', clsValue)
      })
      observer.observe({ entryTypes: ['layout-shift'] })
    } catch (e) {
      console.debug('CLS monitoring not available')
    }
  }

  /**
   * Monitor Time to First Byte
   */
  private monitorTTFB(): void {
    if ((performance as any).timing) {
      const timing = (performance as any).timing
      const ttfb = timing.responseStart - timing.navigationStart
      this.vitals.TTFB = ttfb
    }
  }

  /**
   * Monitor First Contentful Paint
   */
  private monitorFCP(): void {
    if (performance.getEntriesByName) {
      const fcpEntries = performance.getEntriesByName('first-contentful-paint')
      if (fcpEntries.length > 0) {
        this.vitals.FCP = fcpEntries[0].startTime
      }
    }
  }

  /**
   * Subscribe to vital updates
   */
  subscribe(callback: Function): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  /**
   * Notify all subscribers of vital change
   */
  private notifyListeners(vitalType: string, value: number): void {
    this.listeners.forEach(callback => {
      callback({ type: vitalType, value })
    })
  }

  /**
   * Get current vitals
   */
  getVitals() {
    return {
      LCP: this.vitals.LCP ? Math.round(this.vitals.LCP) : null,
      FID: this.vitals.FID ? Math.round(this.vitals.FID) : null,
      CLS: this.vitals.CLS ? Math.round(this.vitals.CLS * 10000) / 10000 : null,
      TTFB: this.vitals.TTFB ? Math.round(this.vitals.TTFB) : null,
      FCP: this.vitals.FCP ? Math.round(this.vitals.FCP) : null
    }
  }

  /**
   * Get vitals status
   */
  getStatus() {
    const vitals = this.getVitals()
    return {
      LCP: {
        value: vitals.LCP,
        status: vitals.LCP && vitals.LCP <= 2500 ? 'good' : vitals.LCP && vitals.LCP <= 4000 ? 'needs-improvement' : 'poor'
      },
      FID: {
        value: vitals.FID,
        status: vitals.FID && vitals.FID <= 100 ? 'good' : vitals.FID && vitals.FID <= 300 ? 'needs-improvement' : 'poor'
      },
      CLS: {
        value: vitals.CLS,
        status: vitals.CLS && vitals.CLS <= 0.1 ? 'good' : vitals.CLS && vitals.CLS <= 0.25 ? 'needs-improvement' : 'poor'
      }
    }
  }

  /**
   * Export vitals data
   */
  export() {
    return {
      timestamp: new Date().toISOString(),
      vitals: this.getVitals(),
      status: this.getStatus()
    }
  }
}

export const webVitals = new CoreWebVitalsMonitor()

/**
 * Performance Report Generator
 */
export class PerformanceReporter {
  /**
   * Generate comprehensive performance report
   */
  static generateReport() {
    return {
      timestamp: new Date().toISOString(),
      metrics: metrics.export(),
      components: componentTracker.export(),
      webVitals: webVitals.export(),
      summary: {
        metricsCount: metrics.getAllStats().length,
        coreWebVitalsStatus: webVitals.getStatus()
      }
    }
  }

  /**
   * Generate performance summary for console
   */
  static logSummary(): void {
    console.group('%cPerformance Report', 'font-weight: bold; font-size: 14px;')

    // Metrics
    console.group('Timing Metrics')
    metrics.getAllStats().forEach((stat: any) => {
      console.log(`${stat.label}: avg=${stat.avg}ms, min=${stat.min}ms, max=${stat.max}ms, p95=${stat.p95}ms`)
    })
    console.groupEnd()

    // Web Vitals
    console.group('Core Web Vitals')
    const vitals = webVitals.getStatus()
    Object.entries(vitals).forEach(([key, data]: [string, any]) => {
      console.log(`${key}: ${data.value}ms (${data.status})`)
    })
    console.groupEnd()

    console.groupEnd()
  }
}

export default {
  metrics,
  componentTracker,
  webVitals,
  PerformanceReporter
}
