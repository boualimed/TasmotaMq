// ml-service.ts
// Machine Learning Service using TensorFlow.js for IoT predictions and anomaly detection

import * as tf from '@tensorflow/tfjs';
import { indexedDBService, SensorDataRecord } from './indexeddb.service';
import { Device } from '../models/device.model';
import { logger } from '../utils/logger.util';
import { notificationService } from './notification.service';

export interface PredictionResult {
  timestamp: Date;
  predictedValue: number;
  confidence: number;
  lowerBound: number;
  upperBound: number;
}

export interface AnomalyResult {
  timestamp: Date;
  value: number;
  isAnomaly: boolean;
  anomalyScore: number;
  threshold: number;
  expectedRange: { min: number; max: number };
}

export interface TrainingMetrics {
  loss: number;
  mse: number;
  mae: number;
  epochs: number;
  samples: number;
}

export interface MLModelConfig {
  lookbackPeriod: number; // How many past values to consider
  predictionHorizon: number; // How far into the future to predict
  lstmUnits: number;
  learningRate: number;
  epochs: number;
  batchSize: number;
  validationSplit: number;
}

export interface DeviceMLState {
  deviceId: string;
  deviceName: string;
  model: tf.LayersModel | null;
  lastTraining: Date | null;
  trainingMetrics: TrainingMetrics | null;
  anomalyThreshold: number;
  isTraining: boolean;
  config: MLModelConfig;
}

const DEFAULT_ML_CONFIG: MLModelConfig = {
  lookbackPeriod: 20, // Use last 20 readings
  predictionHorizon: 10, // Predict next 10 time steps
  lstmUnits: 32,
  learningRate: 0.001,
  epochs: 50,
  batchSize: 16,
  validationSplit: 0.2
};

export class MLService {
  private models = new Map<string, DeviceMLState>();
  private trainingQueue: string[] = [];
  private isProcessingQueue = false;

  constructor() {
    this.initializeTensorFlow();
  }

   private async initializeTensorFlow(): Promise<void> {
    try {
      await tf.ready();
      logger.addLog('success', 'ðŸ§  TensorFlow.js initialized successfully');
      notificationService.success('âœ… ML engine ready', 2500);
    } catch (error: any) {
      logger.addLog('error', `TensorFlow.js initialization failed: ${error.message}`);
      notificationService.error('âŒ ML engine failed to initialize', 4000);
    }
  }

  /**
   * Get or create ML state for a device
   */
  private getOrCreateState(deviceId: string, deviceName: string): DeviceMLState {
    if (!this.models.has(deviceId)) {
      this.models.set(deviceId, {
        deviceId,
        deviceName,
        model: null,
        lastTraining: null,
        trainingMetrics: null,
        anomalyThreshold: 2.5, // 2.5 standard deviations
        isTraining: false,
        config: { ...DEFAULT_ML_CONFIG }
      });
    }
    return this.models.get(deviceId)!;
  }

  /**
   * Prepare time series data for training
   */
  /**private prepareTimeSeriesData(
    records: SensorDataRecord[],
    config: MLModelConfig
  ): { inputs: number[][]; outputs: number[][] } {
    // Extract numeric values from sensor data
    const values = records.map(r => this.extractNumericValue(r.data));

    // Normalize data
    const normalized = this.normalizeData(values);

    const inputs: number[][] = [];
    const outputs: number[][] = [];

    // Create sequences for training
    for (let i = 0; i < normalized.length - config.lookbackPeriod - config.predictionHorizon; i++) {
      const input = normalized.slice(i, i + config.lookbackPeriod);
      const output = normalized.slice(
        i + config.lookbackPeriod,
        i + config.lookbackPeriod + config.predictionHorizon
      );
      inputs.push(input);
      outputs.push(output);
    }

    return { inputs, outputs };
  }**/

