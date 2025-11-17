/**
 * Alerting Service - Multi-channel Alert Notifications
 * 
 * Manages alert rules and multi-channel notifications:
 * - Alert rule evaluation
 * - Multi-channel delivery (Email, Slack, PagerDuty)
 * - Severity levels (critical, warning, info)
 * - Alert triggering and escalation
 */

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals';
  threshold: number;
  severity: 'critical' | 'warning' | 'info';
  channels: Array<'email' | 'slack' | 'pagerduty' | 'sms'>;
  enabled: boolean;
}

interface Alert {
  id: string;
  ruleId: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'critical' | 'warning' | 'info';
  timestamp: number;
  message: string;
  sent: boolean;
}

interface NotificationResult {
  channel: 'email' | 'slack' | 'pagerduty' | 'sms';
  sent: boolean;
  timestamp: number;
  error?: string;
}

class AlertingService {
  private rules: Map<string, AlertRule> = new Map();
  private alerts: Alert[] = [];
  private notificationHistory: NotificationResult[] = [];
  private lastAlertTime: Map<string, number> = new Map();
  private alertCooldown: number = 300000; // 5 minutes

  /**
   * Add alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove alert rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Get all rules
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Enable/disable rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Evaluate metric against rules and trigger alerts
   */
  checkMetric(metricName: string, value: number): Alert[] {
    const triggeredAlerts: Alert[] = [];

    this.rules.forEach((rule) => {
      if (!rule.enabled || rule.metric !== metricName) {
        return;
      }

      let conditionMet = false;

      switch (rule.condition) {
        case 'greater_than':
          conditionMet = value > rule.threshold;
          break;
        case 'less_than':
          conditionMet = value < rule.threshold;
          break;
        case 'equals':
          conditionMet = value === rule.threshold;
          break;
      }

      if (conditionMet) {
        // Check cooldown
        const lastTime = this.lastAlertTime.get(rule.id) || 0;
        if (Date.now() - lastTime < this.alertCooldown) {
          return; // Alert on cooldown
        }

        const alert: Alert = {
          id: `alert_${Date.now()}_${Math.random()}`,
          ruleId: rule.id,
          metric: metricName,
          value,
          threshold: rule.threshold,
          severity: rule.severity,
          timestamp: Date.now(),
          message: `${rule.name}: ${metricName} is ${value} (threshold: ${rule.threshold})`,
          sent: false,
        };

        this.alerts.push(alert);
        this.lastAlertTime.set(rule.id, Date.now());

        // Send notifications
        this.sendAlert(alert, rule);

        triggeredAlerts.push(alert);
      }
    });

    return triggeredAlerts;
  }

  /**
   * Send alert through configured channels
   */
  private sendAlert(alert: Alert, rule: AlertRule): void {
    rule.channels.forEach((channel) => {
      this.sendNotification(channel, alert);
    });

    alert.sent = true;
  }

  /**
   * Send notification through specific channel
   */
  private sendNotification(channel: 'email' | 'slack' | 'pagerduty' | 'sms', alert: Alert): void {
    const result: NotificationResult = {
      channel,
      sent: false,
      timestamp: Date.now(),
    };

    try {
      switch (channel) {
        case 'email':
          this.sendEmail(alert);
          result.sent = true;
          break;
        case 'slack':
          this.sendSlack(alert);
          result.sent = true;
          break;
        case 'pagerduty':
          this.sendPagerDuty(alert);
          result.sent = true;
          break;
        case 'sms':
          this.sendSMS(alert);
          result.sent = true;
          break;
      }
    } catch (error) {
      result.error = String(error);
      console.error(`[AlertingService] Failed to send ${channel} notification:`, error);
    }

    this.notificationHistory.push(result);
  }

  /**
   * Send email notification
   */
  private sendEmail(alert: Alert): void {
    // In production, use email service (e.g., SendGrid, SES)
    console.log(`[AlertingService] Sending email: ${alert.message}`);

    // Simulated email sending
    const emailConfig = {
      to: 'alerts@example.com',
      subject: `Alert [${alert.severity.toUpperCase()}]: ${alert.metric}`,
      body: `Alert triggered:\n${alert.message}\nTime: ${new Date(alert.timestamp).toISOString()}`,
    };

    console.log('[AlertingService] Email config:', emailConfig);
  }

