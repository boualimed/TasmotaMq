import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { supabaseConfigStyles } from '../styles/supabase-config.styles';
import { supabaseService } from '../services/supabase.service';
import { SupabaseSettings, DEFAULT_SUPABASE_SETTINGS } from '../models/supabase.model';
import { notificationService } from '../services/notification.service';

@customElement('supabase-config')
export class SupabaseConfig extends LitElement {
  static styles = supabaseConfigStyles;

  @state() private settings: SupabaseSettings = { ...DEFAULT_SUPABASE_SETTINGS };
  @state() private isLoading = false;
  @state() private isTesting = false;
  @state() private statusMessage = '';
  @state() private statusType: 'success' | 'error' | '' = '';
  @state() private stats = { insertCount: 0, errorCount: 0, queueSize: 0 };

  private statsInterval: any;

  connectedCallback() {
    super.connectedCallback();
    this.loadSettings();
    this.startStatsUpdater();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
  }

  private loadSettings(): void {
    const loaded = supabaseService.getSettings();
    if (loaded) {
      this.settings = { ...loaded };
    }
  }

  private startStatsUpdater(): void {
    this.statsInterval = setInterval(() => {
      this.stats = supabaseService.getStats();
    }, 2000);
  }

  private handleToggleEnable(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.settings = { ...this.settings, enabled: input.checked };
  }

  private handleConfigChange(e: Event, field: 'url' | 'anonKey' | 'serviceRoleKey'): void {
    const input = e.target as HTMLInputElement;
    this.settings = {
      ...this.settings,
      config: {
        ...this.settings.config,
        [field]: input.value
      }
    };
  }

  private handleStorageOptionChange(e: Event, field: 'storeMqttMessages' | 'storeDeviceStates'): void {
    const input = e.target as HTMLInputElement;
    this.settings = { ...this.settings, [field]: input.checked };
  }

  private handleNumberChange(e: Event, field: 'retentionDays' | 'batchSize' | 'batchInterval'): void {
    const input = e.target as HTMLInputElement;
    const value = parseInt(input.value) || 0;
    this.settings = { ...this.settings, [field]: value };
  }

  private async handleTestConnection(): Promise<void> {
    if (!this.validateConfig()) {
      this.statusType = 'error';
      this.statusMessage = 'Please fill in URL and Anon Key';
      return;
    }

    this.isTesting = true;
    this.statusMessage = 'Testing connection...';
    this.statusType = '';

    const result = await supabaseService.testConnection(this.settings.config);

    this.isTesting = false;

    if (result.success) {
      this.statusType = 'success';
      this.statusMessage = '✓ Connection successful! Supabase is configured correctly.';
      notificationService.success('Supabase connection test passed!', 3000);
    } else {
      this.statusType = 'error';
      this.statusMessage = `✗ Connection failed: ${result.error}`;
      notificationService.error(`Connection test failed: ${result.error}`, 5000);
    }
  }

  private async handleSaveSettings(): Promise<void> {
    if (!this.validateConfig()) {
      this.statusType = 'error';
      this.statusMessage = 'Please fill in required fields';
      return;
    }

    this.isLoading = true;

    if (this.settings.enabled) {
      const result = await supabaseService.initialize(this.settings.config);

      if (!result.success) {
        this.statusType = 'error';
        this.statusMessage = `Failed to initialize: ${result.error}`;
        this.isLoading = false;
        return;
      }
    }

    supabaseService.saveSettings(this.settings);

    this.isLoading = false;
    this.statusType = 'success';
    this.statusMessage = 'Supabase settings saved successfully!';
    notificationService.success('Supabase settings saved!', 3000);

    this.dispatchEvent(new CustomEvent('supabase-settings-saved', {
      detail: this.settings,
      bubbles: true,
      composed: true
    }));
  }

  private validateConfig(): boolean {
    return !!(this.settings.config.url && this.settings.config.anonKey);
  }

  private async handleFlushQueues(): Promise<void> {
    await supabaseService.flushAll();
    notificationService.info('Queues flushed to Supabase', 2000);
  }

