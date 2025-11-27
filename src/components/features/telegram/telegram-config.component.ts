// Enhanced telegram-config.component.ts with HISTORY FIX

import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { telegramService } from '../../../services/telegram.service';
import {
  TelegramSettings,
  TelegramAlertConfig,
  AlertType,
  getAvailableAlertTypes,
  alertTypeRequiresThreshold,
  ALERT_TYPE_DESCRIPTIONS,
  ALERT_TYPE_ICONS,
  getAlertTypeUnit
} from '../../../models/telegram.model';
import { Device } from '../../../models/device.model';
import { deviceService } from '../../../services/device-service';
import { telegramConfigStyles } from '../../../styles/telegram-config.styles';

@customElement('telegram-config')
export class TelegramConfigComponent extends LitElement {
  static styles = telegramConfigStyles;

  @state() private settings: TelegramSettings = {
    enabled: false,
    botToken: '',
    chatId: '',
    defaultCooldownMinutes: 5,
    quietHoursEnabled: false,
    groupAlerts: false,
    groupAlertDelay: 10
  };

  @state() private testing = false;
  @state() private testResult: { success: boolean; message: string } | null = null;
  @state() private devices: Device[] = [];
  @state() private selectedDeviceId: string | null = null;
  @state() private alertConfig: Partial<TelegramAlertConfig> = {};
  @state() private activeTab: 'settings' | 'alerts' | 'history' = 'settings';

  private telegramHandler: any;

  connectedCallback(): void {
    super.connectedCallback();
    this.loadSettings();
    this.loadDevices();
  }

  setTelegramHandler(handler: any): void {
    this.telegramHandler = handler;
    this.loadSettings();
  }

  private loadSettings(): void {
    if (this.telegramHandler) {
      const settings = this.telegramHandler.getSettings();
      if (settings) {
        this.settings = { ...settings };
      }
    }
  }

  private loadDevices(): void {
    // 🆕 Load ALL device types
    this.devices = deviceService.getDevices();
  }

  // =============================================================================
  // Settings Tab (Enhanced with Global Options)
  // =============================================================================

  private handleSettingChange(field: keyof TelegramSettings, value: any): void {
    this.settings = { ...this.settings, [field]: value };
  }

  private async handleTestConnection(): Promise<void> {
    if (!this.settings.botToken || !this.settings.chatId) {
      this.testResult = { success: false, message: 'Please enter both Bot Token and Chat ID' };
      return;
    }

    this.testing = true;
    this.testResult = null;

    const result = await telegramService.testConnection(this.settings.botToken, this.settings.chatId);

    this.testing = false;
    this.testResult = {
      success: result.success,
      message: result.success
        ? '✅ Connection successful! Test message sent to Telegram.'
        : `❌ Connection failed: ${result.error}`
    };

    if (result.success) {
      this.settings.lastTestTime = new Date();
      this.settings.testStatus = 'success';
    } else {
      this.settings.testStatus = 'failed';
    }
  }

  private handleSaveSettings(): void {
    if (this.telegramHandler) {
      this.telegramHandler.updateSettings(this.settings);
      this.testResult = { success: true, message: '💾 Settings saved successfully!' };
    }
  }

  // =============================================================================
  // Alerts Tab (Enhanced for All Device Types)
  // =============================================================================

  private handleDeviceSelect(deviceId: string): void {
    this.selectedDeviceId = deviceId;

    const device = this.devices.find(d => d.id === deviceId);
    if (!device) return;

    if (this.telegramHandler) {
      const config = this.telegramHandler.getAlertConfig(deviceId);
      if (config) {
        this.alertConfig = { ...config };
      } else {
        // 🆕 Default config based on device type
        this.alertConfig = {
          deviceId,
          deviceName: device.name,
          deviceType: device.type,
          enabled: true,
          alertType: this.getDefaultAlertType(device.type),
          cooldownMinutes: this.settings.defaultCooldownMinutes,  // 🆕 Use global default
          alertOnRestore: true,
          priority: 'normal'
        };
      }
    }
  }

