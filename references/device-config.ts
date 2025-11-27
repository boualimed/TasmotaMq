// device-config.ts (Phase 2 Complete: All Renders Extracted)
// Main UI Component - Now ultra-clean with separated concerns

import '../features/shield/shield-dashboard.component'; // Register the component
import { shieldHandler } from '../handlers/shield-handler';
import { LitElement, html, TemplateResult, nothing, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { deviceConfigStyles } from '../../styles/device-config.styles';
import { DeviceConfigLogic } from './device-config-logic';
// ✅ PHASE 2: Import render modules
import { renderNotifications, renderError, renderUsageBanner } from '../renders/notifications.render';
import { renderDraggableDeviceCard } from '../renders/device-card.render';
import {
  renderDeviceTypeSelector,
  renderDeviceForm,
  renderAddDeviceButton,
  renderActivityLog
} from '../renders/device-form.render';
import {
  renderHeader,
  renderSideNav,
  renderCategoryTabs,
  renderDeviceToolbar,
  renderEmptyCategory,
  SideNavState
} from '../renders/navigation-render';
import { renderAllModals } from '../renders/modals-render';

// Component imports
import '../features/ai/ai-settings.component';
import '../features/db/supabase-config';
import '../features/ai/chat-prompt.component';
import '../renders/rule-builder-modal.component';
import '../renders/script-builder-modal.component';
import '../features/analytics/chart-viewer.component';
import '../renders/timer-manager-modal.component';
import '../features/db/sensor-history.component';
import '../features/analytics/ml-insights-modal.component';
import '../renders/subscription-widget.component';
import '../features/telegram/telegram-config.component';



/**
 * DeviceConfig Component (UI Layer)
 * Phase 2 Complete: All rendering logic extracted to separate modules
 * Main component is now ~250 lines (down from ~1500)
 */
@customElement('device-config')
export class DeviceConfig extends LitElement {
  static styles  = [
    deviceConfigStyles,
    telegramStyles,
    shieldStyles
  ];

  // 🆕 Make logic static/singleton to persist across remounts
  private static sharedLogic: DeviceConfigLogic | null = null;
  private hasInitialized = false;

  // Logic layer instance
  private logic!: DeviceConfigLogic;

  // State properties (for reactivity)
  //@state() private updateTrigger = 0;
  @state() private sideNavOpen = false;
  @state() private activeSection: 'mqtt' | 'ai' | null = null;
  @state() private showTelegramConfig = false;
  @state() private telegramEnabled = false;
  @state() private activeAlertCount = 0;
  @state() private showShieldDashboard = false;
  // =============================================================================
  // Lifecycle Methods
  // =============================================================================

  async connectedCallback(): Promise<void> {
    super.connectedCallback();

    // Reuse existing logic instance if available
    if (DeviceConfig.sharedLogic) {
      console.log('♻️ Reusing existing logic instance');
      this.logic = DeviceConfig.sharedLogic;
      this.logic.setStateChangeCallback(() => this.requestUpdate());
      this.updateTelegramStats();
      this.hasInitialized = true;
      this.requestUpdate();
      return;
    }

    // First mount - create new logic instance
    console.log('🆕 First mount - creating logic instance');
    this.logic = new DeviceConfigLogic(() => this.requestUpdate());
    DeviceConfig.sharedLogic = this.logic;

    if (!this.hasInitialized) {
      await this.logic.initialize();
      // TELEGRAM: Initialize + update stats only on first load
    //await this.initializeTelegram();
    this.updateTelegramStats();
      this.hasInitialized = true;
  }


  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    console.log('📤 Component unmounting (preserving shared state)');
    // Logic persists - no cleanup on unmount
  }

  public dispose(): void {
    console.log('🧹 Explicit disposal requested');
    if (DeviceConfig.sharedLogic) {
      DeviceConfig.sharedLogic.cleanup();
      DeviceConfig.sharedLogic = null;
    }
  }

  // =============================================================================
  // Main Render Method
  // =============================================================================

  // =============================================================================
  // Layout Sections
  // =============================================================================



    render(): TemplateResult {
      const sideNavState: SideNavState = {
        sideNavOpen: this.sideNavOpen,
        activeSection: this.activeSection
      };

      return html`
        <!-- Notifications -->
        ${renderNotifications(this.logic)}

        <!-- Side Navigation -->
        ${renderSideNav(
          this.logic,
          sideNavState,
          () => this.closeSideNav(),
          (section) => this.openSection(section)
        )}

        <!-- Main Content -->
        ${this.renderMainContent()}


        <!-- All Modals -->
        ${renderAllModals(this.logic)}

        <!-- Telegram Modal - MOVED TO TRUE ROOT LEVEL -->
        ${this.renderTelegramModal()}

        <!-- Chat Component -->
        <chat-prompt></chat-prompt>
      `;
    }

    private renderMainContent(): TemplateResult {
      return html`
        <div class="config-container">
          ${renderHeader(
            this.logic,
            (page) => this.handleNavigate(page),
            () => this.openSideNav(),
            () => this.openTelegramConfig(),
            this.telegramEnabled,
            this.activeAlertCount,
      )}

          ${this.logic.errorMessage ? renderError(this.logic.errorMessage) : ''}
          ${this.renderMainGrid()}
          <!-- REMOVED renderTelegramModal() from here -->
          ${this.showShieldDashboard ? html`
            <div class="modal-overlay" @click=${this.closeShieldDashboard}>
              <div class="modal-container large" @click=${(e: Event) => e.stopPropagation()}>
                <div class="modal-header">
                  <h2>Command Shield Dashboard</h2>
                  <button class="btn-close" @click=${this.closeShieldDashboard}>×</button>
                </div>
                <div class="modal-body" style="padding:0;">
                  <shield-dashboard></shield-dashboard>
                </div>
              </div>
            </div>
          ` : nothing}
             <button
        class="shield-fab ${this.logic.getShieldBlockedCount() > 0 ? 'blocked' : ''}"
        @click=${this.openShieldDashboard}
        title="Command Shield Dashboard"
      >
        🛡️
        <span class="fab-label">Shield</span>
      </button>
        </div>
      `;
    }

  /* ------------------------------------------------------------------ */
/*  Telegram Modal render + Quick actions                              */
/* ------------------------------------------------------------------ */

private renderTelegramModal(): TemplateResult | typeof nothing {
  if (!this.showTelegramConfig) return nothing;
  return html`
    <div class="modal-overlay" @click=${() => this.closeTelegramConfig()}>
      <div class="modal-container" @click=${(e: Event) => e.stopPropagation()}>
        <div class="modal-header">
          <h2>Telegram Configuration</h2>
          <button class="btn-close" @click=${() => this.closeTelegramConfig()}>Close</button>
        </div>
        <div class="modal-body">
          <telegram-config .telegramHandler=${this.logic.getTelegramHandler()}></telegram-config>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click=${() => this.closeTelegramConfig()}>Close</button>
        </div>
      </div>
    </div>
  `;
}



  private renderMainGrid(): TemplateResult {
    return html`
      <div class="main-grid-updated">
        ${this.renderDevicesSection()}
        ${this.renderDeviceManagementSection()}
      </div>
    `;
  }

  // =============================================================================
  // Devices Section
  // =============================================================================

  private renderDevicesSection(): TemplateResult {
    const filteredDevices = this.logic.getFilteredDevices();

    return html`
      <div class="devices-section-full">
        ${renderCategoryTabs(this.logic)}
        ${renderDeviceToolbar(filteredDevices.length, this.logic)}

        ${filteredDevices.length === 0
          ? renderEmptyCategory(this.logic.activeCategory)
          : this.renderDevicesGrid()
        }
      </div>
    `;
  }

  private renderDevicesGrid(): TemplateResult {
    const filteredDevices = this.logic.getFilteredDevices();

    return html`
      <div class="devices-grid">
        ${filteredDevices.map(device => renderDraggableDeviceCard(device, this.logic))}
      </div>
    `;
  }

  // =============================================================================
  // Device Management Section
  // =============================================================================

  private renderDeviceManagementSection(): TemplateResult {
    return html`
      <div class="section">
        <div class="section-title">📱 Add New Device</div>
        ${renderUsageBanner(this.logic, (page) => this.handleNavigate(page))}
        ${renderDeviceTypeSelector(this.logic)}
        ${renderDeviceForm(this.logic)}
        ${renderAddDeviceButton(this.logic)}
        ${renderActivityLog(this.logic)}
      </div>
    `;
  }

  // =============================================================================
  // Side Nav Handlers
  // =============================================================================

  private openSection(section: 'mqtt' | 'ai'): void {
    this.activeSection = section;
    this.requestUpdate();
  }

  private closeSideNav(): void {
    this.sideNavOpen = false;
    this.activeSection = null;
    this.requestUpdate();
  }

  private openSideNav(): void {
    this.sideNavOpen = true;
    this.activeSection = null;
    this.requestUpdate();
  }

  // =============================================================================
  // Navigation Handlers
  // =============================================================================

  private handleNavigate(page: string): void {
    // Handle special cases
    if (page === 'home') {
      this.logic.handleBack();
    }

    // Dispatch navigation event
    this.dispatchEvent(new CustomEvent('navigate', {
      detail: { page },
      bubbles: true,
      composed: true
    }));
  }

  /* ------------------------------------------------------------------ */
/*  Telegram helpers (called after init & when modal opens/closes)   */
/* ------------------------------------------------------------------ */
private openTelegramConfig(): void {
  this.showTelegramConfig = true;
  this.updateTelegramStats();
}
private closeTelegramConfig(): void {
  this.showTelegramConfig = false;
  this.updateTelegramStats();
}
private updateTelegramStats(): void {
  const handler = this.logic.getTelegramHandler();
  const settings = handler?.getSettings();
  this.telegramEnabled = settings?.enabled ?? false;
  const stats = handler?.getStats();
  this.activeAlertCount = stats?.activeConfigs ?? 0;
}
private async openShieldDashboard(): Promise<void> {
  this.showShieldDashboard = true;
  // Critical: Initialize the handler the first time the dashboard is opened
  if (!shieldHandler['initialize']) {
    await shieldHandler.initialize();
    // Optional: mark as initialized to avoid re-init
    (shieldHandler as any).initialized = true;
  }
  this.requestUpdate();
}

private closeShieldDashboard(): void {
  this.showShieldDashboard = false;
  this.requestUpdate();
}
}