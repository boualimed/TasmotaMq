// components/features/emergency-controls.component.ts
// Emergency Control Panel for Command Shield

import { LitElement, html, css } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { commandShield } from '../../../services/command-shield.service';
import { serviceManager } from '../../../services/service-manager';
import { notificationService } from '../../../services/notification.service';
import { logger } from '../../../utils/logger.util';

@customElement('emergency-controls')
export class EmergencyControls extends LitElement {
  @state() private emergencyStopActive = false;
  @state() private pauseActive = false;
  @state() private status = commandShield.getStatus();
  @state() private isPaused = false;
  @state() private pauseEndTime: Date | null = null;
  @state() private remainingSeconds = 0;

  @property({ type: Boolean }) compact = false;

  private statusInterval: any = null;
  private pauseInterval: any = null;

  connectedCallback() {
    super.connectedCallback();
    this.startStatusUpdates();
    this.updateStatus();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stopStatusUpdates();
  }

  private startStatusUpdates(): void {
    // Update status every second
    this.statusInterval = setInterval(() => {
      this.updateStatus();
    }, 1000);
  }

  private stopStatusUpdates(): void {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
    if (this.pauseInterval) {
      clearInterval(this.pauseInterval);
      this.pauseInterval = null;
    }
  }

  private updateStatus(): void {
    this.status = commandShield.getStatus();
    this.emergencyStopActive = this.status.emergencyStopActive;
    this.isPaused = this.status.globalPauseActive;

    // Update pause countdown if active
    if (this.isPaused && this.pauseEndTime) {
      const now = Date.now();
      const remaining = Math.max(0, this.pauseEndTime.getTime() - now);
      this.remainingSeconds = Math.ceil(remaining / 1000);

      if (remaining <= 0) {
        this.pauseActive = false;
        this.isPaused = false;
        this.pauseEndTime = null;
      }
    }
  }

  render() {
    if (this.compact) {
      return this.renderCompact();
    }
    return this.renderFull();
  }

