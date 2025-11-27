// navigation.render.ts
// Render functions for navigation (header, side-nav, tabs, toolbar)

import { html, TemplateResult } from 'lit';
import { DeviceType } from '../../models/device.model';
import { DeviceConfigLogic } from '../app/device-config-logic';
import { ollamaAIService } from '../../services/ollama-ai.service';

// Cache for category counts to prevent recalculation on every render
interface CategoryCountCache {
  counts: Map<DeviceType | 'all', number>;
  lastDeviceHash: string;
}

const categoryCountCache: CategoryCountCache = {
  counts: new Map(),
  lastDeviceHash: ''
};

 /**
 * Generate a simple hash from device list to detect changes
 * Only recalculates when the actual device list changes
 */
function generateDeviceHash(logic: DeviceConfigLogic): string {
  const devices = logic.devices || [];
  // Simple hash: count + concatenated IDs + types
  return `${devices.length}-${devices.map(d => `${d.id}:${d.type}`).join(',')}`;
}
/**
 * Get cached category counts or recalculate if device list changed
 */
function getCachedCategoryCounts(logic: DeviceConfigLogic): Map<DeviceType | 'all', number> {
  const currentHash = generateDeviceHash(logic);

  // Check if cache is still valid
  if (categoryCountCache.lastDeviceHash === currentHash && categoryCountCache.counts.size > 0) {
    return categoryCountCache.counts;
  }

  // Recalculate counts - device list has changed
  const categories: Array<DeviceType | 'all'> = ['all', 'switch', 'dimmer', 'shutter', 'sensor'];
  categoryCountCache.counts.clear();

  categories.forEach(cat => {
    categoryCountCache.counts.set(cat, logic.getCategoryCount(cat));
  });

  categoryCountCache.lastDeviceHash = currentHash;

  return categoryCountCache.counts;
}

export interface SideNavState {
  sideNavOpen: boolean;
  activeSection: 'mqtt' | 'ai' | null;
}

// navigation-render.ts
// ...other imports unchanged
export function renderHeader(
  logic: DeviceConfigLogic,
  onNavigate: (page: string) => void,
  onOpenSideNav: () => void,
  onOpenTelegram?: () => void,                 // NEW
  telegramEnabled: boolean = false,            // NEW
  activeAlertCount: number = 0                 // NEW
): TemplateResult {
  return html`
    <div class="config-header">
      <!-- Back Button -->
      <button class="back-button" @click="${() => { logic.handleBack(); onNavigate('home'); }}">←</button>

      <!-- Title Section -->
      <div class="header-text">
        <h1>Tasmota MQTT Controller</h1>
        <p>Manage your smart devices</p>
      </div>

      <!-- Settings Button -->
      <button
        class="config-button"
        @click="${() => onOpenSideNav()}"
        title="Open settings"
      >
      <span class="config-icon">🔗</span>
       Connectivity
      </button>


      <!-- Firebase Dropdown -->
      <menu-dropdown
        @navigate="${(e: CustomEvent) => onNavigate(e.detail.route)}"
      ></menu-dropdown>

      <!-- Right Section: User Info & Actions -->
      <div class="user-info">
        <!-- Telegram Button with status badge -->
        <button
          class="telegram-button ${telegramEnabled ? 'enabled' : ''}"
          @click="${() => onOpenTelegram && onOpenTelegram()}"
          title="Configure Telegram Alerts"
        >
          📱 Telegram
          ${telegramEnabled && activeAlertCount > 0 ? html`<span class="badge">${activeAlertCount}</span>` : ''}
        </button>

        <!-- Subscription Widget -->
        <subscription-widget
          @navigate-subscription="${() => onNavigate('subscription-manager')}"
        ></subscription-widget>

        <!-- User Info -->
        <div class="user-info">
          <span class="user-icon">👤</span>
          <span class="user-name">${logic.currentUser}</span>
        </div>

        <!-- Logout Button -->
        <button
          class="logout-button"
          @click="${() => logic.handleLogout()}"
          title="Logout"
        >
          🚪 Logout
        </button>
      </div>
    </div>
  `;
}


/**
 * Render side navigation panel
 */
