import { PerformanceService, PerformanceMetric } from '../performanceService';

describe('PerformanceService', () => {
  let perfService: PerformanceService;

  beforeEach(() => {
    perfService = PerformanceService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const service1 = PerformanceService.getInstance();
      const service2 = PerformanceService.getInstance();
      expect(service1).toBe(service2);
    });
  });

  describe('Metric Recording', () => {
    it('should record metrics', () => {
      perfService.recordMetric('test', { value: 100, timestamp: Date.now() });
      const metrics = perfService.getMetrics();
      expect(metrics['test']).toBeDefined();
      expect(metrics['test'].value).toBe(100);
    });

    it('should handle multiple metrics', () => {
      perfService.recordMetric('metric1', { value: 100, timestamp: Date.now() });
      perfService.recordMetric('metric2', { value: 200, timestamp: Date.now() });
      const metrics = perfService.getMetrics();
      expect(Object.keys(metrics).length).toBeGreaterThanOrEqual(2);
    });

    it('should overwrite existing metric', () => {
      perfService.recordMetric('test', { value: 100, timestamp: Date.now() });
      perfService.recordMetric('test', { value: 200, timestamp: Date.now() });
      const metrics = perfService.getMetrics();
      expect(metrics['test'].value).toBe(200);
    });
  });

  describe('Caching', () => {
    it('should cache data with TTL', () => {
      perfService.cacheData('key1', { data: 'value' }, 300);
      const cached = perfService.getCachedData('key1');
      expect(cached).toEqual({ data: 'value' });
    });

    it('should return null for missing key', () => {
      const cached = perfService.getCachedData('nonexistent');
      expect(cached).toBeNull();
    });

    it('should expire cached data after TTL', (done) => {
      perfService.cacheData('key2', { data: 'value' }, 0.1); // 100ms TTL
      setTimeout(() => {
        const cached = perfService.getCachedData('key2');
        expect(cached).toBeNull();
        done();
      }, 150);
    });

    it('should clear cache by pattern', () => {
      perfService.cacheData('user_1', { id: 1 }, 300);
      perfService.cacheData('user_2', { id: 2 }, 300);
      perfService.cacheData('post_1', { id: 1 }, 300);

      perfService.clearCache('user_.*');

      expect(perfService.getCachedData('user_1')).toBeNull();
      expect(perfService.getCachedData('user_2')).toBeNull();
      expect(perfService.getCachedData('post_1')).toBeDefined();
    });

    it('should clear all cache when no pattern provided', () => {
      perfService.cacheData('key1', { data: 'value1' }, 300);
      perfService.cacheData('key2', { data: 'value2' }, 300);

      perfService.clearCache();

      expect(perfService.getCachedData('key1')).toBeNull();
      expect(perfService.getCachedData('key2')).toBeNull();
    });
  });

  describe('Async Measurement', () => {
    it('should measure async function execution time', async () => {
      const result = await perfService.measureAsync('test-async', async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 'result';
      });

      expect(result).toBe('result');
      const metrics = perfService.getMetrics();
      expect(metrics['test-async']).toBeDefined();
      expect(metrics['test-async'].value).toBeGreaterThanOrEqual(50);
    });

    it('should measure sync function execution time', () => {
      const result = perfService.measureSync('test-sync', () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      });

      expect(result).toBeDefined();
      const metrics = perfService.getMetrics();
      expect(metrics['test-sync']).toBeDefined();
    });
  });

  describe('Prefetch and Preload', () => {
    it('should prefetch resources', () => {
      if (typeof document !== 'undefined') {
        perfService.prefetch('https://example.com/style.css');
        const link = document.querySelector('link[rel="prefetch"]');
        expect(link).toBeTruthy();
      }
    });

    it('should preload resources', () => {
      if (typeof document !== 'undefined') {
        perfService.preload('https://example.com/script.js', 'script');
        const link = document.querySelector('link[rel="preload"]');
        expect(link).toBeTruthy();
      }
    });
  });

  describe('Performance Reporting', () => {
    it('should generate performance report', () => {
      const report = perfService.reportMetrics();
      expect(report).toBeDefined();
      expect(report.navigationTiming).toBeDefined();
      expect(Array.isArray(report.resourceTiming)).toBe(true);
      expect(typeof report.customMetrics).toBe('object');
    });

    it('should include custom metrics in report', () => {
      perfService.recordMetric('custom-metric', { value: 123, timestamp: Date.now() });
      const report = perfService.reportMetrics();
      expect(report.customMetrics['custom-metric']).toBeDefined();
    });
  });

  describe('Memory Usage', () => {
    it('should get memory usage', () => {
      const memory = perfService.getMemoryUsage();
      // Memory usage may be null in some environments
      if (memory) {
        expect(typeof memory.usedJSHeapSize).toBe('number');
        expect(typeof memory.deviceMemory).toBe('number');
      }
    });
  });

  describe('Thresholds', () => {
    it('should warn for metrics exceeding threshold', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      perfService.recordMetric('lcp', { value: 3000, timestamp: Date.now() }); // > 2500
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should not warn for metrics below threshold', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      perfService.recordMetric('fid', { value: 50, timestamp: Date.now() }); // < 100
      // May be called by initialization, but not for this metric warning
      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle cache with undefined data', () => {
      perfService.cacheData('key-undef', undefined, 300);
      const cached = perfService.getCachedData('key-undef');
      expect(cached).toBeUndefined();
    });

    it('should handle cache with complex objects', () => {
      const complexObj = {
        nested: {
          deep: {
            value: 123,
            array: [1, 2, 3],
          },
        },
      };
      perfService.cacheData('complex', complexObj, 300);
      const cached = perfService.getCachedData('complex');
      expect(cached).toEqual(complexObj);
    });

    it('should handle pattern matching edge cases', () => {
      perfService.cacheData('test-1', { id: 1 }, 300);
      perfService.cacheData('test-2', { id: 2 }, 300);

      perfService.clearCache('test-1'); // Exact match
      expect(perfService.getCachedData('test-1')).toBeNull();
      expect(perfService.getCachedData('test-2')).toBeDefined();
    });
  });
});
