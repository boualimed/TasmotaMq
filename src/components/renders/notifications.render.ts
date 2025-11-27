// notifications.render.ts
// Render functions for notifications and banners

import { html, TemplateResult } from 'lit';
import { Notification } from '../../services/notification.service';
import { DeviceConfigLogic } from '../app/device-config-logic';

/**
 * Render all notifications container
 */
export function renderNotifications(logic: DeviceConfigLogic): TemplateResult {
  return html`
    <div class="notification-container">
      ${logic.notifications.map(notif => renderNotification(notif, logic))}
    </div>
  `;
}

/**
 * Render single notification item
 */
export function renderNotification(notif: Notification, logic: DeviceConfigLogic): TemplateResult {
  return html`
    <div
      class="notification-item ${notif.type}"
      @click="${() => logic.dismissNotification(notif.id)}"
    >
      <span class="notification-icon">${logic.getNotificationIcon(notif.type)}</span>
      <span class="notification-message">${notif.message}</span>
      <button
        class="notification-close"
        @click="${(e: Event) => {
          e.stopPropagation();
          logic.dismissNotification(notif.id);
        }}"
      >
        ×
      </button>
    </div>
  `;
}

/**
 * Render error notification
 */
export function renderError(errorMessage: string): TemplateResult {
  return html`
    <div class="notification error">⚠️ ${errorMessage}</div>
  `;
}

/**
 * Render usage banner for subscription limits
 */
export function renderUsageBanner(
  logic: DeviceConfigLogic,
  onNavigate: (page: string) => void
): TemplateResult {
  const subInfo = logic.getSubscriptionInfo();
  const warnings = logic.getUsageWarnings();
  const canAdd = logic.canAddDevice();

  // Don't show banner if enterprise (unlimited)
  if (subInfo.tier === 'enterprise') {
    return html``;
  }

  // Calculate overall usage percentage
  const deviceUsage = subInfo.features.maxDevices === -1
    ? 0
    : (subInfo.usage.devicesCreated / subInfo.features.maxDevices) * 100;

  const mqttUsage = subInfo.usage.monthlyQuota.mqttMessages === -1
    ? 0
    : (subInfo.usage.mqttMessagesProcessed / subInfo.usage.monthlyQuota.mqttMessages) * 100;

  const showWarning = deviceUsage >= 75 || mqttUsage >= 75;
  const showDanger = deviceUsage >= 90 || mqttUsage >= 90;

  if (!showWarning && warnings.length === 0) {
    return html``; // Don't show banner if usage is low
  }

  return html`
    <div class="usage-banner ${showDanger ? 'danger' : showWarning ? 'warning' : 'info'}">
      <div class="banner-icon">
        ${showDanger ? '⚠️' : showWarning ? '📊' : 'ℹ️'}
      </div>

      <div class="banner-content">
        <div class="banner-title">
          ${showDanger
            ? '⚠️ Usage Limit Approaching'
            : showWarning
            ? '📊 High Usage Detected'
            : 'ℹ️ Usage Update'
          }
        </div>

        <div class="banner-stats">
          <!-- Device Usage -->
          <div class="stat-item">
            <span class="stat-label">📱 Devices:</span>
            <span class="stat-value ${deviceUsage >= 90 ? 'danger' : deviceUsage >= 75 ? 'warning' : ''}">
              ${subInfo.usage.devicesCreated} / ${subInfo.features.maxDevices}
              <span class="stat-percentage">(${Math.round(deviceUsage)}%)</span>
            </span>
          </div>

          <!-- MQTT Messages -->
          <div class="stat-item">
            <span class="stat-label">📡 MQTT:</span>
            <span class="stat-value ${mqttUsage >= 90 ? 'danger' : mqttUsage >= 75 ? 'warning' : ''}">
              ${subInfo.usage.mqttMessagesProcessed.toLocaleString()} / ${subInfo.usage.monthlyQuota.mqttMessages.toLocaleString()}
              <span class="stat-percentage">(${Math.round(mqttUsage)}%)</span>
            </span>
          </div>

          <!-- Reset Info -->
          <div class="stat-item reset-info">
            <span class="stat-label">🔄 Resets in:</span>
            <span class="stat-value">${logic.getDaysUntilReset()} days</span>
          </div>
        </div>

        ${warnings.length > 0 ? html`
          <div class="banner-warnings">
            ${warnings.map(warning => html`
              <div class="warning-item">${warning}</div>
            `)}
          </div>
        ` : ''}

        ${!canAdd.allowed ? html`
          <div class="banner-alert">
            🚫 <strong>Cannot add more devices:</strong> ${canAdd.reason}
          </div>
        ` : ''}
      </div>

      <div class="banner-actions">
        ${subInfo.tier !== 'enterprise' ? html`
          <button
            class="banner-button upgrade"
            @click="${() => onNavigate('subscription-manager')}"
          >
            ⬆️ Upgrade Plan
          </button>
        ` : ''}

        <button
          class="banner-button details"
          @click="${() => onNavigate('subscription-details')}"
        >
          📊 View Details
        </button>
      </div>
    </div>
  `;
}