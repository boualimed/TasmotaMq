// device-form.render.ts
// Render functions for add device form (FIXED)

import { html, TemplateResult } from 'lit';
//import { DeviceType } from '../../models/device.model';
import { DeviceConfigLogic } from '../app/device-config-logic';
import {
  validateDeviceForm,
  validateShutterConfig,
  getFieldError,
  hasFieldError,
  getValidationWarnings,
  isFormValid
} from '../utils/validators.util';
import { getDeviceNamePlaceholder, getShutterModeDescription } from '../utils/formatters.util';
import { renderSensorTypeSelector, renderSensorAdditionalConfig } from './sensor-render';

/**
 * Render device type selector (Switch, Dimmer, Shutter, Sensor)
 */
export function renderDeviceTypeSelector(logic: DeviceConfigLogic): TemplateResult {
  return html`
    <div class="device-type-selector">
      <div
        class="type-option ${logic.newDevice.type === 'switch' ? 'selected' : ''}"
        @click="${() => logic.handleTypeSelect('switch')}"
      >
        <div>💡</div>
        <div>Switch</div>
      </div>
      <div
        class="type-option ${logic.newDevice.type === 'dimmer' ? 'selected' : ''}"
        @click="${() => logic.handleTypeSelect('dimmer')}"
      >
        <div>🔆</div>
        <div>Dimmer</div>
      </div>
      <div
        class="type-option ${logic.newDevice.type === 'shutter' ? 'selected' : ''}"
        @click="${() => logic.handleTypeSelect('shutter')}"
      >
        <div>🪟</div>
        <div>Shutter</div>
      </div>
      <div
        class="type-option ${logic.newDevice.type === 'sensor' ? 'selected' : ''}"
        @click="${() => logic.handleTypeSelect('sensor')}"
      >
        <div>🌡️</div>
        <div>Sensor</div>
      </div>
    </div>
  `;
}

/**
 * Render complete device form
 */
export function renderDeviceForm(logic: DeviceConfigLogic): TemplateResult {
  const validation = validateDeviceForm(logic.newDevice);

  return html`
    <!-- Device Name -->
    <div class="form-group ${hasFieldError('name', validation.fieldErrors) ? 'has-error' : ''}">
      <label class="form-label">
        Device Name
        <span style="color: #ef4444; margin-left: 4px;">*</span>
      </label>
      <input
        type="text"
        class="form-input"
        placeholder="${getDeviceNamePlaceholder(logic.newDevice.type)}"
        .value="${logic.newDevice.name}"
        @input="${(e: Event) => {
          const target = e.target as HTMLInputElement;
          logic.handleDeviceInputChange('name', target.value);
        }}"
      />
      ${renderFieldError('name', validation.fieldErrors)}
    </div>

    <!-- Tasmota Device ID / Topic -->
    <div class="form-group ${hasFieldError('baseTopic', validation.fieldErrors) || hasFieldError('topic', validation.fieldErrors) ? 'has-error' : ''}">
      <label class="form-label">
        Tasmota Device ID
        <span style="color: #ef4444; margin-left: 4px;">*</span>
      </label>
      <input
        type="text"
        class="form-input"
        placeholder="e.g., tasmota_110CE1"
        .value="${logic.newDevice.baseTopic}"
        @input="${(e: Event) => {
          const target = e.target as HTMLInputElement;
          logic.handleDeviceInputChange('baseTopic', target.value);
        }}"
      />
      ${renderFieldError('baseTopic', validation.fieldErrors)}

      ${logic.newDevice.type !== 'shutter' ? html`
        <input
          type="text"
          class="form-input"
          placeholder="Or full topic path: cmnd/device/POWER"
          .value="${logic.newDevice.topic}"
          @input="${(e: Event) => {
            const target = e.target as HTMLInputElement;
            logic.handleDeviceInputChange('topic', target.value);
          }}"
          style="margin-top: 8px"
        />
        ${renderFieldError('topic', validation.fieldErrors)}
      ` : ''}

      <div class="parser-help">
        💡 Tip: Use device ID like <code>tasmota_110CE1</code> for standard setups
      </div>
    </div>

    <!-- Power Channel (for switch/dimmer) -->
    ${logic.newDevice.type === 'switch' || logic.newDevice.type === 'dimmer' ?
      renderPowerChannelSelector(logic, validation.fieldErrors)
    : ''}

    <!-- Shutter-specific fields -->
    ${logic.newDevice.type === 'shutter' ? renderShutterConfigFields(logic) : ''}

    <!-- Auto Discovery -->
    ${renderAutoDiscoveryCheckbox(logic)}

    <!-- ✅ CRITICAL FIX: Sensor-specific fields with JSON Path -->
    ${logic.newDevice.type === 'sensor' ? html`
      <!-- JSON Path Parser -->
      <div class="form-group ${hasFieldError('jsonPath', validation.fieldErrors) ? 'has-error' : ''}">
        <label class="form-label">
          JSON Path (optional)
          <span style="color: #9ca3af; font-size: 0.8rem; margin-left: 8px;">
            Extract specific value from payload
          </span>
        </label>
        <input
          type="text"
          class="form-input"
          placeholder="e.g., AM2301 or AM2301.Temperature"
          .value="${logic.newDevice.jsonPath || ''}"
          @input="${(e: Event) => {
            const target = e.target as HTMLInputElement;
            logic.handleDeviceInputChange('jsonPath', target.value);
          }}"
        />
        ${renderFieldError('jsonPath', validation.fieldErrors)}
        <div class="parser-help">
          📋 Examples: <code>AM2301</code>, <code>AM2301.Temperature</code>, <code>Energy.Power</code>, <code>StatusSNS.DHT11.Temperature</code>
          <br/>
          💡 Leave empty to use the entire payload
        </div>
      </div>

      <!-- Sensor Type Selector -->
      ${renderSensorTypeSelector(
        logic.newDevice.sensorConfig?.sensorType || 'custom',
        (type: any) => logic.handleSensorConfigChange('sensorType', type)
      )}

      <!-- Additional Sensor Configuration -->
      ${renderSensorAdditionalConfig(
        logic.newDevice.sensorConfig,
        (field: any, value: any) => logic.handleSensorConfigChange(field, value)
      )}
    ` : ''}

    <!-- Validation Warnings -->
    ${renderValidationWarnings(validation)}
  `;
}