  /**
   * Extract numeric value from sensor data (handles various formats)
   */
  private extractNumericValue(data: any): number {
    if (typeof data === 'number') return data;
    if (typeof data === 'string') return parseFloat(data);

    // Handle nested objects (e.g., {Temperature: 25.5})
    if (typeof data === 'object') {
      // Try common sensor fields
      const fields = ['Temperature', 'Humidity', 'Power', 'Energy', 'Value', 'value'];
      for (const field of fields) {
        if (data[field] !== undefined) {
          return parseFloat(data[field]);
        }
      }

      // Try nested paths
      for (const key of Object.keys(data)) {
        if (typeof data[key] === 'object') {
          for (const field of fields) {
            if (data[key][field] !== undefined) {
              return parseFloat(data[key][field]);
            }
          }
        }
      }
    }

    return 0;
  }

  /**
   * Normalize data to [0, 1] range
   */
  private normalizeData(data: number[]): number[] {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;

    if (range === 0) return data.map(() => 0.5);

    return data.map(v => (v - min) / range);
  }

  /**
   * Denormalize predictions back to original scale
   */
  private denormalizeData(normalized: number[], originalData: number[]): number[] {
    const min = Math.min(...originalData);
    const max = Math.max(...originalData);
    const range = max - min;

    return normalized.map(v => v * range + min);
  }

  /**
   * Build LSTM model for time series prediction
   */
 /**  private buildLSTMModel(config: MLModelConfig): tf.LayersModel {
    const model = tf.sequential();

    // Input layer with LSTM
    model.add(tf.layers.lstm({
      units: config.lstmUnits,
      returnSequences: true,
      inputShape: [config.lookbackPeriod, 1]
    }));

    // Dropout for regularization
    model.add(tf.layers.dropout({ rate: 0.2 }));

    // Second LSTM layer
    model.add(tf.layers.lstm({
      units: config.lstmUnits / 2,
      returnSequences: false
    }));

    // Dropout
    model.add(tf.layers.dropout({ rate: 0.2 }));

    // Dense output layer
    model.add(tf.layers.dense({
      units: config.predictionHorizon,
      activation: 'linear'
    }));

    // Compile model
    model.compile({
      optimizer: tf.train.adam(config.learningRate),
      loss: 'meanSquaredError',
      metrics: ['mse', 'mae']
    });

    return model;
  }**/

  /**
   * Train model for a device
   */
  /**async trainModel(device: Device): Promise<TrainingMetrics> {
    const state = this.getOrCreateState(device.id, device.name);

    if (state.isTraining) {
      throw new Error('Model is already training');
    }

    state.isTraining = true;
    logger.addLog('info', `ðŸ"„ Starting model training for ${device.name}...`);
    notificationService.info(`ðŸ"„ Training ML model for ${device.name}...`, 3000);

    try {
      // Fetch historical data
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

      const records = await indexedDBService.getSensorData({
        deviceId: device.id,
        timeRange: { start: startDate, end: endDate }
      });

      if (records.length < state.config.lookbackPeriod + state.config.predictionHorizon + 10) {
        throw new Error(`Insufficient data: need at least ${state.config.lookbackPeriod + state.config.predictionHorizon + 10} records, got ${records.length}`);
      }

      // Prepare data
      const { inputs, outputs } = this.prepareTimeSeriesData(records, state.config);

      if (inputs.length === 0) {
        throw new Error('No valid training sequences could be created');
      }

      // Convert to tensors
      const xs = tf.tensor3d(inputs.map(seq => seq.map(v => [v])));
      const ys = tf.tensor2d(outputs);

      // Build model
      if (state.model) {
        state.model.dispose();
      }
      state.model = this.buildLSTMModel(state.config);

      // Train model
      const history = await state.model.fit(xs, ys, {
        epochs: state.config.epochs,
        batchSize: state.config.batchSize,
        validationSplit: state.config.validationSplit,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
              logger.addLog('info', `Epoch ${epoch + 1}/${state.config.epochs} - loss: ${logs?.loss.toFixed(4)}`);
            }
          }
        }
      });

      // Extract final metrics
      const finalEpoch = history.history.loss.length - 1;
      const metrics: TrainingMetrics = {
        loss: history.history.loss[finalEpoch] as number,
        mse: history.history.mse[finalEpoch] as number,
        mae: history.history.mae[finalEpoch] as number,
        epochs: state.config.epochs,
        samples: inputs.length
      };

      state.trainingMetrics = metrics;
      state.lastTraining = new Date();

      // Cleanup tensors
      xs.dispose();
      ys.dispose();

      logger.addLog('success', `âœ… Model trained for ${device.name} (Loss: ${metrics.loss.toFixed(4)})`);
      notificationService.success(`âœ… ML model trained for ${device.name}`, 3000);

      return metrics;

    } catch (error: any) {
      logger.addLog('error', `Model training failed for ${device.name}: ${error.message}`);
      notificationService.error(`âŒ Training failed: ${error.message}`, 5000);
      throw error;
    } finally {
      state.isTraining = false;
    }
  }**/

