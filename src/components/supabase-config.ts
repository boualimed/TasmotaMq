import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { SupabaseSettings, DEFAULT_SUPABASE_SETTINGS } from '../models/supabase.model';
import { serviceManager } from '../services/service-manager';
import { notificationService } from '../services/notification.service';
import { logger } from '../utils/logger.util';
import { supabaseStyles } from '../styles/supabase.styles';

@customElement('supabase-config')
export class SupabaseConfig extends LitElement {
  static styles = supabaseStyles;

  @property({ type: Object }) settings: SupabaseSettings = { ...DEFAULT_SUPABASE_SETTINGS };
  @state() private isTesting = false;
  @state() private isSaving = false;

  connectedCallback() {
    super.connectedCallback();
    // Load settings without triggering update
    this.loadSettings();
  }

  private loadSettings(): void {
    const saved = localStorage.getItem('supabaseSettings');
    if (saved) {
      try {
        this.settings = JSON.parse(saved);
      } catch (error) {
        console.error('Failed to load Supabase settings:', error);
      }
    }
  }

  private handleSettingChange(field: string, value: any): void {
    const parts = field.split('.');
    if (parts.length === 1) {
      this.settings = { ...this.settings, [parts[0]]: value };
    } else if (parts.length === 2) {
      this.settings = {
        ...this.settings,
        [parts[0]]: {
          ...(this.settings[parts[0] as keyof SupabaseSettings] as any),
          [parts[1]]: value
        }
      };
    }
  }

