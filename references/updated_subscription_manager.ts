// subscription-manager.component.ts
// UPDATED: Integrated with Konnect payment flow

import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { userSessionManager, UserSession } from '../../services/user-session.manager';
import { authService } from '../../services/auth.service';
import { notificationService } from '../../services/notification.service';
import { paymentHandler } from '../handlers/payment-handler';
import { SUBSCRIPTION_PRICES } from '../../models/payment.model';
import { subscriptionStyles } from '../../styles/subscription-mg.styles';

@customElement('subscription-manager')
export class SubscriptionManagerComponent extends LitElement {

  static styles = subscriptionStyles;

  @state() private session: UserSession | null = null;
  @state() private showUpgradeModal = false;
  @state() private selectedTier: 'basic' | 'pro' | 'enterprise' | null = null;
  @state() private selectedDuration: 'monthly' | 'yearly' = 'monthly';
  @state() private isLoading = true;
  @state() private errorMessage = '';
  @state() private paymentHistory: any[] = [];
  @state() private showHistory = false;

  async connectedCallback() {
    super.connectedCallback();
    await this.initializeSession();

    // Subscribe to session changes
    userSessionManager.subscribe((session) => {
      this.session = session;
      this.isLoading = false;
      this.requestUpdate();
    });

    // Check if returning from payment
    this.checkPaymentReturn();
  }