  /**
   * 🆕 Get default alert type for device type
   */
  private getDefaultAlertType(deviceType: 'sensor' | 'switch' | 'dimmer' | 'shutter'): AlertType {
    const types = getAvailableAlertTypes(deviceType);
    return types[0];
  }

  private handleAlertConfigChange(field: keyof TelegramAlertConfig, value: any): void {
    this.alertConfig = { ...this.alertConfig, [field]: value };
  }

  private handleSaveAlertConfig(): void {
    if (!this.selectedDeviceId || !this.telegramHandler) return;

    this.telegramHandler.configureAlert(this.selectedDeviceId, this.alertConfig);
    this.testResult = { success: true, message: '✅ Alert configuration saved!' };
  }

  private handleRemoveAlertConfig(): void {
    if (!this.selectedDeviceId || !this.telegramHandler) return;

    if (confirm('Remove this alert configuration?')) {
      this.telegramHandler.removeAlertConfig(this.selectedDeviceId);
      this.selectedDeviceId = null;
      this.alertConfig = {};
      this.testResult = { success: true, message: '🗑️ Alert configuration removed' };
    }
  }

  // =============================================================================
  // Render Methods
  // =============================================================================

  render() {
    return html`
      <div class="telegram-config">
        <div class="header">
          <h2>📱 Telegram Configuration</h2>
          <p class="subtitle">Configure Telegram bot for device alerts and notifications</p>
        </div>

        ${this.renderTabs()}
        ${this.renderTestResult()}

        <div class="content">
          ${this.activeTab === 'settings' ? this.renderSettingsTab() : ''}
          ${this.activeTab === 'alerts' ? this.renderAlertsTab() : ''}
          ${this.activeTab === 'history' ? this.renderHistoryTab() : ''}
        </div>
      </div>
    `;
  }

  private renderTabs() {
    return html`
      <div class="tabs">
        <button
          class="tab ${this.activeTab === 'settings' ? 'active' : ''}"
          @click=${() => (this.activeTab = 'settings')}
        >
          ⚙️ Settings
        </button>
        <button
          class="tab ${this.activeTab === 'alerts' ? 'active' : ''}"
          @click=${() => (this.activeTab = 'alerts')}
        >
          🔔 Alert Rules
        </button>
        <button
          class="tab ${this.activeTab === 'history' ? 'active' : ''}"
          @click=${() => (this.activeTab = 'history')}
        >
          📊 History
        </button>
      </div>
    `;
  }

  private renderTestResult() {
    if (!this.testResult) return '';

    return html`
      <div class="test-result ${this.testResult.success ? 'success' : 'error'}">
        ${this.testResult.message}
      </div>
    `;
  }

