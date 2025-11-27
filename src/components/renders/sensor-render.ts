// sensor.render.ts
// Render functions for sensor data display

import { html, TemplateResult } from 'lit';
import { Device, SensorType } from '../../models/device.model';
import { flattenObject } from '../../utils/json-parser.util';
import { formatSensorLabel, shouldApplyUnit } from '../utils/formatters.util';

/**
 * Render sensor data container with values
 */
export function renderSensorData(device: Device): TemplateResult {
  const config = device.sensorConfig;
  const icon = config?.icon || '📊';
  const displayName = config?.displayName || device.name;
  const unit = config?.unit || '';

  // If we have structured sensor data, display it nicely
  if (device.sensorData && typeof device.sensorData === 'object') {
    const flatData = flattenObject(device.sensorData);
    const entries = Object.entries(flatData);

    return html`
      <div class="sensor-data-container">
        <div class="sensor-header">
          <span class="sensor-icon">${icon}</span>
          <span class="sensor-display-name">${displayName}</span>
        </div>

        <div class="sensor-values">
          ${entries.length > 0 ? entries.map(([key, value]) =>
            renderSensorValueItem(key, value, unit, config?.sensorType)
          ) : html`
            <div class="sensor-value-item">
              <div class="sensor-value-label">No data</div>
              <div class="sensor-value">Waiting for updates...</div>
            </div>
          `}
        </div>

        ${renderSensorRawData(device)}
      </div>
    `;
  }

  // Fallback for non-object data
  return html`
    <div class="sensor-data-container">
      <div class="sensor-header">
        <span class="sensor-icon">${icon}</span>
        <span class="sensor-display-name">${displayName}</span>
      </div>
      <div class="sensor-value-item">
        <div class="sensor-value-label">Value</div>
        <div class="sensor-value">${device.sensorData} ${unit}</div>
      </div>
    </div>
  `;
}

/**
 * Render individual sensor value item
 */
function renderSensorValueItem(
  key: string,
  value: any,
  unit: string,
  sensorType?: SensorType
): TemplateResult {
  const shouldUseUnit = shouldApplyUnit(key, sensorType);
  const displayValue = shouldUseUnit && unit ? `${value} ${unit}` : value;

  return html`
    <div class="sensor-value-item">
      <div class="sensor-value-label">${formatSensorLabel(key)}</div>
      <div class="sensor-value">${displayValue}</div>
    </div>
  `;
}

/**
 * Render raw sensor data toggle
 */
export function renderSensorRawData(device: Device): TemplateResult {
  return html`
    <details class="sensor-raw-toggle">
      <summary class="sensor-raw-summary">View Raw Data</summary>
      <pre class="sensor-raw">${JSON.stringify(device.sensorData, null, 2)}</pre>
    </details>
  `;
}

/**
 * Render sensor type selector for add device form
 */
export function renderSensorTypeSelector(
  sensorType: SensorType,
  onSensorTypeChange: (type: SensorType) => void
): TemplateResult {
  return html`
    <div class="form-group">
      <label class="form-label">Sensor Type</label>
      <select
        class="form-input"
        .value="${sensorType}"
        @change="${(e: Event) => {
          const target = e.target as HTMLSelectElement;
          onSensorTypeChange(target.value as SensorType);
        }}"
      >
        <option value="temperature">🌡️ Temperature</option>
        <option value="humidity">💧 Humidity</option>
        <option value="pressure">📽 Pressure</option>
        <option value="energy">⚡ Energy</option>
        <option value="light">💡 Light</option>
        <option value="gas">💨 Gas</option>
        <option value="motion">🚶 Motion</option>
        <option value="distance">📏 Distance</option>
        <option value="multi">📊 Multi-sensor</option>
        <option value="custom">⚙️ Custom</option>
      </select>
    </div>
  `;
}

/**
 * Render additional sensor configuration fields (for custom sensors)
 */
export function renderSensorAdditionalConfig(
  config: any,
  onConfigChange: (field: string, value: string) => void
): TemplateResult {
  const sensorType = config?.sensorType || 'custom';

  // Show additional fields for custom sensor type
  if (sensorType !== 'custom') {
    return html``;
  }

  return html`
    <div class="form-group">
      <label class="form-label">Display Name (Optional)</label>
      <input
        type="text"
        class="form-input"
        placeholder="e.g., Room Temperature"
        .value="${config?.displayName || ''}"
        @input="${(e: Event) => {
          const target = e.target as HTMLInputElement;
          onConfigChange('displayName', target.value);
        }}"
      />
      <div class="parser-help">
        Custom name to display for this sensor
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Unit (Optional)</label>
      <input
        type="text"
        class="form-input"
        placeholder="e.g., °C, %, lux"
        .value="${config?.unit || ''}"
        @input="${(e: Event) => {
          const target = e.target as HTMLInputElement;
          onConfigChange('unit', target.value);
        }}"
      />
      <div class="parser-help">
        Unit of measurement for the sensor value
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Icon (Optional)</label>
      <input
        type="text"
        class="form-input"
        placeholder="e.g., 🌡️, 💧, ⚡"
        .value="${config?.icon || ''}"
        @input="${(e: Event) => {
          const target = e.target as HTMLInputElement;
          onConfigChange('icon', target.value);
        }}"
      />
      <div class="parser-help">
        Emoji or icon to represent this sensor
      </div>
    </div>
  `;
}