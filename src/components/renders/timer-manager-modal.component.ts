import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Device, TasmotaTimer } from '../../models/device.model';
import { TIMER_COMMANDS } from '../../constants/mqtt.constants';
import { timerStyles } from '../../styles/timer.styles';
import { commandShield } from '../../services/command-shield.service';

@customElement('timer-manager-modal')
export class TimerManagerModal extends LitElement {
  @property({ type: Object }) device!: Device;
  @property({ type: Boolean }) open = false;

  @state() private selectedTimer: number | null = null;
  @state() private editingTimer: Partial<TasmotaTimer> = {};

  static styles = timerStyles;

  render(): TemplateResult {
    if (!this.open) return html``;

    return html`
      <div class="modal-overlay" @click="${this.handleOverlayClick}">
        <div class="modal-content" @click="${(e: Event) => e.stopPropagation()}">
          <div class="modal-header">
            <h2 class="modal-title">
              ⏰ Timer Manager - ${this.device.name}
            </h2>
          </div>
          ${this.renderShieldStatus()}
          <div class="modal-body">
            ${this.selectedTimer === null
              ? this.renderTimerList()
              : this.renderTimerEditor()
            }
          </div>
        </div>
      </div>
    `;
  }

  private renderTimerList(): TemplateResult {
    const timers = this.device.timerConfig?.timers || [];
    const activeTimers = timers.filter(t => t.enabled);

    return html`
      <div class="timer-list">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <span style="color: #94a3b8; font-size: 0.9rem;">
              ${activeTimers.length} active timer${activeTimers.length !== 1 ? 's' : ''} of ${timers.length}
            </span>
          </div>
          <button
            class="button primary"
            @click="${() => this.handleNewTimer()}"
            style="flex: none; padding: 8px 16px;"
          >
            ➕ Add Timer
          </button>
        </div>

        ${timers.length === 0 ? html`
          <div class="empty-state">
            <div class="empty-state-icon">⏰</div>
            <div style="color: #cbd5e1; font-weight: 500; margin-bottom: 8px;">
              No timers configured
            </div>
            <div style="color: #64748b; font-size: 0.875rem;">
              Click "Add Timer" to create your first timer
            </div>
          </div>
        ` : html`
          ${timers.sort((a, b) => a.id - b.id).map(timer => this.renderTimerItem(timer))}
        `}
      </div>

      <div class="button-group">
        <button class="button secondary" @click="${this.handleClose}">
          Close
        </button>
      </div>
    `;
  }

  private renderTimerItem(timer: TasmotaTimer): TemplateResult {
    const modeLabels = ['Schedule', 'Sunrise', 'Sunset'];
    const actionLabels = ['OFF', 'ON', 'Toggle', 'Rule'];

    return html`
      <div class="timer-item ${timer.enabled ? 'active' : ''}">
        <div class="timer-info">
          <div class="timer-number">Timer ${timer.id}</div>
          <div class="timer-details">
            ${timer.time} • ${modeLabels[timer.mode]} • ${actionLabels[timer.action]}
            ${timer.repeat ? ' • Repeats' : ''}
          </div>
        </div>
        <div class="timer-actions">
          <button
            class="button secondary"
            style="padding: 6px 12px; font-size: 0.85rem;"
            @click="${() => this.handleEditTimer(timer)}"
          >
            ✏️ Edit
          </button>
          <button
            class="button danger"
            style="padding: 6px 12px; font-size: 0.85rem;"
            @click="${() => this.handleDeleteTimer(timer.id)}"
          >
            🗑️
          </button>
        </div>
      </div>
    `;
  }

