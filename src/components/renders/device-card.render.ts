// device-card.render.ts
// Render functions for device card display

import { html, TemplateResult } from 'lit';
import { Device } from '../../models/device.model';
import { DeviceConfigLogic } from '../app/device-config-logic';
import { getDeviceIcon, formatDateTime, formatShutterPosition } from '../utils/formatters.util';
import { renderSensorData } from './sensor-render';
import { renderDeviceControls } from './device-controls-render';
import { renderAdvancedRelayControls } from './advanced-relay-render';

/**
 * Render draggable device card with all content
 * UPDATED: Added Advanced Relay Control section
 */
export function renderDraggableDeviceCard(
  device: Device,
  logic: DeviceConfigLogic
): TemplateResult {
  const isDragging = logic.draggedDeviceId === device.id;

  return html`
    <div
      class="device-card ${device.isConnected ? 'connected' : ''} ${isDragging ? 'dragging' : ''}"
      draggable="true"
      @dragstart="${() => logic.handleDragStart(device.id)}"
      @dragover="${(e: DragEvent) => logic.handleDragOver(e)}"
      @drop="${() => logic.handleDrop(device.id)}"
      @dragend="${() => logic.handleDragEnd()}"
    >
      <!-- Drag Handle -->
      <div class="drag-handle" title="Drag to reorder">
        ⋮⋮
      </div>

      <!-- Device Card Content -->
      ${renderDeviceCardHeader(device, logic)}
      ${renderDeviceInfo(device, logic)}

      ${device.type === 'sensor' && device.sensorData ? html`
        <div class="chart-button-container">
          <button
            class="button secondary chart-button"
            @click="${() => logic.openChartModal(device.id)}"
          >
            📊 View Chart
          </button>
        </div>
      ` : ''}

      ${renderDeviceControls(device, logic.connectionStatus === 'connected', logic)}

      <!-- 🔥 NEW: Advanced Relay Control (for switch/dimmer only) -->
      ${(device.type === 'switch' || device.type === 'dimmer') && device.baseTopic
        ? renderAdvancedRelayControls(device, logic)
        : ''}

      ${renderAutomationSection(device, logic)}
      ${device.type === 'sensor' && device.sensorData ? renderSensorData(device) : ''}
    </div>
  `;
}

/**
 * Render device card header with name and status
 */
export function renderDeviceCardHeader(
  device: Device,
  logic: DeviceConfigLogic
): TemplateResult {
  const isDisabled = device.isEnabled === false;
  const isMqttConnected = logic.connectionStatus === 'connected';

  // Determine actual status
  let statusClass = 'unknown';
  let statusText = 'Unknown';

  if (isDisabled) {
    statusClass = 'disabled';
    statusText = 'Disabled';
  } else if (!isMqttConnected) {
    statusClass = 'unknown';
    statusText = 'Unknown';
  } else {
    statusClass = device.isConnected ? 'connected' : 'disconnected';
    statusText = device.isConnected ? 'Online' : 'Offline';
  }

  const icon = device.type === 'sensor' && device.sensorConfig?.icon
    ? device.sensorConfig.icon
    : getDeviceIcon(device.type);

  return html`
    <div class="device-header">
      <div class="device-name" style="${isDisabled ? 'opacity: 0.5;' : ''}">
        ${icon} ${device.name}
        ${isDisabled ? html`<span style="font-size: 0.75rem; color: #999; margin-left: 8px;">(Disabled)</span>` : ''}
      </div>
      <div class="device-status ${statusClass}">
        <span class="status-indicator ${statusClass}"></span>
        ${statusText}
      </div>
    </div>
  `;
}

/**
 * Render device information section
 */