  private renderSettingsTab() {
    return html`
      <div class="settings-tab">
        <!-- Bot Configuration -->
        <div class="section">
          <h3>🤖 Bot Configuration</h3>

          <div class="form-group">
            <label for="enabled">
              <input
                type="checkbox"
                id="enabled"
                .checked=${this.settings.enabled}
                @change=${(e: Event) =>
                  this.handleSettingChange('enabled', (e.target as HTMLInputElement).checked)}
              />
              Enable Telegram notifications
            </label>
          </div>

          <div class="form-group">
            <label for="botToken">Bot Token</label>
            <input
              type="password"
              id="botToken"
              .value=${this.settings.botToken}
              @input=${(e: Event) =>
                this.handleSettingChange('botToken', (e.target as HTMLInputElement).value)}
              placeholder="123456:ABC-DEF..."
              ?disabled=${!this.settings.enabled}
            />
          </div>

          <div class="form-group">
            <label for="chatId">Chat ID</label>
            <input
              type="text"
              id="chatId"
              .value=${this.settings.chatId}
              @input=${(e: Event) =>
                this.handleSettingChange('chatId', (e.target as HTMLInputElement).value)}
              placeholder="123456789"
              ?disabled=${!this.settings.enabled}
            />
          </div>
        </div>

        <!-- 🆕 Global Alert Settings -->
        <div class="section">
          <h3>⏱️ Global Alert Settings</h3>

          <div class="form-group">
            <label for="defaultCooldown">Default Cooldown Period (minutes)</label>
            <input
              type="number"
              id="defaultCooldown"
              min="1"
              max="1440"
              .value=${this.settings.defaultCooldownMinutes.toString()}
              @input=${(e: Event) =>
                this.handleSettingChange('defaultCooldownMinutes', parseInt((e.target as HTMLInputElement).value))}
              ?disabled=${!this.settings.enabled}
            />
            <small>Time between alerts to prevent spam (applies to new alerts)</small>
          </div>

          <div class="form-group">
            <label for="groupAlerts">
              <input
                type="checkbox"
                id="groupAlerts"
                .checked=${this.settings.groupAlerts}
                @change=${(e: Event) =>
                  this.handleSettingChange('groupAlerts', (e.target as HTMLInputElement).checked)}
                ?disabled=${!this.settings.enabled}
              />
              Group multiple alerts
            </label>
            <small>Combine multiple alerts from same device into one message</small>
          </div>

          ${this.settings.groupAlerts ? html`
            <div class="form-group">
              <label for="groupDelay">Group Alert Delay (seconds)</label>
              <input
                type="number"
                id="groupDelay"
                min="1"
                max="60"
                .value=${this.settings.groupAlertDelay.toString()}
                @input=${(e: Event) =>
                  this.handleSettingChange('groupAlertDelay', parseInt((e.target as HTMLInputElement).value))}
                ?disabled=${!this.settings.enabled}
              />
              <small>Wait time before sending grouped alert</small>
            </div>
          ` : ''}
        </div>

        <!-- 🆕 Quiet Hours -->
        <div class="section">
          <h3>🔕 Quiet Hours</h3>

          <div class="form-group">
            <label for="quietHours">
              <input
                type="checkbox"
                id="quietHours"
                .checked=${this.settings.quietHoursEnabled}
                @change=${(e: Event) =>
                  this.handleSettingChange('quietHoursEnabled', (e.target as HTMLInputElement).checked)}
                ?disabled=${!this.settings.enabled}
              />
              Enable quiet hours (no alerts)
            </label>
          </div>

          ${this.settings.quietHoursEnabled ? html`
            <div class="form-row">
              <div class="form-group">
                <label for="quietStart">Start Time</label>
                <input
                  type="time"
                  id="quietStart"
                  .value=${this.settings.quietHoursStart || '22:00'}
                  @input=${(e: Event) =>
                    this.handleSettingChange('quietHoursStart', (e.target as HTMLInputElement).value)}
                  ?disabled=${!this.settings.enabled}
                />
              </div>

              <div class="form-group">
                <label for="quietEnd">End Time</label>
                <input
                  type="time"
                  id="quietEnd"
                  .value=${this.settings.quietHoursEnd || '07:00'}
                  @input=${(e: Event) =>
                    this.handleSettingChange('quietHoursEnd', (e.target as HTMLInputElement).value)}
                  ?disabled=${!this.settings.enabled}
                />
              </div>
            </div>
          ` : ''}
        </div>

        <div class="button-group">
          <button
            class="btn btn-secondary"
            @click=${this.handleTestConnection}
            ?disabled=${!this.settings.enabled || this.testing}
          >
            ${this.testing ? '🔄 Testing...' : '🧪 Test Connection'}
          </button>
          <button
            class="btn btn-primary"
            @click=${this.handleSaveSettings}
            ?disabled=${!this.settings.enabled}
          >
            💾 Save Settings
          </button>
        </div>
      </div>
    `;
  }

  private renderAlertsTab() {
    return html`
      <div class="alerts-tab">
        <div class="device-selector">
          <label>Select Device:</label>
          <select @change=${(e: Event) => this.handleDeviceSelect((e.target as HTMLSelectElement).value)}>
            <option value="">-- Choose a device --</option>
            ${this.devices.map(device => {
              const icon = device.type === 'sensor' ? '📊' :
                          device.type === 'switch' ? '💡' :
                          device.type === 'dimmer' ? '🔆' : '🪟';
              return html`
                <option value=${device.id} ?selected=${device.id === this.selectedDeviceId}>
                  ${icon} ${device.name} (${device.type})
                </option>
              `;
            })}
          </select>
        </div>

        ${this.selectedDeviceId ? this.renderAlertConfigForm() : ''}
      </div>
    `;
  }