  private renderTimerEditor(): TemplateResult {
    const isNew = this.selectedTimer === 0;
    const timer = this.editingTimer;

    return html`
      <div>
        <button
          class="button secondary"
          @click="${() => this.selectedTimer = null}"
          style="margin-bottom: 20px; padding: 8px 16px;"
        >
          ← Back to List
        </button>

        <h3 style="color: #f1f5f9; margin-bottom: 20px;">
          ${isNew ? 'Create New Timer' : `Edit Timer ${this.selectedTimer}`}
        </h3>

        <div class="form-group">
          <label class="form-label">Time</label>
          <input
            type="time"
            class="form-input"
            .value="${timer.time || '00:00'}"
            @input="${(e: Event) => {
              const target = e.target as HTMLInputElement;
              this.editingTimer = { ...this.editingTimer, time: target.value };
            }}"
          />
      <div class="help-text">Set the time for this timer to trigger</div>
        </div>

        <div class="form-group">
          <label class="form-label">Mode</label>
          <select
            class="form-select"
            .value="${(timer.mode ?? TIMER_COMMANDS.MODE_SCHEDULE).toString()}"
            @change="${(e: Event) => {
              const target = e.target as HTMLSelectElement;
              this.editingTimer = { ...this.editingTimer, mode: parseInt(target.value) };
            }}"
          >
            <option value="${TIMER_COMMANDS.MODE_SCHEDULE}">🕐 Schedule (Fixed Time)</option>
            <option value="${TIMER_COMMANDS.MODE_SUNRISE}">🌅 Sunrise Offset</option>
            <option value="${TIMER_COMMANDS.MODE_SUNSET}">🌇 Sunset Offset</option>
          </select>
          <div class="help-text">
            ${timer.mode === TIMER_COMMANDS.MODE_SUNRISE
              ? 'Time will be relative to sunrise (e.g., 00:30 = 30 min after sunrise)'
              : timer.mode === TIMER_COMMANDS.MODE_SUNSET
              ? 'Time will be relative to sunset (e.g., -00:30 = 30 min before sunset)'
              : 'Timer will trigger at the specified time'
            }
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Action</label>
          <select
            class="form-select"
            .value="${(timer.action ?? TIMER_COMMANDS.ACTION_ON).toString()}"
            @change="${(e: Event) => {
              const target = e.target as HTMLSelectElement;
              this.editingTimer = { ...this.editingTimer, action: parseInt(target.value) };
            }}"
          >
            <option value="${TIMER_COMMANDS.ACTION_OFF}">⚫ Turn OFF</option>
            <option value="${TIMER_COMMANDS.ACTION_ON}">🟢 Turn ON</option>
            <option value="${TIMER_COMMANDS.ACTION_TOGGLE}">🔄 Toggle</option>
            <option value="${TIMER_COMMANDS.ACTION_RULE}">📜 Execute Rule</option>
          </select>
        </div>

        ${this.device.powerChannel && this.device.powerChannel > 1 ? html`
          <div class="form-group">
            <label class="form-label">Output/Relay</label>
            <select
              class="form-select"
              .value="${(timer.output ?? this.device.powerChannel ?? 1).toString()}"
              @change="${(e: Event) => {
                const target = e.target as HTMLSelectElement;
                this.editingTimer = { ...this.editingTimer, output: parseInt(target.value) };
              }}"
            >
              ${Array.from({ length: 8 }, (_, i) => i + 1).map(i => html`
                <option value="${i}">POWER${i}</option>
              `)}
            </select>
            <div class="help-text">Select which relay/output to control</div>
          </div>
        ` : ''}

        <div class="form-group">
          <label class="form-label">Random Window (minutes)</label>
          <input
            type="number"
            class="form-input"
            min="0"
            max="15"
            .value="${(timer.window ?? 0).toString()}"
            @input="${(e: Event) => {
              const target = e.target as HTMLInputElement;
              this.editingTimer = { ...this.editingTimer, window: parseInt(target.value) || 0 };
            }}"
          />
          <div class="help-text">
            Randomize trigger time ±N minutes (0-15). Useful for security/presence simulation.
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Days of Week</label>
          <div class="days-selector">
            ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
              const isActive = this.isDayActive(index);
              return html`
                <button
                  class="day-button ${isActive ? 'active' : ''}"
                  @click="${() => this.toggleDay(index)}"
                  type="button"
                >
                  ${day}
                </button>
              `;
            })}
          </div>
          <div class="help-text">Select which days this timer should be active</div>
        </div>

        <div class="checkbox-group">
          <input
            type="checkbox"
            class="checkbox"
            .checked="${timer.repeat ?? false}"
            @change="${(e: Event) => {
              const target = e.target as HTMLInputElement;
              this.editingTimer = { ...this.editingTimer, repeat: target.checked };
            }}"
            id="repeat-timer"
          />
          <label class="form-label" for="repeat-timer">
            🔁 Repeat daily
          </label>
        </div>

        <div class="checkbox-group">
          <input
            type="checkbox"
            class="checkbox"
            .checked="${timer.enabled ?? true}"
            @change="${(e: Event) => {
              const target = e.target as HTMLInputElement;
              this.editingTimer = { ...this.editingTimer, enabled: target.checked };
            }}"
            id="enable-timer"
          />
          <label class="form-label" for="enable-timer">
            ✅ Enable timer (Arm)
          </label>
        </div>

        <div class="button-group">
          <button
            class="button secondary"
            @click="${() => this.selectedTimer = null}"
          >
            Cancel
          </button>
          <button
            class="button primary"
            @click="${() => this.handleSaveTimer()}"
          >
            💾 Save Timer
          </button>
        </div>
      </div>
    `;
  }

  private renderShieldStatus(): TemplateResult {
    const status = commandShield.getStatus();

    if (status.emergencyStopActive) {
      return html`
        <div class="shield-warning emergency">
          <span class="icon">🚨</span>
          <span class="text">Emergency Stop Active - Rules cannot be uploaded</span>
        </div>
      `;
    }

    if (status.globalPauseActive) {
      return html`
        <div class="shield-warning paused">
          <span class="icon">⏸️</span>
          <span class="text">Commands Paused - Rules cannot be uploaded</span>
        </div>
      `;
    }

    if (commandShield.isDeviceBlacklisted(this.device.id)) {
      return html`
        <div class="shield-warning blacklisted">
          <span class="icon">⛔</span>
          <span class="text">Device Blacklisted - Rules cannot be uploaded</span>
        </div>
      `;
    }

    return html`
      <div class="shield-status ok">
        <span class="icon">✅</span>
        <span class="text">Shield Active - Safe to upload rules</span>
      </div>
    `;
  }
  private handleNewTimer(): void {
    // Find next available timer ID (1-16)
    const existingTimers = this.device.timerConfig?.timers || [];
    const usedIds = new Set(existingTimers.map(t => t.id));
    let nextId = 1;

    while (nextId <= 16 && usedIds.has(nextId)) {
      nextId++;
    }

    if (nextId > 16) {
      alert('Maximum 16 timers allowed per device');
      return;
    }

    this.selectedTimer = nextId;
    this.editingTimer = {
      id: nextId,
      enabled: true,
      mode: TIMER_COMMANDS.MODE_SCHEDULE,
      time: '00:00',
      window: 0,
      days: '1111111', // All days
      repeat: true,
      output: this.device.powerChannel || 1,
      action: TIMER_COMMANDS.ACTION_ON
    };
  }

  private handleEditTimer(timer: TasmotaTimer): void {
    this.selectedTimer = timer.id;
    this.editingTimer = { ...timer };
  }

  private handleSaveTimer(): void {
    if (!this.editingTimer.time) {
      alert('Please set a time for the timer');
      return;
    }

    const timerId = this.selectedTimer!;
    this.dispatchEvent(new CustomEvent('save-timer', {
      detail: {
        timerId,
        timer: {
          ...this.editingTimer,
          id: timerId
        }
      },
      bubbles: true,
      composed: true
    }));

    this.selectedTimer = null;
    this.editingTimer = {};
  }

  private handleDeleteTimer(timerId: number): void {
    this.dispatchEvent(new CustomEvent('delete-timer', {
      detail: { timerId },
      bubbles: true,
      composed: true
    }));
  }

  private isDayActive(dayIndex: number): boolean {
    const days = this.editingTimer.days || '1111111';
    return days[dayIndex] === '1';
  }

  private toggleDay(dayIndex: number): void {
    const days = (this.editingTimer.days || '1111111').split('');
    days[dayIndex] = days[dayIndex] === '1' ? '0' : '1';
    this.editingTimer = {
      ...this.editingTimer,
      days: days.join('')
    };
    this.requestUpdate();
  }

  private handleOverlayClick(): void {
    this.handleClose();
  }

  private handleClose(): void {
    this.dispatchEvent(new CustomEvent('close', {
      bubbles: true,
      composed: true
    }));
  }
}