  private async initializeSession() {
    try {
      const user = authService.getCurrentUser();

      if (!user) {
        this.errorMessage = 'No user logged in. Please log in first.';
        this.isLoading = false;
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }

      let session = userSessionManager.restoreSession();

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

  private checkPaymentReturn() {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const orderId = urlParams.get('orderId');
    const paymentRef = urlParams.get('payment_ref');

    if (status && orderId && paymentRef) {
      paymentHandler.handlePaymentReturn(
        status as 'success' | 'failed',
        orderId,
        paymentRef
      );
      
      // Clean URL
      window.history.replaceState({}, '', '/subscription');
    }
  }

  private handleUpgrade(tier: 'basic' | 'pro' | 'enterprise') {
    this.selectedTier = tier;
    this.selectedDuration = 'monthly';
    this.showUpgradeModal = true;
  }

  private async confirmUpgrade() {
    if (!this.selectedTier) return;

    try {
      // Close modal
      this.showUpgradeModal = false;

      // Start payment flow (will redirect to Konnect)
      await paymentHandler.startPayment(this.selectedTier, this.selectedDuration);

    } catch (error: any) {
      notificationService.error(`Failed to start payment: ${error.message}`, 4000);
      this.selectedTier = null;
    }
  }

  private cancelUpgrade() {
    this.showUpgradeModal = false;
    this.selectedTier = null;
  }

  private async loadPaymentHistory() {
    this.paymentHistory = await paymentHandler.getPaymentHistory();
    this.showHistory = true;
  }

  private formatDate(date?: Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  private getUsagePercentage(used: number, quota: number): number {
    if (quota === -1) return 0;
    return Math.min((used / quota) * 100, 100);
  }

  private formatPrice(tier: 'basic' | 'pro' | 'enterprise', duration: 'monthly' | 'yearly'): string {
    const millimes = SUBSCRIPTION_PRICES[tier][duration];
    const tnd = millimes / 1000;
    return `${tnd.toFixed(0)} TND`;
  }

  render() {
    if (this.isLoading) {
      return html`
        <div class="loading">
          <p>⏳ Loading session...</p>
        </div>
      `;
    }

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

    return html`
      <div class="subscription-container">
        <h2>💳 Subscription Management</h2>

        ${this.renderCurrentPlan()}
        ${this.renderUsageMetrics()}
        ${this.renderFeatureComparison()}
        ${this.showUpgradeModal ? this.renderUpgradeModal() : ''}
        ${this.showHistory ? this.renderPaymentHistory() : ''}
      </div>
    `;
  }

  private renderCurrentPlan() {
    const { subscription, features } = this.session!;

    return html`
      <div class="current-plan-card">
        <div class="plan-header">
          <h3>Current Plan: ${subscription.tier.toUpperCase()}</h3>
          <button class="btn-history" @click=${this.loadPaymentHistory}>
            📋 Payment History
          </button>
        </div>
        
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
            <span>${usage.mqttMessagesProcessed.toLocaleString()} / ${usage.monthlyQuota.mqttMessages === -1 ? '∞' : usage.monthlyQuota.mqttMessages.toLocaleString()}</span>
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
        <p class="payment-info">🇹🇳 Secure payment powered by <strong>Konnect</strong></p>

        <div class="pricing-cards">
          ${this.renderPricingCard('free', currentTier)}
          ${this.renderPricingCard('basic', currentTier)}
          ${this.renderPricingCard('pro', currentTier)}
          ${this.renderPricingCard('enterprise', currentTier)}
        </div>
      </div>
    `;
  }

  private renderPricingCard(tier: 'free' | 'basic' | 'pro' | 'enterprise', currentTier: string) {
    const features = {
      free: ['5 Devices', '3 Rules', '5 Timers', 'Basic Analytics'],
      basic: ['20 Devices', '10 Rules', '20 Timers', 'Advanced Analytics', 'Cloud Sync'],
      pro: ['100 Devices', '50 Rules', '100 Timers', 'All Basic +', 'AI Insights', 'API Access', 'Priority Support'],
      enterprise: ['Unlimited Devices', 'Unlimited Rules', 'Unlimited Timers', 'All Pro +', 'White Label', 'Dedicated Manager']
    };

    const isCurrent = currentTier === tier;
    const isRecommended = (currentTier === 'free' && tier === 'basic') || (currentTier === 'basic' && tier === 'pro');

    return html`
      <div class="pricing-card ${isCurrent ? 'current' : ''} ${isRecommended ? 'recommended' : ''}">
        ${isRecommended ? html`<div class="badge">Recommended</div>` : ''}
        
        <h4>${tier.charAt(0).toUpperCase() + tier.slice(1)}</h4>
        
        ${tier !== 'free' ? html`
          <div class="price">
            ${this.formatPrice(tier as 'basic' | 'pro' | 'enterprise', 'monthly')}
            <span>/month</span>
          </div>
        ` : html`
          <div class="price">Free<span>Forever</span></div>
        `}

        <ul class="features-list">
          ${features[tier].map(feature => html`<li>✅ ${feature}</li>`)}
        </ul>

        ${isCurrent ? html`
          <button class="btn-current" disabled>Current Plan</button>
        ` : tier !== 'free' ? html`
          <button class="btn-upgrade" @click=${() => this.handleUpgrade(tier as 'basic' | 'pro' | 'enterprise')}>
            Upgrade Now
          </button>
        ` : ''}
      </div>
    `;
  }

  private renderUpgradeModal() {
    const tier = this.selectedTier!;

    return html`
      <div class="modal-overlay" @click=${this.cancelUpgrade}>
        <div class="modal-content" @click=${(e: Event) => e.stopPropagation()}>
          <h3>🎉 Upgrade to ${tier.toUpperCase()}</h3>

          <div class="billing-toggle">
            <button 
              class="toggle-btn ${this.selectedDuration === 'monthly' ? 'active' : ''}"
              @click=${() => this.selectedDuration = 'monthly'}
            >
              Monthly
            </button>
            <button 
              class="toggle-btn ${this.selectedDuration === 'yearly' ? 'active' : ''}"
              @click=${() => this.selectedDuration = 'yearly'}
            >
              Yearly <span class="discount">-10%</span>
            </button>
          </div>

          <div class="upgrade-summary">
            <p>You're upgrading to the <strong>${tier}</strong> plan.</p>
            <div class="price-summary">
              <span class="amount">${this.formatPrice(tier, this.selectedDuration)}</span>
              <span class="period">/${this.selectedDuration === 'monthly' ? 'month' : 'year'}</span>
            </div>
            <p class="billing-info">
              💳 Secure payment via <strong>Konnect</strong> (supports Tunisian & international cards)
            </p>
          </div>

          <div class="modal-actions">
            <button class="btn-confirm" @click=${this.confirmUpgrade}>
              Proceed to Payment
            </button>
            <button class="btn-cancel" @click=${this.cancelUpgrade}>
              Cancel
            </button>
          </div>

          <p class="terms">
            <small>By continuing, you agree to our Terms of Service and Privacy Policy.</small>
          </p>
        </div>
      </div>
    `;
  }

  private renderPaymentHistory() {
    return html`
      <div class="modal-overlay" @click=${() => this.showHistory = false}>
        <div class="modal-content history-modal" @click=${(e: Event) => e.stopPropagation()}>
          <h3>📋 Payment History</h3>
          
          ${this.paymentHistory.length === 0 ? html`
            <p class="no-history">No payment history yet.</p>
          ` : html`
            <table class="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${this.paymentHistory.map(payment => html`
                  <tr>
                    <td>${this.formatDate(payment.createdAt)}</td>
                    <td>${payment.tier.toUpperCase()}</td>
                    <td>${(payment.amount / 1000).toFixed(2)} TND</td>
                    <td>
                      <span class="status-badge ${payment.status}">
                        ${payment.status}
                      </span>
                    </td>
                  </tr>
                `)}
              </tbody>
            </table>
          `}
          
          <button class="btn-close" @click=${() => this.showHistory = false}>
            Close
          </button>
        </div>
      </div>
    `;
  }
}
