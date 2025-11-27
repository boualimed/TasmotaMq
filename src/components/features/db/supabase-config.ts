import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { SupabaseSettings, DEFAULT_SUPABASE_SETTINGS } from '../../../models/supabase.model';
import { supabaseService } from '../../../services/supabase.service';
import { notificationService } from '../../../services/notification.service';
//import { logger } from '../../../utils/logger.util';
import { supabaseStyles } from '../../../styles/supabase.styles';
import { userSessionManager } from '../../../services/user-session.manager';

@customElement('supabase-config')
export class SupabaseConfig extends LitElement {
  static styles = supabaseStyles;

  @property({ type: Object }) settings: SupabaseSettings = { ...DEFAULT_SUPABASE_SETTINGS };
  @state() private isTesting = false;
  @state() private isSaving = false;

  // New state to reflect result of the latest test
  @state() private testResult: 'idle' | 'success' | 'error' = 'idle';
  @state() private testMessage: string = '';

  private notificationUnsub: (() => void) | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.loadSettings();

    // Subscribe to notification service so we can react if needed and force updates
    // Assume notificationService.subscribe exists and returns an unsubscribe function
    if ((notificationService as any).subscribe) {
      try {
        this.notificationUnsub = (notificationService as any).subscribe(() => {
          // re-render on notifications to keep UI in sync if they matter
          this.requestUpdate();
        });
      } catch (e) {
        // If subscribe not available no-op
        console.warn('notificationService.subscribe not available', e);
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.notificationUnsub) {
      this.notificationUnsub();
      this.notificationUnsub = null;
    }
  }