  private renderCompact() {
    return html`
      <div class="emergency-compact">
        ${this.emergencyStopActive ? html`
          <button
            class="emergency-button active"
            @click=${this.handleDeactivateStop}
            title="Emergency stop is active - Click to resume"
          >
            🚨 STOP
          </button>
        ` : html`
          <button
            class="emergency-button"
            @click=${this.handleEmergencyStop}
            title="Emergency stop - Blocks all commands"
          >
            🛡️
          </button>
        `}

        ${this.isPaused ? html`
          <div class="pause-indicator">
            ⏸️ ${this.remainingSeconds}s
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderFull() {
    return html`
      <div class="emergency-panel">
        <h3>🛡️ Emergency Controls</h3>

        <!-- Emergency Stop Button -->
        ${this.renderEmergencyStopButton()}

        <!-- Pause Button -->
        ${!this.emergencyStopActive ? html`
          <button
            class="pause-commands ${this.isPaused ? 'active' : ''}"
            @click=${this.handlePauseCommands}
            ?disabled=${this.isPaused}
          >
            ${this.isPaused
              ? html`⏸️ Paused (${this.remainingSeconds}s remaining)`
              : html`⏸️ Pause All Commands (30s)`
            }
          </button>
        ` : ''}

        <!-- Quick Actions -->
        ${!this.emergencyStopActive && !this.isPaused ? html`
          <div class="quick-actions">
            <button
              class="quick-action"
              @click=${() => this.handleQuickPause(10)}
              title="Pause for 10 seconds"
            >
              ⏸️ 10s
            </button>
            <button
              class="quick-action"
              @click=${() => this.handleQuickPause(60)}
              title="Pause for 1 minute"
            >
              ⏸️ 1m
            </button>
            <button
              class="quick-action"
              @click=${() => this.handleQuickPause(300)}
              title="Pause for 5 minutes"
            >
              ⏸️ 5m
            </button>
          </div>
        ` : ''}

        <!-- Status Display -->
        <div class="status-section">
          ${this.renderStatus()}
        </div>

        <!-- Help Text -->
        ${!this.emergencyStopActive && !this.isPaused ? html`
          <div class="help-text">
            <p><strong>Emergency Stop:</strong> Immediately blocks all device commands.</p>
            <p><strong>Pause:</strong> Temporarily blocks commands for a set duration.</p>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderEmergencyStopButton() {
    if (this.emergencyStopActive) {
      return html`
        <div class="emergency-active">
          <button
            class="emergency-stop active"
            @click=${this.handleDeactivateStop}
          >
            🚨 EMERGENCY STOP ACTIVE
          </button>
          <p class="emergency-message">
            All device commands are blocked. Click above to resume operations.
          </p>
        </div>
      `;
    }

    return html`
      <button
        class="emergency-stop"
        @click=${this.handleEmergencyStop}
      >
        🚨 EMERGENCY STOP
      </button>
    `;
  }

  private renderStatus() {
    return html`
      <div class="status-grid">
        <div class="status-item">
          <span class="status-label">Active Commands:</span>
          <span class="status-value ${this.status.activeCommands > 0 ? 'active' : ''}">
            ${this.status.activeCommands}
          </span>
        </div>

        <div class="status-item">
          <span class="status-label">Device Locks:</span>
          <span class="status-value ${this.status.deviceLocks > 0 ? 'active' : ''}">
            ${this.status.deviceLocks}
          </span>
        </div>

        <div class="status-item">
          <span class="status-label">Blacklisted:</span>
          <span class="status-value ${this.status.blacklistedDevices > 0 ? 'warning' : ''}">
            ${this.status.blacklistedDevices}
          </span>
        </div>

        <div class="status-item">
          <span class="status-label">Shield Status:</span>
          <span class="status-value ${serviceManager.isShieldActive() ? 'success' : 'error'}">
            ${serviceManager.isShieldActive() ? '✅ Active' : '❌ Inactive'}
          </span>
        </div>
      </div>
    `;
  }

  private handleEmergencyStop(): void {
    const confirmed = confirm(
      '🚨 EMERGENCY STOP\n\n' +
      'This will:\n' +
      '• Stop all active commands immediately\n' +
      '• Block all new commands\n' +
      '• Cancel command queue\n\n' +
      'Only use in emergencies!\n\n' +
      'Continue?'
    );

    if (confirmed) {
      try {
        commandShield.activateEmergencyStop('User activated emergency stop');
        this.emergencyStopActive = true;

        logger.addLog('error', '🚨 Emergency stop activated by user');
        notificationService.error('🚨 EMERGENCY STOP ACTIVE', 0);

        // Dispatch custom event
        this.dispatchEvent(new CustomEvent('emergency-stop-activated', {
          bubbles: true,
          composed: true
        }));

      } catch (error: any) {
        console.error('Failed to activate emergency stop:', error);
        notificationService.error(`Failed to activate emergency stop: ${error.message}`);
      }
    }
  }

  private handleDeactivateStop(): void {
    const confirmed = confirm(
      '✅ Resume Operations\n\n' +
      'This will deactivate emergency stop and allow device commands again.\n\n' +
      'Are you sure it\'s safe to proceed?'
    );

    if (confirmed) {
      try {
        commandShield.deactivateEmergencyStop();
        this.emergencyStopActive = false;

        logger.addLog('success', '✅ Emergency stop deactivated');
        notificationService.success('✅ Operations resumed', 5000);

        // Dispatch custom event
        this.dispatchEvent(new CustomEvent('emergency-stop-deactivated', {
          bubbles: true,
          composed: true
        }));

      } catch (error: any) {
        console.error('Failed to deactivate emergency stop:', error);
        notificationService.error(`Failed to resume: ${error.message}`);
      }
    }
  }

  private handlePauseCommands(): void {
    this.handleQuickPause(30);
  }

  private handleQuickPause(seconds: number): void {
    if (this.isPaused) {
      notificationService.warning('Commands are already paused');
      return;
    }

    try {
      const durationMs = seconds * 1000;
      commandShield.pauseCommands(durationMs, `User requested ${seconds}s pause`);

      this.pauseActive = true;
      this.isPaused = true;
      this.pauseEndTime = new Date(Date.now() + durationMs);
      this.remainingSeconds = seconds;

      logger.addLog('warning', `⏸️ Commands paused for ${seconds}s`);
      notificationService.warning(`⏸️ Commands paused for ${seconds}s`, 3000);

      // Start countdown
      this.pauseInterval = setInterval(() => {
        if (this.pauseEndTime) {
          const remaining = Math.max(0, this.pauseEndTime.getTime() - Date.now());
          this.remainingSeconds = Math.ceil(remaining / 1000);

          if (remaining <= 0) {
            this.pauseActive = false;
            this.isPaused = false;
            this.pauseEndTime = null;

            if (this.pauseInterval) {
              clearInterval(this.pauseInterval);
              this.pauseInterval = null;
            }

            notificationService.success('✅ Pause ended - Commands enabled', 2000);
          }
        }
      }, 100);

      // Dispatch custom event
      this.dispatchEvent(new CustomEvent('commands-paused', {
        bubbles: true,
        composed: true,
        detail: { seconds }
      }));

    } catch (error: any) {
      console.error('Failed to pause commands:', error);
      notificationService.error(`Failed to pause: ${error.message}`);
    }
  }

  static styles = css`
    :host {
      display: block;
    }

    .emergency-panel {
      padding: 20px;
      background: var(--error-bg, #ffe0e0);
      border: 2px solid var(--error, #ff0000);
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    h3 {
      margin: 0 0 16px 0;
      font-size: 20px;
      color: var(--error, #ff0000);
    }

    .emergency-stop {
      width: 100%;
      padding: 16px;
      font-size: 18px;
      font-weight: bold;
      background: #ff0000;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      margin-bottom: 12px;
      transition: background 0.2s;
    }

    .emergency-stop:hover:not(:disabled) {
      background: #cc0000;
    }

    .emergency-stop.active {
      background: #990000;
      animation: pulse 1.5s infinite;
      cursor: pointer;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(0.98); }
    }

    .emergency-active {
      margin-bottom: 16px;
    }

    .emergency-message {
      margin: 12px 0 0 0;
      padding: 12px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 4px;
      color: #333;
      font-weight: 500;
    }

    .pause-commands {
      width: 100%;
      padding: 12px;
      font-size: 16px;
      font-weight: 500;
      background: #ff8800;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      margin-bottom: 12px;
      transition: background 0.2s;
    }

    .pause-commands:hover:not(:disabled) {
      background: #e67700;
    }

    .pause-commands:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .pause-commands.active {
      background: #cc6600;
    }

    .quick-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }

    .quick-action {
      flex: 1;
      padding: 10px;
      font-size: 14px;
      font-weight: 500;
      background: #4a90e2;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .quick-action:hover {
      background: #357abd;
    }

    .status-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(0, 0, 0, 0.1);
    }

    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
    }

    .status-item {
      display: flex;
      flex-direction: column;
      padding: 12px;
      background: rgba(255, 255, 255, 0.8);
      border-radius: 6px;
    }

    .status-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
      font-weight: 500;
    }

    .status-value {
      font-size: 18px;
      font-weight: bold;
      color: #333;
    }

    .status-value.active {
      color: #4a90e2;
    }

    .status-value.warning {
      color: #ff8800;
    }

    .status-value.success {
      color: #00aa00;
    }

    .status-value.error {
      color: #ff0000;
    }

    .help-text {
      margin-top: 16px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.6);
      border-radius: 6px;
      font-size: 13px;
      color: #555;
    }

    .help-text p {
      margin: 6px 0;
    }

    .help-text strong {
      color: #333;
    }

    /* Compact Mode */
    .emergency-compact {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .emergency-button {
      padding: 8px 16px;
      font-size: 16px;
      font-weight: bold;
      background: #ff0000;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .emergency-button:hover {
      background: #cc0000;
    }

    .emergency-button.active {
      background: #990000;
      animation: pulse 1.5s infinite;
    }

    .pause-indicator {
      padding: 6px 12px;
      background: #ff8800;
      color: white;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
    }
  `;
}