  private renderAlertConfigForm() {
    const device = this.devices.find(d => d.id === this.selectedDeviceId);
    if (!device) return '';

    const availableTypes = getAvailableAlertTypes(device.type);
    const selectedType = this.alertConfig.alertType || availableTypes[0];
    const requiresThreshold = alertTypeRequiresThreshold(selectedType);
    const unit = getAlertTypeUnit(selectedType);

    return html`
      <div class="alert-config-form">
        <h3>🔔 Alert Configuration for ${device.name}</h3>

        <div class="form-group">
          <label>
            <input
              type="checkbox"
              .checked=${this.alertConfig.enabled !== false}
              @change=${(e: Event) =>
                this.handleAlertConfigChange('enabled', (e.target as HTMLInputElement).checked)}
            />
            Enable alerts for this device
          </label>
        </div>

        <!-- 🆕 Alert Type Selection -->
        <div class="form-group">
          <label for="alertType">Alert Type</label>
          <select
            id="alertType"
            .value=${selectedType}
            @change=${(e: Event) =>
              this.handleAlertConfigChange('alertType', (e.target as HTMLSelectElement).value)}
          >
            ${availableTypes.map(type => html`
              <option value=${type}>
                ${ALERT_TYPE_ICONS[type]} ${ALERT_TYPE_DESCRIPTIONS[type]}
              </option>
            `)}
          </select>
          <small>What to monitor for this device</small>
        </div>

        <!-- Threshold Configuration (if required) -->
        ${requiresThreshold ? html`
          <div class="form-group">
            <label for="minThreshold">Minimum Threshold${unit ? ` (${unit})` : ''}</label>
            <input
              type="number"
              id="minThreshold"
              step="0.1"
              .value=${this.alertConfig.minThreshold?.toString() || ''}
              @input=${(e: Event) =>
                this.handleAlertConfigChange('minThreshold', parseFloat((e.target as HTMLInputElement).value))}
              placeholder="Optional"
            />
            <small>Alert if value falls below this</small>
          </div>

          <div class="form-group">
            <label for="maxThreshold">Maximum Threshold${unit ? ` (${unit})` : ''}</label>
            <input
              type="number"
              id="maxThreshold"
              step="0.1"
              .value=${this.alertConfig.maxThreshold?.toString() || ''}
              @input=${(e: Event) =>
                this.handleAlertConfigChange('maxThreshold', parseFloat((e.target as HTMLInputElement).value))}
              placeholder="Optional"
            />
            <small>Alert if value exceeds this</small>
          </div>
        ` : ''}

        <!-- 🆕 Cooldown Period (Per-Alert) -->
        <div class="form-group">
          <label for="cooldown">Cooldown Period (minutes)</label>
          <input
            type="number"
            id="cooldown"
            min="1"
            max="1440"
            .value=${(this.alertConfig.cooldownMinutes || this.settings.defaultCooldownMinutes).toString()}
            @input=${(e: Event) =>
              this.handleAlertConfigChange('cooldownMinutes', parseInt((e.target as HTMLInputElement).value))}
          />
          <small>Time between alerts for THIS device (default: ${this.settings.defaultCooldownMinutes} min)</small>
        </div>

        <!-- Priority -->
        <div class="form-group">
          <label for="priority">Alert Priority</label>
          <select
            id="priority"
            .value=${this.alertConfig.priority || 'normal'}
            @change=${(e: Event) =>
              this.handleAlertConfigChange('priority', (e.target as HTMLSelectElement).value)}
          >
            <option value="low">🔵 Low</option>
            <option value="normal">🟢 Normal</option>
            <option value="high">🔴 High (Critical)</option>
          </select>
        </div>

        <div class="form-group">
          <label>
            <input
              type="checkbox"
              .checked=${this.alertConfig.alertOnRestore !== false}
              @change=${(e: Event) =>
                this.handleAlertConfigChange('alertOnRestore', (e.target as HTMLInputElement).checked)}
            />
            Send notification when value returns to normal
          </label>
        </div>

        <!-- 🆕 Custom Message -->
        <div class="form-group">
          <label for="customMessage">Custom Message Template (optional)</label>
          <textarea
            id="customMessage"
            rows="3"
            .value=${this.alertConfig.customMessage || ''}
            @input=${(e: Event) =>
              this.handleAlertConfigChange('customMessage', (e.target as HTMLTextAreaElement).value)}
            placeholder="Use {device}, {value}, {threshold}"
          ></textarea>
          <small>Leave empty for default message</small>
        </div>

        <div class="button-group">
          <button class="btn btn-primary" @click=${this.handleSaveAlertConfig}>
            💾 Save Alert Config
          </button>
          <button class="btn btn-danger" @click=${this.handleRemoveAlertConfig}>
            🗑️ Remove Config
          </button>
        </div>
      </div>
    `;
  }

