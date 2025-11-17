/**
 * Performance Service
 * Handles optimization, caching, and performance monitoring
 */
export class PerformanceService {
  private static instance: PerformanceService;
  private metrics: Map<string, PerformanceMetric> = new Map();
  private cacheStore: Map<string, CacheEntry> = new Map();
  private preloadEnabled = true;

  private constructor() {
    this.initializePerformanceMonitoring();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PerformanceService {
    if (!PerformanceService.instance) {
      PerformanceService.instance = new PerformanceService();
    }
    return PerformanceService.instance;
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    if (typeof window !== 'undefined' && window.performance) {
      // Monitor Core Web Vitals
      this.monitorLCP(); // Largest Contentful Paint
      this.monitorFID(); // First Input Delay
      this.monitorCLS(); // Cumulative Layout Shift
    }
  }

  /**
   * Monitor Largest Contentful Paint
   */
  private monitorLCP(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          this.recordMetric('lcp', {
            value: lastEntry.renderTime || lastEntry.loadTime || 0,
            timestamp: Date.now(),
          });
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('LCP monitoring not supported');
      }
    }
  }

  /**
   * Monitor First Input Delay
   */
  private monitorFID(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.recordMetric('fid', {
              value: entry.processingDuration || 0,
              timestamp: Date.now(),
            });
          });
        });
        observer.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        console.warn('FID monitoring not supported');
      }
    }
  }

  /**
   * Monitor Cumulative Layout Shift
   */
  private monitorCLS(): void {
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              this.recordMetric('cls', {
                value: clsValue,
                timestamp: Date.now(),
              });
            }
          });
        });
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('CLS monitoring not supported');
      }
    }
  }

  /**
   * Record performance metric
   */
  recordMetric(name: string, data: PerformanceMetric): void {
    this.metrics.set(name, data);

    if (data.value > this.getThreshold(name)) {
      console.warn(`Performance warning: ${name} = ${data.value}ms`);
    }
  }

  /**
   * Get performance threshold by metric name
   */
  private getThreshold(name: string): number {
    const thresholds: Record<string, number> = {
      lcp: 2500, // 2.5 seconds
      fid: 100, // 100 milliseconds
      cls: 0.1, // 0.1
      ttfb: 600, // 600 milliseconds
      fcp: 1800, // 1.8 seconds
    };
    return thresholds[name] || 1000;
  }

  /**
   * Get all metrics
   */
  getMetrics(): Record<string, PerformanceMetric> {
    const result: Record<string, PerformanceMetric> = {};
    this.metrics.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Cache data with TTL
   */
  cacheData<T>(key: string, data: T, ttlSeconds: number = 300): void {
    this.cacheStore.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Get cached data
   */
  getCachedData<T>(key: string): T | null {
    const entry = this.cacheStore.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.cacheStore.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Clear cache
   */
  clearCache(pattern?: string): void {
    if (!pattern) {
      this.cacheStore.clear();
      return;
    }

    const regex = new RegExp(pattern);
    this.cacheStore.forEach((_, key) => {
      if (regex.test(key)) {
        this.cacheStore.delete(key);
      }
    });
  }

  /**
   * Measure function execution time
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;
      this.recordMetric(name, { value: duration, timestamp: Date.now() });
    }
  }

  /**
   * Measure synchronous function execution time
   */
  measureSync<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - start;
      this.recordMetric(name, { value: duration, timestamp: Date.now() });
    }
  }

  /**
   * Prefetch resource
   */
  prefetch(url: string): void {
    if (!this.preloadEnabled || typeof document === 'undefined') {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  }

  /**
   * Preload critical resource
   */
  preload(url: string, type: 'script' | 'style' | 'image'): void {
    if (!this.preloadEnabled || typeof document === 'undefined') {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = type;
    document.head.appendChild(link);
  }

  /**
   * Report performance data
   */
  reportMetrics(): PerformanceReport {
    if (typeof window === 'undefined' || !window.performance) {
      return {
        navigationTiming: null,
        resourceTiming: [],
        customMetrics: {},
      };
    }

    return {
      navigationTiming: this.getNavigationTiming(),
      resourceTiming: this.getResourceTiming(),
      customMetrics: this.getMetrics(),
    };
  }

  /**
   * Get navigation timing
   */
  private getNavigationTiming(): NavigationTiming | null {
    const timing = window.performance.timing;
    if (!timing || timing.navigationStart === 0) {
      return null;
    }

    return {
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      tcp: timing.connectEnd - timing.connectStart,
      request: timing.responseStart - timing.requestStart,
      response: timing.responseEnd - timing.responseStart,
      domInteractive: timing.domInteractive - timing.navigationStart,
      domComplete: timing.domComplete - timing.navigationStart,
      loadComplete: timing.loadEventEnd - timing.navigationStart,
    };
  }

  /**
   * Get resource timing
   */
  private getResourceTiming(): ResourceTiming[] {
    const resources = window.performance.getEntriesByType?.('resource') || [];
    return resources.map((resource: any) => ({
      name: resource.name,
      duration: resource.duration,
      size: resource.transferSize || 0,
    }));
  }

  /**
   * Get memory usage (if available)
   */
  getMemoryUsage(): MemoryUsage | null {
    const navWithDeviceMemory = navigator as any;
    const perfWithMemory = performance as any;

    if (!navWithDeviceMemory.deviceMemory && !perfWithMemory.memory) {
      return null;
    }

    return {
      usedJSHeapSize: perfWithMemory.memory?.usedJSHeapSize || 0,
      totalJSHeapSize: perfWithMemory.memory?.totalJSHeapSize || 0,
      jsHeapSizeLimit: perfWithMemory.memory?.jsHeapSizeLimit || 0,
      deviceMemory: navWithDeviceMemory.deviceMemory || 0,
    };
  }
}

/**
 * Performance Metric
 */
export interface PerformanceMetric {
  value: number;
  timestamp: number;
}

/**
 * Cache Entry
 */
interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

/**
 * Navigation Timing
 */
export interface NavigationTiming {
  dns: number;
  tcp: number;
  request: number;
  response: number;
  domInteractive: number;
  domComplete: number;
  loadComplete: number;
}

/**
 * Resource Timing
 */
export interface ResourceTiming {
  name: string;
  duration: number;
  size: number;
}

/**
 * Memory Usage
 */
export interface MemoryUsage {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  deviceMemory: number;
}

/**
 * Performance Report
 */
export interface PerformanceReport {
  navigationTiming: NavigationTiming | null;
  resourceTiming: ResourceTiming[];
  customMetrics: Record<string, PerformanceMetric>;
}

/**
 * React Hook for Performance Monitoring
 */
export function usePerformance() {
  const perfService = PerformanceService.getInstance();
  const [metrics, setMetrics] = React.useState<Record<string, PerformanceMetric>>({});
  const [report, setReport] = React.useState<PerformanceReport | null>(null);

  React.useEffect(() => {
    // Update metrics periodically
    const interval = setInterval(() => {
      setMetrics(perfService.getMetrics());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const generateReport = React.useCallback(() => {
    const perfReport = perfService.reportMetrics();
    setReport(perfReport);
    return perfReport;
  }, [perfService]);

  const recordMetric = React.useCallback(
    (name: string, value: number) => {
      perfService.recordMetric(name, { value, timestamp: Date.now() });
    },
    [perfService]
  );

  return {
    metrics,
    report,
    generateReport,
    recordMetric,
    perfService,
  };
}

import React from 'react';