export function renderDeviceInfo(
  device: Device,
  logic: DeviceConfigLogic
): TemplateResult {
  const isMqttConnected = logic.connectionStatus === 'connected';

  return html`
    <div class="device-info">
      <div class="device-info-item">
        <span class="device-info-label">Type:</span>
        <span class="device-info-value">${device.type}</span>
      </div>
      <div class="device-info-item">
        <span class="device-info-label">Topic:</span>
        <span class="device-info-value">${device.topic}</span>
      </div>

      ${device.type === 'switch' || device.type === 'dimmer' ? html`
        <div class="device-info-item">
          <span class="device-info-label">Power:</span>
          <span class="device-info-value">
            ${!isMqttConnected ? '❓ Unknown' : device.isOn ? 'ON' : 'OFF'}
          </span>
        </div>
      ` : ''}

      ${device.type === 'dimmer' && device.dimmerValue !== undefined ? html`
        <div class="device-info-item">
          <span class="device-info-label">Brightness:</span>
          <span class="device-info-value">
            ${!isMqttConnected ? '❓ Unknown' : `${device.dimmerValue}%`}
          </span>
        </div>
      ` : ''}

      ${device.type === 'shutter' && device.shutterPosition !== undefined ? html`
        <div class="device-info-item">
          <span class="device-info-label">Position:</span>
          <span class="device-info-value">
            ${!isMqttConnected ? '❓ Unknown' : formatShutterPosition(device.shutterPosition, device.shutterInvert || false)}
          </span>
        </div>
      ` : ''}

      ${device.useAutoDiscovery && device.lwtStatus && isMqttConnected ? html`
        <div class="device-info-item">
          <span class="device-info-label">Device Status:</span>
          <span class="device-info-value" style="color: ${device.lwtStatus === 'Online' ? '#059669' : '#dc2626'}">
            ${device.lwtStatus === 'Online' ? '🟢 Active' : '🔴 Idle'}
          </span>
        </div>
      ` : !isMqttConnected ? html`
        <div class="device-info-item">
          <span class="device-info-label">Device Status:</span>
          <span class="device-info-value" style="color: #6b7280">
            ❓ Cannot Verify (MQTT Disconnected)
          </span>
        </div>
      ` : ''}

      ${device.lastSeen ? html`
        <div class="device-info-item">
          <span class="device-info-label">Last Seen:</span>
          <span class="device-info-value">
            ${formatDateTime(device.lastSeen)}
            ${!isMqttConnected ? html`<span style="color: #6b7280; font-size: 0.75rem;"> (before disconnect)</span>` : ''}
          </span>
        </div>
      ` : ''}

      ${renderValidationInfo(device)}
    </div>
  `;
}

/**
 * Render validation status and details
 */
function renderValidationInfo(device: Device): TemplateResult {
  if (!device.validationStatus) {
    return html``;
  }

  return html`
    <div class="device-info-item">
      <span class="device-info-label">Configuration:</span>
      <span class="device-info-value" style="color: ${
        device.validationStatus === 'valid' ? '#059669' :
        device.validationStatus === 'invalid' ? '#dc2626' :
        device.validationStatus === 'checking' ? '#f59e0b' :
        '#6b7280'
      }">
        ${device.validationStatus === 'valid' ? '✅ Verified' :
          device.validationStatus === 'invalid' ? '❌ Mismatch' :
          device.validationStatus === 'checking' ? '🔍 Checking...' :
          '❓ Unknown'
        }
      </span>
    </div>

    ${device.validationResult && !device.validationResult.isValid ? html`
      <details class="validation-details" style="margin-top: 8px;">
        <summary style="cursor: pointer; color: ${device.validationResult.mismatches.length > 0 ? '#dc2626' : '#f59e0b'}; font-size: 0.875rem;">
          ${device.validationResult.mismatches.length > 0
            ? `⚠️ ${device.validationResult.mismatches.length} Issue(s) Found`
            : `ℹ️ ${device.validationResult.warnings.length} Info`
          }
        </summary>
        <div style="margin-top: 8px; font-size: 0.8rem;">
          ${renderValidationDetails(device.validationResult)}
        </div>
      </details>
    ` : ''}
  `;
}

/**
 * Render detailed validation information
 */
function renderValidationDetails(validationResult: any): TemplateResult {
  return html`
    <!-- Module Info -->
    ${validationResult.actualCapabilities ? html`
      <div style="background: #1f2937; padding: 12px; border-radius: 6px; margin-bottom: 12px; border-left: 3px solid #3b82f6;">
        <div style="color: #60a5fa; font-weight: 600; margin-bottom: 8px; font-size: 0.9rem;">
          📦 Detected Module
        </div>
        <div style="color: #e5e7eb; line-height: 1.8;">
          <div style="font-weight: 500; font-size: 0.95rem;">
            ${validationResult.actualCapabilities.moduleName}
            <span style="color: #9ca3af; font-weight: normal; margin-left: 8px;">
              (Module ${validationResult.actualCapabilities.moduleType})
            </span>
          </div>
          <div style="margin-top: 8px; color: #9ca3af; font-size: 0.85rem;">
            ⚡ Relays: ${validationResult.actualCapabilities.relayCount}
            ${validationResult.actualCapabilities.hasDimmer ? ' | 💡 Dimmer: Yes' : ''}
            ${validationResult.actualCapabilities.hasShutter ? ' | 🪟 Shutter: Yes' : ''}
            ${validationResult.actualCapabilities.hasSensor ? ` | 📡 Sensors: ${validationResult.actualCapabilities.rawData?.sensorKeys.join(', ') || 'Yes'}` : ''}
          </div>
          <div style="color: #6b7280; margin-top: 4px; font-size: 0.8rem;">
            📢 Version: ${validationResult.actualCapabilities.version}
          </div>
        </div>
      </div>
    ` : ''}

    <!-- Mismatches -->
    ${validationResult.mismatches.length > 0 ? html`
      <div style="color: #dc2626; font-weight: 500; margin-bottom: 8px;">⚠️ Configuration Issues:</div>
      ${validationResult.mismatches.map((m: string) => html`
        <div style="padding: 6px 0; color: #fca5a5; line-height: 1.4;">${m}</div>
      `)}
    ` : ''}

    <!-- Warnings -->
    ${validationResult.warnings.length > 0 ? html`
      <div style="color: #f59e0b; font-weight: 500; margin-bottom: 8px; ${validationResult.mismatches.length > 0 ? 'margin-top: 12px;' : ''}">
        ℹ️ Additional Information:
      </div>
      ${validationResult.warnings.map((w: string) => html`
        <div style="padding: 4px 0; color: #fcd34d; line-height: 1.4;">${w}</div>
      `)}
    ` : ''}
  `;
}

