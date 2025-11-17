/**
 * Advanced ML Dashboard Component
 * Visualizes neural network performance, personalization, and predictions
 */

import React, { useState, useEffect } from 'react';
import styles from './AdvancedMLDashboard.module.css';
import { NeuralNetworkService } from '../services/neuralNetworkService';

interface NetworkStats {
  layerCount: number;
  totalWeights: number;
  totalBiases: number;
}

interface AdvancedMLDashboardProps {
  userId?: string;
  onPersonalizationChange?: () => void;
}

/**
 * Network Visualizer Component
 */
const NetworkVisualizer: React.FC<{ stats: NetworkStats }> = ({ stats }) => (
  <div className={styles.visualizerCard}>
    <h3>Neural Network Architecture</h3>
    <div className={styles.networkDiagram}>
      <div className={styles.networkStats}>
        <div className={styles.statItem}>
          <span className={styles.label}>Layers:</span>
          <span className={styles.value}>{stats.layerCount}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.label}>Weights:</span>
          <span className={styles.value}>{stats.totalWeights.toLocaleString()}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.label}>Biases:</span>
          <span className={styles.value}>{stats.totalBiases.toLocaleString()}</span>
        </div>
      </div>
      <div className={styles.networkVisual}>
        <div className={styles.layer}>
          <div className={styles.neuron}>Input</div>
          <div className={styles.neuron}>50</div>
        </div>
        <div className={styles.arrow}>→</div>
        <div className={styles.layer}>
          <div className={styles.neuron}>Hidden 1</div>
          <div className={styles.neuron}>32</div>
        </div>
        <div className={styles.arrow}>→</div>
        <div className={styles.layer}>
          <div className={styles.neuron}>Hidden 2</div>
          <div className={styles.neuron}>16</div>
        </div>
        <div className={styles.arrow}>→</div>
        <div className={styles.layer}>
          <div className={styles.neuron}>Output</div>
          <div className={styles.neuron}>1</div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * Personalization Profile Component
 */
interface PersonalizationData {
  engagementScore: number;
  clusterCount: number;
  affinityCount: number;
  loyaltyRisk: 'low' | 'medium' | 'high';
}

const PersonalizationProfile: React.FC<{ data: PersonalizationData }> = ({ data }) => (
  <div className={styles.profileCard}>
    <h3>User Personalization Profile</h3>
    <div className={styles.profileMetrics}>
      <div className={styles.metricRow}>
        <span>Engagement Score</span>
        <div className={styles.progressBar}>
          <div className={styles.progress} style={{ width: `${data.engagementScore * 100}%` }} />
        </div>
        <span className={styles.percentage}>{(data.engagementScore * 100).toFixed(1)}%</span>
      </div>
      <div className={styles.metricRow}>
        <span>Preference Clusters</span>
        <span className={styles.badge}>{data.clusterCount}</span>
      </div>
      <div className={styles.metricRow}>
        <span>Content Affinities</span>
        <span className={styles.badge}>{data.affinityCount}</span>
      </div>
      <div className={styles.metricRow}>
        <span>Loyalty Risk</span>
        <span className={`${styles.badge} ${styles[`risk_${data.loyaltyRisk}`]}`}>
          {data.loyaltyRisk.charAt(0).toUpperCase() + data.loyaltyRisk.slice(1)}
        </span>
      </div>
    </div>
  </div>
);

/**
 * Prediction Results Component
 */
interface PredictionData {
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
  forecastNext: number;
  anomalyCount: number;
}

const PredictionResults: React.FC<{ data: PredictionData }> = ({ data }) => (
  <div className={styles.predictionCard}>
    <h3>Behavior Predictions</h3>
    <div className={styles.predictions}>
      <div className={styles.predictionItem}>
        <span>Trend Direction</span>
        <div className={`${styles.trendIndicator} ${styles[`trend_${data.trend}`]}`}>
          {data.trend === 'increasing' && '📈'}
          {data.trend === 'decreasing' && '📉'}
          {data.trend === 'stable' && '📊'}
          <span>{data.trend.charAt(0).toUpperCase() + data.trend.slice(1)}</span>
        </div>
      </div>
      <div className={styles.predictionItem}>
        <span>Forecast Confidence</span>
        <div className={styles.confidenceBar}>
          <div
            className={styles.confidenceFill}
            style={{
              width: `${data.confidence * 100}%`,
              backgroundColor: data.confidence > 0.7 ? '#10b981' : data.confidence > 0.4 ? '#f59e0b' : '#ef4444',
            }}
          />
        </div>
        <span className={styles.percentage}>{(data.confidence * 100).toFixed(0)}%</span>
      </div>
      <div className={styles.predictionItem}>
        <span>Next Period Value</span>
        <span className={styles.largeNumber}>{data.forecastNext.toFixed(0)}</span>
      </div>
      <div className={styles.predictionItem}>
        <span>Anomalies Detected</span>
        <span className={`${styles.badge} ${styles[data.anomalyCount > 2 ? 'warning' : 'info']}`}>
          {data.anomalyCount}
        </span>
      </div>
    </div>
  </div>
);

