import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ollamaAIService, OllamaConfig, DEFAULT_OLLAMA_CONFIG } from '../services/ollama-ai.service';
import { notificationService } from '../services/notification.service';
import { storageService } from '../services/storage-service';
import { logger } from '../utils/logger.util';
import { aiSettings } from '../styles/ai-settings.styles';

@customElement('ai-settings')
export class AISettings extends LitElement {
  static styles = aiSettings;

  @state() private config: OllamaConfig = { ...DEFAULT_OLLAMA_CONFIG };
  @state() private isChecking = false;
  @state() private isAvailable = false;
  @state() private availableModels: string[] = [];
  @state() private customModel = '';

  connectedCallback() {
    super.connectedCallback();
    // Load config from storage first
    this.loadConfig();
    // Then load available models
    this.loadAvailableModels();
  }

  /**
   * Load configuration from storage
   */
  private loadConfig(): void {
    const savedConfig = storageService.loadAIConfig();
    if (savedConfig) {
      this.config = savedConfig;
      logger.addLog('success', 'AI configuration loaded from storage');
    } else {
      this.config = ollamaAIService.getConfig();
    }
  }

  /**
   * Save configuration to storage
   */
  private saveConfig(): void {
    storageService.saveAIConfig(this.config);
    // Notify parent component
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this.config },
      bubbles: true,
      composed: true
    }));
  }

  private async loadAvailableModels(): Promise<void> {
    try {
      const response = await fetch(`http://${this.config.host}:${this.config.port}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        this.availableModels = data.models?.map((m: any) => m.name) || [];
        logger.addLog('info', `Found ${this.availableModels.length} Ollama models`);
      }
    } catch (error) {
      console.log('Could not fetch models - Ollama may not be running');
    }
  }

  private handleConfigChange(field: keyof OllamaConfig, value: any): void {
    this.config = { ...this.config, [field]: value };
    ollamaAIService.updateConfig({ [field]: value });

    // Save immediately on every change
    this.saveConfig();
  }

  private async handleTestConnection(): Promise<void> {
    this.isChecking = true;
    notificationService.info('🤖 Testing Ollama connection...', 2000);

    try {
      const available = await ollamaAIService.checkAvailability();
      this.isAvailable = available;

      if (available) {
        // Reload available models
        await this.loadAvailableModels();

        notificationService.success(
          `✅ Ollama is running! Found ${this.availableModels.length} models.`,
          3000
        );
        logger.addLog('success', 'Ollama connection successful');
      } else {
        notificationService.error('❌ Cannot connect to Ollama. Make sure it\'s running.', 5000);
        logger.addLog('error', 'Ollama connection failed');
      }
    } catch (error: any) {
      notificationService.error(`❌ Connection error: ${error.message}`, 5000);
      logger.addLog('error', `Ollama test failed: ${error.message}`);
      this.isAvailable = false;
    } finally {
      this.isChecking = false;
    }
  }

  private handleEnableToggle(enabled: boolean): void {
    this.handleConfigChange('enabled', enabled);

    if (enabled) {
      notificationService.success('🤖 AI analysis enabled', 3000);
      logger.addLog('success', 'AI analysis enabled');
    } else {
      notificationService.info('🤖 AI analysis disabled', 3000);
      logger.addLog('info', 'AI analysis disabled');
    }
  }

  private handleModelSelect(model: string): void {
    this.handleConfigChange('model', model);
    this.customModel = ''; // Clear custom input when selecting from list
    notificationService.info(`🤖 Model changed to ${model}`, 2000);
  }

  private handleCustomModelInput(value: string): void {
    this.customModel = value;
  }

  private handleSetCustomModel(): void {
    if (this.customModel.trim()) {
      this.handleConfigChange('model', this.customModel.trim());
      notificationService.success(`🤖 Custom model set: ${this.customModel}`, 3000);
    }
  }

  render() {
    const commonModels = ['llama3.2', 'llama3.2:1b', 'llama3.1', 'mistral', 'phi3', 'deepseek-r1'];
    const displayModels = this.availableModels.length > 0 ? this.availableModels : commonModels;

    return html`
      <div class="ai-section">
        <div class="ai-header">
          <div class="ai-title">
            🤖 AI Analysis
          </div>
          <div class="ai-status">
            <span class="status-dot ${this.config.enabled ? 'active' : ''}"></span>
            ${this.config.enabled ? 'Active' : 'Inactive'}
          </div>
        </div>

        <div class="info-banner">
          💡 AI-powered analysis interprets sensor data and device behavior to provide intelligent insights and recommendations.
          <br>Requires <code>ollama</code> running locally.
        </div>

        <div class="checkbox-group">
          <input
            type="checkbox"
            class="checkbox"
            .checked="${this.config.enabled}"
            @change="${(e: Event) => this.handleEnableToggle((e.target as HTMLInputElement).checked)}"
          />
          <label class="form-label">Enable AI Analysis</label>
        </div>

        <div class="form-group">
          <label class="form-label">Ollama Host</label>
          <input
            type="text"
            class="form-input"
            .value="${this.config.host}"
            @input="${(e: Event) => this.handleConfigChange('host', (e.target as HTMLInputElement).value)}"
            ?disabled="${!this.config.enabled}"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Ollama Port</label>
          <input
            type="number"
            class="form-input"
            .value="${this.config.port}"
            @input="${(e: Event) => this.handleConfigChange('port', parseInt((e.target as HTMLInputElement).value))}"
            ?disabled="${!this.config.enabled}"
          />
        </div>

        <div class="form-group">
          <label class="form-label">
            AI Model
            ${this.availableModels.length > 0 ? html`
              <span style="font-size: 0.75rem; color: rgba(255,255,255,0.7)">
                (${this.availableModels.length} installed)
              </span>
            ` : ''}
          </label>
          <div class="model-selector">
            ${displayModels.map(model => html`
              <div
                class="model-option ${this.config.model === model ? 'selected' : ''}"
                @click="${() => this.config.enabled && this.handleModelSelect(model)}"
              >
                ${model}
              </div>
            `)}
          </div>

          <!-- Custom Model Input -->
          <div style="margin-top: 15px;">
            <label class="form-label" style="font-size: 0.85rem;">
              Or enter custom model name:
            </label>
            <div style="display: flex; gap: 8px;">
              <input
                type="text"
                class="form-input"
                placeholder="e.g., deepseek-v3:671b-cloud"
                .value="${this.customModel}"
                @input="${(e: Event) => this.handleCustomModelInput((e.target as HTMLInputElement).value)}"
                ?disabled="${!this.config.enabled}"
                style="flex: 1;"
              />
              <button
                class="button primary"
                @click="${this.handleSetCustomModel}"
                ?disabled="${!this.config.enabled || !this.customModel.trim()}"
                style="flex: 0 0 auto; padding: 10px 20px;"
              >
                Set
              </button>
            </div>
            ${this.config.model && !displayModels.includes(this.config.model) ? html`
              <div style="margin-top: 8px; font-size: 0.8rem; color: rgba(255,255,255,0.9);">
                ✅ Current: <strong>${this.config.model}</strong>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="checkbox-group">
          <input
            type="checkbox"
            class="checkbox"
            .checked="${this.config.autoAnalyze}"
            @change="${(e: Event) => this.handleConfigChange('autoAnalyze', (e.target as HTMLInputElement).checked)}"
            ?disabled="${!this.config.enabled}"
          />
          <label class="form-label">
            Auto-analyze device data
            <div class="help-text">
              Automatically analyze data at regular intervals
            </div>
          </label>
        </div>

        ${this.config.autoAnalyze ? html`
          <div class="form-group">
            <label class="form-label">Analysis Interval (seconds)</label>
            <input
              type="number"
              class="form-input"
              min="10"
              max="3600"
              .value="${this.config.analysisInterval}"
              @input="${(e: Event) => this.handleConfigChange('analysisInterval', parseInt((e.target as HTMLInputElement).value))}"
              ?disabled="${!this.config.enabled}"
            />
            <div class="help-text">
              How often to analyze accumulated data (10-3600 seconds)
            </div>
          </div>
        ` : ''}

        <div class="button-group">
          <button
            class="button secondary"
            @click="${this.handleTestConnection}"
            ?disabled="${!this.config.enabled || this.isChecking}"
          >
            ${this.isChecking ? '⏳ Testing...' : '🔍 Test Connection'}
          </button>
        </div>

        ${!this.config.enabled ? html`
          <div class="help-text" style="margin-top: 15px; text-align: center;">
            ℹ️ Enable AI analysis to start monitoring your devices intelligently
          </div>
        ` : ''}
      </div>
    `;
  }
}