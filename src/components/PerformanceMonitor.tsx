import { useState, useEffect } from 'react';
import { PerformanceService, PerformanceReport } from '../services/performanceService';
import styles from './PerformanceMonitor.module.css';

/**
 * Performance Monitor Component
 */
export function PerformanceMonitor() {
  const perfService = PerformanceService.getInstance();
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Generate report on mount
    const initialReport = perfService.reportMetrics();
    setReport(initialReport);

    // Update periodically
    const interval = setInterval(() => {
      const updatedReport = perfService.reportMetrics();
      setReport(updatedReport);
    }, 5000);

    return () => clearInterval(interval);
  }, [perfService]);

  if (!report) {
    return null;
  }

  const navigationTiming = report.navigationTiming;

  return (
    <div className={styles.monitor}>
      <button
        className={styles.toggleButton}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-label={isExpanded ? 'Hide' : 'Show'}
        title="Performance Monitor"
      >
        {isExpanded ? '▼' : '▶'} Perf
      </button>

      {isExpanded && (
        <div className={styles.details}>
          {navigationTiming && (
            <>
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Navigation Timing</h3>
                <div className={styles.metrics}>
                  <Metric label="DNS Lookup" value={navigationTiming.dns} />
                  <Metric label="TCP Connection" value={navigationTiming.tcp} />
                  <Metric label="Request Time" value={navigationTiming.request} />
                  <Metric label="Response Time" value={navigationTiming.response} />
                  <Metric label="DOM Interactive" value={navigationTiming.domInteractive} />
                  <Metric label="DOM Complete" value={navigationTiming.domComplete} />
                  <Metric label="Load Complete" value={navigationTiming.loadComplete} />
                </div>
              </div>
            </>
          )}

          {report.customMetrics && Object.keys(report.customMetrics).length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Core Web Vitals</h3>
              <div className={styles.metrics}>
                {Object.entries(report.customMetrics).map(([name, metric]) => (
                  <Metric
                    key={name}
                    label={name.toUpperCase()}
                    value={metric.value}
                    unit={name === 'cls' ? '' : 'ms'}
                  />
                ))}
              </div>
            </div>
          )}

          {report.resourceTiming && report.resourceTiming.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Resources ({report.resourceTiming.length})</h3>
              <div className={styles.resources}>
                {report.resourceTiming.slice(0, 5).map((resource, index) => (
                  <div key={index} className={styles.resourceItem}>
                    <p className={styles.resourceName}>{resource.name.split('/').pop()}</p>
                    <p className={styles.resourceStats}>
                      {resource.duration.toFixed(1)}ms • {(resource.size / 1024).toFixed(1)}KB
                    </p>
                  </div>
                ))}
                {report.resourceTiming.length > 5 && (
                  <p className={styles.resourceMore}>
                    +{report.resourceTiming.length - 5} more resources
                  </p>
                )}
              </div>
            </div>
          )}

          <button className={styles.downloadButton} onClick={() => exportReport(report)}>
            📥 Export Report
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Metric Component
 */
function Metric({ label, value, unit = 'ms' }: { label: string; value: number; unit?: string }) {
  const isGood = getMetricQuality(label, value);

  return (
    <div className={`${styles.metric} ${styles[isGood]}`}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>
        {value.toFixed(1)}{unit}
      </span>
    </div>
  );
}

/**
 * Get metric quality indicator
 */
function getMetricQuality(label: string, value: number): 'good' | 'fair' | 'poor' {
  const thresholds: Record<string, [number, number]> = {
    'DNS LOOKUP': [100, 300],
    'TCP CONNECTION': [100, 300],
    'REQUEST TIME': [200, 500],
    'RESPONSE TIME': [500, 1500],
    'DOM INTERACTIVE': [1500, 3000],
    'DOM COMPLETE': [2000, 4000],
    'LOAD COMPLETE': [2500, 5000],
    'LCP': [2500, 4000],
    'FID': [100, 300],
    'CLS': [0.1, 0.25],
  };

  const [goodThreshold, fairThreshold] = thresholds[label] || [1000, 3000];

  if (value <= goodThreshold) {
    return 'good';
  }
  if (value <= fairThreshold) {
    return 'fair';
  }
  return 'poor';
}

/**
 * Export performance report
 */
function exportReport(report: PerformanceReport): void {
  const data = JSON.stringify(report, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `performance-report-${new Date().toISOString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