export function renderSideNav(
  logic: DeviceConfigLogic,
  state: SideNavState,
  onClose: () => void,
  onOpenSection: (section: 'mqtt' | 'ai') => void
): TemplateResult {
  const isConnected = logic.connectionStatus === 'connected';
  const isConnecting = logic.connectionStatus === 'connecting';

  return html`
    <div class="side-nav ${state.sideNavOpen ? 'open' : ''}">
      <div class="side-nav-header">
        <h2>⚙️ Settings</h2>
        <button
          class="side-nav-close"
          @click="${() => onClose()}"
          aria-label="Close settings"
        >
          ×
        </button>
      </div>

      <div class="side-nav-content">
        ${state.activeSection === 'mqtt'
          ? renderMqttSection(logic, isConnected, isConnecting, () => onOpenSection(null as any))
          : state.activeSection === 'ai'
          ? renderAISection(logic, () => onOpenSection(null as any))
          : renderSideNavMenu(logic, onOpenSection)
        }
      </div>
    </div>

    ${state.sideNavOpen ? html`
      <div
        class="side-nav-overlay"
        @click="${() => onClose()}"
      ></div>
    ` : ''}
  `;
}

/**
 * Render side nav menu (settings list)
 */
function renderSideNavMenu(
  logic: DeviceConfigLogic,
  onOpenSection: (section: 'mqtt' | 'ai') => void
): TemplateResult {
  return html`
    <div class="side-nav-menu">
      <button
        class="side-nav-menu-item"
        @click="${() => onOpenSection('mqtt')}"
      >
        <span class="menu-icon">🔗</span>
        <div class="menu-content">
          <div class="menu-title">MQTT Connection</div>
          <div class="menu-subtitle">
            ${logic.connectionStatus === 'connected'
              ? '✅ Connected'
              : '❌ Disconnected'
            }
          </div>
        </div>
        <span class="menu-arrow">›</span>
      </button>

      <button
        class="side-nav-menu-item"
        @click="${() => onOpenSection('ai')}"
      >
        <span class="menu-icon">🧠</span>
        <div class="menu-content">
          <div class="menu-title">AI Settings</div>
          <div class="menu-subtitle">
            ${ollamaAIService.getConfig().enabled
              ? '✅ Enabled'
              : '❌ Disabled'
            }
          </div>
        </div>
        <span class="menu-arrow">›</span>
      </button>
    </div>
  `;
}

/**
 * Render MQTT section in side nav
 */
function renderMqttSection(
  logic: DeviceConfigLogic,
  isConnected: boolean,
  isConnecting: boolean,
  onBackToMenu: () => void
): TemplateResult {
  return html`
    <div class="section-content">
      <button
        class="back-to-menu"
        @click="${() => onBackToMenu()}"
      >
        ‹ Back to Settings
      </button>

      <div class="section-title">🔗 MQTT Connection</div>
      ${renderConnectionStatus(logic)}
      ${renderMqttForm(logic, isConnected, isConnecting)}
      ${renderConnectionButton(logic, isConnected, isConnecting)}
    </div>
  `;
}

/**
 * Render connection status indicator
 */
function renderConnectionStatus(logic: DeviceConfigLogic): TemplateResult {
  return html`
    <div class="connection-status ${logic.getStatusClass()}">
      <span class="status-indicator ${logic.getStatusClass()}"></span>
      ${logic.getStatusText()}
    </div>
  `;
}

/**
 * Render MQTT configuration form
 */