/**
 * Render power channel selector
 */
function renderPowerChannelSelector(
  logic: DeviceConfigLogic,
  fieldErrors: Record<string, string>
): TemplateResult {
  return html`
    <div class="form-group ${hasFieldError('powerChannel', fieldErrors) ? 'has-error' : ''}">
      <label class="form-label">
        Power Channel
        ${logic.newDevice.type === 'dimmer' ? html`
          <span style="color: #f59e0b; margin-left: 4px; font-size: 0.8rem;">
            (Default: POWER2 for dimmers)
          </span>
        ` : ''}
      </label>
      <select
        class="form-input"
        .value="${(logic.newDevice.powerChannel || (logic.newDevice.type === 'dimmer' ? 2 : 1)).toString()}"
        @change="${(e: Event) => {
          const target = e.target as HTMLSelectElement;
          logic.handleDeviceInputChange('powerChannel', parseInt(target.value));
        }}"
      >
        <option value="1">POWER / POWER1 ①</option>
        <option value="2">POWER2 ②</option>
        <option value="3">POWER3 ③</option>
        <option value="4">POWER4 ④</option>
        <option value="5">POWER5 ⑤</option>
        <option value="6">POWER6 ⑥</option>
        <option value="7">POWER7 ⑦</option>
        <option value="8">POWER8 ⑧</option>
      </select>
      ${renderFieldError('powerChannel', fieldErrors)}
      <div class="parser-help">
        Tasmota supports up to 8 power channels (POWER1-POWER8)
      </div>
    </div>
  `;
}

/**
 * Render shutter configuration fields
 */
export function renderShutterConfigFields(logic: DeviceConfigLogic): TemplateResult {
  if (logic.newDevice.type !== 'shutter') {
    return html``;
  }

  const shutterValidation = validateShutterConfig(logic.newDevice);

  return html`
    <!-- Shutter Index -->
    <div class="form-group">
      <label class="form-label">
        Shutter Index
        <span style="color: #ef4444; margin-left: 4px;">*</span>
      </label>
      <select
        class="form-input"
        .value="${(logic.newDevice.shutterIndex || 1).toString()}"
        @change="${(e: Event) => {
          const target = e.target as HTMLSelectElement;
          const value = parseInt(target.value);
          logic.handleShutterConfigChange('shutterIndex', value);
        }}"
      >
        <option value="1">Shutter 1</option>
        <option value="2">Shutter 2</option>
        <option value="3">Shutter 3</option>
        <option value="4">Shutter 4</option>
        <option value="5">Shutter 5 (ESP32 only)</option>
        <option value="6">Shutter 6 (ESP32 only)</option>
        <option value="7">Shutter 7 (ESP32 only)</option>
        <option value="8">Shutter 8 (ESP32 only)</option>
      </select>
      <div class="parser-help">
        🏠 ESP8266 supports 1-4, ESP32 supports 1-16
      </div>
    </div>

    <!-- Shutter Mode -->
    <div class="form-group">
      <label class="form-label">
        Shutter Mode
        <span style="color: #ef4444; margin-left: 4px;">*</span>
      </label>
      <select
        class="form-input"
        .value="${(logic.newDevice.shutterMode || 1).toString()}"
        @change="${(e: Event) => {
          const target = e.target as HTMLSelectElement;
          const value = parseInt(target.value);
          logic.handleShutterConfigChange('shutterMode', value);
        }}"
      >
        <option value="1">Mode 1: Normal (2 relays, UP/DOWN)</option>
        <option value="2">Mode 2: Circuit Safe (ON/OFF + Direction)</option>
        <option value="3">Mode 3: Garage Motors (Pulse)</option>
        <option value="4">Mode 4: Stepper Motor</option>
        <option value="5">Mode 5: Servo Position</option>
        <option value="6">Mode 6: Servo Speed</option>
      </select>
      <div class="parser-help">
        📖 ${getShutterModeDescription(logic.newDevice.shutterMode || 1)}
      </div>
    </div>

    <!-- Shutter Invert -->
    <div class="checkbox-group">
      <input
        type="checkbox"
        class="checkbox"
        .checked="${logic.newDevice.shutterInvert || false}"
        @change="${(e: Event) => {
          const target = e.target as HTMLInputElement;
          const value = target.checked;
          logic.handleShutterConfigChange('shutterInvert', value);
        }}"
      />
      <label class="form-label">
        Invert Position (0=Open, 100=Closed)
        <div style="font-size: 0.75rem; color: #666; margin-top: 4px;">
          🔄 By default: 0=Closed, 100=Open. Enable this to reverse.
        </div>
      </label>
    </div>

    ${shutterValidation.warnings.length > 0 ? html`
      <div class="validation-warnings">
        ${shutterValidation.warnings.map(warning => html`
          <div class="warning-item">
            <span class="warning-icon">⚠️</span>
            <span class="warning-message">${warning}</span>
          </div>
        `)}
      </div>
    ` : ''}
  `;
}

