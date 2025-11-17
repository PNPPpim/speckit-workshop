/**
 * Neural Network Service
 * Implements a multi-layer perceptron for deep learning-based feature prediction
 * Features: Feedforward, backpropagation, training, inference, model persistence
 */

export type ActivationType = 'sigmoid' | 'relu' | 'tanh' | 'linear';

export interface NeuralLayer {
  weights: number[][];
  biases: number[];
  activation: ActivationType;
  learningRate: number;
  cache?: {
    input: number[];
    z: number[];
    a: number[];
  };
}

export interface TrainingData {
  inputs: number[];
  expectedOutput: number[];
}

export interface TrainingMetrics {
  epoch: number;
  loss: number;
  accuracy: number;
  mse: number;
  duration: number;
}

export interface PredictionResult {
  score: number;
  confidence: number;
  reasoning: string;
  normalized: boolean;
}

export interface ModelSnapshot {
  layers: NeuralLayer[];
  config: {
    inputSize: number;
    layerSizes: number[];
    activations: ActivationType[];
    learningRate: number;
  };
  stats: {
    trainedEpochs: number;
    finalLoss: number;
    finalAccuracy: number;
  };
}

/**
 * Neural Network Service - Multi-layer Perceptron Implementation
 * Supports: Feedforward, Backpropagation, Training, Inference
 */
export class NeuralNetworkService {
  private layers: NeuralLayer[] = [];
  private trainingMetrics: TrainingMetrics[] = [];
  private featureCache: Map<string, number[]> = new Map();
  private inputMeanStd: { mean: number[]; std: number[] } = { mean: [], std: [] };

  /**
   * Create a new neural network
   */
  createNetwork(
    inputSize: number,
    layerSizes: number[],
    activations: ActivationType[],
    learningRate: number = 0.01
  ): void {
    this.layers = [];
    let prevSize = inputSize;

    for (let i = 0; i < layerSizes.length; i++) {
      const currentSize = layerSizes[i];
      const activation = activations[i] || 'sigmoid';

      const layer: NeuralLayer = {
        weights: this.initializeWeights(prevSize, currentSize),
        biases: Array(currentSize).fill(0.001),
        activation,
        learningRate,
        cache: {
          input: [],
          z: [],
          a: [],
        },
      };

      this.layers.push(layer);
      prevSize = currentSize;
    }

    this.trainingMetrics = [];
  }

  /**
   * Initialize weights using Xavier initialization
   */
  private initializeWeights(inputSize: number, outputSize: number): number[][] {
    const weights: number[][] = [];
    const limit = Math.sqrt(6 / (inputSize + outputSize));

    for (let i = 0; i < inputSize; i++) {
      weights[i] = [];
      for (let j = 0; j < outputSize; j++) {
        weights[i][j] = (Math.random() - 0.5) * 2 * limit;
      }
    }

    return weights;
  }

  /**
   * Feedforward pass through network
   */
  feedForward(input: number[]): number[] {
    if (this.layers.length === 0) {
      throw new Error('Network not initialized');
    }

    let a = input;

    for (const layer of this.layers) {
      if (!layer.cache) layer.cache = { input: [], z: [], a: [] };

      layer.cache.input = a;

      // Z = W * A + B
      const z = this.matrixMultiply([a], layer.weights)[0];
      const z_with_bias = z.map((val, i) => val + layer.biases[i]);

      // A = activation(Z)
      a = z_with_bias.map((val) => this.activate(val, layer.activation));

      layer.cache.z = z_with_bias;
      layer.cache.a = a;
    }

    return a;
  }

  /**
   * Activation functions
   */
  private activate(x: number, type: ActivationType): number {
    switch (type) {
      case 'sigmoid':
        return 1 / (1 + Math.exp(-Math.min(x, 500))); // Prevent overflow
      case 'relu':
        return Math.max(0, x);
      case 'tanh':
        return Math.tanh(x);
      case 'linear':
        return x;
      default:
        return x;
    }
  }

  /**
   * Activation function derivatives
   */
  private activateDerivative(x: number, type: ActivationType): number {
    switch (type) {
      case 'sigmoid': {
        const sig = 1 / (1 + Math.exp(-Math.min(x, 500)));
        return sig * (1 - sig);
      }
      case 'relu':
        return x > 0 ? 1 : 0;
      case 'tanh':
        return 1 - Math.tanh(x) ** 2;
      case 'linear':
        return 1;
      default:
        return 1;
    }
  }

