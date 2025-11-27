// components/features/shield-dashboard.component.ts
// Comprehensive Command Shield Monitoring Dashboard

import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { commandShield } from '../../../services/command-shield.service';
import { serviceManager } from '../../../services/service-manager';
import { deviceService } from '../../../services/device-service';
import { userSessionManager } from '../../../services/user-session.manager';
import { notificationService } from '../../../services/notification.service';
import { shieldDashStyles } from '../../../styles/shield-dash.styles';
import { shieldHandler } from '../../handlers/shield-handler';

interface ShieldMetrics {
  totalCommands: number;
  completedCommands: number;
  failedCommands: number;
  blockedCommands: number;
  deniedCommands: number;
  averageSafetyScore: number;
  commandsLastHour: number;
  commandsLastMinute: number;
}

@customElement('shield-dashboard')
export class ShieldDashboard extends LitElement {
    static styles = shieldDashStyles;
  @state() private status = commandShield.getStatus();
  @state() private metrics: ShieldMetrics | null = null;
  @state() private session = userSessionManager.getCurrentSession();
  @state() private devices = deviceService.getDevices();
  @state() private selectedTab: 'overview' | 'metrics' | 'devices' | 'settings' = 'overview';
  @state() private autoRefresh = true;
  @state() private lastUpdate = new Date();

  private refreshInterval: any = null;
  private unsubscribers: (() => void)[] = [];

  connectedCallback() {
      super.connectedCallback();
    // ✅ CRITICAL FIX: Subscribe to shield events
    this.setupSubscriptions();
    this.updateData();
    if (this.autoRefresh) {
      this.startAutoRefresh();
      }
      console.log('✅ Shield Dashboard connected and listening');
  }

  disconnectedCallback() {
    super.disconnectedCallback();
      this.stopAutoRefresh();
      this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];