/**
 * Render auto discovery checkbox
 */
function renderAutoDiscoveryCheckbox(logic: DeviceConfigLogic): TemplateResult {
  return html`
    <div class="checkbox-group">
      <input
        type="checkbox"
        class="checkbox"
        .checked="${logic.newDevice.useAutoDiscovery}"
        @change="${(e: Event) => {
          const target = e.target as HTMLInputElement;
          logic.handleDeviceInputChange('useAutoDiscovery', target.checked);
        }}"
      />
      <label class="form-label">
        Use LWT (Last Will Testament) for real-time device status
        <div style="font-size: 0.75rem; color: #666; margin-top: 4px;">
          ✅ Requires Tasmota SetOption19 1 (enabled by default)
        </div>
      </label>
    </div>
  `;
}

/**
 * Render field error message
 */
export function renderFieldError(field: string, fieldErrors: Record<string, string>): TemplateResult {
  const error = getFieldError(field, fieldErrors);
  if (!error) return html``;

  return html`
    <div class="field-error">
      <span class="error-icon">⚠️</span>
      <span class="error-message">${error}</span>
    </div>
  `;
}

/**
 * Render validation warnings
 */
export function renderValidationWarnings(validation: ReturnType<typeof validateDeviceForm>): TemplateResult {
  const warnings = getValidationWarnings(validation);
  if (warnings.length === 0) return html``;

  return html`
    <div class="validation-warnings">
      ${warnings.map(warning => html`
        <div class="warning-item">
          <span class="warning-icon">💡</span>
          <span class="warning-message">${warning}</span>
        </div>
      `)}
    </div>
  `;
}

/**
 * Render add device button with validation
 */
export function renderAddDeviceButton(logic: DeviceConfigLogic): TemplateResult {
  const validation = validateDeviceForm(logic.newDevice);
  const disabled = !isFormValid(validation);
  const typeName = logic.newDevice.type.charAt(0).toUpperCase() + logic.newDevice.type.slice(1);

  return html`
    <button
      class="button ${disabled ? 'disabled' : 'secondary'}"
      @click="${() => logic.handleAddDevice()}"
      ?disabled="${disabled}"
      title="${disabled ? 'Please fix validation errors' : `Add ${typeName}`}"
    >
      ${disabled ? '❌ Fix Errors First' : `✅ Add ${typeName}`}
    </button>

    ${disabled ? html`
      <div class="validation-summary">
        <span style="color: #ef4444; font-size: 0.875rem;">
          ⚠️ ${validation.errors.length} error(s) must be fixed before adding device
        </span>
      </div>
    ` : ''}
  `;
}

/**
 * Render activity log
 */
export function renderActivityLog(logic: DeviceConfigLogic): TemplateResult {
  return html`
    <div class="log-section">
      <div style="color: #9ca3af; font-size: 0.8rem; margin-bottom: 10px;">
        Activity Log:
      </div>
      ${logic.logs.length === 0 ? html`
        <div class="log-entry info">No activity yet...</div>
      ` : logic.logs.slice(-10).map(log => html`
        <div class="log-entry ${log.type}">
          [${log.timestamp.toLocaleTimeString()}] ${log.message}
        </div>
      `)}
    </div>
  `;
}