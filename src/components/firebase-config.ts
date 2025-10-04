import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { firebaseConfigStyles } from '../styles/firebase-config.styles';
import { firebaseService } from '../services/firebase.service';
import { FirebaseConfig, FirebaseSettings, DEFAULT_FIREBASE_SETTINGS } from '../models/firebase.model';
import { notificationService } from '../services/notification.service';

@customElement('firebase-config')
export class FirebaseConfig extends LitElement {
  static styles = firebaseConfigStyles;

  @state() private settings: FirebaseSettings = { ...DEFAULT_FIREBASE_SETTINGS };
  @state() private isLoading = false;
  @state() private isTesting = false;
  @state() private statusMessage = '';
  @state() private statusType: 'success' | 'error' | 'warning' | '' = '';

  connectedCallback() {
    super.connectedCallback();
    this.loadSettings();
  }

  private loadSettings(): void {
    const loaded = firebaseService.getSettings();
    if (loaded) {
      this.settings = { ...loaded };
    }
  }

  private handleToggleEnable(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.settings = { ...this.settings, enabled: input.checked };
  }

  private handleConfigChange(e: Event, field: keyof FirebaseConfig): void {
    const input = e.target as HTMLInputElement;
    this.settings = {
      ...this.settings,
      config: {
        ...this.settings.config,
        [field]: input.value
      }
    };
  }

  private handleSyncOptionChange(e: Event, field: 'syncDevices' | 'syncMqttSettings'): void {
    const input = e.target as HTMLInputElement;
    this.settings = { ...this.settings, [field]: input.checked };
  }

  private async handleTestConnection(): Promise<void> {
    if (!this.validateConfig()) {
      this.statusType = 'error';
      this.statusMessage = 'Please fill in all required fields';
      return;
    }

    this.isTesting = true;
    this.statusMessage = 'Testing connection...';
    this.statusType = '';

    const result = await firebaseService.testConnection(this.settings.config);

    this.isTesting = false;

    if (result.success) {
      this.statusType = 'success';
      this.statusMessage = '✓ Connection successful! Firebase configuration is valid.';
      notificationService.success('Firebase connection test passed!', 3000);
    } else {
      this.statusType = 'error';
      this.statusMessage = `✗ Connection failed: ${result.error}`;
      notificationService.error(`Connection test failed: ${result.error}`, 5000);
    }
  }

  private async handleSaveSettings(): Promise<void> {
    if (!this.validateConfig()) {
      this.statusType = 'error';
      this.statusMessage = 'Please fill in all required fields';
      return;
    }

    this.isLoading = true;

    if (this.settings.enabled) {
      // Initialize Firebase with the new config
      const result = await firebaseService.initialize(this.settings.config);

      if (!result.success) {
        this.statusType = 'error';
        this.statusMessage = `Failed to initialize Firebase: ${result.error}`;
        this.isLoading = false;
        return;
      }
    }

    // Save settings
    firebaseService.saveSettings(this.settings);

    this.isLoading = false;
    this.statusType = 'success';
    this.statusMessage = 'Firebase settings saved successfully!';
    notificationService.success('Firebase settings saved!', 3000);

    // Dispatch event to notify parent component
    this.dispatchEvent(new CustomEvent('firebase-settings-saved', {
      detail: this.settings,
      bubbles: true,
      composed: true
    }));
  }

  private validateConfig(): boolean {
    const { config } = this.settings;
    return !!(
      config.apiKey &&
      config.authDomain &&
      config.projectId &&
      config.storageBucket &&
      config.messagingSenderId &&
      config.appId
    );
  }

