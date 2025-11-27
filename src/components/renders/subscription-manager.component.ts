// subscription-manager.component.ts
// FIXED: Proper session initialization and error handling

import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { userSessionManager, UserSession } from '../../services/user-session.manager';
import { authService } from '../../services/auth.service';
import { notificationService } from '../../services/notification.service';
import { subscriptionStyles } from '../../styles/subscription-mg.styles';

@customElement('subscription-manager')
export class SubscriptionManagerComponent extends LitElement {

  static styles = subscriptionStyles;

  @state() private session: UserSession | null = null;
  @state() private showUpgradeModal = false;
  @state() private selectedTier: 'basic' | 'pro' | 'enterprise' | null = null;
  @state() private isLoading = true;
  @state() private errorMessage = '';

  async connectedCallback() {
    super.connectedCallback();
    await this.initializeSession();

    // Subscribe to session changes
    userSessionManager.subscribe((session) => {
      this.session = session;
      this.isLoading = false;
      this.requestUpdate();
    });
  }

  private async initializeSession() {
    try {
      // 1. Check if user is logged in
      const user = authService.getCurrentUser();

      if (!user) {
        this.errorMessage = 'No user logged in. Please log in first.';
        this.isLoading = false;

        // Redirect to login after 2 seconds
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }

      // 2. Try to restore existing session
      let session = userSessionManager.restoreSession();

      // 3. If no session exists, initialize a new one
      if (!session) {
        console.log('🆕 No existing session, initializing new session...');
        session = userSessionManager.initializeSession(user);
      }

      this.session = session;
      this.isLoading = false;

      console.log('✅ Session loaded:', {
        user: session.username,
        tier: session.subscription.tier
      });

    } catch (error: any) {
      console.error('❌ Session initialization failed:', error);
      this.errorMessage = `Failed to load session: ${error.message}`;
      this.isLoading = false;
    }
  }

  private handleUpgrade(tier: 'basic' | 'pro' | 'enterprise') {
    this.selectedTier = tier;
    this.showUpgradeModal = true;
  }

  private async confirmUpgrade() {
    if (!this.selectedTier) return;

    try {
      userSessionManager.upgradeSubscription(this.selectedTier);
      notificationService.success(`🎉 Upgraded to ${this.selectedTier} plan!`, 4000);
      this.showUpgradeModal = false;
      this.selectedTier = null;

      // Refresh session
      this.session = userSessionManager.getCurrentSession();
      this.requestUpdate();
    } catch (error: any) {
      notificationService.error(`Failed to upgrade: ${error.message}`, 4000);
    }
  }

  private cancelUpgrade() {
    this.showUpgradeModal = false;
    this.selectedTier = null;
  }

  private formatDate(date?: Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }

  private getUsagePercentage(used: number, quota: number): number {
    if (quota === -1) return 0; // Unlimited
    return Math.min((used / quota) * 100, 100);
  }

  render() {
    // Show loading state
    if (this.isLoading) {
      return html`
        <div class="loading">
          <p>⏳ Loading session...</p>
        </div>
      `;
    }

    // Show error state
    if (this.errorMessage) {
      return html`
        <div class="subscription-container">
          <div class="error-message">
            <h3>❌ Error</h3>
            <p>${this.errorMessage}</p>
            <button @click=${() => window.location.href = '/login'}>
              Go to Login
            </button>
          </div>
        </div>
      `;
    }

    // Show "no session" state
    if (!this.session) {
      return html`
        <div class="subscription-container">
          <div class="error-message">
            <h3>⚠️ No Session</h3>
            <p>No active session found. Please log in.</p>
            <button @click=${() => window.location.href = '/login'}>
              Go to Login
            </button>
          </div>
        </div>
      `;
    }

    // Normal render with session
    return html`
      <div class="subscription-container">
        <h2>💳 Subscription Management</h2>

        ${this.renderCurrentPlan()}
        ${this.renderUsageMetrics()}
        ${this.renderFeatureComparison()}
        ${this.showUpgradeModal ? this.renderUpgradeModal() : ''}
      </div>
    `;
  }

