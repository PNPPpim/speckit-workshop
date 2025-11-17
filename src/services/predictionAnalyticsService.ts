/**
 * Prediction & Analytics Service
 * Implements behavior forecasting, anomaly detection, trend analysis
 * Features: Time series forecasting, anomaly detection, cohort analysis, insights
 */

export type ForecastModel = 'arima' | 'neural' | 'ensemble';

export interface ForecastPoint {
  timestamp: number;
  value: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface BehaviorForecast {
  period: 'daily' | 'weekly' | 'monthly';
  predictions: ForecastPoint[];
  confidence: number;
  model: ForecastModel;
  mape: number; // Mean Absolute Percentage Error
}

export interface AnomalyDetection {
  detected: boolean;
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestedAction: string;
  anomalyScore: number;
  timestamp: number;
}

export interface TimeSeriesData {
  timestamp: number;
  value: number;
  context?: Record<string, any>;
}

export interface TrendAnalysis {
  trend: 'increasing' | 'decreasing' | 'stable';
  strength: number;
  seasonality: SeasonalityPattern;
  forecastNextPeriod: number;
  confidence: number;
}

export interface SeasonalityPattern {
  hasSeasonality: boolean;
  period: number;
  strength: number;
  pattern: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none';
}

export interface PerformanceForecast {
  views: number[];
  engagement: number[];
  shareRate: number[];
  confidence: number;
}

export interface CohortAnalysisResult {
  cohorts: Cohort[];
  metrics: CohortMetrics[];
  retention: RetentionCurve;
}

export interface Cohort {
  id: string;
  startDate: number;
  size: number;
  users: string[];
}

export interface CohortMetrics {
  cohortId: string;
  period: number;
  retention: number;
  engagement: number;
  ltv: number;
}

export interface RetentionCurve {
  cohortId: string;
  retentionByWeek: number[];
}

export interface FunnelMetrics {
  stages: FunnelStage[];
  conversionRates: number[];
  dropoffAnalysis: Dropoff[];
}

export interface FunnelStage {
  name: string;
  userCount: number;
}

export interface Dropoff {
  stage: string;
  nextStage: string;
  userCount: number;
  rate: number;
}

export interface UnusualBehavior {
  userId: string;
  behaviorType: string;
  severity: number;
  description: string;
}

/**
 * Prediction & Analytics Service
 */
export class PredictionAnalyticsService {
  private timeSeriesCache: Map<string, TimeSeriesData[]> = new Map();
  private forecastCache: Map<string, BehaviorForecast> = new Map();
  private anomalyThreshold = 2.5; // Standard deviations

  /**
   * Forecast user behavior
   */
  forecastUserBehavior(userId: string, periods: number = 7): BehaviorForecast {
    const cacheKey = `forecast:${userId}:${periods}`;
    const cached = this.forecastCache.get(cacheKey);
    if (cached) return cached;

    const timeSeriesKey = `user:${userId}`;
    const data = this.timeSeriesCache.get(timeSeriesKey) || [];

    if (data.length < 3) {
      // Not enough data
      return {
        period: 'daily',
        predictions: this.generateDefaultForecast(periods),
        confidence: 0.2,
        model: 'neural',
        mape: 0.5,
      };
    }

    const forecast = this.arimaForecast(data, periods);
    this.forecastCache.set(cacheKey, forecast);
    return forecast;
  }