  /**
 * Optimized train model for a device
 */
 async trainModel(device: Device): Promise<TrainingMetrics> {
    const state = this.getOrCreateState(device.id, device.name);

    if (state.isTraining) {
      throw new Error('Model is already training');
    }

    state.isTraining = true;
    logger.addLog('info', `🔧 Starting model training for ${device.name}...`);
    notificationService.info(`🔧 Training ML model for ${device.name}...`, 3000);

    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 2 * 24 * 60 * 60 * 1000);

      const MAX_RECORDS = 2000;
      let records = await indexedDBService.getSensorData({
        deviceId: device.id,
        timeRange: { start: startDate, end: endDate },
        limit: MAX_RECORDS
      });

      if (records.length > MAX_RECORDS) {
        const step = Math.ceil(records.length / MAX_RECORDS);
        records = records.filter((_, i) => i % step === 0);
      }

      const minRequired = state.config.lookbackPeriod + state.config.predictionHorizon + 10;
      if (records.length < minRequired) {
        throw new Error(
          `Insufficient data: need at least ${minRequired} records, got ${records.length}`
        );
      }

      // Use optimized preparation method with stride
      const { inputs, outputs } = this.prepareTimeSeriesDataOptimized(
        records,
        state.config,
        3
      );

      if (inputs.length === 0) {
        throw new Error('No valid training sequences could be created');
      }

      const MAX_SEQUENCES = 500;
      let finalInputs = inputs;
      let finalOutputs = outputs;

      if (inputs.length > MAX_SEQUENCES) {
        const step = Math.floor(inputs.length / MAX_SEQUENCES);
        finalInputs = inputs.filter((_, i) => i % step === 0);
        finalOutputs = outputs.filter((_, i) => i % step === 0);
      }

      if (state.model) {
        state.model.dispose();
      }
      // Use optimized model builder
      state.model = this.buildOptimizedLSTMModel(state.config);

      const reducedEpochs = Math.min(state.config.epochs, 20);
      let bestLoss = Infinity;
      let patienceCounter = 0;
      const patience = 3;

      const xs = tf.tensor3d(finalInputs.map(seq => seq.map(v => [v])));
      const ys = tf.tensor2d(finalOutputs);

