// sensor-history.component.ts
// Enhanced UI Component with IndexedDB management features

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Device } from '../../../models/device.model';
import { indexedDBService, SensorDataRecord, TimeRange } from '../../../services/indexeddb.service';
import { logger } from '../../../utils/logger.util';
import { notificationService } from '../../../services/notification.service';
import { indexdbStyles } from '../../../styles/indexdb.styles';

@customElement('sensor-history')
export class SensorHistoryComponent extends LitElement {
  @property({ type: Object }) device!: Device;
  @property({ type: Boolean }) open = false;

  @state() private records: SensorDataRecord[] = [];
  @state() private loading = false;
  @state() private timeRange: '1h' | '6h' | '24h' | '7d' | '30d' | 'all' = '24h';
  @state() private statistics = { count: 0, oldest: null as Date | null, newest: null as Date | null };
  @state() private selectedField: string | null = null;
  @state() private availableFields: string[] = [];
  @state() private showSettings = false;
  @state() private databaseSize = 'Calculating...';
  @state() private indexedDBEnabled = true;

  static styles = css`
    ${indexdbStyles}

    /* Additional styles for settings panel */
    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      border-bottom: 2px solid var(--border-color, #334155);
    }

    .tab-btn {
      padding: 12px 24px;
      background: transparent;
      border: none;
      border-bottom: 3px solid transparent;
      color: var(--text-secondary, #94a3b8);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .tab-btn:hover {
      color: var(--text-primary, #f1f5f9);
    }

    .tab-btn.active {
      color: #3b82f6;
      border-bottom-color: #3b82f6;
    }

    .settings-panel {
      padding: 20px 0;
    }

    .setting-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      background: var(--input-background, #0f172a);
      border-radius: 8px;
      margin-bottom: 12px;
      border: 1px solid var(--border-color, #334155);
    }

    .setting-info {
      flex: 1;
    }

    .setting-label {
      font-size: 15px;
      font-weight: 500;
      color: var(--text-primary, #f1f5f9);
      margin-bottom: 4px;
    }

    .setting-description {
      font-size: 13px;
      color: var(--text-secondary, #94a3b8);
      line-height: 1.4;
    }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 52px;
      height: 28px;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #475569;
      transition: 0.3s;
      border-radius: 28px;
    }

    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: 0.3s;
      border-radius: 50%;
    }

    input:checked + .toggle-slider {
      background-color: #10b981;
    }

    input:checked + .toggle-slider:before {
      transform: translateX(24px);
    }

    .number-input {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .number-input input {
      width: 100px;
      padding: 8px 12px;
      background: var(--card-background, #1e293b);
      border: 1px solid var(--border-color, #334155);
      border-radius: 6px;
      color: var(--text-primary, #f1f5f9);
      font-size: 14px;
    }

    .number-input input:focus {
      outline: none;
      border-color: #3b82f6;
    }

    .number-input span {
      font-size: 13px;
      color: var(--text-secondary, #94a3b8);
    }

    .clear-section {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid var(--border-color, #334155);
    }

    .section-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary, #f1f5f9);
      margin-bottom: 16px;
    }

    .clear-options {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }

    .clear-btn {
      padding: 10px 16px;
      background: var(--card-background, #1e293b);
      border: 1px solid var(--border-color, #334155);
      border-radius: 8px;
      color: var(--text-primary, #f1f5f9);
      cursor: pointer;
      transition: all 0.2s;
      font-size: 13px;
      font-weight: 500;
      text-align: center;
    }

    .clear-btn:hover {
      background: #1e40af;
      border-color: #3b82f6;
      transform: translateY(-2px);
    }

    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      margin: 20px 0;
    }

    .stat-card-small {
      background: var(--input-background, #0f172a);
      border-radius: 8px;
      padding: 12px;
      border: 1px solid var(--border-color, #334155);
      text-align: center;
    }

    .stat-label-small {
      font-size: 12px;
      color: var(--text-secondary, #94a3b8);
      margin-bottom: 4px;
    }

    .stat-value-small {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary, #f1f5f9);
    }

    .warning-box {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid #ef4444;
      border-radius: 8px;
      padding: 12px 16px;
      margin-top: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .warning-icon {
      font-size: 20px;
    }

    .warning-text {
      font-size: 13px;
      color: #fca5a5;
      line-height: 1.4;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-left: auto;
    }

    .status-badge.enabled {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
    }

    .status-badge.disabled {
      background: rgba(148, 163, 184, 0.2);
      color: #94a3b8;
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
  `;

