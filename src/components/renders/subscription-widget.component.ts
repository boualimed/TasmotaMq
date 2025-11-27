// subscription-widget.component.ts
// Compact subscription info widget for app header

import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { userSessionManager, UserSession } from '../../services/user-session.manager';
//import { notificationService } from '../../services/notification.service';
import { router } from '../../router.js';
@customElement('subscription-widget')
export class SubscriptionWidget extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    /* Overlay */
    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 98;
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(2px);
      animation: fadeIn 0.2s ease;
    }

    .overlay.visible {
      display: block;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Main Widget Container */
    .subscription-widget {
      position: relative;
      z-index: 99;
    }

    /* Widget Trigger Button */
    .widget-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 16px;
      background: rgba(30, 41, 59, 0.8);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: inherit;
      min-width: 140px;
      position: relative;
      overflow: hidden;
    }

    .widget-trigger::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.1),
        transparent
      );
      transition: left 0.5s;
    }

    .widget-trigger:hover::before {
      left: 100%;
    }

    .widget-trigger:hover {
      border-color: rgba(59, 130, 246, 0.4);
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
    }

    .widget-trigger.open {
      border-color: rgba(59, 130, 246, 0.6);
      background: rgba(30, 41, 59, 0.95);
    }

    /* Tier-specific styling */
    .widget-trigger.free {
      background: linear-gradient(135deg, rgba(148, 163, 184, 0.2) 0%, rgba(100, 116, 139, 0.3) 100%);
    }

    .widget-trigger.basic {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.3) 100%);
    }

    .widget-trigger.pro {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(124, 58, 237, 0.3) 100%);
    }

    .widget-trigger.enterprise {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.3) 100%);
    }

    /* Tier Badge */
    .tier-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
    }

    .tier-icon {
      font-size: 1.2rem;
      transition: transform 0.3s ease;
    }

    .widget-trigger:hover .tier-icon {
      transform: scale(1.1);
    }

    .tier-name {
      font-size: 0.9rem;
      color: #e2e8f0;
      text-transform: capitalize;
      font-weight: 700;
      letter-spacing: 0.3px;
    }

    .dropdown-icon {
      font-size: 0.7rem;
      color: #94a3b8;
      transition: transform 0.3s ease;
    }

    .widget-trigger.open .dropdown-icon {
      transform: rotate(180deg);
      color: #3b82f6;
    }

    /* Dropdown Panel */
    .dropdown-panel {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      background: rgba(30, 41, 59, 0.98);
      backdrop-filter: blur(30px) saturate(180%);
      border-radius: 16px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(148, 163, 184, 0.2);
      min-width: 320px;
      max-width: 380px;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-10px) scale(0.95);
      transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      z-index: 100;
      overflow: hidden;
    }

    .dropdown-panel.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
    }

    /* Panel Header */
    .panel-header {
      padding: 20px 24px;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    }

    .panel-title {
      font-weight: 800;
      font-size: 1.1rem;
      margin-bottom: 4px;
      letter-spacing: 0.5px;
    }

    .panel-subtitle {
      font-size: 0.85rem;
      opacity: 0.9;
      font-weight: 600;
    }

    /* Panel Content */
    .panel-content {
      padding: 0;
    }

    /* Sections */
    .usage-section,
    .features-section {
      padding: 20px 24px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }

    .section-title {
      font-weight: 700;
      font-size: 0.9rem;
      color: #f1f5f9;
      margin-bottom: 16px;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      opacity: 0.8;
    }

    /* Usage Items */
    .usage-item {
      margin-bottom: 16px;
    }

    .usage-item:last-child {
      margin-bottom: 0;
    }

    .usage-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .usage-label {
      font-size: 0.85rem;
      color: #cbd5e1;
      font-weight: 600;
    }

    .usage-value {
      font-size: 0.8rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
    }

    .usage-value.normal {
      color: #10b981;
      background: rgba(16, 185, 129, 0.1);
    }

    .usage-value.warning {
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.1);
    }

    .usage-value.danger {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .usage-value.unlimited {
      color: #8b5cf6;
      background: rgba(139, 92, 246, 0.1);
    }

    /* Progress Bar */
    .progress-bar {
      height: 6px;
      background: rgba(15, 23, 42, 0.8);
      border-radius: 3px;
      overflow: hidden;
      position: relative;
    }

    .progress-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .progress-fill.normal {
      background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
    }

    .progress-fill.warning {
      background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%);
      box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
    }

    .progress-fill.danger {
      background: linear-gradient(90deg, #ef4444 0%, #f87171 100%);
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
    }

    .progress-fill::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
      animation: progressShimmer 2s infinite;
    }

    @keyframes progressShimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    /* Features List */
    .features-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
      color: #cbd5e1;
      transition: all 0.2s ease;
    }

    .feature-item:hover {
      color: #f1f5f9;
      transform: translateX(4px);
    }

    .feature-icon {
      font-size: 0.7rem;
      transition: transform 0.2s ease;
    }

    .feature-item:hover .feature-icon {
      transform: scale(1.2);
    }

    .feature-icon.enabled {
      color: #10b981;
    }

    .feature-icon.disabled {
      color: #64748b;
    }

    /* Panel Actions */
    .panel-actions {
      padding: 20px 24px;
      display: flex;
      gap: 12px;
    }

    .btn {
      flex: 1;
      padding: 12px 16px;
      border: none;
      border-radius: 10px;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: inherit;
      position: relative;
      overflow: hidden;
      letter-spacing: 0.3px;
    }

    .btn::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%, rgba(255, 255, 255, 0.2) 100%);
      transform: translateX(-100%) skewX(-15deg);
      transition: transform 0.6s;
    }

    .btn:hover::before {
      transform: translateX(100%) skewX(-15deg);
    }

    .btn-upgrade {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
      border: 1px solid rgba(99, 102, 241, 0.4);
    }

    .btn-upgrade:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
    }

    .btn-manage {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(148, 163, 184, 0.3);
      color: #cbd5e1;
    }

    .btn-manage:hover {
      background: rgba(59, 130, 246, 0.1);
      border-color: #3b82f6;
      color: #3b82f6;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
    }

    /* Loading State */
    .widget-trigger:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }

    .widget-trigger:disabled:hover::before {
      left: -100%;
    }

    /* Animation for dropdown items */
    .usage-item,
    .feature-item {
      animation: slideIn 0.2s ease-out backwards;
    }

    .usage-item:nth-child(1) { animation-delay: 0.05s; }
    .usage-item:nth-child(2) { animation-delay: 0.1s; }
    .usage-item:nth-child(3) { animation-delay: 0.15s; }
    .feature-item:nth-child(1) { animation-delay: 0.1s; }
    .feature-item:nth-child(2) { animation-delay: 0.15s; }
    .feature-item:nth-child(3) { animation-delay: 0.2s; }
    .feature-item:nth-child(4) { animation-delay: 0.25s; }
    .feature-item:nth-child(5) { animation-delay: 0.3s; }
    .feature-item:nth-child(6) { animation-delay: 0.35s; }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(10px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .dropdown-panel {
        min-width: 300px;
        max-width: 90vw;
        right: -10px;
      }

      .features-list {
        grid-template-columns: 1fr;
      }

      .panel-actions {
        flex-direction: column;
      }

      .widget-trigger {
        min-width: 120px;
        padding: 8px 14px;
      }

      .tier-name {
        font-size: 0.85rem;
      }
    }

    @media (max-width: 480px) {
      .dropdown-panel {
        min-width: 280px;
        right: -20px;
      }

      .panel-header,
      .usage-section,
      .features-section,
      .panel-actions {
        padding: 16px 20px;
      }

      .widget-trigger {
        min-width: 110px;
      }

      .tier-name {
        display: none;
      }

      .tier-badge {
        gap: 6px;
      }
    }

    /* Accessibility */
    .widget-trigger:focus-visible {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }

    .btn:focus-visible {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }

    /* High Contrast Mode Support */
    @media (prefers-contrast: high) {
      .widget-trigger {
        border-width: 2px;
      }

      .dropdown-panel {
        border-width: 2px;
      }

      .btn {
        border-width: 2px;
      }
    }

    /* Reduced Motion Support */
    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  `;

  @state() private session: UserSession | null = null;
  @state() private isOpen = false;

// ✅ CRITICAL FIX: Store unsubscribe function
private sessionUnsubscribe: (() => void) | null = null;


  connectedCallback() {
    super.connectedCallback();

    // Load current session
    this.session = userSessionManager.getCurrentSession();

   // ✅ FIXED: Store unsubscribe function for cleanup
   this.sessionUnsubscribe = userSessionManager.subscribe((session) => {
    this.session = session;
    this.requestUpdate();
  });

  console.log('📊 Subscription widget mounted - session subscribed');
  }

  // ✅ CRITICAL FIX: Clean up subscription on unmount
  disconnectedCallback() {
    super.disconnectedCallback();

    // Unsubscribe from session changes
    if (this.sessionUnsubscribe) {
      this.sessionUnsubscribe();
      this.sessionUnsubscribe = null;
      console.log('🧹 Subscription widget unmounted - session unsubscribed');
    }
  }

  private toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  private closeDropdown() {
    this.isOpen = false;
  }

  private handleUpgrade() {
    this.closeDropdown();
    router.navigate('/subscription');   // Works instantly
  }

  private handleManage() {
    this.closeDropdown();
    this.dispatchEvent(new CustomEvent('navigate-subscription', {
      bubbles: true,
      composed: true
    }));
  }

  private getTierIcon(tier: string): string {
    const icons: Record<string, string> = {
      free: '🆓',
      basic: '⭐',
      pro: '💎',
      enterprise: '👑'
    };
    return icons[tier] || '📦';
  }

  private getUsagePercentage(used: number, quota: number): number {
    if (quota === -1) return 0; // Unlimited
    return Math.min((used / quota) * 100, 100);
  }

  private getUsageStatus(percentage: number): 'normal' | 'warning' | 'danger' {
    if (percentage >= 90) return 'danger';
    if (percentage >= 75) return 'warning';
    return 'normal';
  }

  render() {
    if (!this.session) {
      return html`
        <div class="subscription-widget">
          <button class="widget-trigger free" disabled>
            <span class="tier-badge">
              <span class="tier-icon">⏳</span>
              <span class="tier-name">Loading...</span>
            </span>
          </button>
        </div>
      `;
    }

    const { subscription  } = this.session;
    const tier = subscription.tier;

    return html`
      ${this.isOpen ? html`
        <div class="overlay visible" @click=${this.closeDropdown}></div>
      ` : ''}

      <div class="subscription-widget">
        <button
          class="widget-trigger ${tier} ${this.isOpen ? 'open' : ''}"
          @click=${this.toggleDropdown}  title="Subscription Plan"
        >
          <span class="tier-badge">
            <span class="tier-icon">${this.getTierIcon(tier)}</span>
            <span class="tier-name">${tier}</span>
          </span>
          <span class="dropdown-icon">▼</span>
        </button>

        <div class="dropdown-panel ${this.isOpen ? 'open' : ''}">
          ${this.renderPanelContent()}
        </div>
      </div>
    `;
  }

  private renderPanelContent(): TemplateResult {
    const { subscription, features, usage } = this.session!;

    return html`
      <div class="panel-header">
        <div class="panel-title">
          ${this.getTierIcon(subscription.tier)} ${subscription.tier.toUpperCase()} Plan
        </div>
        <div class="panel-subtitle">
          ${subscription.status === 'active' ? '✅ Active' : '⚠️ ' + subscription.status}
        </div>
      </div>

      <div class="panel-content">
        <!-- Usage Metrics -->
        <div class="usage-section">
          <div class="section-title">📊 Current Usage</div>

          <!-- Devices -->
          ${this.renderUsageItem(
            '📱 Devices',
            usage.devicesCreated,
            features.maxDevices,
            features.maxDevices
          )}

          <!-- MQTT Messages -->
          ${this.renderUsageItem(
            '📡 MQTT Messages',
            usage.mqttMessagesProcessed,
            usage.monthlyQuota.mqttMessages,
            usage.monthlyQuota.mqttMessages
          )}

          <!-- AI Queries (if enabled) -->
          ${features.aiInsights ? this.renderUsageItem(
            '🤖 AI Queries',
            usage.aiQueriesUsed,
            usage.monthlyQuota.aiQueries,
            usage.monthlyQuota.aiQueries
          ) : ''}
        </div>

        <!-- Key Features -->
        <div class="features-section">
          <div class="section-title">⚡ Plan Features</div>
          <div class="features-list">
            ${this.renderFeature('📱 Devices', features.maxDevices === -1 ? 'Unlimited' : `${features.maxDevices} max`)}
            ${this.renderFeature('📜 Rules', features.maxRules === -1 ? 'Unlimited' : `${features.maxRules} max`)}
            ${this.renderFeature('⏰ Timers', features.maxTimers === -1 ? 'Unlimited' : `${features.maxTimers} max`)}
            ${this.renderFeature('🤖 AI Insights', features.aiInsights)}
            ${this.renderFeature('☁️ Cloud Sync', features.cloudSync)}
            ${this.renderFeature('🔌 API Access', features.apiAccess)}
          </div>
        </div>

        <!-- Actions -->
        <div class="panel-actions">
          ${subscription.tier !== 'enterprise' ? html`
            <button class="btn btn-upgrade" @click=${this.handleUpgrade}>
              ⬆️ Upgrade Plan
            </button>
          ` : ''}
          <button class="btn btn-manage" @click=${this.handleManage}>
            ⚙️ Manage
          </button>
        </div>
      </div>
    `;
  }

  private renderUsageItem(
    label: string,
    used: number,
    quota: number,
    maxQuota: number
  ): TemplateResult {
    const isUnlimited = quota === -1;
    const percentage = isUnlimited ? 0 : this.getUsagePercentage(used, quota);
    const status = this.getUsageStatus(percentage);

    return html`
      <div class="usage-item">
        <div class="usage-header">
          <span class="usage-label">${label}</span>
          <span class="usage-value ${isUnlimited ? 'unlimited' : status}">
            ${used.toLocaleString()} ${isUnlimited ? '' : `/ ${quota === maxQuota && quota !== -1 ? quota.toLocaleString() : '∞'}`}
          </span>
        </div>
        ${!isUnlimited ? html`
          <div class="progress-bar">
            <div class="progress-fill ${status}" style="width: ${percentage}%"></div>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderFeature(label: string, enabled: boolean | string): TemplateResult {
    const isEnabled = typeof enabled === 'boolean' ? enabled : true;
    const displayText = typeof enabled === 'string' ? enabled : label;

    return html`
      <div class="feature-item">
        <span class="feature-icon ${isEnabled ? 'enabled' : 'disabled'}">
          ${isEnabled ? '✅' : '❌'}
        </span>
        <span>${displayText}</span>
      </div>
    `;
  }
}