      try {
        const history = await state.model!.fit(xs, ys, {
          epochs: reducedEpochs,
          batchSize: state.config.batchSize,
          validationSplit: state.config.validationSplit,
          shuffle: true,
          callbacks: {
            onEpochEnd: async (epoch, logs) => {
              const currentLoss = logs?.loss || Infinity;

              if (epoch % 5 === 0 || epoch === reducedEpochs - 1) {
                logger.addLog(
                  'info',
                  `Epoch ${epoch + 1}/${reducedEpochs} - loss: ${currentLoss.toFixed(4)}, val_loss: ${logs?.val_loss?.toFixed(4) || 'N/A'}`
                );
              }

              if (currentLoss < bestLoss - 0.001) {
                bestLoss = currentLoss;
                patienceCounter = 0;
              } else {
                patienceCounter++;
                if (patienceCounter >= patience) {
                  logger.addLog('info', '⏹️ Early stopping triggered');
                  state.model!.stopTraining = true;
                }
              }

              if (epoch % 5 === 0) {
                await tf.nextFrame();
              }
            }
          }
        });

        xs.dispose();
        ys.dispose();

        const finalEpoch = history.history.loss.length - 1;
        const metrics: TrainingMetrics = {
          loss: history.history.loss[finalEpoch] as number,
          mse: (history.history.mse?.[finalEpoch] as number) || (history.history.loss[finalEpoch] as number),
          mae: (history.history.mae?.[finalEpoch] as number) || 0,
          epochs: finalEpoch + 1,
          samples: finalInputs.length
        };

        state.trainingMetrics = metrics;
        state.lastTraining = new Date();

        logger.addLog(
          'success',
          `✅ Model trained for ${device.name} (Loss: ${metrics.loss.toFixed(4)}, Samples: ${metrics.samples})`
        );
        notificationService.success(`✅ ML model trained for ${device.name}`, 3000);

        return metrics;

      } catch (tensorError: any) {
        xs.dispose();
        ys.dispose();
        throw tensorError;
      }

    } catch (error: any) {
      logger.addLog('error', `Model training failed for ${device.name}: ${error.message}`);
      notificationService.error(`❌ Training failed: ${error.message}`, 5000);
      throw error;
    } finally {
      state.isTraining = false;
      if (tf.engine().memory().numTensors > 100) {
        await tf.nextFrame();
      }
    }
  }

/**
 * OPTIMIZATION 4: Optimized time series data preparation with stride
 */
private prepareTimeSeriesDataOptimized(
  records: SensorDataRecord[],
  config: MLModelConfig,
  stride: number = 1
): { inputs: number[][]; outputs: number[][] } {
  const values = records.map(r => this.extractNumericValue(r.data));
  const normalized = this.normalizeData(values);

  const inputs: number[][] = [];
  const outputs: number[][] = [];

  const maxIndex = normalized.length - config.lookbackPeriod - config.predictionHorizon;
  for (let i = 0; i < maxIndex; i += stride) {
    const input = normalized.slice(i, i + config.lookbackPeriod);
    const output = normalized.slice(
      i + config.lookbackPeriod,
      i + config.lookbackPeriod + config.predictionHorizon
    );
    inputs.push(input);
    outputs.push(output);
  }

  return { inputs, outputs };
}

/**
 * OPTIMIZATION 5: Build smaller, more efficient LSTM model
 */
private buildOptimizedLSTMModel(config: MLModelConfig): tf.LayersModel {
  const model = tf.sequential();

  const units = Math.min(config.lstmUnits, 16);

  model.add(tf.layers.lstm({
    units: units,
    returnSequences: false,
    inputShape: [config.lookbackPeriod, 1],
    kernelInitializer: 'glorotNormal',
    recurrentInitializer: 'orthogonal'
  }));

  model.add(tf.layers.dropout({ rate: 0.15 }));

  model.add(tf.layers.dense({
    units: config.predictionHorizon,
    activation: 'linear',
    kernelInitializer: 'glorotNormal'
  }));

  model.compile({
    optimizer: tf.train.adam(config.learningRate),
    loss: 'meanSquaredError',
    metrics: ['mae']
  });

  return model;
}

  /**
   * Make predictions for future time steps
   */
 /** async predict(device: Device, steps: number = 10): Promise<PredictionResult[]> {
    const state = this.getOrCreateState(device.id, device.name);

    if (!state.model) {
      throw new Error('Model not trained. Train the model first.');
    }

    try {
      // Fetch recent data
      const records = await indexedDBService.getSensorData({
        deviceId: device.id,
        limit: state.config.lookbackPeriod
      });

      if (records.length < state.config.lookbackPeriod) {
        throw new Error(`Insufficient recent data: need ${state.config.lookbackPeriod}, got ${records.length}`);
      }

      // Extract and normalize values
      const recentValues = records.slice(-state.config.lookbackPeriod).map(r => this.extractNumericValue(r.data));
      const normalized = this.normalizeData(recentValues);

      // Create input tensor
      const inputTensor = tf.tensor3d([[normalized.map(v => [v])]]);

      // Make prediction
      const prediction = state.model.predict(inputTensor) as tf.Tensor;
      const predictedValues = await prediction.data();

      // Cleanup
      inputTensor.dispose();
      prediction.dispose();

      // Denormalize predictions
      const denormalized = this.denormalizeData(Array.from(predictedValues), recentValues);

      // Calculate confidence intervals (simplified using historical variance)
      const variance = this.calculateVariance(recentValues);
      const stdDev = Math.sqrt(variance);

      // Generate results
      const lastTimestamp = records[records.length - 1].timestamp;
      const avgInterval = this.calculateAverageInterval(records);

      const results: PredictionResult[] = denormalized.slice(0, steps).map((value, i) => ({
        timestamp: new Date(lastTimestamp + (i + 1) * avgInterval),
        predictedValue: value,
        confidence: Math.max(0.5, 1 - (i * 0.05)), // Confidence decreases with distance
        lowerBound: value - 1.96 * stdDev,
        upperBound: value + 1.96 * stdDev
      }));

      logger.addLog('success', `ðŸ"® Generated ${steps} predictions for ${device.name}`);
      return results;

    } catch (error: any) {
      logger.addLog('error', `Prediction failed for ${device.name}: ${error.message}`);
      throw error;
    }
  }**/

   /**
 * Make predictions for future time steps
 */
