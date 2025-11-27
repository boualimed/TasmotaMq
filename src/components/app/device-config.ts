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

 const telegramStyles = css`
:host .modal-overlay {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  margin: 0 !important;
  padding: 0 !important;
  background: rgba(0, 0, 0, 0.7) !important;
  backdrop-filter: blur(4px) !important;
  -webkit-backdrop-filter: blur(4px) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 999999 !important;
  animation: modalFadeIn 0.2s ease !important;
  pointer-events: auto !important;
  box-sizing: border-box !important;
}

@keyframes modalFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

:host .telegram-modal-container {
  position: relative !important;
  background: white !important;
  border-radius: 16px !important;
  max-width: 900px !important;
  width: 90vw !important;
  max-height: 90vh !important;
  margin: 0 auto !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6) !important;
  animation: modalSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
  z-index: 1000000 !important;
  pointer-events: auto !important;
  box-sizing: border-box !important;
}

@keyframes modalSlideUp {
  from {
    transform: translateY(50px) scale(0.95);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

:host .telegram-modal-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  padding: 24px 30px !important;
  border-bottom: 2px solid #e0e0e0 !important;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: white !important;
  flex-shrink: 0 !important;
  box-sizing: border-box !important;
}

:host .telegram-modal-header h2 {
  margin: 0 !important;
  font-size: 24px !important;
  font-weight: 600 !important;
  color: white !important;
  line-height: 1.2 !important;
}

:host .telegram-btn-close {
  background: rgba(255, 255, 255, 0.2) !important;
  border: none !important;
  color: white !important;
  font-size: 28px !important;
  width: 40px !important;
  height: 40px !important;
  min-width: 40px !important;
  min-height: 40px !important;
  border-radius: 50% !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.3s ease !important;
  padding: 0 !important;
  margin: 0 !important;
  line-height: 1 !important;
  flex-shrink: 0 !important;
  box-sizing: border-box !important;
}

:host .telegram-btn-close:hover {
  background: rgba(255, 255, 255, 0.4) !important;
  transform: rotate(90deg) !important;
}

:host .telegram-modal-body {
  flex: 1 !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  padding: 0 !important;
  margin: 0 !important;
  background: #f8f9fa !important;
  box-sizing: border-box !important;
  -webkit-overflow-scrolling: touch !important;
}

:host .telegram-modal-footer {
  padding: 20px 30px !important;
  border-top: 2px solid #e0e0e0 !important;
  display: flex !important;
  justify-content: flex-end !important;
  gap: 12px !important;
  background: white !important;
  flex-shrink: 0 !important;
  box-sizing: border-box !important;
}

:host .telegram-modal-footer .telegram-btn {
  padding: 10px 24px !important;
  border: none !important;
  border-radius: 8px !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: all 0.3s ease !important;
  box-sizing: border-box !important;
}

:host .telegram-modal-footer .telegram-btn-secondary {
  background: #6c757d !important;
  color: white !important;
}

:host .telegram-modal-footer .telegram-btn-secondary:hover {
  background: #5a6268 !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3) !important;
}

/* Telegram Button in Header */
:host .telegram-button {
  position: relative !important;
  padding: 10px 20px !important;
  border: 2px solid #0088cc !important;
  background: white !important;
  color: #0088cc !important;
  border-radius: 8px !important;
  cursor: pointer !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  transition: all 0.3s ease !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  white-space: nowrap !important;
  box-sizing: border-box !important;
}

:host .telegram-button:hover {
  background: #0088cc !important;
  color: white !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 12px rgba(0, 136, 204, 0.3) !important;
}

:host .telegram-button.enabled {
  background: #0088cc !important;
  color: white !important;
  border-color: #0088cc !important;
}

:host .telegram-button .badge {
  position: absolute !important;
  top: -8px !important;
  right: -8px !important;
  background: #dc3545 !important;
  color: white !important;
  border-radius: 50% !important;
  width: 22px !important;
  height: 22px !important;
  min-width: 22px !important;
  min-height: 22px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 11px !important;
  font-weight: bold !important;
  border: 2px solid white !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
  line-height: 1 !important;
  box-sizing: border-box !important;
}

/* Ensure telegram-config component fills modal body */
:host telegram-config {
  display: block !important;
  width: 100% !important;
  min-height: 100% !important;
  box-sizing: border-box !important;
}

/* Responsive Design */
@media (max-width: 768px) {
  :host telegram-modal-container {
    width: 95vw !important;
    max-height: 95vh !important;
    border-radius: 12px !important;
  }

  :host .telegram-modal-header {
    padding: 20px !important;
  }

  :host .telegram-modal-header h2 {
    font-size: 20px !important;
  }

  :host .telegram-btn-close {
    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;
    min-height: 36px !important;
    font-size: 24px !important;
  }

  :host .telegram-modal-footer {
    padding: 16px 20px !important;
  }

  :host .telegram-button {
    padding: 8px 16px !important;
    font-size: 13px !important;
  }

  :host .telegram-button .badge {
    width: 20px !important;
    height: 20px !important;
    min-width: 20px !important;
    min-height: 20px !important;
    font-size: 10px !important;
  }
}

/* Prevent body scroll when modal is open */
:host([modal-open]) {
  overflow: hidden !important;
}

/* Override any conflicting parent styles */
:host .telegram-modal-overlay * {
  box-sizing: border-box !important;
}

/* Ensure config-container doesn't create stacking context issues */
:host .telegram-config-container {
  position: relative;
  z-index: 1;
}

/* Fix for potential transform issues on parents */
:host {
  contain: layout style;
}
`;
// shield styling
const shieldStyles = css`
  /* SHIELD FAB – Always Top-Right, Beautiful & Performant */
  :host .shield-fab {
    position: fixed !important;
    top: 24px !important;
    right: 24px !important;
    width: 64px !important;
    height: 64px !important;
    border-radius: 50% !important;
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
    color: white !important;
    border: none !important;
    cursor: pointer !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 28px !important;
    box-shadow:
      0 8px 25px rgba(239, 68, 68, 0.4),
      0 0 0 4px rgba(239, 68, 68, 0.15) !important;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    z-index: 9999 !important;
    transform: translateZ(0);
    backface-visibility: hidden;
    -webkit-font-smoothing: antialiased;
  }

  :host .shield-fab:hover {
    transform: scale(1.12) translateY(-4px) !important;
    box-shadow:
      0 16px 40px rgba(239, 68, 68, 0.5),
      0 0 0 6px rgba(239, 68, 68, 0.2) !important;
  }

  :host .shield-fab:active {
    transform: scale(1.05) !important;
  }

  :host .shield-fab .fab-label {
    font-size: 9px !important;
    font-weight: 700 !important;
    letter-spacing: 0.5px !important;
    margin-top: 3px !important;
    text-transform: uppercase !important;
  }

  /* Shield Modal Overlay */
  :host .shield-modal-overlay {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    background: rgba(0, 0, 0, 0.75) !important;
    backdrop-filter: blur(8px) !important;
    -webkit-backdrop-filter: blur(8px) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 999999 !important;
    animation: fadeIn 0.2s ease !important;
    padding: 20px !important;
    box-sizing: border-box !important;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  /* Shield Modal Container - Full Height */
  :host .shield-modal-container {
    position: relative !important;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%) !important;
    border-radius: 20px !important;
    width: 95vw !important;
    max-width: 1400px !important;
    height: 90vh !important;
    max-height: 900px !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
    box-shadow:
      0 25px 80px rgba(0, 0, 0, 0.6),
      0 0 0 1px rgba(255, 255, 255, 0.1) !important;
    animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    box-sizing: border-box !important;
  }

  @keyframes slideUp {
    from {
      transform: translateY(50px) scale(0.95);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }

  /* Shield Modal Header */
  :host .shield-modal-header {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    padding: 24px 30px !important;
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
    border-bottom: 2px solid rgba(255, 255, 255, 0.1) !important;
    flex-shrink: 0 !important;
    box-sizing: border-box !important;
  }

  :host .shield-modal-header h2 {
    margin: 0 !important;
    font-size: 24px !important;
    font-weight: 700 !important;
    color: white !important;
    display: flex !important;
    align-items: center !important;
    gap: 12px !important;
  }

  :host .shield-modal-header h2::before {
    content: "🛡️" !important;
    font-size: 28px !important;
  }

  /* Close Button */
  :host .shield-btn-close {
    background: rgba(255, 255, 255, 0.2) !important;
    border: none !important;
    color: white !important;
    font-size: 24px !important;
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;
    min-height: 40px !important;
    border-radius: 50% !important;
    cursor: pointer !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    transition: all 0.3s ease !important;
    padding: 0 !important;
    margin: 0 !important;
    line-height: 1 !important;
    flex-shrink: 0 !important;
    box-sizing: border-box !important;
  }

  :host .shield-btn-close:hover {
    background: rgba(255, 255, 255, 0.3) !important;
    transform: rotate(90deg) scale(1.1) !important;
  }

  :host .shield-btn-close:active {
    transform: rotate(90deg) scale(0.95) !important;
  }

  /* Shield Modal Body - CRITICAL: No padding, full flex */
  :host .shield-modal-body {
    flex: 1 !important;
    overflow: hidden !important;
    display: flex !important;
    flex-direction: column !important;
    padding: 0 !important;
    margin: 0 !important;
    background: transparent !important;
    box-sizing: border-box !important;
    min-height: 0 !important; /* Important for flex scrolling */
  }

  /* Ensure shield-dashboard fills the modal body */
  :host .shield-modal-body shield-dashboard {
    flex: 1 !important;
    display: flex !important;
    flex-direction: column !important;
    width: 100% !important;
    height: 100% !important;
    overflow: auto !important;
    box-sizing: border-box !important;
  }

  /* Mobile: Slightly smaller fab, full screen modal */
  @media (max-width: 768px) {
    :host .shield-fab {
      top: 16px !important;
      right: 16px !important;
      width: 56px !important;
      height: 56px !important;
      font-size: 24px !important;
      box-shadow:
        0 6px 20px rgba(239, 68, 68, 0.4),
        0 0 0 3px rgba(239, 68, 68, 0.15) !important;
    }

    :host .shield-fab .fab-label {
      display: none !important;
    }

    :host .shield-modal-overlay {
      padding: 10px !important;
    }

    :host .shield-modal-container {
      width: 100% !important;
      height: 95vh !important;
      border-radius: 16px !important;
    }

    :host .shield-modal-header {
      padding: 20px !important;
    }

    :host .shield-modal-header h2 {
      font-size: 20px !important;
    }

    :host .shield-modal-header h2::before {
      font-size: 24px !important;
    }

    :host .shield-btn-close {
      width: 36px !important;
      height: 36px !important;
      min-width: 36px !important;
      min-height: 36px !important;
      font-size: 20px !important;
    }
  }

  /* Optional: Pulse animation when shield blocks a command */
  :host .shield-fab.blocked {
    animation: shieldPulse 2s infinite;
  }

  @keyframes shieldPulse {
    0%, 100% {
      box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4),
                  0 0 0 4px rgba(239, 68, 68, 0.15);
    }
    50% {
      box-shadow: 0 8px 25px rgba(239, 68, 68, 0.6),
                  0 0 30px rgba(239, 68, 68, 0.4),
                  0 0 0 8px rgba(239, 68, 68, 0.3);
    }
  }

  /* Prevent body scroll when modal is open */
  :host([shield-modal-open]) body {
    overflow: hidden !important;
  }
`;

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

   /** private renderMainContent(): TemplateResult {
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
        class="shield-fab"
        @click=${this.openShieldDashboard}
        title="Command Shield Dashboard"
      >
        🛡️
        <span class="fab-label">Shield</span>
      </button>
        </div>
      `;
    }**/

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

            <!-- Shield Dashboard Modal - IMPROVED VERSION -->
            ${this.showShieldDashboard ? html`
              <div class="shield-modal-overlay" @click=${this.closeShieldDashboard}>
                <div class="shield-modal-container" @click=${(e: Event) => e.stopPropagation()}>
                  <div class="shield-modal-header">
                    <h2>Command Shield Dashboard</h2>
                    <button class="shield-btn-close" @click=${this.closeShieldDashboard}>×</button>
                  </div>
                  <div class="shield-modal-body">
                    <shield-dashboard></shield-dashboard>
                  </div>
                </div>
              </div>
            ` : nothing}

            <!-- Shield FAB Button -->
            <button
              class="shield-fab ${this.logic.getShieldBlockedCount() ? 'blocked' : ''}"
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