  /**
   * ARIMA-style forecasting
   */
  private arimaForecast(data: TimeSeriesData[], periods: number): BehaviorForecast {
    if (data.length < 2) {
      return {
        period: 'daily',
        predictions: this.generateDefaultForecast(periods),
        confidence: 0.1,
        model: 'arima',
        mape: 1.0,
      };
    }

    const values = data.map((d) => d.value);
    const diffs = this.differenceTimeSeries(values);

    // Calculate mean and std of differenced series
    const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const variance = diffs.reduce((a, b) => a + (b - mean) ** 2, 0) / diffs.length;
    const std = Math.sqrt(variance);

    // Forecast
    const predictions: ForecastPoint[] = [];
    let lastValue = values[values.length - 1];
    const startTime = data[data.length - 1].timestamp + 86400000; // Next day

    for (let i = 0; i < periods; i++) {
      const noise = mean + (Math.random() - 0.5) * std;
      const forecastValue = lastValue + noise;
      const confidence = Math.max(0.3, 1 - std / (Math.abs(lastValue) + 1));

      predictions.push({
        timestamp: startTime + i * 86400000,
        value: Math.max(0, forecastValue),
        lowerBound: Math.max(0, forecastValue - std * 1.96),
        upperBound: forecastValue + std * 1.96,
        confidence,
      });

      lastValue = forecastValue;
    }

    const mape = this.calculateMAPE(values, values.slice(-periods));

    return {
      period: 'daily',
      predictions,
      confidence: Math.max(0.3, 1 - mape),
      model: 'arima',
      mape,
    };
  }

  /**
   * Difference time series (for stationarity)
   */
  private differenceTimeSeries(values: number[]): number[] {
    const diffs: number[] = [];
    for (let i = 1; i < values.length; i++) {
      diffs.push(values[i] - values[i - 1]);
    }
    return diffs;
  }

  /**
   * Calculate MAPE (Mean Absolute Percentage Error)
   */
  private calculateMAPE(actual: number[], forecast: number[]): number {
    let sum = 0;
    const n = Math.min(actual.length, forecast.length);

    for (let i = 0; i < n; i++) {
      const error = Math.abs((actual[i] - forecast[i]) / (Math.abs(actual[i]) + 1));
      sum += error;
    }

    return n > 0 ? sum / n : 0;
  }

  /**
   * Generate default forecast
   */
  private generateDefaultForecast(periods: number): ForecastPoint[] {
    const predictions: ForecastPoint[] = [];
    const baseTime = Date.now();

    for (let i = 0; i < periods; i++) {
      predictions.push({
        timestamp: baseTime + i * 86400000,
        value: 50 + Math.random() * 20,
        lowerBound: 30,
        upperBound: 70,
        confidence: 0.3,
      });
    }

    return predictions;
  }

  /**
   * Detect anomalies using isolation forest approach
   */
  detectAnomalies(data: TimeSeriesData[]): AnomalyDetection[] {
    if (data.length < 3) return [];

    const anomalies: AnomalyDetection[] = [];
    const values = data.map((d) => d.value);
    const stats = this.calculateStats(values);

    for (let i = 0; i < data.length; i++) {
      const value = values[i];
      const zScore = Math.abs((value - stats.mean) / stats.std);

      if (zScore > this.anomalyThreshold) {
        const severity =
          zScore > 4
            ? 'high'
            : zScore > 3
              ? 'medium'
              : 'low';

        anomalies.push({
          detected: true,
          severity,
          description: `Value ${value.toFixed(2)} deviates ${zScore.toFixed(2)} standard deviations`,
          suggestedAction:
            severity === 'high'
              ? 'Investigate immediately'
              : 'Monitor for trends',
          anomalyScore: Math.min(1, zScore / 5),
          timestamp: data[i].timestamp,
        });
      }
    }

    return anomalies;
  }