  private renderCurrentPlan() {
    const { subscription, features } = this.session!;

    return html`
      <div class="current-plan-card">
        <h3>Current Plan: ${subscription.tier.toUpperCase()}</h3>
        <div class="plan-status">
          <span class="status-badge ${subscription.status}">
            ${subscription.status}
          </span>
          ${subscription.endDate ? html`
            <span>Expires: ${this.formatDate(subscription.endDate)}</span>
          ` : ''}
        </div>

        <div class="plan-features">
          <h4>Your Features:</h4>
          <ul>
            <li>📱 Devices: ${features.maxDevices === -1 ? 'Unlimited' : features.maxDevices}</li>
            <li>📜 Rules: ${features.maxRules === -1 ? 'Unlimited' : features.maxRules}</li>
            <li>⏰ Timers: ${features.maxTimers === -1 ? 'Unlimited' : features.maxTimers}</li>
            <li>📊 Advanced Analytics: ${features.advancedAnalytics ? '✅' : '❌'}</li>
            <li>🤖 AI Insights: ${features.aiInsights ? '✅' : '❌'}</li>
            <li>☁️ Cloud Sync: ${features.cloudSync ? '✅' : '❌'}</li>
            <li>🔌 API Access: ${features.apiAccess ? '✅' : '❌'}</li>
            <li>🎨 Custom Integrations: ${features.customIntegrations ? '✅' : '❌'}</li>
            <li>🎯 Priority Support: ${features.prioritySupport ? '✅' : '❌'}</li>
            <li>🏷️ White Label: ${features.whiteLabel ? '✅' : '❌'}</li>
          </ul>
        </div>
      </div>
    `;
  }