export function renderMqttForm(
  logic: DeviceConfigLogic,
  isConnected: boolean,
  isConnecting: boolean
): TemplateResult {
  const disabled = isConnected || isConnecting;
  const currentQos = (logic.mqttSettings as any).qos || 0;

  return html`
    <div class="form-group">
      <label class="form-label">MQTT Broker Host</label>
      <input
        type="text"
        class="form-input"
        placeholder="e.g., 192.168.1.100"
        .value="${logic.mqttSettings.host}"
        @input="${(e: Event) => {
          const target = e.target as HTMLInputElement;
          logic.handleMqttSettingChange('host', target.value);
        }}"
        ?disabled="${disabled}"
      />
    </div>

    <div class="form-group">
      <label class="form-label">WebSocket Port</label>
      <input
        type="number"
        class="form-input"
        .value="${logic.mqttSettings.port}"
        @input="${(e: Event) => {
          const target = e.target as HTMLInputElement;
          logic.handleMqttSettingChange('port', parseInt(target.value));
        }}"
        ?disabled="${disabled}"
      />
    </div>

    <div class="form-group">
      <label class="form-label">Username (optional)</label>
      <input
        type="text"
        class="form-input"
        .value="${logic.mqttSettings.username}"
        @input="${(e: Event) => {
          const target = e.target as HTMLInputElement;
          logic.handleMqttSettingChange('username', target.value);
        }}"
        ?disabled="${disabled}"
      />
    </div>

    <div class="form-group">
      <label class="form-label">Password (optional)</label>
      <input
        type="password"
        class="form-input"
        .value="${logic.mqttSettings.password}"
        @input="${(e: Event) => {
          const target = e.target as HTMLInputElement;
          logic.handleMqttSettingChange('password', target.value);
        }}"
        ?disabled="${disabled}"
      />
    </div>

    <div class="form-group">
      <label class="form-label">Keep Alive (seconds)</label>
      <input
        type="number"
        class="form-input"
        placeholder="Default: 60"
        .value="${(logic.mqttSettings as any).keepAliveInterval || 60}"
        @input="${(e: Event) => {
          const target = e.target as HTMLInputElement;
          const value = parseInt(target.value) || 60;
          logic.handleMqttSettingChange('keepAliveInterval', value);
        }}"
        ?disabled="${disabled}"
      />
      <div class="parser-help">
        Time (in seconds) between messages to keep the connection alive.
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Default QoS</label>
      <select
        class="form-input"
        .value="${currentQos.toString()}"
        @change="${(e: Event) => {
          const target = e.target as HTMLSelectElement;
          logic.handleMqttSettingChange('qos', parseInt(target.value));
        }}"
        ?disabled="${disabled}"
      >
        <option value="0">0: At most once (Fast, no guarantee)</option>
        <option value="1">1: At least once (Guaranteed, can duplicate)</option>
        <option value="2">2: Exactly once (Slowest, safest)</option>
      </select>
      <div class="parser-help">
        Default Quality of Service for publishing messages. Can be overridden.
      </div>
    </div>

    <div class="checkbox-group">
      <input
        type="checkbox"
        class="checkbox"
        .checked="${logic.mqttSettings.useSSL}"
        @change="${(e: Event) => {
          const target = e.target as HTMLInputElement;
          logic.handleMqttSettingChange('useSSL', target.checked);
        }}"
        ?disabled="${disabled}"
      />
      <label class="form-label">Use SSL/TLS (WSS)</label>
    </div>
  `;
}

/**
 * Render connection button (Connect/Disconnect/Cancel)
 */
function renderConnectionButton(
  logic: DeviceConfigLogic,
  isConnected: boolean,
  isConnecting: boolean
): TemplateResult {
  if (isConnecting) {
    return html`
      <button class="button warning" @click="${() => logic.handleCancelConnection()}">
        Cancel Connection
      </button>
    `;
  }

  if (isConnected) {
    return html`
      <button class="button danger" @click="${() => logic.handleDisconnect()}">
        Disconnect
      </button>
    `;
  }

  return html`
    <button class="button primary" @click="${() => logic.handleConnect()}">
      Connect to MQTT
    </button>
  `;
}

/**
 * Render AI section in side nav
 */
function renderAISection(logic: DeviceConfigLogic, onBackToMenu: () => void): TemplateResult {
  return html`
    <div class="section-content">
      <button
        class="back-to-menu"
        @click="${() => onBackToMenu()}"
      >
        ‹ Back to Settings
      </button>

      <ai-settings @config-changed="${() => logic.handleAIConfigChanged()}"></ai-settings>
      ${ollamaAIService.getConfig().enabled ? html`
        <button
          class="button secondary"
          @click="${() => logic.handleAnalyzeNow()}"
          style="margin-top: 10px; width: 100%;"
        >
          🧠 Analyze Now
        </button>
      ` : ''}
    </div>
  `;
}

/**
 * Render category filter tabs
 */