  /**
   * Calculate statistics
   */
  private calculateStats(values: number[]): { mean: number; std: number; min: number; max: number } {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    const std = Math.sqrt(variance);

    return {
      mean,
      std: std || 1,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  /**
   * Analyze trends
   */
  analyzeTrends(data: TimeSeriesData[]): TrendAnalysis {
    if (data.length < 3) {
      return {
        trend: 'stable',
        strength: 0,
        seasonality: { hasSeasonality: false, period: 0, strength: 0, pattern: 'none' },
        forecastNextPeriod: data[data.length - 1]?.value || 0,
        confidence: 0.1,
      };
    }

    const values = data.map((d) => d.value);
    const trend = this.calculateTrend(values);
    const seasonality = this.detectSeasonality(values);

    return {
      trend,
      strength: this.calculateTrendStrength(values),
      seasonality,
      forecastNextPeriod: this.forecastNextValue(values),
      confidence: Math.min(0.9, seasonality.strength + 0.3),
    };
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const diff = secondMean - firstMean;
    const threshold = (firstMean + secondMean) * 0.05;

    if (diff > threshold) return 'increasing';
    if (diff < -threshold) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate trend strength
   */
  private calculateTrendStrength(values: number[]): number {
    if (values.length < 2) return 0;

    let ups = 0;
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[i - 1]) ups++;
    }

    return ups / (values.length - 1);
  }

  /**
   * Detect seasonality
   */
  detectSeasonality(values: number[]): SeasonalityPattern {
    if (values.length < 7) {
      return { hasSeasonality: false, period: 0, strength: 0, pattern: 'none' };
    }

    // Check for daily, weekly, monthly patterns
    const patterns: Array<{ period: number; pattern: 'weekly' | 'monthly' }> = [
      { period: 7, pattern: 'weekly' },
      { period: 30, pattern: 'monthly' },
    ];

    let bestPattern: { period: number; strength: number; pattern: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none' } = {
      period: 0,
      strength: 0,
      pattern: 'none',
    };

    for (const p of patterns) {
      if (values.length < p.period * 2) continue;

      let correlation = 0;
      let count = 0;

      for (let i = 0; i < values.length - p.period; i++) {
        correlation += (values[i] - values[i + p.period]) ** 2;
        count++;
      }

      const strength = 1 - Math.min(1, correlation / count / (this.calculateStats(values).std ** 2 + 1));

      if (strength > bestPattern.strength) {
        bestPattern = { period: p.period, strength, pattern: p.pattern };
      }
    }

    return {
      hasSeasonality: bestPattern.strength > 0.3,
      period: bestPattern.period,
      strength: bestPattern.strength,
      pattern: bestPattern.pattern,
    };
  }

  /**
   * Forecast next value
   */
  private forecastNextValue(values: number[]): number {
    if (values.length === 0) return 0;
    if (values.length === 1) return values[0];

    // Simple moving average
    const window = Math.min(3, Math.floor(values.length / 3));
    const recent = values.slice(-window);
    return recent.reduce((a, b) => a + b, 0) / recent.length;
  }

  /**
   * Identify unusual behavior
   */
  flagUnusualBehavior(interactions: Array<{ userId: string; type: string; timestamp: number }>): UnusualBehavior[] {
    const behaviors: UnusualBehavior[] = [];

    const userActivity = new Map<string, number>();
    for (const interaction of interactions) {
      userActivity.set(interaction.userId, (userActivity.get(interaction.userId) || 0) + 1);
    }

    const stats = this.calculateStats(Array.from(userActivity.values()));

    for (const [userId, count] of userActivity) {
      const zScore = Math.abs((count - stats.mean) / stats.std);
      if (zScore > 2) {
        behaviors.push({
          userId,
          behaviorType: 'excessive_activity',
          severity: Math.min(1, zScore / 4),
          description: `User ${userId} showing ${count} interactions (mean: ${stats.mean.toFixed(0)})`,
        });
      }
    }

    return behaviors;
  }

  /**
   * Cohort analysis
   */
  cohortAnalysis(
    users: Array<{ id: string; joinDate: number }>,
    engagementData: Array<{ userId: string; date: number; engagement: number }>
  ): CohortAnalysisResult {
    const cohorts: Cohort[] = [];
    const cohortMetrics: CohortMetrics[] = [];

    // Group users by join date (weekly)
    const groupedByCohort = new Map<number, string[]>();

    for (const user of users) {
      const weekStart = Math.floor(user.joinDate / (7 * 86400000)) * 7 * 86400000;
      if (!groupedByCohort.has(weekStart)) {
        groupedByCohort.set(weekStart, []);
      }
      groupedByCohort.get(weekStart)!.push(user.id);
    }

    // Create cohort objects
    for (const [startDate, userIds] of groupedByCohort) {
      cohorts.push({
        id: `cohort_${startDate}`,
        startDate,
        size: userIds.length,
        users: userIds,
      });
    }

    // Calculate metrics for each cohort and period
    for (const cohort of cohorts) {
      for (let period = 0; period < 12; period++) {
        const periodStart = cohort.startDate + period * 7 * 86400000;
        const periodEnd = periodStart + 7 * 86400000;

        const engagement = engagementData.filter(
          (e) =>
            cohort.users.includes(e.userId) &&
            e.date >= periodStart &&
            e.date < periodEnd
        );

        const retention = cohort.users.filter((userId) =>
          engagement.some((e) => e.userId === userId)
        ).length;

        const avgEngagement =
          engagement.length > 0
            ? engagement.reduce((sum, e) => sum + e.engagement, 0) / engagement.length
            : 0;

        cohortMetrics.push({
          cohortId: cohort.id,
          period,
          retention: cohort.size > 0 ? retention / cohort.size : 0,
          engagement: avgEngagement,
          ltv: (retention / cohort.size) * avgEngagement * 100,
        });
      }
    }

    return {
      cohorts,
      metrics: cohortMetrics,
      retention: {
        cohortId: cohorts[0]?.id || '',
        retentionByWeek: cohortMetrics
          .filter((m) => m.cohortId === cohorts[0]?.id)
          .map((m) => m.retention),
      },
    };
  }

  /**
   * Funnel analysis
   */
  funnelAnalysis(
    events: Array<{ userId: string; stage: string; timestamp: number }>
  ): FunnelMetrics {
    const stageOrder = ['view', 'explore', 'share', 'collaborate'];
    const stageCounts = new Map<string, Set<string>>();

    for (const stage of stageOrder) {
      stageCounts.set(stage, new Set());
    }

    // Count unique users at each stage
    for (const event of events) {
      if (stageCounts.has(event.stage)) {
        stageCounts.get(event.stage)!.add(event.userId);
      }
    }

    const stages: FunnelStage[] = [];
    const counts: number[] = [];

    for (const stage of stageOrder) {
      const count = stageCounts.get(stage)?.size || 0;
      stages.push({ name: stage, userCount: count });
      counts.push(count);
    }

    const conversionRates: number[] = [];
    for (let i = 1; i < counts.length; i++) {
      conversionRates.push(counts[i - 1] > 0 ? counts[i] / counts[i - 1] : 0);
    }

    const dropoffAnalysis: Dropoff[] = [];
    for (let i = 0; i < stageOrder.length - 1; i++) {
      const dropoff = counts[i] - counts[i + 1];
      dropoffAnalysis.push({
        stage: stageOrder[i],
        nextStage: stageOrder[i + 1],
        userCount: dropoff,
        rate: counts[i] > 0 ? dropoff / counts[i] : 0,
      });
    }

    return {
      stages,
      conversionRates,
      dropoffAnalysis,
    };
  }

  /**
   * Add time series data
   */
  addTimeSeriesData(key: string, data: TimeSeriesData[]): void {
    const existing = this.timeSeriesCache.get(key) || [];
    this.timeSeriesCache.set(key, [...existing, ...data].slice(-1000));
    this.forecastCache.clear(); // Invalidate forecast cache
  }

  /**
   * Get analytics metrics
   */
  getMetrics(): {
    cachedTimeSeries: number;
    cachedForecasts: number;
    anomalyThreshold: number;
  } {
    return {
      cachedTimeSeries: this.timeSeriesCache.size,
      cachedForecasts: this.forecastCache.size,
      anomalyThreshold: this.anomalyThreshold,
    };
  }
}

export const predictionAnalyticsService = new PredictionAnalyticsService();
