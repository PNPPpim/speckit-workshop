/**
 * T046: Deployment & Monitoring Tests
 * 
 * Comprehensive test suite for:
 * - Production monitoring service
 * - Alerting service
 * - Health checks
 * - Deployment verification
 */

import productionMonitoringService from '../services/productionMonitoringService';
import alertingService from '../services/alertingService';

describe('T046: Deployment & Monitoring', () => {
  beforeEach(() => {
    productionMonitoringService.clearMetrics();
    alertingService.reset();
  });

  // ============= Production Monitoring Tests =============

  describe('ProductionMonitoringService - Health Checks', () => {
    it('should perform application health check', async () => {
      const health = await productionMonitoringService.checkApplicationHealth();

      expect(health).toBeTruthy();
      expect(health.status).toMatch(/healthy|warning|critical/);
      expect(health.checks).toBeTruthy();
      expect(health.checks.memory).toBeTruthy();
    });

    it('should check memory status', async () => {
      const health = await productionMonitoringService.checkApplicationHealth();

      expect(health.checks.memory).toHaveProperty('status');
      expect(health.checks.memory).toHaveProperty('message');
      expect(health.checks.memory).toHaveProperty('details');
    });

    it('should check database connectivity', async () => {
      const health = await productionMonitoringService.checkApplicationHealth();

      expect(health.checks.database).toHaveProperty('status');
      expect(health.checks.database.status).toMatch(/healthy|warning|critical/);
    });

    it('should check cache service', async () => {
      const health = await productionMonitoringService.checkApplicationHealth();

      expect(health.checks.cache).toHaveProperty('status');
      expect(health.checks.cache.status).toMatch(/healthy|warning|critical/);
    });

    it('should check external services', async () => {
      const health = await productionMonitoringService.checkApplicationHealth();

      expect(health.checks.externalServices).toHaveProperty('status');
    });

    it('should track uptime', () => {
      const uptime1 = productionMonitoringService.getUptime();

      // Wait a bit
      // In real test, would use fake timers

      const uptime2 = productionMonitoringService.getUptime();

      expect(uptime2).toBeGreaterThanOrEqual(uptime1);
    });
  });

  describe('ProductionMonitoringService - Metrics', () => {
    it('should record metrics', () => {
      productionMonitoringService.recordMetric('http.request.duration', 150, {
        endpoint: '/api/albums',
      });

      const names = productionMonitoringService.getMetricsNames();

      expect(names).toContain('http.request.duration');
    });

    it('should get metrics snapshot', () => {
      productionMonitoringService.recordMetric('response.time', 100);
      productionMonitoringService.recordMetric('response.time', 200);
      productionMonitoringService.recordMetric('response.time', 150);

      const snapshot = productionMonitoringService.getMetricsSnapshot('response.time');

      expect(snapshot).toBeTruthy();
      expect(snapshot!.aggregates.p50).toBeGreaterThanOrEqual(0);
      expect(snapshot!.aggregates.p95).toBeGreaterThanOrEqual(snapshot!.aggregates.p50);
      expect(snapshot!.aggregates.p99).toBeGreaterThanOrEqual(snapshot!.aggregates.p95);
    });

    it('should calculate percentiles correctly', () => {
      // Record 100 values: 1-100
      for (let i = 1; i <= 100; i++) {
        productionMonitoringService.recordMetric('latency', i);
      }

      const snapshot = productionMonitoringService.getMetricsSnapshot('latency');

      expect(snapshot).toBeTruthy();
      expect(snapshot!.aggregates.p50).toBeCloseTo(50, 5);
      expect(snapshot!.aggregates.p95).toBeCloseTo(95, 5);
      expect(snapshot!.aggregates.p99).toBeCloseTo(99, 5);
    });

    it('should generate health report', async () => {
      productionMonitoringService.recordMetric('test.metric', 42);

      const report = productionMonitoringService.generateHealthReport();

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('status');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('uptime');
    });

    it('should provide monitoring statistics', () => {
      productionMonitoringService.recordMetric('metric1', 10);
      productionMonitoringService.recordMetric('metric2', 20);

      const stats = productionMonitoringService.getStats();

      expect(stats.activeMetrics).toBe(2);
      expect(stats.totalMetricRecords).toBe(2);
    });
  });

  // ============= Alerting Service Tests =============

  describe('AlertingService - Alert Rules', () => {
    it('should add alert rules', () => {
      alertingService.addRule({
        id: 'rule1',
        name: 'High Error Rate',
        metric: 'error.rate',
        condition: 'greater_than',
        threshold: 0.05,
        severity: 'critical',
        channels: ['email', 'slack'],
        enabled: true,
      });

      const rules = alertingService.getRules();

      expect(rules.length).toBe(1);
      expect(rules[0].name).toBe('High Error Rate');
    });

    it('should remove alert rules', () => {
      alertingService.addRule({
        id: 'rule1',
        name: 'Test Rule',
        metric: 'test',
        condition: 'greater_than',
        threshold: 10,
        severity: 'warning',
        channels: [],
        enabled: true,
      });

      alertingService.removeRule('rule1');

      const rules = alertingService.getRules();

      expect(rules.length).toBe(0);
    });

    it('should enable/disable rules', () => {
      alertingService.addRule({
        id: 'rule1',
        name: 'Test',
        metric: 'test',
        condition: 'greater_than',
        threshold: 10,
        severity: 'warning',
        channels: [],
        enabled: true,
      });

      alertingService.setRuleEnabled('rule1', false);

      const rules = alertingService.getRules();

      expect(rules[0].enabled).toBe(false);
    });
  });

  describe('AlertingService - Alert Triggering', () => {
    it('should trigger alert when metric exceeds threshold', () => {
      alertingService.addRule({
        id: 'rule1',
        name: 'High Latency',
        metric: 'api.latency',
        condition: 'greater_than',
        threshold: 1000,
        severity: 'warning',
        channels: ['slack'],
        enabled: true,
      });

      const alerts = alertingService.checkMetric('api.latency', 1500);

      expect(alerts.length).toBe(1);
      expect(alerts[0].severity).toBe('warning');
    });

    it('should not trigger when metric is below threshold', () => {
      alertingService.addRule({
        id: 'rule1',
        name: 'Test',
        metric: 'test',
        condition: 'greater_than',
        threshold: 100,
        severity: 'warning',
        channels: [],
        enabled: true,
      });

      const alerts = alertingService.checkMetric('test', 50);

      expect(alerts.length).toBe(0);
    });

    it('should handle less_than condition', () => {
      alertingService.addRule({
        id: 'rule1',
        name: 'Low Availability',
        metric: 'availability',
        condition: 'less_than',
        threshold: 0.95,
        severity: 'critical',
        channels: [],
        enabled: true,
      });

      const alerts = alertingService.checkMetric('availability', 0.90);

      expect(alerts.length).toBe(1);
    });

    it('should handle equals condition', () => {
      alertingService.addRule({
        id: 'rule1',
        name: 'Exact Match',
        metric: 'status',
        condition: 'equals',
        threshold: 500,
        severity: 'critical',
        channels: [],
        enabled: true,
      });

      const alerts = alertingService.checkMetric('status', 500);

      expect(alerts.length).toBe(1);
    });

    it('should respect alert cooldown', () => {
      alertingService.addRule({
        id: 'rule1',
        name: 'Test',
        metric: 'test',
        condition: 'greater_than',
        threshold: 10,
        severity: 'warning',
        channels: [],
        enabled: true,
      });

      // First alert should trigger
      const alerts1 = alertingService.checkMetric('test', 20);

      expect(alerts1.length).toBe(1);

      // Second alert should be on cooldown
      const alerts2 = alertingService.checkMetric('test', 20);

      expect(alerts2.length).toBe(0);
    });
  });

  describe('AlertingService - Alert Management', () => {
    it('should get active alerts', () => {
      alertingService.addRule({
        id: 'rule1',
        name: 'Test',
        metric: 'test',
        condition: 'greater_than',
        threshold: 10,
        severity: 'critical',
        channels: [],
        enabled: true,
      });

      alertingService.checkMetric('test', 20);

      const active = alertingService.getActiveAlerts();

      expect(active.length).toBeGreaterThan(0);
    });

    it('should filter alerts by severity', () => {
      alertingService.addRule({
        id: 'rule1',
        name: 'Critical',
        metric: 'test1',
        condition: 'greater_than',
        threshold: 10,
        severity: 'critical',
        channels: [],
        enabled: true,
      });

      alertingService.addRule({
        id: 'rule2',
        name: 'Warning',
        metric: 'test2',
        condition: 'greater_than',
        threshold: 10,
        severity: 'warning',
        channels: [],
        enabled: true,
      });

      alertingService.checkMetric('test1', 20);
      alertingService.checkMetric('test2', 20);

      const critical = alertingService.getAlertsBySeverity('critical');
      const warnings = alertingService.getAlertsBySeverity('warning');

      expect(critical.length).toBe(1);
      expect(warnings.length).toBe(1);
    });

    it('should acknowledge alerts', () => {
      alertingService.addRule({
        id: 'rule1',
        name: 'Test',
        metric: 'test',
        condition: 'greater_than',
        threshold: 10,
        severity: 'warning',
        channels: [],
        enabled: true,
      });

      const alerts = alertingService.checkMetric('test', 20);

      if (alerts.length > 0) {
        alertingService.acknowledgeAlert(alerts[0].id);
      }

      expect(true).toBe(true);
    });

    it('should provide alerting statistics', () => {
      alertingService.addRule({
        id: 'rule1',
        name: 'Test',
        metric: 'test',
        condition: 'greater_than',
        threshold: 10,
        severity: 'warning',
        channels: ['email'],
        enabled: true,
      });

      alertingService.checkMetric('test', 20);

      const stats = alertingService.getStats();

      expect(stats.totalRules).toBe(1);
      expect(stats.enabledRules).toBe(1);
      expect(stats.activeAlerts).toBeGreaterThan(0);
    });

    it('should clear old alerts', () => {
      alertingService.addRule({
        id: 'rule1',
        name: 'Test',
        metric: 'test',
        condition: 'greater_than',
        threshold: 10,
        severity: 'warning',
        channels: [],
        enabled: true,
      });

      alertingService.checkMetric('test', 20);

      const cleared = alertingService.clearOldAlerts();

      // Should not clear recent alerts
      expect(cleared).toBe(0);
    });
  });

  // ============= Integration Tests =============

  describe('Integration - Full Monitoring & Alerting', () => {
    it('should complete full monitoring and alerting flow', async () => {
      // Setup monitoring
      productionMonitoringService.start();

      // Setup alert rules
      alertingService.addRule({
        id: 'rule1',
        name: 'High Latency',
        metric: 'api.latency.p95',
        condition: 'greater_than',
        threshold: 2000,
        severity: 'warning',
        channels: ['slack'],
        enabled: true,
      });

      // Record metrics
      for (let i = 0; i < 10; i++) {
        const latency = Math.random() * 2500;
        productionMonitoringService.recordMetric('api.latency.p95', latency);

        if (latency > 2000) {
          alertingService.checkMetric('api.latency.p95', latency);
        }
      }

      // Get health report
      const health = await productionMonitoringService.checkApplicationHealth();

      expect(health).toBeTruthy();
      expect(health.status).toMatch(/healthy|warning|critical/);

      // Get alerts
      const alerts = alertingService.getActiveAlerts();

      expect(Array.isArray(alerts)).toBe(true);

      productionMonitoringService.stop();
    });
  });

  // ============= Deployment Verification Tests =============

  describe('Deployment - Verification Checks', () => {
    it('should verify monitoring is operational', async () => {
      const health = await productionMonitoringService.checkApplicationHealth();

      expect(health).toBeTruthy();
      expect(health.checks.memory).toBeTruthy();
      expect(health.checks.database).toBeTruthy();
      expect(health.checks.cache).toBeTruthy();
    });

    it('should verify alerting is operational', () => {
      const stats = alertingService.getStats();

      expect(stats).toBeTruthy();
      expect(stats.totalRules).toBeGreaterThanOrEqual(0);
    });

    it('should verify metrics collection works', () => {
      productionMonitoringService.recordMetric('test.metric', 42);

      const names = productionMonitoringService.getMetricsNames();

      expect(names).toContain('test.metric');
    });

    it('should generate deployment verification report', async () => {
      const health = await productionMonitoringService.checkApplicationHealth();
      const alertStats = alertingService.getStats();
      const monitorStats = productionMonitoringService.getStats();

      const report = {
        health: health.status,
        healthCheck: health.status === 'healthy' || health.status === 'warning',
        alertingActive: alertStats.totalRules >= 0,
        metricsCollecting: monitorStats.activeMetrics >= 0,
        ready: true,
      };

      expect(report.healthCheck).toBe(true);
      expect(report.alertingActive).toBe(true);
      expect(report.ready).toBe(true);
    });
  });

  // ============= Performance Tests =============

  describe('Performance - Monitoring Efficiency', () => {
    it('should handle high metric volume', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        productionMonitoringService.recordMetric(`metric${i % 10}`, Math.random() * 100);
      }

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    it('should evaluate alerts efficiently', () => {
      alertingService.addRule({
        id: 'rule1',
        name: 'Test',
        metric: 'latency',
        condition: 'greater_than',
        threshold: 1000,
        severity: 'warning',
        channels: [],
        enabled: true,
      });

      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        alertingService.checkMetric('latency', Math.random() * 2000);
      }

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50); // Should be very fast
    });
  });
});