/**export function renderCategoryTabs(logic: DeviceConfigLogic): TemplateResult {
  const categories: Array<{ key: DeviceType | 'all'; label: string; icon: string }> = [
    { key: 'all', label: 'All Devices', icon: '🏠' },
    { key: 'switch', label: 'Switches', icon: '💡' },
    { key: 'dimmer', label: 'Dimmers', icon: '🔆' },
    { key: 'shutter', label: 'Shutters', icon: '🪟' },
    { key: 'sensor', label: 'Sensors', icon: '🌡️' },
  ];

  return html`
    <div class="category-tabs">
      ${categories.map(cat => {
        const count = logic.getCategoryCount(cat.key);
        const isActive = logic.activeCategory === cat.key;

        return html`
          <button
            class="category-tab ${isActive ? 'active' : ''} ${count === 0 ? 'empty' : ''}"
            @click="${() => logic.setActiveCategory(cat.key)}"
            ?disabled="${count === 0}"
          >
            <span class="tab-icon">${cat.icon}</span>
            <span class="tab-label">${cat.label}</span>
            <span class="tab-count">${count}</span>
          </button>
        `;
      })}
    </div>
  `;
}**/
/**
 * Render category filter tabs - OPTIMIZED
 * Only recalculates category counts when device list actually changes
 */
export function renderCategoryTabs(logic: DeviceConfigLogic): TemplateResult {
  const categories: Array<{ key: DeviceType | 'all'; label: string; icon: string }> = [
    { key: 'all', label: 'All Devices', icon: '🏠' },
    { key: 'switch', label: 'Switches', icon: '💡' },
    { key: 'dimmer', label: 'Dimmers', icon: '🔆' },
    { key: 'shutter', label: 'Shutters', icon: '🪟' },
    { key: 'sensor', label: 'Sensors', icon: '🌡️' },
  ];

  // Get cached counts (only recalculates when device list changes)
  const cachedCounts = getCachedCategoryCounts(logic);

  return html`
    <div class="category-tabs">
      ${categories.map(cat => {
        const count = cachedCounts.get(cat.key) ?? 0;
        const isActive = logic.activeCategory === cat.key;

        return html`
          <button
            class="category-tab ${isActive ? 'active' : ''} ${count === 0 ? 'empty' : ''}"
            @click="${() => logic.setActiveCategory(cat.key)}"
            ?disabled="${count === 0}"
          >
            <span class="tab-icon">${cat.icon}</span>
            <span class="tab-label">${cat.label}</span>
            <span class="tab-count">${count}</span>
          </button>
        `;
      })}
    </div>
  `;
}

/**
 * Force cache invalidation (optional - automatic via hash detection)
 */
export function invalidateCategoryCache(): void {
  categoryCountCache.lastDeviceHash = '';
  categoryCountCache.counts.clear();
}
/**
 * Render device toolbar
 */
export function renderDeviceToolbar(deviceCount: number, logic: DeviceConfigLogic): TemplateResult {
  return html`
    <div class="device-toolbar">
      <div class="toolbar-info">
        <span class="device-count">${deviceCount} device${deviceCount !== 1 ? 's' : ''}</span>
        ${logic.activeCategory !== 'all' ? html`
          <span class="category-filter-badge">
            Filtered by ${logic.activeCategory}
          </span>
        ` : ''}
      </div>
      <div class="toolbar-actions">
        <button
          class="toolbar-button"
          @click="${() => logic.resetDeviceOrder()}"
          title="Reset to alphabetical order"
        >
          🔄 Reset Order
        </button>

        <span class="toolbar-hint">
          💡 Drag & drop to reorder
        </span>
      </div>
    </div>
  `;
}

/**
 * Render empty category state
 */
export function renderEmptyCategory(categoryType: DeviceType | 'all'): TemplateResult {
  const categoryName = categoryType === 'all'
    ? 'devices'
    : `${categoryType}s`;

  return html`
    <div class="empty-state">
      <div>🔭</div>
      <div>No ${categoryName} found</div>
      <div style="font-size: 0.875rem; color: #666; margin-top: 8px;">
        ${categoryType === 'all'
          ? 'Add your first device using the form below'
          : `Switch to "All Devices" or add a new ${categoryType}`
        }
      </div>
    </div>
  `;
}