/**
 * Render device automation section (Rules, Scripts, Timers)
 */
export function renderAutomationSection(
  device: Device,
  logic: DeviceConfigLogic
): TemplateResult {
  const hasRules = device.rulesEnabled || false;
  const hasScript = device.scriptEnabled || false;
  const hasTimers = device.timersEnabled || false;
  const isAvailable = logic.isDeviceAvailable(device);
  const isEnabled = device.isEnabled !== false;

  // Only show timers for power-capable devices
  const supportsTimers = ['switch', 'dimmer', 'shutter'].includes(device.type);

  return html`
    <div class="device-automation-section ${isEnabled && isAvailable ? '' : 'unavailable'}">
      <div class="automation-toggle-group">
        <!-- Rules -->
        ${renderAutomationToggle(
          'rules',
          device.id,
          hasRules,
          hasScript,
          isEnabled,
          isAvailable,
          device.activeRulesCount,
          logic
        )}

        <!-- Scripting -->
        ${renderAutomationToggle(
          'script',
          device.id,
          hasScript,
          hasRules,
          isEnabled,
          isAvailable,
          undefined,
          logic
        )}

        <!-- Timers -->
        ${supportsTimers ? renderAutomationToggle(
          'timers',
          device.id,
          hasTimers,
          false,
          isEnabled,
          isAvailable,
          device.timerConfig?.timers?.filter(t => t.enabled).length,
          logic
        ) : ''}
      </div>

      <!-- Manage Buttons -->
      ${hasRules || hasScript || hasTimers ? html`
        <div class="automation-actions ${isEnabled && isAvailable ? '' : 'unavailable'}">
          ${hasRules ? html`
            <button
              class="button secondary manage-btn"
              @click="${() => logic.openRuleModal(device.id)}"
              ?disabled="${!isEnabled || !isAvailable}"
            >
              ⚙️ Manage Rules
            </button>
          ` : ''}
          ${hasScript ? html`
            <button
              class="button secondary manage-btn"
              @click="${() => logic.openScriptModal(device.id)}"
              ?disabled="${!isEnabled || !isAvailable}"
            >
              ⚙️ Manage Script
            </button>
          ` : ''}
          ${hasTimers && supportsTimers ? html`
            <button
              class="button secondary manage-btn"
              @click="${() => logic.openTimerModal(device.id)}"
              ?disabled="${!isEnabled || !isAvailable}"
            >
              ⏰ Manage Timers
            </button>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Render automation toggle (Rules/Scripts/Timers)
 */
function renderAutomationToggle(
  type: 'rules' | 'script' | 'timers',
  deviceId: string,
  isActive: boolean,
  isDisabledByOther: boolean,
  isEnabled: boolean,
  isAvailable: boolean,
  count: number | undefined,
  logic: DeviceConfigLogic
): TemplateResult {
  const config = {
    rules: { icon: '📜', label: 'Rules', handler: logic.handleToggleRules.bind(logic) },
    script: { icon: '🔧', label: 'Scripting', handler: logic.handleToggleScript.bind(logic) },
    timers: { icon: '⏰', label: 'Timers', handler: logic.handleToggleTimers.bind(logic) }
  };

  const { icon, label, handler } = config[type];

  return html`
    <div class="automation-option ${isActive ? 'active' : ''} ${isDisabledByOther ? 'disabled' : ''} ${isEnabled && isAvailable ? '' : 'unavailable'}">
      <input
        type="checkbox"
        class="checkbox"
        .checked="${isActive}"
        @change="${(e: Event) => {
          const checked = (e.target as HTMLInputElement).checked;
          if (checked && isDisabledByOther) {
            logic.showError(`⚠️ ${isDisabledByOther ? 'Scripts' : 'Rules'} must be disabled first`);
            (e.target as HTMLInputElement).checked = false;
            return;
          }
          handler(deviceId, checked);
        }}"
        ?disabled="${!isEnabled || !isAvailable || isDisabledByOther}"
        id="${type}-${deviceId}"
      />
      <label for="${type}-${deviceId}">
        ${icon} ${label}
        ${type === 'script' ? html`<span class="complexity-badge" title="Advanced feature">ADV</span>` : ''}
        ${count && count > 0 ? html`<span class="count-badge">${count}</span>` : ''}
      </label>
    </div>
  `;
}