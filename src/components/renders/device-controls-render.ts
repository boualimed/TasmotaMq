// device-controls.render.ts
// Render functions for device control buttons (switch, dimmer, shutter)

import { html, TemplateResult } from 'lit';
import { Device } from '../../models/device.model';
import { DeviceConfigLogic } from '../app/device-config-logic';
import { getPowerChannelSymbol } from '../utils/formatters.util';

/**
 * Render device controls based on device type
 */
export function renderDeviceControls(
  device: Device,
  isConnected: boolean,
  logic: DeviceConfigLogic
): TemplateResult {
  const isDisabled = device.isEnabled === false;

  return html`
    <div class="device-controls">
      ${!isDisabled ? renderDeviceTypeControls(device, isConnected, logic) : ''}

      ${device.type === 'sensor' && !isDisabled ? html`
        <button
          class="button secondary"
          @click="${() => logic.openSensorHistoryModal(device.id)}"
          title="View sensor history"
          style="min-width: 80px;"
        >
          📊 History
        </button>
      ` : ''}

      ${device.type === 'sensor' && !isDisabled ? html`
        <button
          class="button secondary"
          @click="${() => logic.openMLModal(device.id)}"
          title="ML Insights & Predictions"
          style="min-width: 80px;"
        >
          🔮 ML
        </button>
      ` : ''}

      ${isConnected && !isDisabled ? html`
        <button
          class="button secondary"
          @click="${() => logic.handleValidateDevice(device.id)}"
          title="Validate device configuration"
          ?disabled="${device.validationStatus === 'checking'}"
          style="min-width: 80px;"
        >
          ${device.validationStatus === 'checking' ? '🔍 ...' : '🔍 Validate'}
        </button>
      ` : ''}

      <button
        class="button ${isDisabled ? 'secondary' : 'warning'}"
        @click="${() => logic.handleToggleDeviceEnabled(device.id)}"
        title="${isDisabled ? 'Enable device' : 'Disable device'}"
        style="min-width: 80px;"
      >
        ${isDisabled ? '🔓 Enable' : '🔕 Disable'}
      </button>

      <button
        class="remove-button"
        @click="${() => logic.handleRemoveDevice(device.id)}"
        title="Remove device"
      >
        🗑️
      </button>
    </div>
  `;
}

/**
 * Route to type-specific control renderer
 */
function renderDeviceTypeControls(
  device: Device,
  isConnected: boolean,
  logic: DeviceConfigLogic
): TemplateResult {
  switch (device.type) {
    case 'switch':
      return renderSwitchControl(device, isConnected, logic);
    case 'dimmer':
      return renderDimmerControl(device, isConnected, logic);
    case 'shutter':
      return renderShutterControl(device, isConnected, logic);
    default:
      return html``;
  }
}

/**
 * Render switch control (ON/OFF button)
 */
export function renderSwitchControl(
  device: Device,
  isConnected: boolean,
  logic: DeviceConfigLogic
): TemplateResult {
  const disabled = !isConnected || !device.isConnected;
  const title = !isConnected
    ? 'MQTT broker disconnected'
    : !device.isConnected
      ? 'Device is offline'
      : '';

  const powerChannel = device.powerChannel || 1;
  const channelSymbol = getPowerChannelSymbol(powerChannel);

  return html`
    <button
      class="toggle-button ${device.isOn ? 'on' : 'off'}"
      @click="${() => logic.handleToggleDevice(device)}"
      ?disabled="${disabled}"
      title="${title}"
    >
      ${device.isOn ? 'Turn OFF' : 'Turn ON'} ⓟⓞⓦ${channelSymbol}
    </button>
  `;
}

/**
 * Render dimmer control (ON/OFF + brightness slider)
 */