  async connectedCallback() {
    super.connectedCallback();
    if (this.open) {
      await this.loadData();
      await this.updateDatabaseSize();
    }
    this.indexedDBEnabled = indexedDBService.isEnabled();
  }

  async updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('open') && this.open) {
      await this.loadData();
      await this.updateDatabaseSize();
      this.indexedDBEnabled = indexedDBService.isEnabled();
    }
    if (changedProperties.has('timeRange') && !this.showSettings) {
      await this.loadData();
    }
  }

  private async updateDatabaseSize() {
    try {
      this.databaseSize = await indexedDBService.getFormattedDatabaseSize();
    } catch (error) {
      this.databaseSize = 'Unknown';
    }
  }

  private async loadData() {
    this.loading = true;

    try {
      const timeRangeObj = this.getTimeRangeObject();
      const records = await indexedDBService.getSensorData({
        deviceId: this.device.id,
        timeRange: timeRangeObj
      });

      this.records = records.sort((a, b) => b.timestamp - a.timestamp);
      this.statistics = await indexedDBService.getStatistics(this.device.id, timeRangeObj);

      if (records.length > 0 && records[0].data) {
        this.availableFields = this.extractFields(records[0].data);
        if (!this.selectedField && this.availableFields.length > 0) {
          this.selectedField = this.availableFields[0];
        }
      }
    } catch (error: any) {
      logger.addLog('error', `Failed to load sensor history: ${error.message}`);
    } finally {
      this.loading = false;
    }
  }

  private extractFields(data: any, prefix = ''): string[] {
    const fields: string[] = [];

    if (typeof data === 'object' && data !== null) {
      Object.keys(data).forEach(key => {
        const path = prefix ? `${prefix}.${key}` : key;
        if (typeof data[key] === 'object' && data[key] !== null) {
          fields.push(...this.extractFields(data[key], path));
        } else {
          fields.push(path);
        }
      });
    }

    return fields;
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private getTimeRangeObject(): TimeRange | undefined {
    const now = new Date();
    const ranges: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    if (this.timeRange === 'all') {
      return undefined;
    }

    const ms = ranges[this.timeRange];
    return {
      start: new Date(now.getTime() - ms),
      end: now
    };
  }

  private formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    if (typeof value === 'boolean') {
      return value ? 'ON' : 'OFF';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }

  private getValueBadgeClass(value: any): string {
    if (typeof value === 'boolean') {
      return value ? 'badge-success' : 'badge-warning';
    }
    if (typeof value === 'number') {
      return 'badge-info';
    }
    return 'badge-info';
  }

  private async handleExport() {
    try {
      const data = await indexedDBService.exportData(this.device.id);
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.device.name}-history-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      logger.addLog('success', `✅ Exported ${data.length} records`);
      notificationService.success(`✅ Exported ${data.length} records`, 3000);
    } catch (error: any) {
      logger.addLog('error', `Export failed: ${error.message}`);
      notificationService.error('❌ Export failed', 3000);
    }
  }

  private async handleClear() {
    if (!confirm(`Delete all historical data for ${this.device.name}?`)) {
      return;
    }

    try {
      await indexedDBService.deleteSensorData(this.device.id);
      await this.loadData();
      logger.addLog('success', '🗑️ Sensor history cleared');
      notificationService.success('✅ History cleared', 2500);
    } catch (error: any) {
      logger.addLog('error', `Clear failed: ${error.message}`);
      notificationService.error('❌ Failed to clear', 3000);
    }
  }

  private async handleToggleEnabled(e: Event) {
    const enabled = (e.target as HTMLInputElement).checked;
    indexedDBService.updateSettings({ enabled });
    this.indexedDBEnabled = enabled;
    await this.updateDatabaseSize();
  }

  private async handleToggleAutoCleanup(e: Event) {
    const enabled = (e.target as HTMLInputElement).checked;
    indexedDBService.updateSettings({ autoCleanup: enabled });
    notificationService.info(`🧹 Auto-cleanup ${enabled ? 'enabled' : 'disabled'}`, 2500);
  }

  private async handleMaxRecordsChange(e: Event) {
    const value = parseInt((e.target as HTMLInputElement).value);
    if (value >= 100 && value <= 50000) {
      indexedDBService.updateSettings({ maxRecordsPerDevice: value });
      notificationService.success('✅ Max records updated', 2500);
    }
  }

  private async handleClearOldData(hours: number) {
    const timeLabel = hours < 24 ? `${hours} hour${hours > 1 ? 's' : ''}` : `${hours / 24} day${hours / 24 > 1 ? 's' : ''}`;

    if (!confirm(`Delete all sensor data older than ${timeLabel}?`)) {
      return;
    }

    try {
     // const deletedCount = await indexedDBService.clearDataOlderThan(hours);
      await this.loadData();
      await this.updateDatabaseSize();
    } catch (error: any) {
      notificationService.error(`❌ Failed: ${error.message}`, 4000);
    }
  }

  private async handleClearAllData() {
    if (!confirm('⚠️ Delete ALL sensor data from ALL devices? This cannot be undone!')) {
      return;
    }

    try {
      await indexedDBService.clearAllData();
      await this.loadData();
      await this.updateDatabaseSize();
    } catch (error: any) {
      notificationService.error(`❌ Failed: ${error.message}`, 4000);
    }
  }

  render() {
    if (!this.open) {
      return html``;
    }

    return html`
      <div class="modal-overlay" @click=${this.handleClose}>
        <div class="modal-content" @click=${(e: Event) => e.stopPropagation()}>
          <div class="modal-header">
            <div class="modal-title">
              <span class="device-icon">📊</span>
              <h2>${this.device.name} - History</h2>
            </div>
            <span class="status-badge ${this.indexedDBEnabled ? 'enabled' : 'disabled'}">
              ${this.indexedDBEnabled ? '✓ Logging' : '✕ Disabled'}
            </span>
            <button class="close-btn" @click=${this.handleClose}>✕</button>
          </div>

          <div class="modal-body">
            <!-- Tabs -->
            <div class="tabs">
              <button
                class="tab-btn ${!this.showSettings ? 'active' : ''}"
                @click=${() => this.showSettings = false}
              >
                📊 Data History
              </button>
              <button
                class="tab-btn ${this.showSettings ? 'active' : ''}"
                @click=${() => { this.showSettings = true; this.updateDatabaseSize(); }}
              >
                ⚙️ Settings
              </button>
            </div>

            ${this.showSettings ? this.renderSettings() : this.renderHistory()}
          </div>
        </div>
      </div>
    `;
  }

  private renderSettings() {
    const settings = indexedDBService.getSettings();

    return html`
      <div class="settings-panel">
        <!-- Enable/Disable -->
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">Enable Sensor Data Logging</div>
            <div class="setting-description">
              Store historical sensor readings locally in your browser
            </div>
          </div>
          <label class="toggle-switch">
            <input
              type="checkbox"
              .checked=${this.indexedDBEnabled}
              @change=${this.handleToggleEnabled}
            />
            <span class="toggle-slider"></span>
          </label>
        </div>

        ${this.indexedDBEnabled ? html`
          <!-- Auto Cleanup -->
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">Auto Cleanup</div>
              <div class="setting-description">
                Automatically delete oldest records when limit is reached
              </div>
            </div>
            <label class="toggle-switch">
              <input
                type="checkbox"
                .checked=${settings.autoCleanup}
                @change=${this.handleToggleAutoCleanup}
              />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <!-- Max Records -->
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">Max Records Per Device</div>
              <div class="setting-description">
                Maximum records to keep (100-50,000)
              </div>
            </div>
            <div class="number-input">
              <input
                type="number"
                min="100"
                max="50000"
                step="100"
                .value=${settings.maxRecordsPerDevice.toString()}
                @change=${this.handleMaxRecordsChange}
              />
              <span>records</span>
            </div>
          </div>

          <!-- Database Stats -->
          <div class="stat-grid">
            <div class="stat-card-small">
              <div class="stat-label-small">Database Size</div>
              <div class="stat-value-small">${this.databaseSize}</div>
            </div>
            <div class="stat-card-small">
              <div class="stat-label-small">Device Records</div>
              <div class="stat-value-small">${this.statistics.count}</div>
            </div>
          </div>

          <!-- Clear Data Section -->
          <div class="clear-section">
            <div class="section-title">Clear Old Data (This Device)</div>
            <div class="clear-options">
              <button class="clear-btn" @click=${() => this.handleClearOldData(1)}>
                Last 1 Hour
              </button>
              <button class="clear-btn" @click=${() => this.handleClearOldData(24)}>
                Last 24 Hours
              </button>
              <button class="clear-btn" @click=${() => this.handleClearOldData(168)}>
                Last 7 Days
              </button>
              <button class="clear-btn" @click=${() => this.handleClearOldData(720)}>
                Last 30 Days
              </button>
            </div>

            <div class="action-buttons">
              <button class="btn btn-danger" @click=${this.handleClear}>
                🗑️ Clear This Device
              </button>
              <button class="btn btn-danger" @click=${this.handleClearAllData}>
                🗑️ Clear All Devices
              </button>
            </div>
          </div>

          <div class="warning-box">
            <span class="warning-icon">⚠️</span>
            <div class="warning-text">
              Clearing data is permanent and cannot be undone. Export before clearing to keep a backup.
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderHistory() {
    return html`
      ${this.renderControls()}
      ${this.renderStatistics()}
      ${this.loading ? this.renderLoading() : this.renderTable()}
    `;
  }

  private renderControls() {
    return html`
      <div class="controls">
        <div class="time-range-selector">
          ${['1h', '6h', '24h', '7d', '30d', 'all'].map(range => html`
            <button
              class="time-btn ${this.timeRange === range ? 'active' : ''}"
              @click=${() => { this.timeRange = range as any; }}
            >
              ${range === 'all' ? 'All Time' : range.toUpperCase()}
            </button>
          `)}
        </div>

        ${this.availableFields.length > 0 ? html`
          <div class="field-selector">
            <label>Field:</label>
            <select @change=${(e: Event) => {
              this.selectedField = (e.target as HTMLSelectElement).value;
            }}>
              <option value="">All Fields</option>
              ${this.availableFields.map(field => html`
                <option value="${field}" ?selected=${this.selectedField === field}>
                  ${field}
                </option>
              `)}
            </select>
          </div>
        ` : ''}

        <div style="margin-left: auto; display: flex; gap: 12px;">
          <button class="btn btn-primary" @click=${this.handleExport}>
            📥 Export
          </button>
        </div>
      </div>
    `;
  }

  private renderStatistics() {
    return html`
      <div class="statistics">
        <div class="stat-card">
          <div class="stat-label">Total Records</div>
          <div class="stat-value">${this.statistics.count}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Oldest Record</div>
          <div class="stat-value">
            ${this.statistics.oldest
              ? this.formatTimestamp(this.statistics.oldest.getTime())
              : 'N/A'}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Latest Record</div>
          <div class="stat-value">
            ${this.statistics.newest
              ? this.formatTimestamp(this.statistics.newest.getTime())
              : 'N/A'}
          </div>
        </div>
      </div>
    `;
  }

  private renderLoading() {
    return html`
      <div class="loading">
        <div class="spinner"></div>
        <div>Loading sensor history...</div>
      </div>
    `;
  }

  private renderTable() {
    if (this.records.length === 0) {
      return html`
        <div class="empty-state">
          <div class="empty-icon">🔭</div>
          <h3>No Data Available</h3>
          <p>No sensor readings have been recorded yet.</p>
        </div>
      `;
    }

    return html`
      <div class="data-table">
        <div class="table-header">
          <div>Timestamp</div>
          <div>Value</div>
          <div>Status</div>
        </div>
        <div class="table-body">
          ${this.records.map(record => this.renderTableRow(record))}
        </div>
      </div>
    `;
  }

  private renderTableRow(record: SensorDataRecord) {
    const value = this.selectedField
      ? this.getValueByPath(record.data, this.selectedField)
      : record.data;

    return html`
      <div class="table-row">
        <div class="timestamp">${this.formatTimestamp(record.timestamp)}</div>
        <div class="data-value">${this.formatValue(value)}</div>
        <div>
          <span class="data-badge ${this.getValueBadgeClass(value)}">
            ${typeof value === 'boolean' ? (value ? 'Active' : 'Inactive') : 'OK'}
          </span>
        </div>
      </div>
    `;
  }

  private handleClose() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }
}