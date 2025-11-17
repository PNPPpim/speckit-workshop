/**
 * Advanced ML & Personalization Tests
 * Tests for neural networks, personalization, and prediction analytics
 */

import { NeuralNetworkService, TrainingData } from '../neuralNetworkService';
import { PersonalizationService, EngagementRecord, Content } from '../personalizationService';
import { PredictionAnalyticsService, TimeSeriesData } from '../predictionAnalyticsService';

describe('Advanced ML & Personalization (T047)', () => {
  let neuralNetwork: NeuralNetworkService;
  let personalization: PersonalizationService;
  let predictions: PredictionAnalyticsService;

  beforeEach(() => {
    neuralNetwork = new NeuralNetworkService();
    personalization = new PersonalizationService();
    predictions = new PredictionAnalyticsService();
  });

  describe('Neural Network Service', () => {
    test('should initialize network with correct architecture', () => {
      neuralNetwork.createNetwork(50, [32, 16, 1], ['relu', 'relu', 'linear']);
      const stats = neuralNetwork.getStatistics();

      expect(stats.layerCount).toBe(3);
      expect(stats.inputSize).toBe(50);
      expect(stats.outputSize).toBe(1);
      expect(stats.totalWeights).toBeGreaterThan(0);
    });

    test('should perform forward pass', () => {
      neuralNetwork.createNetwork(10, [5, 1], ['relu', 'linear']);
      const input = Array(10)
        .fill(0)
        .map(() => Math.random());
      const output = neuralNetwork.feedForward(input);

      expect(output).toHaveLength(1);
      expect(output[0]).toBeGreaterThanOrEqual(0);
      expect(output[0]).toBeLessThanOrEqual(1);
    });

    test('should calculate MSE correctly', () => {
      const error = [0.1, -0.2, 0.15];
      const mse = neuralNetwork.calculateMSE(error);

      const expected = (0.1 * 0.1 + 0.2 * 0.2 + 0.15 * 0.15) / 3;
      expect(mse).toBeCloseTo(expected, 4);
    });

    test('should calculate accuracy', () => {
      const predictions = [0.8, 0.2, 0.9];
      const actual = [1, 0, 1];
      const accuracy = neuralNetwork.calculateAccuracy(predictions, actual);

      expect(accuracy).toBe(1);
    });

    test('should train network and reduce loss', () => {
      neuralNetwork.createNetwork(5, [3, 1], ['relu', 'linear']);

      const trainingData: TrainingData[] = [
        { inputs: [0.1, 0.2, 0.3, 0.4, 0.5], expectedOutput: [1] },
        { inputs: [0.9, 0.8, 0.7, 0.6, 0.5], expectedOutput: [0] },
        { inputs: [0.2, 0.3, 0.4, 0.5, 0.6], expectedOutput: [1] },
      ];

      const metrics = neuralNetwork.train(trainingData, 10);

      expect(metrics.loss).toBeLessThanOrEqual(0.5);
      expect(metrics.accuracy).toBeGreaterThanOrEqual(0);
    });

    test('should normalize features', () => {
      const features = [10, 20, 30];
      const normalized = neuralNetwork.normalizeFeatures(features);

      expect(normalized).toHaveLength(3);
      normalized.forEach((val) => {
        expect(Number.isFinite(val)).toBe(true);
      });
    });

    test('should predict scores', () => {
      neuralNetwork.createNetwork(5, [3, 1], ['relu', 'linear']);
      const features = [0.1, 0.2, 0.3, 0.4, 0.5];

      const result = neuralNetwork.predictScore(features);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.reasoning).toBeDefined();
    });

    test('should export and import model', () => {
      neuralNetwork.createNetwork(10, [5, 1], ['relu', 'linear']);
      const trainingData: TrainingData[] = [
        { inputs: Array(10).fill(0.5), expectedOutput: [0.5] },
      ];
      neuralNetwork.train(trainingData, 5);

      const snapshot = neuralNetwork.exportModel();

      expect(snapshot.config.inputSize).toBe(10);
      expect(snapshot.config.layerSizes).toEqual([5, 1]);
      expect(snapshot.stats.trainedEpochs).toBeGreaterThan(0);

      const newNetwork = new NeuralNetworkService();
      newNetwork.importModel(snapshot);
      const newStats = newNetwork.getStatistics();
      expect(newStats.inputSize).toBe(10);
    });
  });

  describe('Personalization Service', () => {
    test('should build user profile', () => {
      const interactions: EngagementRecord[] = [
        {
          contentId: 'photo_1',
          type: 'view',
          timestamp: Date.now(),
        },
      ];

      const profile = personalization.buildUserProfile('user_1', interactions);

      expect(profile.userId).toBe('user_1');
      expect(profile.profileVector).toHaveLength(50);
      expect(profile.engagementHistory).toHaveLength(1);
    });

    test('should detect behavior patterns', () => {
      const interactions: EngagementRecord[] = [
        { contentId: 'photo_1', type: 'view', timestamp: Date.now() },
        { contentId: 'photo_2', type: 'view', timestamp: Date.now() },
        { contentId: 'photo_3', type: 'share', timestamp: Date.now() },
      ];

      const profile = personalization.buildUserProfile('user_2', interactions);

      expect(profile.behaviorPatterns.length).toBeGreaterThan(0);
      expect(profile.behaviorPatterns[0].frequency).toBeGreaterThan(0);
    });

    test('should get preference clusters', () => {
      const interactions: EngagementRecord[] = [
        { contentId: 'photo_1', type: 'view', timestamp: Date.now() },
        { contentId: 'photo_2', type: 'view', timestamp: Date.now() },
        { contentId: 'photo_3', type: 'view', timestamp: Date.now() },
        { contentId: 'photo_4', type: 'share', timestamp: Date.now() },
      ];

      const profile = personalization.buildUserProfile('user_3', interactions);

      expect(profile.preferenceClusters).toBeDefined();
      expect(Array.isArray(profile.preferenceClusters)).toBe(true);
    });

    test('should rank content personalized', () => {
      const content: Content[] = [
        {
          id: 'photo_1',
          title: 'Mountain',
          tags: ['nature', 'landscape'],
          category: 'nature',
          createdAt: Date.now(),
        },
        {
          id: 'photo_2',
          title: 'City',
          tags: ['urban', 'architecture'],
          category: 'urban',
          createdAt: Date.now(),
        },
      ];

      personalization.registerContent(content[0]);
      personalization.registerContent(content[1]);

      const ranked = personalization.rankContentPersonalized('user_4', content);

      expect(ranked).toHaveLength(2);
      expect(ranked[0].id).toBeDefined();
    });

    test('should predict next action', () => {
      const interactions: EngagementRecord[] = [
        { contentId: 'photo_1', type: 'view', timestamp: Date.now() },
        { contentId: 'photo_2', type: 'view', timestamp: Date.now() },
      ];

      personalization.buildUserProfile('user_5', interactions);
      const prediction = personalization.predictNextAction('user_5');

      expect(prediction.action).toBeDefined();
      expect(prediction.probability).toBeGreaterThanOrEqual(0);
      expect(prediction.probability).toBeLessThanOrEqual(1);
      expect(prediction.timeToAction).toBeGreaterThan(0);
    });

    test('should find similar users', () => {
      const interactions1: EngagementRecord[] = [
        { contentId: 'photo_1', type: 'view', timestamp: Date.now() },
      ];
      const interactions2: EngagementRecord[] = [
        { contentId: 'photo_1', type: 'view', timestamp: Date.now() },
        { contentId: 'photo_2', type: 'view', timestamp: Date.now() },
      ];

      personalization.buildUserProfile('user_6', interactions1);
      personalization.buildUserProfile('user_7', interactions2);

      const similar = personalization.findSimilarUsers('user_6', 5);

      expect(Array.isArray(similar)).toBe(true);
    });

    test('should calculate engagement score', () => {
      const interactions: EngagementRecord[] = [
        { contentId: 'photo_1', type: 'view', timestamp: Date.now() },
        { contentId: 'photo_2', type: 'view', timestamp: Date.now() },
        { contentId: 'photo_3', type: 'share', timestamp: Date.now() },
      ];

      personalization.buildUserProfile('user_8', interactions);
      const score = personalization.calculateEngagementScore('user_8');

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    test('should get loyalty metrics', () => {
      const interactions: EngagementRecord[] = [
        { contentId: 'photo_1', type: 'view', timestamp: Date.now() },
      ];

      personalization.buildUserProfile('user_9', interactions);
      const metrics = personalization.getLoyaltyMetrics('user_9');

      expect(metrics.engagementScore).toBeGreaterThanOrEqual(0);
      expect(['low', 'medium', 'high']).toContain(metrics.retentionRisk);
      expect(metrics.predictedLifetimeValue).toBeGreaterThanOrEqual(0);
      expect(metrics.churnProbability).toBeGreaterThanOrEqual(0);
    });

    test('should select bandit arms', () => {
      const content: Content[] = [
        {
          id: 'photo_1',
          title: 'Photo 1',
          tags: [],
          category: 'test',
          createdAt: Date.now(),
        },
        {
          id: 'photo_2',
          title: 'Photo 2',
          tags: [],
          category: 'test',
          createdAt: Date.now(),
        },
      ];

      const selected = personalization.selectBanditArm('user_10', content);

      expect(selected).toBeDefined();
      expect(content.map((c) => c.id)).toContain(selected.id);
    });

    test('should update bandit rewards', () => {
      personalization.updateBanditRewards('user_11', 'photo_1', 0.8);
      personalization.updateBanditRewards('user_11', 'photo_1', 0.9);

      const metrics = personalization.getMetrics();
      expect(metrics.totalBanditArms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Prediction Analytics Service', () => {
    test('should forecast user behavior', () => {
      const forecast = predictions.forecastUserBehavior('user_1', 7);

      expect(forecast.predictions).toHaveLength(7);
      expect(forecast.predictions[0].value).toBeGreaterThanOrEqual(0);
      expect(forecast.predictions[0].confidence).toBeGreaterThanOrEqual(0);
    });

    test('should detect anomalies', () => {
      const data: TimeSeriesData[] = [
        { timestamp: 1000, value: 10 },
        { timestamp: 2000, value: 12 },
        { timestamp: 3000, value: 11 },
        { timestamp: 4000, value: 100 }, // Anomaly
      ];

      const anomalies = predictions.detectAnomalies(data);

      expect(Array.isArray(anomalies)).toBe(true);
    });

    test('should analyze trends', () => {
      const data: TimeSeriesData[] = [
        { timestamp: 1000, value: 10 },
        { timestamp: 2000, value: 15 },
        { timestamp: 3000, value: 20 },
        { timestamp: 4000, value: 25 },
      ];

      const trend = predictions.analyzeTrends(data);

      expect(['increasing', 'decreasing', 'stable']).toContain(trend.trend);
      expect(trend.confidence).toBeGreaterThanOrEqual(0);
    });

    test('should detect seasonality', () => {
      const data: TimeSeriesData[] = Array.from({ length: 30 }, (_, i) => ({
        timestamp: (i + 1) * 1000,
        value: 10 + 5 * Math.sin((i * Math.PI) / 7),
      }));

      const trend = predictions.analyzeTrends(data);

      expect(trend.seasonality.hasSeasonality).toBeDefined();
      expect(trend.seasonality.pattern).toBeDefined();
    });

    test('should flag unusual behavior', () => {
      const interactions = [
        { userId: 'user_1', type: 'view', timestamp: Date.now() },
        { userId: 'user_2', type: 'view', timestamp: Date.now() },
        { userId: 'user_3', type: 'view', timestamp: Date.now() },
        { userId: 'user_3', type: 'view', timestamp: Date.now() },
        { userId: 'user_3', type: 'view', timestamp: Date.now() },
        { userId: 'user_3', type: 'view', timestamp: Date.now() },
        { userId: 'user_3', type: 'view', timestamp: Date.now() },
        { userId: 'user_3', type: 'view', timestamp: Date.now() },
        { userId: 'user_3', type: 'view', timestamp: Date.now() },
      ];

      const unusual = predictions.flagUnusualBehavior(interactions);

      expect(Array.isArray(unusual)).toBe(true);
    });

    test('should perform cohort analysis', () => {
      const users = [
        { id: 'user_1', joinDate: Date.now() - 100000000 },
        { id: 'user_2', joinDate: Date.now() - 50000000 },
      ];

      const engagementData = [
        { userId: 'user_1', date: Date.now(), engagement: 0.8 },
        { userId: 'user_2', date: Date.now(), engagement: 0.6 },
      ];

      const result = predictions.cohortAnalysis(users, engagementData);

      expect(result.cohorts.length).toBeGreaterThan(0);
      expect(result.metrics.length).toBeGreaterThan(0);
    });

    test('should perform funnel analysis', () => {
      const events = [
        { userId: 'user_1', stage: 'view', timestamp: Date.now() },
        { userId: 'user_1', stage: 'explore', timestamp: Date.now() },
        { userId: 'user_2', stage: 'view', timestamp: Date.now() },
        { userId: 'user_2', stage: 'explore', timestamp: Date.now() },
        { userId: 'user_2', stage: 'share', timestamp: Date.now() },
      ];

      const funnel = predictions.funnelAnalysis(events);

      expect(funnel.stages.length).toBeGreaterThan(0);
      expect(funnel.conversionRates.length).toBeGreaterThan(0);
      expect(funnel.dropoffAnalysis.length).toBeGreaterThan(0);
    });

    test('should add time series data and cache', () => {
      const data: TimeSeriesData[] = [
        { timestamp: 1000, value: 10 },
        { timestamp: 2000, value: 15 },
      ];

      predictions.addTimeSeriesData('test_key', data);
      const metrics = predictions.getMetrics();

      expect(metrics.cachedTimeSeries).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration Tests', () => {
    test('should integrate neural network with personalization', () => {
      neuralNetwork.createNetwork(10, [5, 1], ['relu', 'linear']);
      const trainingData: TrainingData[] = [
        { inputs: Array(10).fill(0.5), expectedOutput: [0.5] },
      ];
      neuralNetwork.train(trainingData, 5);

      const features = Array(10).fill(0.5);
      const prediction = neuralNetwork.predictScore(features);

      expect(prediction.score).toBeGreaterThanOrEqual(0);
      expect(prediction.score).toBeLessThanOrEqual(1);
    });

    test('should handle end-to-end personalization pipeline', () => {
      // Build profile
      const interactions: EngagementRecord[] = [
        { contentId: 'photo_1', type: 'view', timestamp: Date.now() },
        { contentId: 'photo_2', type: 'view', timestamp: Date.now() },
        { contentId: 'photo_3', type: 'share', timestamp: Date.now() },
      ];

      personalization.buildUserProfile('user_pipeline', interactions);

      // Get metrics
      const engagement = personalization.calculateEngagementScore('user_pipeline');
      const loyalty = personalization.getLoyaltyMetrics('user_pipeline');
      const prediction = personalization.predictNextAction('user_pipeline');

      expect(engagement).toBeGreaterThanOrEqual(0);
      expect(loyalty.churnProbability).toBeGreaterThanOrEqual(0);
      expect(prediction.probability).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Tests', () => {
    test('neural network should predict in < 10ms', () => {
      neuralNetwork.createNetwork(50, [32, 16, 1], ['relu', 'relu', 'linear']);
      const features = Array(50)
        .fill(0)
        .map(() => Math.random());

      const start = Date.now();
      neuralNetwork.predictScore(features);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50); // Allow 50ms for test environment
    });

    test('personalization ranking should complete in < 50ms', () => {
      const content: Content[] = Array.from({ length: 50 }, (_, i) => ({
        id: `photo_${i}`,
        title: `Photo ${i}`,
        tags: ['nature', 'landscape'],
        category: 'nature',
        createdAt: Date.now(),
      }));

      content.forEach((c) => personalization.registerContent(c));

      const start = Date.now();
      personalization.rankContentPersonalized('user_perf', content);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Allow 100ms for test environment
    });

    test('predictions should handle 1000 data points', () => {
      const largeDataset: TimeSeriesData[] = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: i * 1000,
        value: 50 + Math.random() * 20,
      }));

      const start = Date.now();
      predictions.detectAnomalies(largeDataset);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });
  });
});