  /**
   * Backpropagation
   */
  backpropagate(error: number[]): void {
    if (this.layers.length === 0) return;

    let delta = error;

    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (!layer.cache) continue;

      // Calculate gradient for this layer
      const z_derivatives = layer.cache.z.map((z) => this.activateDerivative(z, layer.activation));
      const deltas = delta.map((d, j) => d * z_derivatives[j]);

      // Update weights and biases
      const input = layer.cache.input;
      for (let j = 0; j < layer.weights.length; j++) {
        for (let k = 0; k < layer.weights[j].length; k++) {
          const gradient = input[j] * deltas[k];
          layer.weights[j][k] -= layer.learningRate * gradient;
        }
      }

      for (let j = 0; j < layer.biases.length; j++) {
        layer.biases[j] -= layer.learningRate * deltas[j];
      }

      // Propagate error to previous layer
      if (i > 0) {
        delta = Array(layer.weights.length).fill(0);
        for (let j = 0; j < layer.weights.length; j++) {
          for (let k = 0; k < layer.weights[j].length; k++) {
            delta[j] += layer.weights[j][k] * deltas[k];
          }
        }
      }
    }
  }

  /**
   * Train network on dataset
   */
  train(data: TrainingData[], epochs: number, verbose: boolean = false): TrainingMetrics {
    const startTime = Date.now();
    let bestLoss = Infinity;

    for (let epoch = 0; epoch < epochs; epoch++) {
      let totalLoss = 0;
      let correctPredictions = 0;

      for (const { inputs, expectedOutput } of data) {
        const normalizedInput = this.normalizeFeatures(inputs);
        const output = this.feedForward(normalizedInput);
        const error = expectedOutput.map((val, i) => val - output[i]);
        totalLoss += this.calculateMSE(error);
        this.backpropagate(error);

        // Accuracy calculation (for binary/multi-class)
        const predicted = output.map((v) => (v > 0.5 ? 1 : 0));
        if (JSON.stringify(predicted) === JSON.stringify(expectedOutput)) {
          correctPredictions++;
        }
      }

      const avgLoss = totalLoss / data.length;
      const accuracy = correctPredictions / data.length;

      if (avgLoss < bestLoss) {
        bestLoss = avgLoss;
      }

      const metrics: TrainingMetrics = {
        epoch,
        loss: avgLoss,
        accuracy,
        mse: avgLoss,
        duration: Date.now() - startTime,
      };

      this.trainingMetrics.push(metrics);

      if (verbose && epoch % Math.max(1, Math.floor(epochs / 10)) === 0) {
        console.log(
          `Epoch ${epoch}/${epochs} - Loss: ${avgLoss.toFixed(4)}, Accuracy: ${(accuracy * 100).toFixed(2)}%`
        );
      }
    }

    const duration = Date.now() - startTime;
    const finalMetrics: TrainingMetrics = {
      epoch: epochs - 1,
      loss: bestLoss,
      accuracy: this.trainingMetrics[this.trainingMetrics.length - 1]?.accuracy || 0,
      mse: bestLoss,
      duration,
    };

    return finalMetrics;
  }

  /**
   * Predict score for features
   */
  predictScore(features: number[]): PredictionResult {
    try {
      const normalized = this.normalizeFeatures(features);
      const output = this.feedForward(normalized);
      const score = output[0] || 0;
      const confidence = Math.abs(score - 0.5) * 2; // Higher confidence for scores closer to 0 or 1

      const reasoning =
        score > 0.7
          ? 'High match detected'
          : score > 0.4
            ? 'Moderate match detected'
            : 'Low match detected';

      return {
        score: Math.max(0, Math.min(1, score)),
        confidence: Math.max(0, Math.min(1, confidence)),
        reasoning,
        normalized: true,
      };
    } catch (error) {
      console.error('Prediction error:', error);
      return {
        score: 0.5,
        confidence: 0.2,
        reasoning: 'Error in prediction',
        normalized: false,
      };
    }
  }

  /**
   * Normalize features using mean and standard deviation
   */
  normalizeFeatures(features: number[]): number[] {
    if (this.inputMeanStd.mean.length === 0) {
      // Initialize if first time
      this.inputMeanStd.mean = features.map(() => 0);
      this.inputMeanStd.std = features.map(() => 1);
    }

    return features.map((val, i) => {
      const mean = this.inputMeanStd.mean[i] || 0;
      const std = this.inputMeanStd.std[i] || 1;
      return std === 0 ? 0 : (val - mean) / std;
    });
  }

  /**
   * Calculate MSE
   */
  calculateMSE(error: number[]): number {
    if (error.length === 0) return 0;
    const squared = error.map((e) => e * e);
    return squared.reduce((a, b) => a + b, 0) / error.length;
  }

  /**
   * Calculate accuracy
   */
  calculateAccuracy(predictions: number[], actual: number[]): number {
    if (predictions.length === 0) return 0;
    const correct = predictions.filter((p, i) => Math.round(p) === Math.round(actual[i])).length;
    return correct / predictions.length;
  }

  /**
   * Fit normalization statistics
   */
  fitNormalization(data: TrainingData[]): void {
    if (data.length === 0) return;

    const inputSize = data[0].inputs.length;
    const means = Array(inputSize).fill(0);
    const stds = Array(inputSize).fill(0);

    // Calculate means
    for (const { inputs } of data) {
      inputs.forEach((val, i) => {
        means[i] += val;
      });
    }
    means.forEach((_, i) => (means[i] /= data.length));

    // Calculate standard deviations
    for (const { inputs } of data) {
      inputs.forEach((val, i) => {
        stds[i] += Math.pow(val - means[i], 2);
      });
    }
    stds.forEach((_, i) => (stds[i] = Math.sqrt(stds[i] / data.length)));

    this.inputMeanStd = { mean: means, std: stds };
  }

  /**
   * Matrix multiplication helper
   */
  private matrixMultiply(a: number[][], b: number[][]): number[][] {
    const result: number[][] = [];
    for (let i = 0; i < a.length; i++) {
      result[i] = [];
      for (let j = 0; j < b[0].length; j++) {
        let sum = 0;
        for (let k = 0; k < b.length; k++) {
          sum += a[i][k] * b[k][j];
        }
        result[i][j] = sum;
      }
    }
    return result;
  }

  /**
   * Export model to snapshot
   */
  exportModel(): ModelSnapshot {
    return {
      layers: JSON.parse(JSON.stringify(this.layers)),
      config: {
        inputSize: this.layers[0]?.weights.length || 0,
        layerSizes: this.layers.map((l) => l.weights[0].length),
        activations: this.layers.map((l) => l.activation),
        learningRate: this.layers[0]?.learningRate || 0.01,
      },
      stats: {
        trainedEpochs: this.trainingMetrics.length,
        finalLoss: this.trainingMetrics[this.trainingMetrics.length - 1]?.loss || 0,
        finalAccuracy: this.trainingMetrics[this.trainingMetrics.length - 1]?.accuracy || 0,
      },
    };
  }

  /**
   * Import model from snapshot
   */
  importModel(snapshot: ModelSnapshot): void {
    this.layers = JSON.parse(JSON.stringify(snapshot.layers));
    this.trainingMetrics = [];
  }

  /**
   * Get training history
   */
  getTrainingHistory(): TrainingMetrics[] {
    return [...this.trainingMetrics];
  }

  /**
   * Get network statistics
   */
  getStatistics(): {
    layerCount: number;
    totalWeights: number;
    totalBiases: number;
    inputSize: number;
    outputSize: number;
  } {
    const layerCount = this.layers.length;
    let totalWeights = 0;
    let totalBiases = 0;

    for (const layer of this.layers) {
      totalWeights += layer.weights.length * layer.weights[0].length;
      totalBiases += layer.biases.length;
    }

    return {
      layerCount,
      totalWeights,
      totalBiases,
      inputSize: this.layers[0]?.weights.length || 0,
      outputSize: this.layers[this.layers.length - 1]?.weights[0].length || 0,
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.featureCache.clear();
    for (const layer of this.layers) {
      if (layer.cache) {
        layer.cache.input = [];
        layer.cache.z = [];
        layer.cache.a = [];
      }
    }
  }
}

export const neuralNetworkService = new NeuralNetworkService();