  /**
   * Send Slack notification
   */
  private sendSlack(alert: Alert): void {
    // In production, use Slack Webhook
    console.log(`[AlertingService] Sending Slack: ${alert.message}`);

    const color =
      alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'good';

    const slackMessage = {
      attachments: [
        {
          color,
          title: `Alert [${alert.severity.toUpperCase()}]`,
          text: alert.message,
          fields: [
            { title: 'Metric', value: alert.metric, short: true },
            { title: 'Value', value: alert.value.toString(), short: true },
            { title: 'Threshold', value: alert.threshold.toString(), short: true },
            {
              title: 'Time',
              value: new Date(alert.timestamp).toISOString(),
              short: true,
            },
          ],
        },
      ],
    };

    console.log('[AlertingService] Slack message:', slackMessage);
  }

  /**
   * Send PagerDuty notification
   */
  private sendPagerDuty(alert: Alert): void {
    // In production, use PagerDuty API
    console.log(`[AlertingService] Sending PagerDuty: ${alert.message}`);

    const severity = alert.severity === 'critical' ? 'critical' : 'warning';

    const pagerDutyEvent = {
      routing_key: process.env.PAGERDUTY_ROUTING_KEY,
      event_action: 'trigger',
      dedup_key: `${alert.ruleId}_${alert.metric}`,
      payload: {
        summary: alert.message,
        severity,
        source: 'Photo Album App',
        timestamp: new Date(alert.timestamp).toISOString(),
        custom_details: {
          metric: alert.metric,
          value: alert.value,
          threshold: alert.threshold,
        },
      },
    };

    console.log('[AlertingService] PagerDuty event:', pagerDutyEvent);
  }

  /**
   * Send SMS notification (for critical alerts)
   */
  private sendSMS(alert: Alert): void {
    if (alert.severity !== 'critical') {
      return; // Only SMS for critical
    }

    // In production, use Twilio or similar
    console.log(`[AlertingService] Sending SMS: ${alert.message}`);

    const smsMessage = {
      to: process.env.ALERT_PHONE_NUMBER,
      message: `CRITICAL ALERT: ${alert.metric} = ${alert.value} (threshold: ${alert.threshold})`,
    };

    console.log('[AlertingService] SMS message:', smsMessage);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    return this.alerts
      .filter((a) => now - a.timestamp < oneDayMs)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: 'critical' | 'warning' | 'info'): Alert[] {
    return this.getActiveAlerts().filter((a) => a.severity === severity);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      // Mark as acknowledged (in production, update alert status)
      console.log(`[AlertingService] Alert acknowledged: ${alertId}`);
    }
  }

  /**
   * Get notification history
   */
  getNotificationHistory(limit: number = 100): NotificationResult[] {
    return this.notificationHistory.slice(-limit);
  }

  /**
   * Get alerting statistics
   */
  getStats(): {
    totalRules: number;
    enabledRules: number;
    activeAlerts: number;
    criticalAlerts: number;
    warningAlerts: number;
    notificationsSent: number;
    notificationsFailed: number;
  } {
    const activeAlerts = this.getActiveAlerts();
    const critical = activeAlerts.filter((a) => a.severity === 'critical').length;
    const warnings = activeAlerts.filter((a) => a.severity === 'warning').length;

    const sent = this.notificationHistory.filter((n) => n.sent).length;
    const failed = this.notificationHistory.filter((n) => !n.sent).length;

    return {
      totalRules: this.rules.size,
      enabledRules: Array.from(this.rules.values()).filter((r) => r.enabled).length,
      activeAlerts: activeAlerts.length,
      criticalAlerts: critical,
      warningAlerts: warnings,
      notificationsSent: sent,
      notificationsFailed: failed,
    };
  }

  /**
   * Clear old alerts (older than 24 hours)
   */
  clearOldAlerts(): number {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const beforeCount = this.alerts.length;

    this.alerts = this.alerts.filter((a) => now - a.timestamp < oneDayMs);

    return beforeCount - this.alerts.length;
  }

  /**
   * Reset alerts and history
   */
  reset(): void {
    this.alerts = [];
    this.notificationHistory = [];
    this.lastAlertTime.clear();
  }
}

export default new AlertingService();