  private async handleTestConnection(): Promise<void> {
    this.isTesting = true;

    try {
      notificationService.info('🔍 Testing Supabase connection...', 2000);

      const { createClient } = await import('@supabase/supabase-js');
      const testClient = createClient(this.settings.config.url, this.settings.config.anonKey);

      const { error } = await testClient
        .from('mqtt_messages')
        .select('count', { count: 'exact', head: true })
        .limit(0);

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }

      notificationService.success('✅ Connection successful!', 3000);
      logger.addLog('success', 'Supabase connection test passed');
    } catch (error: any) {
      notificationService.error(`❌ Connection failed: ${error.message}`, 5000);
      logger.addLog('error', `Supabase test failed: ${error.message}`);
    } finally {
      this.isTesting = false;
    }
  }

  private async handleSave(): Promise<void> {
    this.isSaving = true;

    try {
      // Use service manager to properly initialize
      await serviceManager.updateSupabaseSettings(this.settings);

      notificationService.success('✅ Settings saved successfully!', 3000);
      logger.addLog('success', 'Supabase settings saved');

      // Emit event to parent
      this.dispatchEvent(new CustomEvent('settings-saved', {
        detail: { settings: this.settings },
        bubbles: true,
        composed: true
      }));

    } catch (error: any) {
      notificationService.error(`❌ Failed to save: ${error.message}`, 5000);
      logger.addLog('error', `Settings save failed: ${error.message}`);
    } finally {
      this.isSaving = false;
    }
  }

  private handleBack(): void {
    this.dispatchEvent(new CustomEvent('navigate-back', {
      bubbles: true,
      composed: true
    }));
  }

  render() {
    return html`
      <div class="header">
        <button class="back-button" @click="${this.handleBack}">←</button>
        <div class="title">📊 Supabase Configuration</div>
        <span class="status-badge ${this.settings.enabled ? 'enabled' : 'disabled'}">
          ${this.settings.enabled ? '● Enabled' : '○ Disabled'}
        </span>
      </div>

      <div class="info-box">
        <p>
          <strong>Supabase Integration:</strong> Store and analyze your MQTT data in the cloud.
          Get real-time insights, historical data, and advanced analytics.
        </p>
      </div>

      <div class="section">
        <div class="section-title">🔑 Connection Settings</div>

        <div class="checkbox-group">
          <input
            type="checkbox"
            class="checkbox"
            .checked="${this.settings.enabled}"
            @change="${(e: Event) => this.handleSettingChange('enabled', (e.target as HTMLInputElement).checked)}"
          />
          <label class="form-label">Enable Supabase Integration</label>
        </div>

        <div class="form-group">
          <label class="form-label">Project URL</label>
          <input
            type="text"
            class="form-input"
            placeholder="https://xxxxx.supabase.co"
            .value="${this.settings.config?.url || ''}"
            @input="${(e: Event) => this.handleSettingChange('config.url', (e.target as HTMLInputElement).value)}"
            ?disabled="${!this.settings.enabled}"
          />
          <div class="help-text">
            Find this in your Supabase project settings → API → Project URL
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Anon Key</label>
          <input
            type="password"
            class="form-input"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            .value="${this.settings.config?.anonKey || ''}"
            @input="${(e: Event) => this.handleSettingChange('config.anonKey', (e.target as HTMLInputElement).value)}"
            ?disabled="${!this.settings.enabled}"
          />
          <div class="help-text">
            Find this in your Supabase project settings → API → Project API keys → anon public
          </div>
        </div>

        <div class="button-group">
          <button
            class="button secondary"
            @click="${this.handleTestConnection}"
            ?disabled="${!this.settings.enabled || this.isTesting}"
          >
            ${this.isTesting ? '⏳ Testing...' : '🔍 Test Connection'}
          </button>
        </div>
      </div>

      <div class="section">
        <div class="section-title">⚙️ Data Storage Options</div>

        <div class="checkbox-group">
          <input
            type="checkbox"
            class="checkbox"
            .checked="${this.settings.storeMqttMessages}"
            @change="${(e: Event) => this.handleSettingChange('storeMqttMessages', (e.target as HTMLInputElement).checked)}"
            ?disabled="${!this.settings.enabled}"
          />
          <label class="form-label">Store MQTT Messages</label>
        </div>

        <div class="checkbox-group">
          <input
            type="checkbox"
            class="checkbox"
            .checked="${this.settings.storeDeviceStates}"
            @change="${(e: Event) => this.handleSettingChange('storeDeviceStates', (e.target as HTMLInputElement).checked)}"
            ?disabled="${!this.settings.enabled}"
          />
          <label class="form-label">Store Device States</label>
        </div>

        <div class="form-group">
          <label class="form-label">Batch Size (messages per batch)</label>
          <input
            type="number"
            class="form-input"
            min="10"
            max="1000"
            .value="${this.settings.batchSize}"
            @input="${(e: Event) => this.handleSettingChange('batchSize', parseInt((e.target as HTMLInputElement).value))}"
            ?disabled="${!this.settings.enabled}"
          />
          <div class="help-text">
            Number of messages to batch before sending to Supabase (10-1000)
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Batch Interval (milliseconds)</label>
          <input
            type="number"
            class="form-input"
            min="1000"
            max="60000"
            .value="${this.settings.batchInterval}"
            @input="${(e: Event) => this.handleSettingChange('batchInterval', parseInt((e.target as HTMLInputElement).value))}"
            ?disabled="${!this.settings.enabled}"
          />
          <div class="help-text">
            How often to send batched data to Supabase (1000-60000ms)
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Data Retention (days)</label>
          <input
            type="number"
            class="form-input"
            min="1"
            max="365"
            .value="${this.settings.retentionDays}"
            @input="${(e: Event) => this.handleSettingChange('retentionDays', parseInt((e.target as HTMLInputElement).value))}"
            ?disabled="${!this.settings.enabled}"
          />
          <div class="help-text">
            Automatically delete data older than this many days (1-365)
          </div>
        </div>
      </div>

      <div class="button-group">
        <button
          class="button primary"
          @click="${this.handleSave}"
          ?disabled="${this.isSaving}"
        >
          ${this.isSaving ? '⏳ Saving...' : '💾 Save Settings'}
        </button>
        <button
          class="button secondary"
          @click="${this.handleBack}"
        >
          Cancel
        </button>
      </div>
    `;
  }
}