  private loadSettings(): void {
    // Load from user session instead of localStorage
    const session = userSessionManager.getCurrentSession();
    if (session?.supabaseSettings) {
      this.settings = session.supabaseSettings;
      console.log('✅ Loaded Supabase settings from user session');
    } else {
      // Use defaults
      this.settings = { ...DEFAULT_SUPABASE_SETTINGS };
      console.log('ℹ️ Using default Supabase settings');
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
    this.testResult = 'idle';
    this.testMessage = '';

    try {
      const result = await supabaseService.testConnection(this.settings.config);

      if (!result.success) {
        // reflect failure on button
        this.testResult = 'error';
        this.testMessage = result.error || 'Connection test failed';
        // notification already handled inside service
      } else {
        this.testResult = 'success';
        this.testMessage = 'Connection successful';
      }
    } catch (error: any) {
      this.testResult = 'error';
      this.testMessage = error?.message || String(error) || 'Connection test error';
      console.error('Connection test error:', error);
    } finally {
      this.isTesting = false;

      // Reset testResult back to idle after a short delay so the UI doesn't stay colored forever
      // keep result visible for 3s
      setTimeout(() => {
        this.testResult = 'idle';
        this.requestUpdate();
      }, 3000);
    }
  }

  private async handleSave(): Promise<void> {
    const session = userSessionManager.getCurrentSession();
    if (!session) {
      notificationService.error('❌ No active session. Please log in.', 5000);
      return;
    }

    this.isSaving = true;
    this.requestUpdate(); // Force UI update to show loading state

    try {
      // Validate settings before saving
      if (this.settings.enabled) {
        if (!this.settings.config.url || !this.settings.config.anonKey) {
          throw new Error('Project URL and Anon Key are required when enabling Supabase');
        }
      }

      // Save settings to user session via supabase service and await result
      try {
        const session = userSessionManager.getCurrentSession();
        if (!session) {
          throw new Error('No active session');
        }

        await userSessionManager.updateSupabaseSettings(this.settings);
        supabaseService.saveSettings(this.settings);
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Failed to save settings');
      }

      // If enabled, initialize the connection and return its result
      if (this.settings.enabled && this.settings.config.url && this.settings.config.anonKey) {
        notificationService.info('🔄 Initializing Supabase connection...', 2000);

        const initResult = await supabaseService.initialize(this.settings.config);
        if (!initResult.success) {
          throw new Error(initResult.error || 'Failed to initialize Supabase');
        }
      } else if (!this.settings.enabled) {
        // Disconnect if disabled
        supabaseService.disconnect();
        notificationService.info('📊 Supabase disabled', 2000);
      }

      // Emit event to parent once saved and initialized
      this.dispatchEvent(new CustomEvent('settings-saved', {
        detail: { settings: this.settings },
        bubbles: true,
        composed: true
      }));

      // Optionally show brief success state on save button (we already show notifications in service)
    } catch (error: any) {
      console.error('Save error:', error);
      notificationService.error(`❌ ${error.message}`, 5000);
    } finally {
      this.isSaving = false;
      this.requestUpdate();
    }
  }

  private handleBack(): void {
    this.dispatchEvent(new CustomEvent('navigate', {
      detail: { page: 'device-config' },
      bubbles: true,
      composed: true
    }));
  }

  render() {
    const session = userSessionManager.getCurrentSession();
    const hasSession = !!session;

    // Button classes for test result
    const testBtnClass = this.testResult === 'success' ? 'button success' :
                         this.testResult === 'error' ? 'button danger' : 'button secondary';

    const testBtnText = this.isTesting ? '⏳ Testing...' :
                        this.testResult === 'success' ? '✅ Success' :
                        this.testResult === 'error' ? `❌ ${this.testMessage || 'Failed'}` :
                        '🔍 Test Connection';

    return html`
      ${!hasSession ? html`
        <div class="info-box warning">
          <p><strong>⚠️ No Active Session</strong></p>
          <p>Please log in to configure Supabase settings.</p>
        </div>
      ` : ''}

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
        ${hasSession ? html`
          <p class="help-text">Settings are saved per user: <strong>${session.username}</strong></p>
        ` : ''}
      </div>

      <div class="section">
        <div class="section-title">🔒 Connection Settings</div>

        <div class="checkbox-group">
          <input
            type="checkbox"
            class="checkbox"
            .checked="${this.settings.enabled}"
            @change="${(e: Event) => this.handleSettingChange('enabled', (e.target as HTMLInputElement).checked)}"
            ?disabled="${!hasSession}"
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
            ?disabled="${!this.settings.enabled || !hasSession}"
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
            ?disabled="${!this.settings.enabled || !hasSession}"
          />
          <div class="help-text">
            Find this in your Supabase project settings → API → Project API keys → anon public
          </div>
        </div>

        <div class="button-group">
          <button
            class="${testBtnClass}"
            @click="${this.handleTestConnection}"
            ?disabled="${!this.settings.enabled || this.isTesting || !hasSession}"
          >
            ${testBtnText}
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
            ?disabled="${!this.settings.enabled || !hasSession}"
          />
          <label class="form-label">Store MQTT Messages</label>
        </div>

        <div class="checkbox-group">
          <input
            type="checkbox"
            class="checkbox"
            .checked="${this.settings.storeDeviceStates}"
            @change="${(e: Event) => this.handleSettingChange('storeDeviceStates', (e.target as HTMLInputElement).checked)}"
            ?disabled="${!this.settings.enabled || !hasSession}"
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
            ?disabled="${!this.settings.enabled || !hasSession}"
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
            ?disabled="${!this.settings.enabled || !hasSession}"
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
            ?disabled="${!this.settings.enabled || !hasSession}"
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
          ?disabled="${this.isSaving || !hasSession}"
        >
          ${this.isSaving ? html`
            <span class="loading-spinner"></span>
            ⏳ Saving & Initializing...
          ` : '💾 Save Settings'}
        </button>
        <button
          class="button secondary"
          @click="${this.handleBack}"
          ?disabled="${this.isSaving}"
        >
          Cancel
        </button>
      </div>
    `;
  }
}