  private renderHistoryTab() {
    if (!this.telegramHandler) {
      return html`<div class="no-data">No history available - handler not initialized</div>`;
    }

    const history = this.telegramHandler.getNotificationHistory();
    const stats = this.telegramHandler.getStats();

    // 🔧 Debug logging
    console.log('[Telegram History Debug]', {
      historyLength: history.length,
      stats,
      firstItem: history[0]
    });

    return html`
      <div class="history-tab">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${stats.totalConfigs}</div>
            <div class="stat-label">Total Configs</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.activeConfigs}</div>
            <div class="stat-label">Active Alerts</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.totalNotifications}</div>
            <div class="stat-label">Total Notifications</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.successfulNotifications}</div>
            <div class="stat-label">Sent Successfully</div>
          </div>
        </div>

        <div class="history-list">
          <h3>📜 Recent Notifications</h3>
          ${history.length === 0
            ? html`<div class="no-data">No notifications yet</div>`
            : history.map((notification: any) => {
                // 🔧 Fix: Safe type handling with fallbacks
                const alertType = (notification.alertType || notification.sensorType || 'unknown') as AlertType;
                const alertIcon = ALERT_TYPE_ICONS[alertType] || '📊';
                const alertDesc = ALERT_TYPE_DESCRIPTIONS[alertType] || alertType;
                const unit = getAlertTypeUnit(alertType) || '';

                return html`
                  <div class="history-item ${notification.type}">
                    <div class="history-header">
                      <span class="device-name">
                        ${notification.deviceType === 'sensor' ? '📊' :
                          notification.deviceType === 'switch' ? '💡' :
                          notification.deviceType === 'dimmer' ? '🔆' : '🪟'}
                        ${notification.deviceName}
                      </span>
                      <span class="timestamp">${new Date(notification.timestamp).toLocaleString()}</span>
                    </div>
                    <div class="history-body">
                      <div class="sensor-info">
                        ${alertIcon} ${alertDesc}:
                        <strong>${notification.value}${unit}</strong>
                      </div>
                      <div class="message">${notification.message}</div>
                    </div>
                    <div class="history-footer">
                      ${notification.sent
                        ? html`<span class="status success">✅ Sent</span>`
                        : html`<span class="status error">❌ Failed: ${notification.error || 'Unknown error'}</span>`}
                    </div>
                  </div>
                `;
              })}
        </div>

        <button
          class="btn btn-secondary"
          @click=${() => {
            if (this.telegramHandler) {
              this.telegramHandler.clearNotificationHistory();
              this.requestUpdate();
            }
          }}
        >
          🗑️ Clear History
        </button>
      </div>
    `;
  }
}

// Ensure the interface is extended properly without conflicts
declare global {
  interface HTMLElementTagNameMap {
    'telegram-config': TelegramConfigComponent;
  }
}