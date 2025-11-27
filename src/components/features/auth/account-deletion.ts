// account-deletion.ts - FIXED with session integration and grace period

import { LitElement, html, TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { authService } from '../../../services/auth.service';
import { userSessionManager } from '../../../services/user-session.manager';
import { router, resolveRouterPath } from '../../../router';
import './deletion-summary.component';
import { deletionStyles } from '../../../styles/account-deletion';

type DeletionStep = 'warning' | 'verify' | 'confirm' | 'processing' | 'success';
type VerificationMethod = 'password' | 'security-question';

@customElement('account-deletion')
export class AccountDeletion extends LitElement {
  static styles = deletionStyles;

  @state() private currentStep: DeletionStep = 'warning';
  @state() private verificationMethod: VerificationMethod = 'password';
  @state() private password = '';
  @state() private securityAnswer = '';
  @state() private confirmText = '';
  @state() private errorMessage = '';
  @state() private isLoading = false;
  @state() private gracePeriodEnds?: Date;
  @state() private deletionSummary?: {
    localStorage: string[];
    firebase?: boolean;
    supabase?: boolean;
  };
  @state() private countdownSeconds = 10; // 🆕 Countdown before redirect
  private countdownInterval: any = null;

  // Get current user info
  private get currentUser() {
    return authService.getCurrentUser();
  }

  // 🆕 Get current session
  private get currentSession() {
    return userSessionManager.getCurrentSession();
  }

  // Get user's first security question (if exists)
  private get securityQuestion(): string | undefined {
    return this.currentUser?.securityQuestions?.[0]?.question;
  }

  // 🆕 Calculate what will be deleted
  private getDeletionSummary(): {
    localStorage: string[];
    firebase?: boolean;
    supabase?: boolean;
    itemCount: number;
  } {
    const session = this.currentSession;
    const items: string[] = [];

    if (session) {
      // Count devices
      if (session.devices.length > 0) {
        items.push(`${session.devices.length} Device${session.devices.length > 1 ? 's' : ''}`);
      }

      // MQTT settings
      if (session.mqttSettings.host) {
        items.push('MQTT Settings');
      }

      // AI config
      if (session.aiConfig?.enabled) {
        items.push('AI Configuration');
      }

      // IndexedDB
      if (session.indexedDBSettings?.enabled) {
        items.push('Sensor History Data');
      }

      // Usage data
      items.push('Usage Statistics');

      // Preferences
      items.push('User Preferences');
    }

    return {
      localStorage: items.length > 0 ? items : ['All user data'],
      firebase: true, // Will be deleted after grace period
      supabase: true, // Will be deleted after grace period
      itemCount: items.length
    };
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  render(): TemplateResult {
    return html`
      <div class="container">
        ${this.renderHeader()}
        ${this.renderContent()}
      </div>
    `;
  }

  private renderHeader(): TemplateResult {
    return html`
      <div class="header">
        <div class="header-icon">⚠️</div>
        <h1>Delete Account</h1>
        <p>This action will schedule your account for permanent deletion</p>
      </div>
    `;
  }

  private renderContent(): TemplateResult {
    switch (this.currentStep) {
      case 'warning':
        return this.renderWarningStep();
      case 'verify':
        return this.renderVerifyStep();
      case 'confirm':
        return this.renderConfirmStep();
      case 'processing':
        return this.renderProcessingStep();
      case 'success':
        return this.renderSuccessStep();
      default:
        return html``;
    }
  }

  // =============================================================================
  // Step 1: Warning
  // =============================================================================

  private renderWarningStep(): TemplateResult {
    const summary = this.getDeletionSummary();

    return html`
      <div class="card">
        <div class="warning-box">
          <div class="warning-title">
            <span>⚠️</span>
            <span>Before You Continue</span>
          </div>
          <ul class="warning-list">
            <li>Your account will be scheduled for deletion</li>
            <li>All devices and configurations will be removed immediately</li>
            <li>MQTT settings and AI configurations will be deleted</li>
            <li>Sensor history data will be erased</li>
            <li>Cloud backups (Firebase/Supabase) will be removed after grace period</li>
            <li><strong>You have 30 days to restore your account</strong></li>
            <li>After 30 days, deletion becomes permanent and irreversible</li>
          </ul>
        </div>

        <!-- 🆕 Show actual deletion summary from session -->
        <deletion-summary
          .deletionSummary="${summary}"
        ></deletion-summary>

        ${summary.itemCount > 0 ? html`
          <div class="info-box" style="margin-top: 16px;">
            <div style="color: #60a5fa; font-weight: 500; margin-bottom: 8px;">
              📦 What happens to your data:
            </div>
            <ul style="color: #cbd5e1; font-size: 0.875rem; line-height: 1.8;">
              <li><strong>Immediately:</strong> All app data removed from your browser</li>
              <li><strong>Within 30 days:</strong> You can restore by logging in</li>
              <li><strong>After 30 days:</strong> All cloud data permanently deleted</li>
            </ul>
          </div>
        ` : ''}

        <div class="button-group">
          <button class="button button-secondary" @click="${this.handleCancel}">
            Cancel
          </button>
          <button class="button button-danger" @click="${this.goToVerifyStep}">
            Continue to Deletion
          </button>
        </div>
      </div>
    `;
  }

  // =============================================================================
  // Step 2: Verify Identity
  // =============================================================================

  private renderVerifyStep(): TemplateResult {
    return html`
      <div class="card">
        <h2 style="color: #f1f5f9; margin-bottom: 24px;">Verify Your Identity</h2>

        ${this.errorMessage ? html`
          <div class="error-message">${this.errorMessage}</div>
        ` : ''}

        <div class="verification-options">
          <div
            class="verification-option ${this.verificationMethod === 'password' ? 'selected' : ''}"
            @click="${() => this.selectVerificationMethod('password')}"
          >
            <div class="verification-icon">🔑</div>
            <div class="verification-title">Use Password</div>
          </div>

          ${this.securityQuestion ? html`
            <div
              class="verification-option ${this.verificationMethod === 'security-question' ? 'selected' : ''}"
              @click="${() => this.selectVerificationMethod('security-question')}"
            >
              <div class="verification-icon">❓</div>
              <div class="verification-title">Security Question</div>
            </div>
          ` : ''}
        </div>

        ${this.verificationMethod === 'password'
          ? this.renderPasswordVerification()
          : this.renderSecurityQuestionVerification()
        }

        <div class="button-group">
          <button class="button button-secondary" @click="${this.goToWarningStep}">
            Back
          </button>
          <button
            class="button button-primary"
            @click="${this.handleVerify}"
            ?disabled="${this.isLoading || !this.isVerificationValid()}"
          >
            ${this.isLoading ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </div>
    `;
  }

  private renderPasswordVerification(): TemplateResult {
    return html`
      <div class="form-group">
        <label class="form-label">Enter Your Password</label>
        <input
          type="password"
          class="form-input ${this.errorMessage ? 'error' : ''}"
          placeholder="Enter your current password"
          .value="${this.password}"
          @input="${(e: Event) => {
            this.password = (e.target as HTMLInputElement).value;
            this.errorMessage = '';
          }}"
          @keyup="${(e: KeyboardEvent) => {
            if (e.key === 'Enter' && this.isVerificationValid()) {
              this.handleVerify();
            }
          }}"
          ?disabled="${this.isLoading}"
        />
        <div class="help-text">
          We need to verify your identity before proceeding
        </div>
      </div>
    `;
  }

  private renderSecurityQuestionVerification(): TemplateResult {
    return html`
      <div class="form-group">
        <label class="form-label">${this.securityQuestion}</label>
        <input
          type="text"
          class="form-input ${this.errorMessage ? 'error' : ''}"
          placeholder="Enter your answer"
          .value="${this.securityAnswer}"
          @input="${(e: Event) => {
            this.securityAnswer = (e.target as HTMLInputElement).value;
            this.errorMessage = '';
          }}"
          @keyup="${(e: KeyboardEvent) => {
            if (e.key === 'Enter' && this.isVerificationValid()) {
              this.handleVerify();
            }
          }}"
          ?disabled="${this.isLoading}"
        />
        <div class="help-text">
          Answer your security question to verify your identity
        </div>
      </div>
    `;
  }

  // =============================================================================
  // Step 3: Final Confirmation
  // =============================================================================

  private renderConfirmStep(): TemplateResult {
    return html`
      <div class="card">
        <h2 style="color: #fca5a5; margin-bottom: 24px;">⚠️ FINAL CONFIRMATION</h2>

        ${this.errorMessage ? html`
          <div class="error-message">${this.errorMessage}</div>
        ` : ''}

        <div class="warning-box">
          <div class="warning-title">
            This action cannot be easily undone
          </div>
          <p style="color: #fecaca; margin-top: 12px;">
            Your account will be scheduled for permanent deletion in 30 days.
            You can restore it during this grace period by logging in again.
          </p>
        </div>

        <div class="form-group">
          <label class="form-label">
            Type <strong style="color: #ef4444;">DELETE</strong> to confirm
          </label>
          <input
            type="text"
            class="form-input ${this.errorMessage ? 'error' : ''}"
            placeholder="Type DELETE in capital letters"
            .value="${this.confirmText}"
            @input="${(e: Event) => {
              this.confirmText = (e.target as HTMLInputElement).value;
              this.errorMessage = '';
            }}"
            @keyup="${(e: KeyboardEvent) => {
              if (e.key === 'Enter' && this.confirmText === 'DELETE') {
                this.handleDelete();
              }
            }}"
            ?disabled="${this.isLoading}"
          />
          <div class="help-text">
            This confirms you understand the consequences
          </div>
        </div>

        <div class="button-group">
          <button class="button button-secondary" @click="${this.goToVerifyStep}">
            Back
          </button>
          <button
            class="button button-danger"
            @click="${this.handleDelete}"
            ?disabled="${this.isLoading || this.confirmText !== 'DELETE'}"
          >
            ${this.isLoading ? 'Deleting...' : 'Delete My Account'}
          </button>
        </div>
      </div>
    `;
  }

  // =============================================================================
  // Step 3.5: Processing (NEW)
  // =============================================================================

  private renderProcessingStep(): TemplateResult {
    return html`
      <div class="card">
        <div class="processing-box">
          <div class="spinner-large"></div>
          <h2 style="color: #f1f5f9; margin-top: 24px;">Processing Deletion...</h2>
          <p style="color: #94a3b8; margin-top: 12px;">
            Please wait while we schedule your account for deletion
          </p>
        </div>
      </div>
    `;
  }

  // =============================================================================
  // Step 4: Success (ENHANCED)
  // =============================================================================

  private renderSuccessStep(): TemplateResult {
    return html`
      <div class="card">
        <div class="success-box">
          <div class="success-icon">✅</div>
          <div class="success-title">Account Scheduled for Deletion</div>

          ${this.gracePeriodEnds ? html`
            <div class="grace-period-box">
              <div class="grace-period-label">
                🕒 You can restore your account until:
              </div>
              <div class="grace-period-date">
                ${this.gracePeriodEnds.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              <div class="grace-period-time">
                at ${this.gracePeriodEnds.toLocaleTimeString()}
              </div>
              <div class="grace-period-days">
                (30 days from now)
              </div>
            </div>
          ` : ''}

          ${this.deletionSummary ? html`
            <div class="deletion-summary-box">
              <div class="summary-title">✓ What was deleted:</div>
              <ul class="summary-list">
                ${this.deletionSummary.localStorage.map(item => html`
                  <li>📦 ${item}</li>
                `)}
              </ul>
              <div class="summary-note">
                Cloud backups will be removed after the grace period expires
              </div>
            </div>
          ` : ''}

          <div class="info-box" style="margin-top: 24px;">
            <div class="info-title">📋 What happens next:</div>
            <ul class="info-list">
              <li><strong>Right now:</strong> You'll be logged out</li>
              <li><strong>Within 30 days:</strong> Log in to restore your account</li>
              <li><strong>After 30 days:</strong> Account and all data permanently deleted</li>
            </ul>
          </div>

          <div class="warning-box" style="margin-top: 24px;">
            <div style="color: #fcd34d; font-weight: 500; margin-bottom: 8px;">
              ⚠️ Important:
            </div>
            <p style="color: #fde68a; font-size: 0.875rem;">
              Save your login credentials! You'll need them to restore your account
              within the next 30 days.
            </p>
          </div>

          <!-- 🆕 Countdown timer -->
          <div class="countdown-box">
            <div class="countdown-text">
              Redirecting to login page in:
            </div>
            <div class="countdown-number">
              ${this.countdownSeconds}
            </div>
            <div class="countdown-label">seconds</div>
          </div>

          <div class="button-group" style="margin-top: 24px;">
            <button
              class="button button-primary"
              @click="${this.handleGoToLogin}"
            >
              Go to Login Now
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // =============================================================================
  // Event Handlers
  // =============================================================================

  private goToWarningStep(): void {
    this.currentStep = 'warning';
    this.errorMessage = '';
  }

  private goToVerifyStep(): void {
    this.currentStep = 'verify';
    this.errorMessage = '';
  }

  private goToConfirmStep(): void {
    this.currentStep = 'confirm';
    this.errorMessage = '';
  }

  private selectVerificationMethod(method: VerificationMethod): void {
    this.verificationMethod = method;
    this.errorMessage = '';
  }

  private isVerificationValid(): boolean {
    if (this.verificationMethod === 'password') {
      return this.password.length > 0;
    } else {
      return this.securityAnswer.length > 0;
    }
  }

  private async handleVerify(): Promise<void> {
    if (!this.isVerificationValid()) return;

    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Verify password (simplified - actual verification happens during deletion)
      if (this.verificationMethod === 'password') {
        const result = await authService.login({
          username: this.currentUser!.username,
          password: this.password
        });

        if (!result.success) {
          this.errorMessage = 'Invalid password';
          this.isLoading = false;
          return;
        }
      }

      // Move to confirmation step
      this.goToConfirmStep();
    } catch (error: any) {
      this.errorMessage = error.message || 'Verification failed';
    } finally {
      this.isLoading = false;
    }
  }

  private async handleDelete(): Promise<void> {
    if (this.confirmText !== 'DELETE') {
      this.errorMessage = 'Please type DELETE exactly as shown';
      return;
    }

    this.currentStep = 'processing';
    this.isLoading = true;
    this.errorMessage = '';

    try {
      console.log('🗑️ Starting account deletion process...');

      // 🆕 Call the deletion service with proper parameters
      const result = await authService.deleteAccount({
        password: this.verificationMethod === 'password' ? this.password : undefined,
        securityAnswer: this.verificationMethod === 'security-question' ? this.securityAnswer : undefined,
        confirmText: 'DELETE'
      });

      console.log('🗑️ Deletion result:', result);

      if (result.success) {
        this.gracePeriodEnds = result.gracePeriodEnds;
        this.deletionSummary = result.deletionSummary;

        console.log('✅ Deletion scheduled successfully');
        console.log('📅 Grace period ends:', this.gracePeriodEnds);
        console.log('📦 Deletion summary:', this.deletionSummary);

        // Move to success step
        this.currentStep = 'success';

        // 🆕 Start countdown timer
        this.startCountdown();
      } else {
        this.currentStep = 'confirm';
        this.errorMessage = result.error || 'Deletion failed';
      }
    } catch (error: any) {
      console.error('❌ Deletion error:', error);
      this.currentStep = 'confirm';
      this.errorMessage = error.message || 'An unexpected error occurred';
    } finally {
      this.isLoading = false;
    }
  }

  // 🆕 Start countdown timer
  private startCountdown(): void {
    this.countdownSeconds = 10;

    this.countdownInterval = setInterval(() => {
      this.countdownSeconds--;

      if (this.countdownSeconds <= 0) {
        clearInterval(this.countdownInterval);
        this.handleGoToLogin();
      }
    }, 1000);
  }

  private handleCancel(): void {
    if (confirm('Are you sure you want to cancel? No changes will be made.')) {
      router.navigate(resolveRouterPath('device-config'));
    }
  }

  private handleGoToLogin(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    // User is already logged out by the deletion process
    router.navigate(resolveRouterPath('login'));
  }
}