  private renderUsageMetrics() {
    const { usage, features } = this.session!;

    return html`
      <div class="usage-metrics-card">
        <h3>📊 Usage This Month</h3>

        <div class="metric">
          <div class="metric-header">
            <span>Devices</span>
            <span>${usage.devicesCreated} / ${features.maxDevices === -1 ? '∞' : features.maxDevices}</span>
          </div>
          ${features.maxDevices !== -1 ? html`
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${this.getUsagePercentage(usage.devicesCreated, features.maxDevices)}%"></div>
            </div>
          ` : ''}
        </div>

        <div class="metric">
          <div class="metric-header">
            <span>MQTT Messages</span>
            <span>${usage.mqttMessagesProcessed} / ${usage.monthlyQuota.mqttMessages === -1 ? '∞' : usage.monthlyQuota.mqttMessages}</span>
          </div>
          ${usage.monthlyQuota.mqttMessages !== -1 ? html`
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${this.getUsagePercentage(usage.mqttMessagesProcessed, usage.monthlyQuota.mqttMessages)}%"></div>
            </div>
          ` : ''}
        </div>

        ${features.aiInsights ? html`
          <div class="metric">
            <div class="metric-header">
              <span>AI Queries</span>
              <span>${usage.aiQueriesUsed} / ${usage.monthlyQuota.aiQueries === -1 ? '∞' : usage.monthlyQuota.aiQueries}</span>
            </div>
            ${usage.monthlyQuota.aiQueries !== -1 ? html`
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${this.getUsagePercentage(usage.aiQueriesUsed, usage.monthlyQuota.aiQueries)}%"></div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <div class="metric">
          <div class="metric-header">
            <span>Storage Used</span>
            <span>${(usage.storageUsed / (1024 * 1024)).toFixed(2)} MB</span>
          </div>
        </div>

        <div class="reset-info">
          <small>Usage resets on: ${this.formatDate(new Date(new Date(usage.lastReset).setMonth(new Date(usage.lastReset).getMonth() + 1)))}</small>
        </div>
      </div>
    `;
  }

  private renderFeatureComparison() {
    const currentTier = this.session!.subscription.tier;

    return html`
      <div class="pricing-table">
        <h3>💎 Upgrade Your Plan</h3>

        <div class="pricing-cards">
          <!-- Free Plan -->
          <div class="pricing-card ${currentTier === 'free' ? 'current' : ''}">
            <h4>Free</h4>
            <div class="price">$0<span>/month</span></div>
            <ul class="features-list">
              <li>✅ 5 Devices</li>
              <li>✅ 3 Rules</li>
              <li>✅ 5 Timers</li>
              <li>✅ Basic Analytics</li>
              <li>❌ AI Insights</li>
              <li>❌ Cloud Sync</li>
              <li>❌ API Access</li>
            </ul>
            ${currentTier === 'free' ? html`
              <button class="btn-current" disabled>Current Plan</button>
            ` : ''}
          </div>

          <!-- Basic Plan -->
          <div class="pricing-card ${currentTier === 'basic' ? 'current' : ''} ${currentTier === 'free' ? 'recommended' : ''}">
            ${currentTier === 'free' ? html`<div class="badge">Recommended</div>` : ''}
            <h4>Basic</h4>
            <div class="price">$9<span>/month</span></div>
            <ul class="features-list">
              <li>✅ 20 Devices</li>
              <li>✅ 10 Rules</li>
              <li>✅ 20 Timers</li>
              <li>✅ Advanced Analytics</li>
              <li>❌ AI Insights</li>
              <li>✅ Cloud Sync</li>
              <li>❌ API Access</li>
            </ul>
            ${currentTier === 'basic' ? html`
              <button class="btn-current" disabled>Current Plan</button>
            ` : currentTier === 'free' ? html`
              <button class="btn-upgrade" @click=${() => this.handleUpgrade('basic')}>
                Upgrade Now
              </button>
            ` : ''}
          </div>

          <!-- Pro Plan -->
          <div class="pricing-card ${currentTier === 'pro' ? 'current' : ''} ${currentTier === 'basic' ? 'recommended' : ''}">
            ${currentTier === 'basic' ? html`<div class="badge">Recommended</div>` : ''}
            <h4>Pro</h4>
            <div class="price">$29<span>/month</span></div>
            <ul class="features-list">
              <li>✅ 100 Devices</li>
              <li>✅ 50 Rules</li>
              <li>✅ 100 Timers</li>
              <li>✅ Advanced Analytics</li>
              <li>✅ AI Insights</li>
              <li>✅ Cloud Sync</li>
              <li>✅ API Access</li>
              <li>✅ Custom Integrations</li>
              <li>✅ Priority Support</li>
            </ul>
            ${currentTier === 'pro' ? html`
              <button class="btn-current" disabled>Current Plan</button>
            ` : currentTier !== 'enterprise' ? html`
              <button class="btn-upgrade" @click=${() => this.handleUpgrade('pro')}>
                Upgrade Now
              </button>
            ` : ''}
          </div>

          <!-- Enterprise Plan -->
          <div class="pricing-card ${currentTier === 'enterprise' ? 'current' : ''}">
            <h4>Enterprise</h4>
            <div class="price">$99<span>/month</span></div>
            <ul class="features-list">
              <li>✅ Unlimited Devices</li>
              <li>✅ Unlimited Rules</li>
              <li>✅ Unlimited Timers</li>
              <li>✅ Advanced Analytics</li>
              <li>✅ AI Insights</li>
              <li>✅ Cloud Sync</li>
              <li>✅ API Access</li>
              <li>✅ Custom Integrations</li>
              <li>✅ Priority Support</li>
              <li>✅ White Label</li>
              <li>✅ Dedicated Account Manager</li>
            </ul>
            ${currentTier === 'enterprise' ? html`
              <button class="btn-current" disabled>Current Plan</button>
            ` : html`
              <button class="btn-upgrade" @click=${() => this.handleUpgrade('enterprise')}>
                Upgrade Now
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }

  private renderUpgradeModal() {
    const tier = this.selectedTier!;
    const prices = { basic: 9, pro: 29, enterprise: 99 };

    return html`
      <div class="modal-overlay" @click=${this.cancelUpgrade}>
        <div class="modal-content" @click=${(e: Event) => e.stopPropagation()}>
          <h3>🎉 Upgrade to ${tier.toUpperCase()}</h3>

          <div class="upgrade-summary">
            <p>You're upgrading to the <strong>${tier}</strong> plan.</p>
            <div class="price-summary">
              <span class="amount">$${prices[tier]}</span>
              <span class="period">/month</span>
            </div>
            <p class="billing-info">
              💳 You will be charged immediately. Your subscription will auto-renew monthly.
            </p>
          </div>

          <div class="modal-actions">
            <button class="btn-confirm" @click=${this.confirmUpgrade}>
              Confirm Upgrade
            </button>
            <button class="btn-cancel" @click=${this.cancelUpgrade}>
              Cancel
            </button>
          </div>

          <p class="terms">
            <small>By confirming, you agree to our Terms of Service and Privacy Policy.</small>
          </p>
        </div>
      </div>
    `;
  }
}

