// ml-insights-modal.component.ts
// Modal for ML predictions, anomaly detection, and model training

import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Device } from '../../../models/device.model';
import { mlService, PredictionResult, AnomalyResult, TrainingMetrics, MLModelConfig } from '../../../services/ml-service';
import { logger } from '../../../utils/logger.util';
import { notificationService } from '../../../services/notification.service';
import { mlStyles } from '../../../styles/ml.styles';
type TabView = 'predictions' | 'anomalies' | 'training' | 'config';

@customElement('ml-insights-modal')
export class MLInsightsModal extends LitElement {
  @property({ type: Object }) device!: Device;
  @property({ type: Boolean }) open = false;

  @state() private activeTab: TabView = 'predictions';
  @state() private predictions: PredictionResult[] = [];
  @state() private anomalies: AnomalyResult[] = [];
  @state() private trainingMetrics: TrainingMetrics | null = null;
  @state() private isLoading = false;
  @state() private errorMessage = '';
  @state() private predictionSteps = 10;
  @state() private anomalyWindow = 50;
  @state() private autoRefresh = false;
  @state() private refreshInterval: any = null;

    static styles = mlStyles;



  // Model configuration
  @state() private modelConfig: MLModelConfig = {
    lookbackPeriod: 20,
    predictionHorizon: 10,
    lstmUnits: 32,
    learningRate: 0.001,
    epochs: 50,
    batchSize: 16,
    validationSplit: 0.2
    };

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stopAutoRefresh();
  }

  // =============================================================================
  // Render Methods
  // =============================================================================

  render(): TemplateResult {
    if (!this.open) return html``;

    return html`
      <div class="modal-overlay" @click="${this.handleClose}">
        <div class="modal-container" @click="${(e: Event) => e.stopPropagation()}">
          <!-- Header -->
          ${this.renderHeader()}

          <!-- Tabs -->
          ${this.renderTabs()}

          <!-- Content -->
          ${this.renderContent()}

          <!-- Footer -->
          ${this.renderFooter()}
        </div>
      </div>
    `;
  }

  private renderHeader(): TemplateResult {
    const modelState = mlService.getModelState(this.device.id);
    const isModelTrained = modelState?.model !== null;

    return html`
      <div class="modal-header">
        <div class="modal-title">
          <span class="modal-icon">ðŸ§ </span>
          <div>
            <h2>ML Insights: ${this.device.name}</h2>
            <p class="modal-subtitle">
              ${isModelTrained
                ? html`âœ… Model trained ${modelState?.lastTraining ? this.formatRelativeTime(modelState.lastTraining) : 'recently'}`
                : html`âš ï¸ Model not trained yet`
              }
            </p>
          </div>
        </div>
        <button
          class="modal-close"
          @click="${this.handleClose}"
          aria-label="Close"
        >
          Ã—
        </button>
      </div>
    `;
  }

  private renderTabs(): TemplateResult {
    const tabs: Array<{ id: TabView; label: string; icon: string }> = [
      { id: 'predictions', label: 'Predictions', icon: 'ðŸ"®' },
      { id: 'anomalies', label: 'Anomalies', icon: 'âš ï¸' },
      { id: 'training', label: 'Training', icon: 'ðŸ"„' },
      { id: 'config', label: 'Config', icon: 'âš™ï¸' }
    ];

    return html`
      <div class="modal-tabs">
        ${tabs.map(tab => html`
          <button
            class="tab-button ${this.activeTab === tab.id ? 'active' : ''}"
            @click="${() => this.switchTab(tab.id)}"
          >
            <span class="tab-icon">${tab.icon}</span>
            <span class="tab-label">${tab.label}</span>
          </button>
        `)}
      </div>
    `;
  }

  private renderContent(): TemplateResult {
    return html`
      <div class="modal-content">
        ${this.errorMessage ? html`
          <div class="error-banner">
            <span class="error-icon">âŒ</span>
            <span>${this.errorMessage}</span>
            <button @click="${() => this.errorMessage = ''}">Ã—</button>
          </div>
        ` : ''}

        ${this.isLoading ? html`
          <div class="loading-container">
            <div class="spinner"></div>
            <p>Processing...</p>
          </div>
        ` : this.renderTabContent()}
      </div>
    `;
  }

  private renderTabContent(): TemplateResult {
    switch (this.activeTab) {
      case 'predictions':
        return this.renderPredictionsTab();
      case 'anomalies':
        return this.renderAnomaliesTab();
      case 'training':
        return this.renderTrainingTab();
      case 'config':
        return this.renderConfigTab();
      default:
        return html``;
    }
  }

  // =============================================================================
  // Predictions Tab
  // =============================================================================

  private renderPredictionsTab(): TemplateResult {
    const modelState = mlService.getModelState(this.device.id);

    if (!modelState?.model) {
      return html`
        <div class="empty-state">
          <div class="empty-icon">ðŸ"®</div>
          <h3>No Model Trained</h3>
          <p>Train a model first to generate predictions</p>
          <button
            class="button primary"
            @click="${() => this.switchTab('training')}"
          >
            Go to Training
          </button>
        </div>
      `;
    }

    return html`
      <div class="tab-content">
        <!-- Controls -->
        <div class="control-panel">
          <div class="control-group">
            <label>Prediction Steps:</label>
            <input
              type="number"
              min="1"
              max="50"
              .value="${this.predictionSteps}"
              @input="${(e: Event) => {
                this.predictionSteps = parseInt((e.target as HTMLInputElement).value);
              }}"
            />
          </div>

          <div class="control-group">
            <label>
              <input
                type="checkbox"
                .checked="${this.autoRefresh}"
                @change="${(e: Event) => {
                  this.autoRefresh = (e.target as HTMLInputElement).checked;
                  this.toggleAutoRefresh();
                }}"
              />
              Auto-refresh (30s)
            </label>
          </div>

          <button
            class="button secondary"
            @click="${this.handleGeneratePredictions}"
            ?disabled="${this.isLoading}"
          >
            ðŸ"® Generate Predictions
          </button>
        </div>

        <!-- Predictions List -->
        ${this.predictions.length > 0 ? html`
          <div class="predictions-container">
            <h3>Forecasted Values (Next ${this.predictions.length} readings)</h3>
            <div class="predictions-list">
              ${this.predictions.map((pred, index) => this.renderPrediction(pred, index))}
            </div>

            <!-- Summary Stats -->
            ${this.renderPredictionStats()}
          </div>
        ` : html`
          <div class="empty-state">
            <p>No predictions generated yet</p>
          </div>
        `}
      </div>
    `;
  }

  private renderPrediction(pred: PredictionResult, index: number): TemplateResult {
    const confidence = (pred.confidence * 100).toFixed(0);
    const unit = this.device.sensorConfig?.unit || '';

    return html`
      <div class="prediction-card">
        <div class="prediction-header">
          <span class="prediction-index">#${index + 1}</span>
          <span class="prediction-time">${this.formatTime(pred.timestamp)}</span>
        </div>

        <div class="prediction-value">
          <span class="value-main">${pred.predictedValue.toFixed(2)} ${unit}</span>
          <span class="value-confidence">${confidence}% confidence</span>
        </div>

        <div class="prediction-range">
          <span class="range-label">Expected Range:</span>
          <span class="range-values">
            ${pred.lowerBound.toFixed(2)} - ${pred.upperBound.toFixed(2)} ${unit}
          </span>
        </div>

        <!-- Confidence Bar -->
        <div class="confidence-bar">
          <div
            class="confidence-fill"
            style="width: ${confidence}%"
          ></div>
        </div>
      </div>
    `;
  }

  private renderPredictionStats(): TemplateResult {
    if (this.predictions.length === 0) return html``;

    const values = this.predictions.map(p => p.predictedValue);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const trend = values[values.length - 1] > values[0] ? 'âž¡' : 'âž¡';

    return html`
      <div class="stats-panel">
        <h4>Forecast Summary</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Average</span>
            <span class="stat-value">${avg.toFixed(2)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Min</span>
            <span class="stat-value">${min.toFixed(2)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Max</span>
            <span class="stat-value">${max.toFixed(2)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Trend</span>
            <span class="stat-value">${trend}</span>
          </div>
        </div>
      </div>
    `;
  }

  // =============================================================================
  // Anomalies Tab
  // =============================================================================

  private renderAnomaliesTab(): TemplateResult {
    return html`
      <div class="tab-content">
        <!-- Controls -->
        <div class="control-panel">
          <div class="control-group">
            <label>Window Size:</label>
            <input
              type="number"
              min="10"
              max="200"
              .value="${this.anomalyWindow}"
              @input="${(e: Event) => {
                this.anomalyWindow = parseInt((e.target as HTMLInputElement).value);
              }}"
            />
          </div>

          <button
            class="button secondary"
            @click="${this.handleDetectAnomalies}"
            ?disabled="${this.isLoading}"
          >
            âš ï¸ Detect Anomalies
          </button>
        </div>

        <!-- Anomalies List -->
        ${this.anomalies.length > 0 ? html`
          <div class="anomalies-container">
            <h3>Detected Anomalies</h3>
            ${this.renderAnomalyStats()}

            <div class="anomalies-list">
              ${this.anomalies
                .filter(a => a.isAnomaly)
                .map(anomaly => this.renderAnomaly(anomaly))}
            </div>

            ${this.anomalies.filter(a => a.isAnomaly).length === 0 ? html`
              <div class="success-state">
                <span class="success-icon">âœ…</span>
                <p>No anomalies detected in the last ${this.anomalyWindow} readings</p>
              </div>
            ` : ''}
          </div>
        ` : html`
          <div class="empty-state">
            <p>No anomaly detection run yet</p>
          </div>
        `}
      </div>
    `;
  }

  private renderAnomaly(anomaly: AnomalyResult): TemplateResult {
    const unit = this.device.sensorConfig?.unit || '';
    const severityClass = anomaly.anomalyScore > 4 ? 'critical' :
                         anomaly.anomalyScore > 3 ? 'high' : 'medium';

    return html`
      <div class="anomaly-card ${severityClass}">
        <div class="anomaly-header">
          <span class="anomaly-icon">âš ï¸</span>
          <span class="anomaly-time">${this.formatTime(anomaly.timestamp)}</span>
          <span class="severity-badge ${severityClass}">
            ${severityClass.toUpperCase()}
          </span>
        </div>

        <div class="anomaly-details">
          <div class="anomaly-value">
            <span class="label">Detected Value:</span>
            <span class="value">${anomaly.value.toFixed(2)} ${unit}</span>
          </div>

          <div class="anomaly-expected">
            <span class="label">Expected Range:</span>
            <span class="value">
              ${anomaly.expectedRange.min.toFixed(2)} - ${anomaly.expectedRange.max.toFixed(2)} ${unit}
            </span>
          </div>

          <div class="anomaly-score">
            <span class="label">Anomaly Score:</span>
            <span class="value">${anomaly.anomalyScore.toFixed(2)}Ïƒ</span>
          </div>
        </div>

        <!-- Severity Bar -->
        <div class="severity-bar">
          <div
            class="severity-fill ${severityClass}"
            style="width: ${Math.min(100, (anomaly.anomalyScore / 5) * 100)}%"
          ></div>
        </div>
      </div>
    `;
  }

  private renderAnomalyStats(): TemplateResult {
    const anomalyCount = this.anomalies.filter(a => a.isAnomaly).length;
    const totalCount = this.anomalies.length;
    const percentage = totalCount > 0 ? (anomalyCount / totalCount * 100).toFixed(1) : '0';

    return html`
      <div class="stats-panel">
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Total Readings</span>
            <span class="stat-value">${totalCount}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Anomalies</span>
            <span class="stat-value anomaly">${anomalyCount}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Anomaly Rate</span>
            <span class="stat-value">${percentage}%</span>
          </div>
        </div>
      </div>
    `;
  }

  // =============================================================================
  // Training Tab
  // =============================================================================

  private renderTrainingTab(): TemplateResult {
    const modelState = mlService.getModelState(this.device.id);
    const isTraining = modelState?.isTraining || false;
    const metrics = modelState?.trainingMetrics;

    return html`
      <div class="tab-content">
        <!-- Training Controls -->
        <div class="training-panel">
          <h3>Model Training</h3>
          <p>Train an LSTM model to predict future sensor values</p>

          <button
            class="button primary"
            @click="${this.handleTrainModel}"
            ?disabled="${isTraining || this.isLoading}"
          >
            ${isTraining ? 'ðŸ"„ Training...' : 'ðŸš€ Train Model'}
          </button>

          ${isTraining ? html`
            <div class="training-progress">
              <div class="spinner"></div>
              <p>Training in progress... This may take a few minutes.</p>
            </div>
          ` : ''}
        </div>

        <!-- Training Metrics -->
        ${metrics ? html`
          <div class="metrics-panel">
            <h3>Last Training Results</h3>
            <div class="metrics-grid">
              <div class="metric-card">
                <span class="metric-label">Loss</span>
                <span class="metric-value">${metrics.loss.toFixed(4)}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">MSE</span>
                <span class="metric-value">${metrics.mse.toFixed(4)}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">MAE</span>
                <span class="metric-value">${metrics.mae.toFixed(4)}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Epochs</span>
                <span class="metric-value">${metrics.epochs}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Samples</span>
                <span class="metric-value">${metrics.samples}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Trained</span>
                <span class="metric-value">
                  ${modelState?.lastTraining ? this.formatRelativeTime(modelState.lastTraining) : 'Never'}
                </span>
              </div>
            </div>

            ${this.renderModelQualityIndicator(metrics)}
          </div>
        ` : html`
          <div class="info-panel">
            <p>âš¡ No training history yet. Train a model to see metrics.</p>
          </div>
        `}

        <!-- Backend Info -->
        ${this.renderBackendInfo()}
      </div>
    `;
  }

  private renderModelQualityIndicator(metrics: TrainingMetrics): TemplateResult {
    const quality = metrics.loss < 0.01 ? 'excellent' :
                   metrics.loss < 0.05 ? 'good' :
                   metrics.loss < 0.1 ? 'fair' : 'poor';

                   const qualityIcons: Record<string, string> = {
                    excellent: '✅', // check mark
                    good: '👍',      // thumbs up
                    fair: '⚠️',     // warning
                    poor: '❌'       // cross mark
                  };


    return html`
      <div class="quality-indicator ${quality}">
        <span class="quality-icon">${qualityIcons[quality]}</span>
        <span class="quality-label">Model Quality: ${quality.toUpperCase()}</span>
      </div>
    `;
  }

  private renderBackendInfo(): TemplateResult {
    const info = mlService.getBackendInfo();

    return html`
      <div class="backend-info">
        <h4>TensorFlow.js Info</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Backend:</span>
            <span class="info-value">${info.backend}</span>
          </div>
          ${info.memory ? html`
            <div class="info-item">
              <span class="info-label">Tensors:</span>
              <span class="info-value">${info.memory.numTensors}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Memory:</span>
              <span class="info-value">${(info.memory.numBytes / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // =============================================================================
  // Config Tab
  // =============================================================================

  private renderConfigTab(): TemplateResult {
    return html`
      <div class="tab-content">
        <div class="config-panel">
          <h3>Model Configuration</h3>
          <p>Adjust model parameters (requires retraining)</p>

          <div class="config-form">
            <div class="form-group">
              <label>Lookback Period (readings):</label>
              <input
                type="number"
                min="5"
                max="100"
                .value="${this.modelConfig.lookbackPeriod}"
                @input="${(e: Event) => {
                  this.modelConfig.lookbackPeriod = parseInt((e.target as HTMLInputElement).value);
                }}"
              />
              <span class="form-help">How many past values to consider for predictions</span>
            </div>

            <div class="form-group">
              <label>Prediction Horizon (steps):</label>
              <input
                type="number"
                min="1"
                max="50"
                .value="${this.modelConfig.predictionHorizon}"
                @input="${(e: Event) => {
                  this.modelConfig.predictionHorizon = parseInt((e.target as HTMLInputElement).value);
                }}"
              />
              <span class="form-help">How many future steps to predict</span>
            </div>

            <div class="form-group">
              <label>LSTM Units:</label>
              <input
                type="number"
                min="8"
                max="128"
                step="8"
                .value="${this.modelConfig.lstmUnits}"
                @input="${(e: Event) => {
                  this.modelConfig.lstmUnits = parseInt((e.target as HTMLInputElement).value);
                }}"
              />
              <span class="form-help">Model complexity (higher = more powerful but slower)</span>
            </div>

            <div class="form-group">
              <label>Learning Rate:</label>
              <input
                type="number"
                min="0.0001"
                max="0.1"
                step="0.0001"
                .value="${this.modelConfig.learningRate}"
                @input="${(e: Event) => {
                  this.modelConfig.learningRate = parseFloat((e.target as HTMLInputElement).value);
                }}"
              />
              <span class="form-help">Training step size</span>
            </div>

            <div class="form-group">
              <label>Epochs:</label>
              <input
                type="number"
                min="10"
                max="200"
                step="10"
                .value="${this.modelConfig.epochs}"
                @input="${(e: Event) => {
                  this.modelConfig.epochs = parseInt((e.target as HTMLInputElement).value);
                }}"
              />
              <span class="form-help">Training iterations</span>
            </div>

            <div class="form-group">
              <label>Batch Size:</label>
              <input
                type="number"
                min="4"
                max="64"
                step="4"
                .value="${this.modelConfig.batchSize}"
                @input="${(e: Event) => {
                  this.modelConfig.batchSize = parseInt((e.target as HTMLInputElement).value);
                }}"
              />
              <span class="form-help">Training batch size</span>
            </div>

            <div class="form-group">
              <label>Validation Split:</label>
              <input
                type="number"
                min="0.1"
                max="0.5"
                step="0.05"
                .value="${this.modelConfig.validationSplit}"
                @input="${(e: Event) => {
                  this.modelConfig.validationSplit = parseFloat((e.target as HTMLInputElement).value);
                }}"
              />
              <span class="form-help">Fraction of data for validation (0.2 = 20%)</span>
            </div>

            <button
              class="button primary"
              @click="${this.handleSaveConfig}"
            >
              ðŸ'¾ Save Configuration
            </button>

            <button
              class="button secondary"
              @click="${this.handleResetConfig}"
            >
              ðŸ"„ Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // =============================================================================
  // Footer
  // =============================================================================

  private renderFooter(): TemplateResult {
    return html`
      <div class="modal-footer">
        <button class="button secondary" @click="${this.handleClose}">
          Close
        </button>
      </div>
    `;
  }

  // =============================================================================
  // Event Handlers
  // =============================================================================

  private switchTab(tab: TabView): void {
    this.activeTab = tab;
  }

  private async handleGeneratePredictions(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      this.predictions = await mlService.predict(this.device, this.predictionSteps);
      logger.addLog('success', `Generated ${this.predictions.length} predictions for ${this.device.name}`);
      notificationService.success(`ðŸ"® ${this.predictions.length} predictions generated`, 2500);
    } catch (error: any) {
      this.errorMessage = error.message;
      notificationService.error(`Failed to generate predictions: ${error.message}`, 4000);
    } finally {
      this.isLoading = false;
    }
  }

  private async handleDetectAnomalies(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      this.anomalies = await mlService.detectAnomalies(this.device, this.anomalyWindow);
      const anomalyCount = this.anomalies.filter(a => a.isAnomaly).length;
      logger.addLog('info', `Detected ${anomalyCount} anomalies in ${this.device.name}`);
      notificationService.info(`âš ï¸ Found ${anomalyCount} anomalies`, 2500);
    } catch (error: any) {
      this.errorMessage = error.message;
      notificationService.error(`Failed to detect anomalies: ${error.message}`, 4000);
    } finally {
      this.isLoading = false;
    }
  }

  private async handleTrainModel(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Update config before training
      mlService.updateConfig(this.device.id, this.modelConfig);

      this.trainingMetrics = await mlService.trainModel(this.device);
      logger.addLog('success', `Model trained successfully for ${this.device.name}`);
      notificationService.success(`âœ… Model trained (Loss: ${this.trainingMetrics.loss.toFixed(4)})`, 3000);
    } catch (error: any) {
      this.errorMessage = error.message;
      notificationService.error(`Training failed: ${error.message}`, 5000);
    } finally {
      this.isLoading = false;
    }
  }

  private handleSaveConfig(): void {
    mlService.updateConfig(this.device.id, this.modelConfig);
    logger.addLog('info', `ML config saved for ${this.device.name}`);
    notificationService.success('âœ… Configuration saved', 2000);
  }

  private handleResetConfig(): void {
    this.modelConfig = {
      lookbackPeriod: 20,
      predictionHorizon: 10,
      lstmUnits: 32,
      learningRate: 0.001,
      epochs: 50,
      batchSize: 16,
      validationSplit: 0.2
    };
    notificationService.info('ðŸ"„ Config reset to defaults', 2000);
  }

  private toggleAutoRefresh(): void {
    if (this.autoRefresh) {
      this.refreshInterval = setInterval(() => {
        this.handleGeneratePredictions();
      }, 30000);
      notificationService.info('ðŸ"„ Auto-refresh enabled (30s)', 2500);
    } else {
      this.stopAutoRefresh();
      notificationService.info('âž¡ Auto-refresh disabled', 2000);
    }
  }

  private stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  private handleClose(): void {
    this.stopAutoRefresh();
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  private formatTime(date: Date): string {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private formatRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  }
}