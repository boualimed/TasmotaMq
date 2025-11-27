// modals.render.ts
// Render functions for modal components

import { html, TemplateResult } from 'lit';
import { DeviceConfigLogic } from '../app/device-config-logic';

/**
 * Render all script builder modals
 */
export function renderScriptModals(logic: DeviceConfigLogic): TemplateResult[] {
  return Array.from(logic.openScriptModals).map(deviceId => html`
    <script-builder-modal
      .deviceId="${deviceId}"
      @close="${() => logic.closeScriptModal(deviceId)}"
    ></script-builder-modal>
  `);
}

/**
 * Render all timer manager modals
 */
export function renderTimerModals(logic: DeviceConfigLogic): TemplateResult[] {
  return logic.devices
    .filter(device => logic.isTimerModalOpen(device.id))
    .map(device => html`
      <timer-manager-modal
        .device="${device}"
        .open="${true}"
        @close="${() => logic.closeTimerModal(device.id)}"
        @save-timer="${(e: CustomEvent) => logic.handleSaveTimer(device.id, e.detail.timerId, e.detail.timer)}"
        @delete-timer="${(e: CustomEvent) => logic.handleDeleteTimer(device.id, e.detail.timerId)}"
      ></timer-manager-modal>
    `);
}

/**
 * Render all sensor history modals
 */
export function renderSensorHistoryModals(logic: DeviceConfigLogic): TemplateResult[] {
  return logic.devices
    .filter(device => device.type === 'sensor' && logic.isSensorHistoryModalOpen(device.id))
    .map(device => html`
      <sensor-history
        .device="${device}"
        .open="${true}"
        @close="${() => logic.closeSensorHistoryModal(device.id)}"
      ></sensor-history>
    `);
}

/**
 * Render all ML insights modals
 */
export function renderMLModals(logic: DeviceConfigLogic): TemplateResult[] {
  return logic.devices
    .filter(device => device.type === 'sensor' && logic.isMLModalOpen(device.id))
    .map(device => html`
      <ml-insights-modal
        .device="${device}"
        .open="${true}"
        @close="${() => logic.closeMLModal(device.id)}"
      ></ml-insights-modal>
    `);
}

/**
 * Render all rule builder modals
 */
export function renderRuleModals(logic: DeviceConfigLogic): TemplateResult[] {
  return logic.devices.map(device => html`
    ${logic.showRuleModal && logic.selectedDeviceForRules === device.id ? html`
      <rule-builder-modal
        .device="${device}"
        .open="${true}"
        @close="${() => logic.closeRuleModal()}"
      ></rule-builder-modal>
    ` : ''}
  `);
}

/**
 * Render all chart viewer modals
 */
export function renderChartModals(logic: DeviceConfigLogic): TemplateResult[] {
  return logic.devices.map(device => html`
    ${logic.isChartModalOpen(device.id) ? html`
      <chart-viewer
        .device="${device}"
        .open="${true}"
        @close="${() => logic.closeChartModal(device.id)}"
      ></chart-viewer>
    ` : ''}
  `);
}

/**
 * Render all modals at once
 */
export function renderAllModals(logic: DeviceConfigLogic): TemplateResult {
  return html`
    ${renderScriptModals(logic)}
    ${renderTimerModals(logic)}
    ${renderSensorHistoryModals(logic)}
    ${renderMLModals(logic)}
    ${renderRuleModals(logic)}
    ${renderChartModals(logic)}
  `;
}