    console.log('🔌 Shield Dashboard disconnected');
  }

  private startAutoRefresh(): void {
    this.refreshInterval = setInterval(() => {
      this.updateData();
    }, 1000);
  }

  private stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  private updateData(): void {
    // ✅ Get data from handler
    this.status = shieldHandler.getStatus();
    this.metrics = shieldHandler.refreshMetrics(); // Force refresh
    this.session = userSessionManager.getCurrentSession();
    this.devices = deviceService.getDevices();
    this.lastUpdate = new Date();

    console.log('📊 Dashboard updated:', {
      status: this.status,
      metrics: this.metrics,
      session: this.session?.username
    });

    this.requestUpdate();
  }

  private calculateMetrics(): void {
    const devices = deviceService.getDevices();
    let totalCommands = 0;
    let completedCommands = 0;
    let failedCommands = 0;
    let blockedCommands = 0;
    let deniedCommands = 0;
    let totalSafetyScore = 0;
    let commandsLastHour = 0;
    let commandsLastMinute = 0;

    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const oneMinuteAgo = now - 60000;

    devices.forEach((device: { id: any; }) => {
      const history = commandShield.getCommandHistory(device.id, 1000);

      history.forEach((log: { validation: { safetyScore: number; }; status: string; request: { timestamp: { getTime: () => any; }; }; }) => {
        totalCommands++;
        totalSafetyScore += log.validation.safetyScore;

        if (log.status === 'completed') completedCommands++;
        if (log.status === 'failed') failedCommands++;
        if (log.status === 'denied') deniedCommands++;

        const timestamp = log.request.timestamp.getTime();
        if (timestamp > oneHourAgo) commandsLastHour++;
        if (timestamp > oneMinuteAgo) commandsLastMinute++;
      });
    });

    // Add blocked commands from session stats
    if (this.session?.shieldStats) {
      blockedCommands = this.session.shieldStats.blockedCommands;
    }

    this.metrics = {
      totalCommands,
      completedCommands,
      failedCommands,
      blockedCommands,
      deniedCommands,
      averageSafetyScore: totalCommands > 0 ? Math.round(totalSafetyScore / totalCommands) : 100,
      commandsLastHour,
      commandsLastMinute
    };
    }

    // ✅ FIXED: Subscribe to handler instead of service
    private setupSubscriptions(): void {
        // Subscribe to handler status changes
        const statusUnsub = shieldHandler.onStatusChange((status) => {
          console.log('📊 Status update:', status);
          this.status = status;
          this.lastUpdate = new Date();
          this.requestUpdate();
        });

        // Subscribe to handler metrics changes
        const metricsUnsub = shieldHandler.onMetricsChange((metrics) => {
          console.log('📈 Metrics update:', metrics);
          this.metrics = metrics;
          this.requestUpdate();
        });

        // Subscribe to session changes
        const sessionUnsub = userSessionManager.subscribe((session) => {
          console.log('👤 Session update:', session?.username);
          this.session = session;
          this.requestUpdate();
        });

        // Subscribe to device changes
        const deviceUnsub = deviceService.subscribe((devices) => {
          console.log('🔄 Devices update:', devices.length);
          this.devices = devices;
          this.requestUpdate();
        });

        this.unsubscribers.push(statusUnsub, metricsUnsub, sessionUnsub, deviceUnsub);
      }
    // Format time for display
  private formatTime(date: Date): string {
        return date.toLocaleTimeString();
      }

  render() {
    return html`
      <div class="dashboard">
        <div class="dashboard-header">
          <h2>🛡️ Command Shield Dashboard</h2>
          <div class="header-actions">
          <div class="last-update">
              Last update: ${this.formatTime(this.lastUpdate)}
            </div>
            <label class="auto-refresh-toggle">
              <input
                type="checkbox"
                .checked=${this.autoRefresh}
                @change=${this.handleAutoRefreshToggle}
              />
              Auto-refresh
            </label>
            <button @click=${this.updateData}>🔄 Refresh</button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button
            class="tab ${this.selectedTab === 'overview' ? 'active' : ''}"
            @click=${() => this.selectedTab = 'overview'}
          >
            📊 Overview
          </button>
          <button
            class="tab ${this.selectedTab === 'metrics' ? 'active' : ''}"
            @click=${() => this.selectedTab = 'metrics'}
          >
            📈 Metrics
          </button>
          <button
            class="tab ${this.selectedTab === 'devices' ? 'active' : ''}"
            @click=${() => this.selectedTab = 'devices'}
          >
            📱 Devices
          </button>
          <button
            class="tab ${this.selectedTab === 'settings' ? 'active' : ''}"
            @click=${() => this.selectedTab = 'settings'}
          >
            ⚙️ Settings
          </button>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          ${this.renderTabContent()}
        </div>
      </div>
    `;
  }

  private renderTabContent() {
    switch (this.selectedTab) {
      case 'overview':
        return this.renderOverview();
      case 'metrics':
        return this.renderMetrics();
      case 'devices':
        return this.renderDevices();
      case 'settings':
        return this.renderSettings();
      default:
        return html``;
    }
  }

  private renderOverview() {
    return html`
      <div class="overview">
        <!-- Shield Status -->
        <div class="status-section">
          <h3>Shield Status</h3>
          <div class="status-cards">
            <div class="status-card ${serviceManager.isShieldActive() ? 'success' : 'error'}">
              <div class="card-icon">${serviceManager.isShieldActive() ? '✅' : '❌'}</div>
              <div class="card-label">Shield</div>
              <div class="card-value">${serviceManager.isShieldActive() ? 'Active' : 'Inactive'}</div>
            </div>

            <div class="status-card ${this.status.emergencyStopActive ? 'critical' : 'success'}">
              <div class="card-icon">${this.status.emergencyStopActive ? '🚨' : '✅'}</div>
              <div class="card-label">Emergency Stop</div>
              <div class="card-value">${this.status.emergencyStopActive ? 'ACTIVE' : 'Normal'}</div>
            </div>

            <div class="status-card ${this.status.globalPauseActive ? 'warning' : 'success'}">
              <div class="card-icon">${this.status.globalPauseActive ? '⏸️' : '▶️'}</div>
              <div class="card-label">Commands</div>
              <div class="card-value">${this.status.globalPauseActive ? 'Paused' : 'Active'}</div>
            </div>

            <div class="status-card ${this.status.blacklistedDevices > 0 ? 'warning' : 'success'}">
              <div class="card-icon">⛔</div>
              <div class="card-label">Blacklisted</div>
              <div class="card-value">${this.status.blacklistedDevices}</div>
            </div>
          </div>
        </div>

        <!-- Current Activity -->
        <div class="activity-section">
          <h3>Current Activity</h3>
          <div class="activity-cards">
            <div class="activity-card">
              <div class="activity-icon">⚡</div>
              <div class="activity-label">Active Commands</div>
              <div class="activity-value">${this.status.activeCommands}</div>
            </div>

            <div class="activity-card">
              <div class="activity-icon">🔒</div>
              <div class="activity-label">Device Locks</div>
              <div class="activity-value">${this.status.deviceLocks}</div>
            </div>

            <div class="activity-card">
              <div class="activity-icon">📱</div>
              <div class="activity-label">Total Devices</div>
              <div class="activity-value">${this.devices.length}</div>
            </div>

            <div class="activity-card">
              <div class="activity-icon">✅</div>
              <div class="activity-label">Online Devices</div>
              <div class="activity-value">
                ${this.devices.filter((d: { isConnected: any; }) => d.isConnected).length}
              </div>
            </div>
          </div>
        </div>

        <!-- Session Stats -->
        ${this.session?.shieldStats ? html`
          <div class="stats-section">
            <h3>Session Statistics</h3>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">Total Commands</div>
                <div class="stat-value">${this.session.shieldStats.totalCommands}</div>
              </div>
              <div class="stat-card warning">
                <div class="stat-label">Blocked</div>
                <div class="stat-value">${this.session.shieldStats.blockedCommands}</div>
              </div>
              <div class="stat-card error">
                <div class="stat-label">Emergency Stops</div>
                <div class="stat-value">${this.session.shieldStats.emergencyStops}</div>
              </div>
              ${this.session.shieldStats.lastEmergencyStop ? html`
                <div class="stat-card">
                  <div class="stat-label">Last Emergency Stop</div>
                  <div class="stat-value small">
                    ${this.formatDate(this.session.shieldStats.lastEmergencyStop)}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        <!-- Emergency Controls -->
        <div class="controls-section">
          <emergency-controls></emergency-controls>
        </div>
      </div>
    `;
  }

  private renderMetrics() {
    if (!this.metrics) {
      return html`<div class="loading">Calculating metrics...</div>`;
    }

    const successRate = this.metrics.totalCommands > 0
      ? Math.round((this.metrics.completedCommands / this.metrics.totalCommands) * 100)
      : 0;

    const blockRate = this.metrics.totalCommands > 0
      ? Math.round((this.metrics.blockedCommands / this.metrics.totalCommands) * 100)
      : 0;

    return html`
      <div class="metrics">
        <!-- Summary Metrics -->
        <div class="metrics-summary">
          <h3>Command Metrics</h3>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-label">Total Commands</div>
              <div class="metric-value large">${this.metrics.totalCommands}</div>
            </div>

            <div class="metric-card success">
              <div class="metric-label">Completed</div>
              <div class="metric-value">${this.metrics.completedCommands}</div>
              <div class="metric-subtitle">${successRate}% success rate</div>
            </div>

            <div class="metric-card error">
              <div class="metric-label">Failed</div>
              <div class="metric-value">${this.metrics.failedCommands}</div>
            </div>

            <div class="metric-card warning">
              <div class="metric-label">Blocked</div>
              <div class="metric-value">${this.metrics.blockedCommands}</div>
              <div class="metric-subtitle">${blockRate}% block rate</div>
            </div>

            <div class="metric-card warning">
              <div class="metric-label">Denied</div>
              <div class="metric-value">${this.metrics.deniedCommands}</div>
            </div>

            <div class="metric-card ${this.getSafetyScoreClass(this.metrics.averageSafetyScore)}">
              <div class="metric-label">Avg Safety Score</div>
              <div class="metric-value">${this.metrics.averageSafetyScore}/100</div>
            </div>
          </div>
        </div>

        <!-- Rate Metrics -->
        <div class="rate-metrics">
          <h3>Command Rate</h3>
          <div class="rate-grid">
            <div class="rate-card">
              <div class="rate-icon">⚡</div>
              <div class="rate-label">Last Minute</div>
              <div class="rate-value">${this.metrics.commandsLastMinute}</div>
              <div class="rate-subtitle">${this.metrics.commandsLastMinute}/min</div>
            </div>

            <div class="rate-card">
              <div class="rate-icon">📊</div>
              <div class="rate-label">Last Hour</div>
              <div class="rate-value">${this.metrics.commandsLastHour}</div>
              <div class="rate-subtitle">${Math.round(this.metrics.commandsLastHour / 60)}/min avg</div>
            </div>
          </div>
        </div>

        <!-- Command History Widget -->
        <div class="history-widget">
          <command-history limit="10" compact></command-history>
        </div>
      </div>
    `;
  }

  private renderDevices() {
    const enabledDevices = this.devices.filter((d: { isEnabled?: boolean }) => d.isEnabled === true);
    const disabledDevices = this.devices.filter((d: { isEnabled?: boolean }) => d.isEnabled === false);
    const onlineDevices = this.devices.filter((d: { isConnected?: boolean }) => d.isConnected === true);

    return html`
      <div class="devices">
        <div class="devices-summary">
          <h3>Device Overview</h3>
          <div class="devices-stats">
            <div class="device-stat">
              <span class="label">Total:</span>
              <span class="value">${this.devices.length}</span>
            </div>
            <div class="device-stat success">
              <span class="label">Enabled:</span>
              <span class="value">${enabledDevices.length}</span>
            </div>
            <div class="device-stat">
              <span class="label">Disabled:</span>
              <span class="value">${disabledDevices.length}</span>
            </div>
            <div class="device-stat success">
              <span class="label">Online:</span>
              <span class="value">${onlineDevices.length}</span>
            </div>
          </div>
        </div>

        <div class="devices-list">
          <h3>Device Command Activity</h3>
          ${this.devices.length === 0 ? html`
            <div class="empty-state">No devices configured</div>
          ` : html`
            <div class="devices-table">
              <div class="table-header">
                <div class="col-name">Device</div>
                <div class="col-type">Type</div>
                <div class="col-status">Status</div>
                <div class="col-commands">Commands</div>
                <div class="col-actions">Actions</div>
              </div>
              ${this.devices.map((device: any) => this.renderDeviceRow(device))}
            </div>
          `}
        </div>
      </div>
    `;
  }

  private renderDeviceRow(device: any) {
    const history = commandShield.getCommandHistory(device.id, 100);
    const commandCount = history.length;

    return html`
      <div class="table-row">
        <div class="col-name">
          <span class="device-icon">${this.getDeviceIcon(device.type)}</span>
          ${device.name}
        </div>
        <div class="col-type">${device.type}</div>
        <div class="col-status">
          <span class="status-badge ${device.isConnected ? 'online' : 'offline'}">
            ${device.isConnected ? '✅ Online' : '⚫ Offline'}
          </span>
        </div>
        <div class="col-commands">${commandCount}</div>
        <div class="col-actions">
          <button
            class="action-btn"
            @click=${() => this.showDeviceHistory(device)}
            title="View command history"
          >
            📜
          </button>
        </div>
      </div>
    `;
  }

  private renderSettings() {
    return html`
      <div class="settings">
        <h3>Shield Configuration</h3>

        <div class="settings-info">
          <p>
            <strong>Note:</strong> Shield settings are configured per-device through the command shield service.
            This dashboard provides monitoring and status information.
          </p>
        </div>

        <div class="settings-section">
          <h4>Global Settings</h4>
          <div class="setting-item">
            <div class="setting-label">Shield Status</div>
            <div class="setting-value ${serviceManager.isShieldActive() ? 'success' : 'error'}">
              ${serviceManager.isShieldActive() ? '✅ Active' : '❌ Inactive'}
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-label">Auto-Refresh</div>
            <div class="setting-value">
              <label>
                <input
                  type="checkbox"
                  .checked=${this.autoRefresh}
                  @change=${this.handleAutoRefreshToggle}
                />
                Enabled
              </label>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <h4>System Information</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Shield Version:</span>
              <span class="info-value">1.0.0</span>
            </div>
            <div class="info-item">
              <span class="info-label">Session User:</span>
              <span class="info-value">${this.session?.username || 'Unknown'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Subscription Tier:</span>
              <span class="info-value">${this.session?.subscription.tier || 'free'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Device Limit:</span>
              <span class="info-value">
                ${this.devices.length} / ${this.session?.features.maxDevices === -1 ? '∞' : this.session?.features.maxDevices}
              </span>
            </div>
          </div>
        </div>

        <div class="settings-actions">
          <button @click=${this.handleExportLogs}>💾 Export Logs</button>
          <button @click=${this.handleResetStats}>🔄 Reset Statistics</button>
          <button @click=${commandShield.debugInfo.bind(commandShield)}>🔍 Debug Info</button>
        </div>
      </div>
    `;
  }

  private getDeviceIcon(type: string): string {
    const icons: Record<string, string> = {
      switch: '💡',
      dimmer: '🎚️',
      shutter: '🪟',
      sensor: '📊'
    };
    return icons[type] || '📱';
  }

  private getSafetyScoreClass(score: number): string {
    if (score >= 80) return 'success';
    if (score >= 50) return 'warning';
    return 'error';
  }

  private formatDate(date: Date): string {
    return date.toLocaleString();
  }

  private showDeviceHistory(device: any): void {
    // This would open a modal or navigate to device history
    notificationService.info(`Viewing history for ${device.name}`);

    // Dispatch event for parent to handle
    this.dispatchEvent(new CustomEvent('show-device-history', {
      bubbles: true,
      composed: true,
      detail: { deviceId: device.id }
    }));
  }

  private handleAutoRefreshToggle(e: Event): void {
    this.autoRefresh = (e.target as HTMLInputElement).checked;

    if (this.autoRefresh) {
      this.startAutoRefresh();
      notificationService.success('Auto-refresh enabled');
    } else {
      this.stopAutoRefresh();
      notificationService.info('Auto-refresh disabled');
    }
  }

  private handleExportLogs(): void {
    try {
      // ✅ Use handler method
      const json = shieldHandler.exportLogs();

      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shield-logs-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      notificationService.success('✅ Logs exported');
    } catch (error: any) {
      notificationService.error(`Export failed: ${error.message}`);
    }
  }

  private handleResetStats(): void {
    const confirmed = confirm(
      'Reset Shield Statistics\n\n' +
      'This will reset all command statistics for the current session.\n' +
      'Command history will not be affected.\n\n' +
      'Continue?'
    );

    if (confirmed) {
      // ✅ Use handler method
      shieldHandler.resetSessionStats();
      this.updateData();
      }
    }



}