/**
 * Anomaly Alerts Component
 */
interface AnomalyData {
  count: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

const AnomalyAlerts: React.FC<{ anomalies: AnomalyData[] }> = ({ anomalies }) => (
  <div className={styles.alertsCard}>
    <h3>Anomaly Alerts ({anomalies.length})</h3>
    <div className={styles.alertsList}>
      {anomalies.length === 0 ? (
        <p className={styles.noAlerts}>No anomalies detected ✓</p>
      ) : (
        anomalies.map((anomaly, idx) => (
          <div key={idx} className={`${styles.alertItem} ${styles[`severity_${anomaly.severity}`]}`}>
            <span className={styles.severityBadge}>{anomaly.severity.toUpperCase()}</span>
            <span className={styles.alertText}>{anomaly.description}</span>
          </div>
        ))
      )}
    </div>
  </div>
);

/**
 * Analytics Insights Component
 */
interface InsightData {
  title: string;
  value: string;
  icon: string;
}

const AnalyticsInsights: React.FC<{ insights: InsightData[] }> = ({ insights }) => (
  <div className={styles.insightsCard}>
    <h3>Key Insights</h3>
    <div className={styles.insightsGrid}>
      {insights.map((insight, idx) => (
        <div key={idx} className={styles.insightItem}>
          <span className={styles.insightIcon}>{insight.icon}</span>
          <h4>{insight.title}</h4>
          <p>{insight.value}</p>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Main Advanced ML Dashboard
 */
const AdvancedMLDashboard: React.FC<AdvancedMLDashboardProps> = () => {
  const [networkStats, setNetworkStats] = useState<NetworkStats>({
    layerCount: 3,
    totalWeights: 2880,
    totalBiases: 49,
  });

  const [personalizationData] = useState<PersonalizationData>({
    engagementScore: 0.72,
    clusterCount: 3,
    affinityCount: 12,
    loyaltyRisk: 'low',
  });

  const [predictionData] = useState<PredictionData>({
    trend: 'increasing',
    confidence: 0.84,
    forecastNext: 156,
    anomalyCount: 0,
  });

  const [anomalies] = useState<AnomalyData[]>([]);

  const [insights] = useState<InsightData[]>([
    {
      title: 'Power User',
      value: 'User shows consistent engagement with premium features',
      icon: '⭐',
    },
    {
      title: 'Trending Interest',
      value: '40% increase in landscape photography interests',
      icon: '📈',
    },
    {
      title: 'Recommended Action',
      value: 'Personalized landscape album suggestions may increase retention',
      icon: '💡',
    },
  ]);

  useEffect(() => {
    const neural = new NeuralNetworkService();
    neural.createNetwork(50, [32, 16, 1], ['relu', 'relu', 'linear']);
    const stats = neural.getStatistics();

    setNetworkStats({
      layerCount: stats.layerCount,
      totalWeights: stats.totalWeights,
      totalBiases: stats.totalBiases,
    });
  }, []);

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>Advanced ML & Personalization</h1>
        <p>Neural Network Performance and User Insights</p>
      </div>

      <div className={styles.container}>
        <div className={styles.row}>
          <div className={styles.col}>
            <NetworkVisualizer stats={networkStats} />
          </div>
          <div className={styles.col}>
            <PersonalizationProfile data={personalizationData} />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.col}>
            <PredictionResults data={predictionData} />
          </div>
          <div className={styles.col}>
            <AnomalyAlerts anomalies={anomalies} />
          </div>
        </div>

        <div className={styles.fullWidth}>
          <AnalyticsInsights insights={insights} />
        </div>
      </div>
    </div>
  );
};

export default AdvancedMLDashboard;