  private handleImportFromJson(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const json = JSON.parse(text);

        // Extract Firebase config from various formats
        let config: FirebaseConfig;

        if (json.firebaseConfig) {
          config = json.firebaseConfig;
        } else if (json.result?.sdkConfig?.projectInfo) {
          // Google Services JSON format (Android)
          const project = json.result.sdkConfig.projectInfo;
          const client = json.result.sdkConfig.client[0];
          config = {
            apiKey: client.api_key[0].current_key,
            authDomain: `${project.project_id}.firebaseapp.com`,
            projectId: project.project_id,
            storageBucket: project.storage_bucket,
            messagingSenderId: project.project_number,
            appId: client.client_info.mobilesdk_app_id,
            databaseURL: project.firebase_url || ''
          };
        } else {
          // Assume it's a direct Firebase config
          config = json;
        }

        this.settings = {
          ...this.settings,
          config
        };

        notificationService.success('Firebase config imported successfully!', 3000);
      } catch (error) {
        notificationService.error('Failed to import config. Please check the file format.', 5000);
      }
    };
    input.click();
  }

  render() {
    return html`
      <div class="firebase-section">
        <div class="section-header">
          <div class="section-title">
            🔥 Firebase Integration
          </div>
          <div class="firebase-toggle">
            <span class="toggle-label">Enable Firebase</span>
            <label class="toggle-switch">
              <input
                type="checkbox"
                .checked="${this.settings.enabled}"
                @change="${this.handleToggleEnable}"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        ${this.statusMessage ? html`
          <div class="status-banner ${this.statusType}">
            ${this.statusMessage}
          </div>
        ` : ''}

        <div class="info-box">
          <div class="info-box-title">📖 How to get Firebase Configuration</div>
          <div class="info-box-content">
            <ol>
              <li>Go to <a href="https://console.firebase.google.com" target="_blank">Firebase Console</a></li>
              <li>Select your project or create a new one</li>
              <li>Click on Project Settings (gear icon)</li>
              <li>Scroll down to "Your apps" section</li>
              <li>Click "Add app" and select Web (</> icon)</li>
              <li>Copy the config object values below</li>
            </ol>
            Or <strong>import from JSON file</strong> (google-services.json or firebase-config.json)
          </div>
        </div>

        <div class="config-grid">
          <div class="config-item">
            <label class="config-label">
              API Key <span class="required">*</span>
            </label>
            <input
              type="text"
              class="config-input"
              placeholder="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX"
              .value="${this.settings.config.apiKey}"
              @input="${(e: Event) => this.handleConfigChange(e, 'apiKey')}"
              ?disabled="${!this.settings.enabled}"
            />
          </div>

          <div class="config-item">
            <label class="config-label">
              Auth Domain <span class="required">*</span>
            </label>
            <input
              type="text"
              class="config-input"
              placeholder="your-app.firebaseapp.com"
              .value="${this.settings.config.authDomain}"
              @input="${(e: Event) => this.handleConfigChange(e, 'authDomain')}"
              ?disabled="${!this.settings.enabled}"
            />
          </div>

          <div class="config-item">
            <label class="config-label">
              Project ID <span class="required">*</span>
            </label>
            <input
              type="text"
              class="config-input"
              placeholder="your-project-id"
              .value="${this.settings.config.projectId}"
              @input="${(e: Event) => this.handleConfigChange(e, 'projectId')}"
              ?disabled="${!this.settings.enabled}"
            />
          </div>

          <div class="config-item">
            <label class="config-label">
              Storage Bucket <span class="required">*</span>
            </label>
            <input
              type="text"
              class="config-input"
              placeholder="your-app.appspot.com"
              .value="${this.settings.config.storageBucket}"
              @input="${(e: Event) => this.handleConfigChange(e, 'storageBucket')}"
              ?disabled="${!this.settings.enabled}"
            />
          </div>

          <div class="config-item">
            <label class="config-label">
              Messaging Sender ID <span class="required">*</span>
            </label>
            <input
              type="text"
              class="config-input"
              placeholder="123456789012"
              .value="${this.settings.config.messagingSenderId}"
              @input="${(e: Event) => this.handleConfigChange(e, 'messagingSenderId')}"
              ?disabled="${!this.settings.enabled}"
            />
          </div>

          <div class="config-item">
            <label class="config-label">
              App ID <span class="required">*</span>
            </label>
            <input
              type="text"
              class="config-input"
              placeholder="1:123456789012:web:abcdef123456"
              .value="${this.settings.config.appId}"
              @input="${(e: Event) => this.handleConfigChange(e, 'appId')}"
              ?disabled="${!this.settings.enabled}"
            />
          </div>

          <div class="config-item">
            <label class="config-label">
              Measurement ID (Optional)
            </label>
            <input
              type="text"
              class="config-input"
              placeholder="G-XXXXXXXXXX"
              .value="${this.settings.config.measurementId || ''}"
              @input="${(e: Event) => this.handleConfigChange(e, 'measurementId')}"
              ?disabled="${!this.settings.enabled}"
            />
            <div class="help-text">For Google Analytics</div>
          </div>

          <div class="config-item">
            <label class="config-label">
              Database URL <span class="required">*</span>
            </label>
            <input
              type="text"
              class="config-input"
              placeholder="https://your-app-default-rtdb.firebaseio.com"
              .value="${this.settings.config.databaseURL || ''}"
              @input="${(e: Event) => this.handleConfigChange(e, 'databaseURL')}"
              ?disabled="${!this.settings.enabled}"
            />
            <div class="help-text">Required for Realtime Database sync</div>
          </div>
        </div>

        ${this.settings.enabled ? html`
          <div class="sync-options">
            <strong>Sync Options:</strong>
            <div class="sync-option">
              <input
                type="checkbox"
                class="checkbox"
                id="syncDevices"
                .checked="${this.settings.syncDevices}"
                @change="${(e: Event) => this.handleSyncOptionChange(e, 'syncDevices')}"
              />
              <label for="syncDevices" class="checkbox-label">
                Sync devices to Firebase
              </label>
            </div>
            <div class="sync-option">
              <input
                type="checkbox"
                class="checkbox"
                id="syncMqtt"
                .checked="${this.settings.syncMqttSettings}"
                @change="${(e: Event) => this.handleSyncOptionChange(e, 'syncMqttSettings')}"
              />
              <label for="syncMqtt" class="checkbox-label">
                Sync MQTT settings to Firebase
              </label>
            </div>
          </div>
        ` : ''}

        <div class="button-group">
          <button
            class="btn btn-secondary"
            @click="${this.handleImportFromJson}"
            ?disabled="${!this.settings.enabled || this.isLoading}"
          >
            📁 Import from JSON
          </button>
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