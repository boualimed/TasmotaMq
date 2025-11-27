// advanced-relay-render.ts
// Render functions for advanced relay control features (Collapsible Tray UI)

import { html, TemplateResult } from 'lit';
import { Device } from '../../models/device.model';
import { DeviceConfigLogic } from '../app/device-config-logic';

/**
 * Render collapsible advanced relay control tray
 * Opens/closes from bottom of device card
 */
export function renderAdvancedRelayControls(
  device: Device,
  logic: DeviceConfigLogic
): TemplateResult {
  const isOpen = logic.isAdvancedRelayControlOpen(device.id);
  const isConnected = logic.connectionStatus === 'connected';
  const isAvailable = logic.isDeviceAvailable(device);
  const isDisabled = device.isEnabled === false;

  if (isDisabled) {
    return html``;
  }

  return html`
    <div style="margin-top: 12px; border: 1px solid #374151; border-radius: 8px; overflow: hidden; background: #1f2937;">
      <!-- Toggle Button -->
      <button
        style="
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: #111827;
          border: none;
          color: #e5e7eb;
          cursor: ${!isConnected || !isAvailable ? 'not-allowed' : 'pointer'};
          transition: background 0.2s;
          opacity: ${!isConnected || !isAvailable ? 0.5 : 1};
        "
        @click="${() => {
          if (isOpen) {
            logic.closeAdvancedRelayControl(device.id);
          } else {
            logic.openAdvancedRelayControl(device.id);
          }
        }}"
        ?disabled="${!isConnected || !isAvailable}"
      >
        <span style="font-size: 0.75rem; color: #9ca3af;">
          ${isOpen ? '▼' : '▶'}
        </span>
        <span style="font-size: 1rem;">⚡</span>
        <span style="flex: 1; font-weight: 500; font-size: 0.875rem;">
          Advanced Relay Control
        </span>
        <span style="
          background: #3b82f6;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.65rem;
          font-weight: 600;
        ">
          ADV
        </span>
      </button>

      <!-- Collapsible Content -->
      ${isOpen ? html`
        <div style="
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: #111827;
        ">
          ${renderBlinkControls(device, logic, isConnected && isAvailable)}
          ${renderPulseTimeControls(device, logic, isConnected && isAvailable)}
          ${renderPowerOnStateControls(device, logic, isConnected && isAvailable)}
          ${renderSpecialToggleModes(device, logic, isConnected && isAvailable)}
          ${renderProtectionOptions(device, logic, isConnected && isAvailable)}
          ${renderInfoBanner()}
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Render Blink Controls (Identification)
 */
function renderBlinkControls(
  device: Device,
  logic: DeviceConfigLogic,
  isEnabled: boolean
): TemplateResult {
  return html`
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div style="
        font-size: 0.8rem;
        color: #9ca3af;
        font-weight: 500;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 6px;
      ">
        <span style="font-size: 1rem;">👁️</span>
        <span>Identification Blink</span>
        ${renderTooltip('blink-help', html`
          <div style="line-height: 1.5;">
            <strong style="color: #60a5fa;">Blink Command</strong>
            <p style="margin: 4px 0 0 0; font-size: 0.85rem;">
              Makes the relay blink on/off repeatedly to help you identify which physical device is being controlled.
            </p>
            <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 0.75rem;">
              Useful when you have multiple devices and need to verify connections.
            </p>
          </div>
        `)}
      </div>

      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
        <button
          class="button primary"
          style="padding: 8px 16px; font-size: 0.875rem;"
          @click="${() => {
            // Set blink params and trigger
            const countInput = document.getElementById(`blink-count-${device.id}`) as HTMLInputElement;
            const timeInput = document.getElementById(`blink-time-${device.id}`) as HTMLInputElement;

            if (timeInput?.value) {
              logic.handleSetBlinkTime(device.id, parseInt(timeInput.value));
            }
            if (countInput?.value) {
              logic.handleSetBlinkCount(device.id, parseInt(countInput.value));
            }

            // Send BLINK command
            logic.handleBlinkDevice(device.id);
          }}"
          ?disabled="${!isEnabled}"
        >
          💡 Blink Now
        </button>

        <div style="display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 200px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <label style="
              font-size: 0.75rem;
              color: #9ca3af;
              display: flex;
              align-items: center;
              min-width: 80px;
              gap: 4px;
            ">
              Count
              ${renderTooltip('count-help', html`
                <div style="line-height: 1.5;">
                  <strong style="color: #60a5fa;">BlinkCount</strong>
                  <p style="margin: 4px 0 0 0;">Number of blink cycles (1-32000)</p>
                  <p style="margin: 8px 0 0 0; font-size: 0.75rem;">
                    <strong>Default:</strong> 10 blinks
                  </p>
                  <p style="margin: 4px 0 0 0; font-size: 0.75rem;">
                    <strong>Example:</strong> Set to 5 for quick identification, 100 for extended visibility
                  </p>
                </div>
              `)}
            </label>
            <input
              type="number"
              min="1"
              max="32000"
              value="10"
              id="blink-count-${device.id}"
              ?disabled="${!isEnabled}"
              style="
                width: 80px;
                padding: 6px 8px;
                background: #1f2937;
                border: 1px solid #374151;
                border-radius: 4px;
                color: #e5e7eb;
                font-size: 0.875rem;
              "
            />
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <label style="
              font-size: 0.75rem;
              color: #9ca3af;
              display: flex;
              align-items: center;
              min-width: 80px;
              gap: 4px;
            ">
              Time
              ${renderTooltip('time-help', html`
                <div style="line-height: 1.5;">
                  <strong style="color: #60a5fa;">BlinkTime</strong>
                  <p style="margin: 4px 0 0 0;">Duration of each ON/OFF cycle in 0.1 second increments (2-3600)</p>
                  <p style="margin: 8px 0 0 0; font-size: 0.75rem;">
                    <strong>Default:</strong> 10 (= 1 second)
                  </p>
                  <p style="margin: 4px 0 0 0; font-size: 0.75rem;"><strong>Examples:</strong></p>
                  <ul style="margin: 4px 0 0 16px; padding: 0; font-size: 0.75rem;">
                    <li>5 = 0.5s (fast blink)</li>
                    <li>10 = 1s (default)</li>
                    <li>20 = 2s (slow blink)</li>
                  </ul>
                </div>
              `)}
            </label>
            <input
              type="number"
              min="2"
              max="3600"
              value="10"
              id="blink-time-${device.id}"
              ?disabled="${!isEnabled}"
              @input="${(e: Event) => {
                const target = e.target as HTMLInputElement;
                const display = document.getElementById(`blink-time-display-${device.id}`);
                if (display) {
                  display.textContent = `(${parseInt(target.value) * 0.1}s per cycle)`;
                }
              }}"
              style="
                width: 80px;
                padding: 6px 8px;
                background: #1f2937;
                border: 1px solid #374151;
                border-radius: 4px;
                color: #e5e7eb;
                font-size: 0.875rem;
              "
            />
            <span id="blink-time-display-${device.id}" style="font-size: 0.7rem; color: #6b7280;">
              (1s per cycle)
            </span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Pulse Time Controls
 */
function renderPulseTimeControls(
  device: Device,
  logic: DeviceConfigLogic,
  isEnabled: boolean
): TemplateResult {
  return html`
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div style="
        font-size: 0.8rem;
        color: #9ca3af;
        font-weight: 500;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 6px;
      ">
        <span style="font-size: 1rem;">⏱️</span>
        <span>Pulse Time (Auto-Off Timer)</span>
        ${renderTooltip('pulse-help', html`
          <div style="line-height: 1.5;">
            <strong style="color: #60a5fa;">PulseTime</strong>
            <p style="margin: 4px 0 0 0;">Automatically turns the relay OFF after the specified duration.</p>
            <p style="margin: 8px 0 0 0; font-size: 0.75rem;">
              <strong>Value:</strong> 0-111 (×0.1s increments), 112-64900 (1s increments)
            </p>
            <p style="margin: 8px 0 0 0; font-size: 0.75rem;"><strong>Use Cases:</strong></p>
            <ul style="margin: 4px 0 0 16px; padding: 0; font-size: 0.75rem;">
              <li>0 = Disabled (manual control)</li>
              <li>5 = 0.5s (garage door pulse)</li>
              <li>10 = 1s (doorbell)</li>
              <li>600 = 60s (staircase light)</li>
            </ul>
            <p style="margin: 8px 0 0 0; font-size: 0.75rem; color: #f59e0b;">
              ⚠️ Changes take effect on next power command
            </p>
          </div>
        `)}
      </div>

      <div style="display: flex; align-items: center; gap: 8px;">
        <input
          type="number"
          min="0"
          max="111"
          value="0"
          placeholder="0 = disabled"
          id="pulse-time-${device.id}"
          ?disabled="${!isEnabled}"
          @input="${(e: Event) => {
            const target = e.target as HTMLInputElement;
            const display = document.getElementById(`pulse-time-display-${device.id}`);
            const value = parseInt(target.value) || 0;
            if (display) {
              display.textContent = value === 0 ? 'Disabled' : `Auto-off after ${value * 0.1}s`;
            }
          }}"
          style="
            flex: 1;
            padding: 8px;
            background: #1f2937;
            border: 1px solid #374151;
            border-radius: 4px;
            color: #e5e7eb;
            font-size: 0.875rem;
          "
        />
        <span id="pulse-time-display-${device.id}" style="
          font-size: 0.75rem;
          color: #6b7280;
          font-style: italic;
          min-width: 120px;
        ">
          Disabled
        </span>
      </div>

      <!-- Pulse Time Presets -->
      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
        ${[
          { value: 0, label: 'Off' },
          { value: 5, label: '0.5s' },
          { value: 10, label: '1s' },
          { value: 50, label: '5s' },
          { value: 100, label: '10s' },
          { value: 600, label: '60s' }
        ].map(preset => html`
          <button
            class="button secondary"
            style="
              padding: 4px 10px;
              font-size: 0.75rem;
            "
            @click="${() => {
              const input = document.getElementById(`pulse-time-${device.id}`) as HTMLInputElement;
              if (input) {
                input.value = preset.value.toString();
                const event = new Event('input', { bubbles: true });
                input.dispatchEvent(event);
              }
              logic.handleSetPulseTime(device.id, preset.value);
            }}"
            ?disabled="${!isEnabled}"
          >
            ${preset.label}
          </button>
        `)}
      </div>
    </div>
  `;
}

/**
 * Render Power-On State Controls
 */
function renderPowerOnStateControls(
  device: Device,
  logic: DeviceConfigLogic,
  isEnabled: boolean
): TemplateResult {
  return html`
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div style="
        font-size: 0.8rem;
        color: #9ca3af;
        font-weight: 500;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 6px;
      ">
        <span style="font-size: 1rem;">🔌</span>
        <span>Power-On Behavior</span>
        ${renderTooltip('power-on-help', html`
          <div style="line-height: 1.5;">
            <strong style="color: #60a5fa;">PowerOnState</strong>
            <p style="margin: 4px 0 0 0;">Defines relay behavior when device boots or restarts.</p>
            <p style="margin: 8px 0 0 0; font-size: 0.75rem;"><strong>Options:</strong></p>
            <ul style="margin: 4px 0 0 16px; padding: 0; font-size: 0.75rem; line-height: 1.6;">
              <li><strong>0:</strong> Keep relay OFF (safest)</li>
              <li><strong>1:</strong> Turn relay ON</li>
              <li><strong>2:</strong> Toggle from before restart</li>
              <li><strong>3:</strong> Restore last state (default) ⭐</li>
              <li><strong>4:</strong> Turn ON without PulseTime</li>
              <li><strong>5:</strong> Restore state, reset PulseTime</li>
            </ul>
            <p style="margin: 8px 0 0 0; font-size: 0.75rem; color: #10b981;">
              💡 Most users prefer option 3 (restore last state)
            </p>
          </div>
        `)}
      </div>

      <select
        id="power-on-state-${device.id}"
        ?disabled="${!isEnabled}"
        @change="${(e: Event) => {
          const target = e.target as HTMLSelectElement;
          logic.handleSetPowerOnState(device.id, parseInt(target.value));
        }}"
        style="
          width: 100%;
          padding: 8px;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 4px;
          color: #e5e7eb;
          font-size: 0.875rem;
          cursor: ${!isEnabled ? 'not-allowed' : 'pointer'};
        "
      >
        <option value="0">0 - Keep OFF (safest for heating/motors)</option>
        <option value="1">1 - Turn ON (always start active)</option>
        <option value="2">2 - Toggle (opposite of last state)</option>
        <option value="3" selected>3 - Restore last state (recommended) ⭐</option>
        <option value="4">4 - Turn ON, ignore PulseTime</option>
        <option value="5">5 - Restore state, reset PulseTime</option>
      </select>
    </div>
  `;
}

/**
 * Render Special Toggle Modes
 */
function renderSpecialToggleModes(
  device: Device,
  logic: DeviceConfigLogic,
  isEnabled: boolean
): TemplateResult {
  return html`
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div style="
        font-size: 0.8rem;
        color: #9ca3af;
        font-weight: 500;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 6px;
      ">
        <span style="font-size: 1rem;">📻</span>
        <span>Special Toggle Modes</span>
        ${renderTooltip('toggle-help', html`
          <div style="line-height: 1.5;">
            <strong style="color: #60a5fa;">Advanced Power Commands</strong>
            <p style="margin: 4px 0 0 0;">Special commands that combine power control with blinking.</p>
            <p style="margin: 8px 0 0 0; font-size: 0.75rem;">
              <strong>BLINK:</strong> Start blinking for BlinkCount cycles
            </p>
            <p style="margin: 4px 0 0 0; font-size: 0.75rem;">
              <strong>BLINK_TOGGLE:</strong> Toggle state AND start blinking
            </p>
            <p style="margin: 8px 0 0 0; font-size: 0.75rem; color: #f59e0b;">
              ⚠️ Useful for visual confirmation of remote commands
            </p>
          </div>
        `)}
      </div>

      <div style="display: flex; gap: 8px;">
        <button
          class="button secondary"
          style="flex: 1; padding: 8px 12px; font-size: 0.875rem;"
          @click="${() => logic.handleBlinkDevice(device.id)}"
          ?disabled="${!isEnabled}"
        >
          ⚡ Blink
        </button>
        <button
          class="button secondary"
          style="flex: 1; padding: 8px 12px; font-size: 0.875rem;"
          @click="${() => logic.handleBlinkToggleDevice(device.id)}"
          ?disabled="${!isEnabled}"
        >
          🔄 Blink Toggle
        </button>
      </div>
    </div>
  `;
}

/**
 * Render Protection Options
 */
function renderProtectionOptions(
  device: Device,
  logic: DeviceConfigLogic,
  isEnabled: boolean
): TemplateResult {
  return html`
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div style="
        font-size: 0.8rem;
        color: #9ca3af;
        font-weight: 500;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 6px;
      ">
        <span style="font-size: 1rem;">🔒</span>
        <span>Protection & Persistence</span>
      </div>

      <label style="
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: ${!isEnabled ? 'not-allowed' : 'pointer'};
        padding: 8px;
        background: #1f2937;
        border-radius: 4px;
        border: 1px solid #374151;
      ">
        <input
          type="checkbox"
          id="power-lock-${device.id}"
          ?disabled="${!isEnabled}"
          @change="${(e: Event) => {
            const checked = (e.target as HTMLInputElement).checked;
            logic.handleSetPowerLock(device.id, checked);
          }}"
          style="cursor: ${!isEnabled ? 'not-allowed' : 'pointer'};"
        />
        <span style="font-size: 0.875rem; color: #e5e7eb; flex: 1;">
          🔒 Lock relay control (prevent changes)
        </span>
        ${renderTooltip('lock-help', html`
          <div style="line-height: 1.5;">
            <strong style="color: #60a5fa;">PowerLock</strong>
            <p style="margin: 4px 0 0 0;">Prevents any power state changes to this relay.</p>
            <p style="margin: 8px 0 0 0; font-size: 0.75rem;">
              <strong>Use case:</strong> Protect critical devices from accidental shutoff (servers, refrigerators, security systems)
            </p>
            <p style="margin: 8px 0 0 0; font-size: 0.75rem; color: #ef4444;">
              ⚠️ Must be unlocked before relay can be controlled again
            </p>
          </div>
        `)}
      </label>

      <label style="
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: ${!isEnabled ? 'not-allowed' : 'pointer'};
        padding: 8px;
        background: #1f2937;
        border-radius: 4px;
        border: 1px solid #374151;
      ">
        <input
          type="checkbox"
          id="power-retain-${device.id}"
          ?disabled="${!isEnabled}"
          @change="${(e: Event) => {
            const checked = (e.target as HTMLInputElement).checked;
            logic.handleSetPowerRetain(device.id, checked);
          }}"
          style="cursor: ${!isEnabled ? 'not-allowed' : 'pointer'};"
        />
        <span style="font-size: 0.875rem; color: #e5e7eb; flex: 1;">
          💾 MQTT Retain power state
        </span>
        ${renderTooltip('retain-help', html`
          <div style="line-height: 1.5;">
            <strong style="color: #60a5fa;">PowerRetain</strong>
            <p style="margin: 4px 0 0 0;">Makes MQTT broker remember the last power state even after broker restart.</p>
            <p style="margin: 8px 0 0 0; font-size: 0.75rem;">
              <strong>When enabled:</strong> Broker stores the last state message
            </p>
            <p style="margin: 4px 0 0 0; font-size: 0.75rem;">
              <strong>When disabled:</strong> State only exists during active connection
            </p>
            <p style="margin: 8px 0 0 0; font-size: 0.75rem; color: #10b981;">
              💡 Useful for status monitoring systems that need state persistence
            </p>
          </div>
        `)}
      </label>
    </div>
  `;
}

/**
 * Render Info Banner
 */
function renderInfoBanner(): TemplateResult {
  return html`
    <div style="
      padding: 12px;
      background: #1e3a5f;
      border: 1px solid #3b82f6;
      border-radius: 6px;
      font-size: 0.75rem;
      color: #93c5fd;
      line-height: 1.5;
    ">
      💡 <strong>Tip:</strong> These settings persist in the device firmware. Changes take effect immediately but are remembered across reboots.
    </div>
  `;
}

/**
 * Render tooltip with help icon
 */
function renderTooltip(id: string, content: TemplateResult): TemplateResult {
  return html`
    <span
      style="
        position: relative;
        display: inline-flex;
        align-items: center;
        cursor: help;
      "
      @mouseenter="${(e: Event) => {
        const tooltip = (e.currentTarget as HTMLElement).querySelector('.tooltip-content') as HTMLElement;
        if (tooltip) tooltip.style.display = 'block';
      }}"
      @mouseleave="${(e: Event) => {
        const tooltip = (e.currentTarget as HTMLElement).querySelector('.tooltip-content') as HTMLElement;
        if (tooltip) tooltip.style.display = 'none';
      }}"
    >
      <span style="
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 1px solid #9ca3af;
        color: #9ca3af;
        font-size: 0.7rem;
        font-weight: 600;
      ">?</span>

      <div
        class="tooltip-content"
        style="
          display: none;
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 8px;
          z-index: 1000;
          padding: 12px;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          font-size: 0.8rem;
          line-height: 1.4;
          color: #e5e7eb;
          max-width: 280px;
          width: max-content;
          pointer-events: none;
        "
      >
        ${content}
        <div style="
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 6px 6px 0 6px;
          border-color: #374151 transparent transparent transparent;
        "></div>
      </div>
    </span>
  `;
}