async predict(device: Device, steps: number = 10): Promise<PredictionResult[]> {
  const state = this.getOrCreateState(device.id, device.name);

  if (!state.model) {
    throw new Error('Model not trained. Train the model first.');
  }

  try {
    // Fetch recent data
    const records = await indexedDBService.getSensorData({
      deviceId: device.id,
      limit: state.config.lookbackPeriod
    });

    if (records.length < state.config.lookbackPeriod) {
      throw new Error(`Insufficient recent data: need ${state.config.lookbackPeriod}, got ${records.length}`);
    }

    // Extract and normalize values
    const recentValues = records.slice(-state.config.lookbackPeriod).map(r => this.extractNumericValue(r.data));
    const normalized = this.normalizeData(recentValues);

    // Create input tensor with proper shape: [batch_size, timesteps, features]
    // Shape should be [1, lookbackPeriod, 1]
    const inputData: number[][][] = [
      normalized.map(v => [v])  // Convert each number to [number]
    ];

    const inputTensor = tf.tensor3d(inputData);

    // Make prediction
    const prediction = state.model.predict(inputTensor) as tf.Tensor;
    const predictedValues = await prediction.data();

    // Cleanup
    inputTensor.dispose();
    prediction.dispose();

    // Denormalize predictions
    const denormalized = this.denormalizeData(Array.from(predictedValues), recentValues);

    // Calculate confidence intervals (simplified using historical variance)
    const variance = this.calculateVariance(recentValues);
    const stdDev = Math.sqrt(variance);

    // Generate results
    const lastTimestamp = records[records.length - 1].timestamp;
    const avgInterval = this.calculateAverageInterval(records);

    const results: PredictionResult[] = denormalized.slice(0, steps).map((value, i) => ({
      timestamp: new Date(lastTimestamp + (i + 1) * avgInterval),
      predictedValue: value,
      confidence: Math.max(0.5, 1 - (i * 0.05)), // Confidence decreases with distance
      lowerBound: value - 1.96 * stdDev,
      upperBound: value + 1.96 * stdDev
    }));

    logger.addLog('success', `📈 Generated ${steps} predictions for ${device.name}`);
    return results;

  } catch (error: any) {
    logger.addLog('error', `Prediction failed for ${device.name}: ${error.message}`);
    throw error;
  }
}

  /**
   * Detect anomalies in recent data
   */
  async detectAnomalies(device: Device, windowSize: number = 50): Promise<AnomalyResult[]> {
    const state = this.getOrCreateState(device.id, device.name);

    try {
      // Fetch recent data
      const records = await indexedDBService.getSensorData({
        deviceId: device.id,
        limit: windowSize
      });

      if (records.length < 10) {
        throw new Error('Insufficient data for anomaly detection');
      }

      const values = records.map(r => this.extractNumericValue(r.data));

      // Calculate statistics
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(this.calculateVariance(values));

      // Calculate expected range (mean ± threshold * stdDev)
      const expectedMin = mean - state.anomalyThreshold * stdDev;
      const expectedMax = mean + state.anomalyThreshold * stdDev;

      // Detect anomalies
      const results: AnomalyResult[] = records.map((record, i) => {
        const value = values[i];
        const zScore = Math.abs((value - mean) / stdDev);
        const isAnomaly = zScore > state.anomalyThreshold;

        return {
          timestamp: new Date(record.timestamp),
          value,
          isAnomaly,
          anomalyScore: zScore,
          threshold: state.anomalyThreshold,
          expectedRange: { min: expectedMin, max: expectedMax }
        };
      });

      // Log and notify if anomalies found
      const anomalyCount = results.filter(r => r.isAnomaly).length;
      if (anomalyCount > 0) {
        logger.addLog('warning', `âš ï¸ Detected ${anomalyCount} anomalies in ${device.name}`);
        notificationService.warning(
          `âš ï¸ ${anomalyCount} anomalies detected in ${device.name}`,
          4000
        );
      }

      return results;

    } catch (error: any) {
      logger.addLog('error', `Anomaly detection failed for ${device.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate variance of data
   */
  private calculateVariance(data: number[]): number {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const squaredDiffs = data.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / data.length;
  }

  /**
   * Calculate average interval between readings
   */
  private calculateAverageInterval(records: SensorDataRecord[]): number {
    if (records.length < 2) return 60000; // Default 1 minute

    const intervals = [];
    for (let i = 1; i < records.length; i++) {
      intervals.push(records[i].timestamp - records[i - 1].timestamp);
    }

    return intervals.reduce((a, b) => a + b, 0) / intervals.length;
  }

  /**
   * Get model state for a device
   */
  getModelState(deviceId: string): DeviceMLState | null {
    return this.models.get(deviceId) || null;
  }

  /**
   * Update model configuration
   */
  updateConfig(deviceId: string, config: Partial<MLModelConfig>): void {
    const state = this.models.get(deviceId);
    if (state) {
      state.config = { ...state.config, ...config };
      logger.addLog('info', `Updated ML config for device ${deviceId}`);
    }
  }

  /**
   * Delete model for a device
   */
  async deleteModel(deviceId: string): Promise<void> {
    const state = this.models.get(deviceId);
    if (state?.model) {
      state.model.dispose();
      logger.addLog('info', `ðŸ—'ï¸ Deleted ML model for device ${deviceId}`);
    }
    this.models.delete(deviceId);
  }

  /**
   * Queue device for training
   */
  queueTraining(deviceId: string): void {
    if (!this.trainingQueue.includes(deviceId)) {
      this.trainingQueue.push(deviceId);
      this.processTrainingQueue();
    }
  }

  /**
   * Process training queue
   */
  private async processTrainingQueue(): Promise<void> {
    if (this.isProcessingQueue || this.trainingQueue.length === 0) return;

    this.isProcessingQueue = true;

    while (this.trainingQueue.length > 0) {
      const deviceId = this.trainingQueue.shift()!;
      const state = this.models.get(deviceId);

      if (state && !state.isTraining) {
        try {
          // Note: We need the full device object, which should be passed through the state
          // For now, we'll skip training if device is not available
          logger.addLog('info', `Processing training queue for device ${deviceId}`);
        } catch (error: any) {
          logger.addLog('error', `Queue training failed for ${deviceId}: ${error.message}`);
        }
      }

      // Add delay between training runs to prevent overload
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.isProcessingQueue = false;
  }

  /**
   * Get TensorFlow.js backend info
   */
   getBackendInfo(): { backend: string; memory?: any } {
    return {
      backend: tf.getBackend(),
      memory: tf.memory()
    };
  }


  /**
   * Cleanup all models and free memory
   */
  cleanup(): void {
    for (const [, state] of this.models.entries()) {
      if (state.model) {
        state.model.dispose();
      }
    }
    this.models.clear();
    logger.addLog('info', 'ðŸ§¹ ML service cleanup completed');
  }
}

// Singleton instance
export const mlService = new MLService();