  render() {
    return html`
      <div class="supabase-section">
        <div class="section-header">
          <div class="section-title">
            <span class="supabase-logo">⚡</span> Supabase Storage
          </div>
          <label class="toggle-switch">
            <input
              type="checkbox"
              .checked="${this.settings.enabled}"
              @change="${this.handleToggleEnable}"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>

        ${this.statusMessage ? html`
          <div class="status-banner ${this.statusType}">
            ${this.statusMessage}
          </div>
        ` : ''}

        <div class="info-box">
          <div class="info-box-title">📖 How to get Supabase Configuration</div>
          <div class="info-box-content">
            <ol>
              <li>Go to <a href="https://supabase.com/dashboard" target="_blank">Supabase Dashboard</a></li>
              <li>Create a new project or select existing one</li>
              <li>Go to Settings → API</li>
              <li>Copy <code>Project URL</code> and <code>anon public</code> key</li>
              <li>Run the SQL schema (see documentation)</li>
              <li>Configure Row Level Security policies</li>
            </ol>
          </div>
        </div>

        <div class="config-grid">
          <div class="config-item">
            <label class="config-label">
              Project URL <span class="required">*</span>
            </label>
            <input
              type="text"
              class="config-input"
              placeholder="https://xxxxx.supabase.co"
              .value="${this.settings.config.url}"
              @input="${(e: Event) => this.handleConfigChange(e, 'url')}"
              ?disabled="${!this.settings.enabled}"
            />
          </div>

          <div class="config-item">
            <label class="config-label">
              Anon Key (Public) <span class="required">*</span>
            </label>
            <input
              type="text"
              class="config-input"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              .value="${this.settings.config.anonKey}"
              @input="${(e: Event) => this.handleConfigChange(e, 'anonKey')}"
              ?disabled="${!this.settings.enabled}"
            />
          </div>

          <div class="config-item">
            <label class="config-label">
              Service Role Key (Optional)
            </label>
            <input
              type="password"
              class="config-input"
              placeholder="Keep this secret!"
              .value="${this.settings.config.serviceRoleKey || ''}"
              @input="${(e: Event) => this.handleConfigChange(e, 'serviceRoleKey')}"
              ?disabled="${!this.settings.enabled}"
            />
          </div>
        </div>

        ${this.settings.enabled ? html`
          <div class="storage-options">
            <div class="storage-option">
              <div class="checkbox-group">
                <input
                  type="checkbox"
                  class="checkbox"
                  id="storeMqtt"
                  .checked="${this.settings.storeMqttMessages}"
                  @change="${(e: Event) => this.handleStorageOptionChange(e, 'storeMqttMessages')}"
                />
                <label for="storeMqtt" class="checkbox-label">
                  Store MQTT Messages
                </label>
              </div>
              <div class="option-help">Real-time streaming to PostgreSQL</div>
            </div>

            <div class="storage-option">
              <div class="checkbox-group">
                <input
                  type="checkbox"
                  class="checkbox"
                  id="storeStates"
                  .checked="${this.settings.storeDeviceStates}"
                  @change="${(e: Event) => this.handleStorageOptionChange(e, 'storeDeviceStates')}"
                />
                <label for="storeStates" class="checkbox-label">
                  Store Device States
                </label>
              </div>
              <div class="option-help">Track current device status</div>
            </div>

            <div class="storage-option">
              <label class="config-label">Retention (days)</label>
              <input
                type="number"
                class="number-input"
                min="1"
                max="365"
                .value="${this.settings.retentionDays}"
                @input="${(e: Event) => this.handleNumberChange(e, 'retentionDays')}"
              />
              <div class="option-help">Auto-cleanup old records</div>
            </div>

            <div class="storage-option">
              <label class="config-label">Batch Size</label>
              <input
                type="number"
                class="number-input"
                min="10"
                max="1000"
                .value="${this.settings.batchSize}"
                @input="${(e: Event) => this.handleNumberChange(e, 'batchSize')}"
              />
              <div class="option-help">Messages per batch</div>
            </div>

            <div class="storage-option">
              <label class="config-label">Batch Interval (ms)</label>
              <input
                type="number"
                class="number-input"
                min="1000"
                max="60000"
                step="1000"
                .value="${this.settings.batchInterval}"
                @input="${(e: Event) => this.handleNumberChange(e, 'batchInterval')}"
              />
              <div class="option-help">Time between flushes</div>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${this.stats.insertCount}</div>
              <div class="stat-label">Inserted</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${this.stats.errorCount}</div>
              <div class="stat-label">Errors</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${this.stats.queueSize}</div>
              <div class="stat-label">Queued</div>
            </div>
          </div>
        ` : ''}

        <div class="button-group">
          ${this.settings.enabled ? html`
            <button
              class="btn btn-secondary"
              @click="${this.handleFlushQueues}"
              ?disabled="${this.isLoading}"
            >
              🔄 Flush Queues
            </button>
          ` : ''}
          <button
            class="btn btn-primary"
            @click="${this.handleTestConnection}"
            ?disabled="${!this.settings.enabled || this.isTesting || !this.validateConfig()}"
          >
            ${this.isTesting ? html`<span class="loading-spinner"></span>` : '🔍'} Test Connection
          </button>
          <button
            class="btn btn-primary"
            @click="${this.handleSaveSettings}"
            ?disabled="${!this.settings.enabled || this.isLoading || !this.validateConfig()}"
          >
            ${this.isLoading ? html`<span class="loading-spinner"></span>` : '💾'} Save Settings
          </button>
        </div>
      </div>
    `;
  }
}