export function renderDimmerControl(
  device: Device,
  isConnected: boolean,
  logic: DeviceConfigLogic
): TemplateResult {
  const disabled = !isConnected || !device.isConnected;
  const dimmerValue = device.dimmerValue || 0;
  const powerChannel = device.powerChannel || 2;
  const channelSymbol = getPowerChannelSymbol(powerChannel);

  return html`
    <div class="dimmer-control" style="flex: 1; margin-right: 8px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
        <span style="font-size: 0.875rem; color: #6b7280;">
          🔆 ${dimmerValue}% • ⓟⓞⓦ${channelSymbol}
        </span>
        <button
          class="toggle-button ${device.isOn ? 'on' : 'off'}"
          style="padding: 4px 12px; font-size: 0.875rem;"
          @click="${() => logic.handleToggleDimmer(device)}"
          ?disabled="${disabled}"
        >
          ${device.isOn ? 'OFF' : 'ON'}
        </button>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        .value="${dimmerValue}"
        @input="${(e: Event) => {
          const target = e.target as HTMLInputElement;
          const value = parseInt(target.value);
          logic.handleSetDimmer(device, value);
        }}"
        ?disabled="${disabled}"
        style="width: 100%;"
      />
    </div>
  `;
}

/**
 * Render shutter control (Open/Stop/Close + position slider)
 */
export function renderShutterControl(
  device: Device,
  isConnected: boolean,
  logic: DeviceConfigLogic
): TemplateResult {
  const disabled = !isConnected || !device.isConnected;
  const position = device.shutterPosition ?? 50;
  const direction = device.shutterDirection ?? 0;
  const target = device.shutterTarget;
  const isMoving = direction !== 0;
  const isInverted = device.shutterInvert || false;

  const displayPosition = isInverted ? 100 - position : position;

  return html`
    <div class="shutter-control" style="flex: 1; margin-right: 8px;">
      <!-- Status Display -->
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="flex: 1;">
          <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 4px;">
            🪟 Position: ${displayPosition}%
            ${target !== undefined && target !== position ? html`
              <span style="color: #3b82f6;"> → ${isInverted ? 100 - target : target}%</span>
            ` : ''}
          </div>
          <div style="display: flex; align-items: center; gap: 4px; font-size: 0.75rem;">
            ${isMoving ? html`
              <span style="color: ${direction === 1 ? '#10b981' : '#ef4444'};">
                ${direction === 1 ? '▲ Opening' : '▼ Closing'}
              </span>
            ` : html`
              <span style="color: #6b7280;">■ Stopped</span>
            `}
            ${device.shutterMode ? html`
              <span style="color: #9ca3af; margin-left: 8px;">
                Mode ${device.shutterMode}
              </span>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Control Buttons -->
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <button
          class="button secondary"
          style="padding: 6px 12px; font-size: 0.875rem; flex: 1;"
          @click="${() => logic.handleOpenShutter(device)}"
          ?disabled="${disabled}"
        >
          ▲ Open
        </button>
        <button
          class="button warning"
          style="padding: 6px 12px; font-size: 0.875rem; flex: 1;"
          @click="${() => logic.handleStopShutter(device)}"
          ?disabled="${disabled || !isMoving}"
        >
          ■ Stop
        </button>
        <button
          class="button secondary"
          style="padding: 6px 12px; font-size: 0.875rem; flex: 1;"
          @click="${() => logic.handleCloseShutter(device)}"
          ?disabled="${disabled}"
        >
          ▼ Close
        </button>
      </div>

      <!-- Position Slider -->
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 0.75rem; color: #9ca3af; min-width: 40px;">
          ${isInverted ? 'Open' : 'Closed'}
        </span>
        <input
          type="range"
          min="0"
          max="100"
          .value="${displayPosition}"
          @input="${(e: Event) => {
            const target = e.target as HTMLInputElement;
            const value = parseInt(target.value);
            const actualValue = isInverted ? 100 - value : value;
            logic.handleSetShutterPosition(device, actualValue);
          }}"
          ?disabled="${disabled}"
          style="flex: 1;"
        />
        <span style="font-size: 0.75rem; color: #9ca3af; min-width: 40px; text-align: right;">
          ${isInverted ? 'Closed' : 'Open'}
        </span>
      </div>

      <!-- Quick Positions -->
      <div style="display: flex; gap: 4px; margin-top: 8px;">
        ${[0, 25, 50, 75, 100].map(pos => {
          const displayPos = isInverted ? 100 - pos : pos;
          return html`
            <button
              class="button ${position === pos ? 'primary' : 'secondary'}"
              style="padding: 4px 8px; font-size: 0.75rem; flex: 1;"
              @click="${() => logic.handleSetShutterPosition(device, pos)}"
              ?disabled="${disabled}"
            >
              ${displayPos}%
            </button>
          `;
        })}
      </div>
    </div>
  `;

}

