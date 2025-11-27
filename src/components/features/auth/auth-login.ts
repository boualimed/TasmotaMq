// auth-login.ts (Complete with Account Recovery UI)
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { authLoginStyles } from '../../../styles/auth-login.styles';
import { authService } from '../../../services/auth.service';
import { LoginCredentials, RegisterCredentials, RecoveryRequest } from '../../../models/auth.model';

@customElement('auth-login')
export class AuthLogin extends LitElement {
  static styles = authLoginStyles;

  @state() private mode: 'login' | 'register' | 'recover' = 'login';
  @state() private recoveryStep: 'username' | 'method' | 'verify' = 'username';
  @state() private loginData: LoginCredentials = { username: '', password: '' };
  @state() private registerData: RegisterCredentials & {
    securityQuestions?: Array<{ question: string; answer: string }>;
  } = {
    username: '',
    password: '',
    confirmPassword: '',
    securityQuestions: [
      { question: '', answer: '' },
      { question: '', answer: '' }
    ]
  };
  @state() private recoveryData: {
    username: string;
    method?: 'questions' | 'key';
    answers?: string[];
    recoveryKey?: string;
    newPassword: string;
    confirmPassword: string;
  } = {
    username: '',
    answers: ['', ''],
    recoveryKey: '',
    newPassword: '',
    confirmPassword: ''
  };
  @state() private recoveryOptions?: {
    hasSecurityQuestions: boolean;
    hasRecoveryKey: boolean;
    questions?: string[];
  };
  @state() private generatedRecoveryKey?: string;
  @state() private errorMessage = '';
  @state() private successMessage = '';
  @state() private isLoading = false;
  @state() private passwordStrength: 'weak' | 'medium' | 'strong' | '' = '';
  @state() private showRecoveryKeyModal = false;

  private readonly securityQuestionOptions = [
    "What was your first pet's name?",
    "What city were you born in?",
    "What is your mother's maiden name?",
    "What was the name of your first school?",
    "What is your favorite book?",
    "What was your childhood nickname?",
    "What is the name of the street you grew up on?",
    "What was your first car?"
  ];

  private handleInputChange(e: Event, field: string): void {
    const target = e.target as HTMLInputElement;
    const value = target.value;

    if (this.mode === 'login') {
      this.loginData = { ...this.loginData, [field]: value };
    } else if (this.mode === 'register') {
      this.registerData = { ...this.registerData, [field]: value };

      if (field === 'password' && value) {
        this.checkPasswordStrength(value);
      } else if (field === 'password' && !value) {
        this.passwordStrength = '';
      }
    } else if (this.mode === 'recover') {
      if (field.startsWith('answer-')) {
        const index = parseInt(field.split('-')[1]);
        const answers = [...(this.recoveryData.answers || [])];
        answers[index] = value;
        this.recoveryData = { ...this.recoveryData, answers };
      } else {
        this.recoveryData = { ...this.recoveryData, [field]: value };

        if (field === 'newPassword' && value) {
          this.checkPasswordStrength(value);
        } else if (field === 'newPassword' && !value) {
          this.passwordStrength = '';
        }
      }
    }

    this.errorMessage = '';
  }

  private handleSecurityQuestionChange(e: Event, index: number, field: 'question' | 'answer'): void {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const value = target.value;

    const questions = [...(this.registerData.securityQuestions || [])];
    questions[index] = { ...questions[index], [field]: value };
    this.registerData = { ...this.registerData, securityQuestions: questions };
    this.errorMessage = '';
  }

  private checkPasswordStrength(password: string): void {
    let strength = 0;

    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) {
      this.passwordStrength = 'weak';
    } else if (strength <= 4) {
      this.passwordStrength = 'medium';
    } else {
      this.passwordStrength = 'strong';
    }
  }

  private async handleLogin(e: Event): Promise<void> {
    e.preventDefault();

    this.errorMessage = '';
    this.isLoading = true;

    try {
      const result = await authService.login(this.loginData);

      if (result.success) {
        const { router, resolveRouterPath } = await import('../../../router.js');
        router.navigate(resolveRouterPath('device-config'));
      } else {
        this.errorMessage = result.error || 'Login failed';
      }
    } catch (error) {
      this.errorMessage = 'An unexpected error occurred';
    } finally {
      this.isLoading = false;
    }
  }

  private async handleRegister(e: Event): Promise<void> {
    e.preventDefault();

    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    if (this.registerData.password !== this.registerData.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      this.isLoading = false;
      return;
    }

    try {
      const result = await authService.register(this.registerData);

      if (result.success) {
        if (result.recoveryKey) {
          this.generatedRecoveryKey = result.recoveryKey;
          this.showRecoveryKeyModal = true;
        } else {
          this.successMessage = 'Account created successfully! You can now log in.';
          this.resetRegisterForm();
          setTimeout(() => {
            this.mode = 'login';
            this.successMessage = '';
          }, 2000);
        }
      } else {
        this.errorMessage = result.error || 'Registration failed';
      }
    } catch (error) {
      this.errorMessage = 'An unexpected error occurred';
    } finally {
      this.isLoading = false;
    }
  }

  private async handleRecoverySubmit(e: Event): Promise<void> {
    e.preventDefault();

    if (this.recoveryStep === 'username') {
      await this.checkRecoveryOptions();
    } else if (this.recoveryStep === 'verify') {
      await this.submitRecovery();
    }
  }

  private async checkRecoveryOptions(): Promise<void> {
    this.errorMessage = '';
    this.isLoading = true;

    try {
      const options = authService.getRecoveryOptions(this.recoveryData.username);

      if (!options.hasSecurityQuestions && !options.hasRecoveryKey) {
        this.errorMessage = 'No recovery options available for this account';
        this.isLoading = false;
        return;
      }

      this.recoveryOptions = options;
      this.recoveryStep = 'method';
    } catch (error) {
      this.errorMessage = 'An unexpected error occurred';
    } finally {
      this.isLoading = false;
    }
  }

  private selectRecoveryMethod(method: 'questions' | 'key'): void {
    this.recoveryData = { ...this.recoveryData, method };
    this.recoveryStep = 'verify';
    this.errorMessage = '';
  }

  private async submitRecovery(): Promise<void> {
    this.errorMessage = '';
    this.isLoading = true;

    if (this.recoveryData.newPassword !== this.recoveryData.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      this.isLoading = false;
      return;
    }

    try {
      const request: RecoveryRequest = {
        username: this.recoveryData.username,
        method: this.recoveryData.method!,
        answers: this.recoveryData.method === 'questions' ? this.recoveryData.answers : undefined,
        recoveryKey: this.recoveryData.method === 'key' ? this.recoveryData.recoveryKey : undefined
      };

      const result = await authService.recoverAccount(request, this.recoveryData.newPassword);

      if (result.success) {
        this.successMessage = 'Password reset successfully! You can now log in.';
        this.resetRecoveryForm();
        setTimeout(() => {
          this.mode = 'login';
          this.successMessage = '';
        }, 2000);
      } else {
        this.errorMessage = result.error || 'Recovery failed';
      }
    } catch (error) {
      this.errorMessage = 'An unexpected error occurred';
    } finally {
      this.isLoading = false;
    }
  }

  private switchMode(mode: 'login' | 'register'): void {
    this.mode = mode;
    this.errorMessage = '';
    this.successMessage = '';
    this.passwordStrength = '';
    this.resetRecoveryForm();
  }

  private switchToRecovery(): void {
    this.mode = 'recover';
    this.errorMessage = '';
    this.successMessage = '';
    this.resetRecoveryForm();
  }

  private backToLogin(): void {
    this.mode = 'login';
    this.errorMessage = '';
    this.successMessage = '';
    this.resetRecoveryForm();
  }

  private resetRegisterForm(): void {
    this.registerData = {
      username: '',
      password: '',
      confirmPassword: '',
      securityQuestions: [
        { question: '', answer: '' },
        { question: '', answer: '' }
      ]
    };
    this.passwordStrength = '';
  }

  private resetRecoveryForm(): void {
    this.recoveryStep = 'username';
    this.recoveryData = {
      username: '',
      answers: ['', ''],
      recoveryKey: '',
      newPassword: '',
      confirmPassword: ''
    };
    this.recoveryOptions = undefined;
    this.passwordStrength = '';
  }

  private copyRecoveryKey(): void {
    if (this.generatedRecoveryKey) {
      navigator.clipboard.writeText(this.generatedRecoveryKey);
      this.successMessage = 'Recovery key copied to clipboard!';
      setTimeout(() => this.successMessage = '', 2000);
    }
  }

  private downloadRecoveryKey(): void {
    if (!this.generatedRecoveryKey) return;

    const content = `TASMOTA CONTROLLER - RECOVERY KEY
====================================

Username: ${this.registerData.username}
Recovery Key: ${this.generatedRecoveryKey}
Created: ${new Date().toLocaleString()}

⚠️ IMPORTANT: Keep this key safe!
- You will need it to recover your account if you forget your password
- Store it in a secure location (password manager, safe, etc.)
- Do not share this key with anyone

Without this key and your security questions, account recovery is impossible.`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasmota-recovery-${this.registerData.username}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private closeRecoveryKeyModal(): void {
    this.showRecoveryKeyModal = false;
    this.generatedRecoveryKey = undefined;
    this.successMessage = 'Account created successfully! You can now log in.';
    this.resetRegisterForm();
    setTimeout(() => {
      this.mode = 'login';
      this.successMessage = '';
    }, 2000);
  }

  render() {
    return html`
      <div class="auth-container">
        <div class="auth-header">
          <div class="auth-icon">🔐</div>
          <h1>Tasmota Controller</h1>
          <p>Secure access to your smart home</p>
        </div>

        <div class="auth-body">
          ${this.mode === 'recover' ? this.renderRecoveryUI() : html`
            <div class="tab-switcher">
              <button
                class="tab ${this.mode === 'login' ? 'active' : ''}"
                @click="${() => this.switchMode('login')}"
              >
                Login
              </button>
              <button
                class="tab ${this.mode === 'register' ? 'active' : ''}"
                @click="${() => this.switchMode('register')}"
              >
                Register
              </button>
            </div>

            ${this.errorMessage ? html`
              <div class="error-message">${this.errorMessage}</div>
            ` : ''}

            ${this.successMessage ? html`
              <div class="success-message">${this.successMessage}</div>
            ` : ''}

            ${this.mode === 'login' ? this.renderLoginForm() : this.renderRegisterForm()}
          `}
        </div>

        ${this.showRecoveryKeyModal ? this.renderRecoveryKeyModal() : ''}
      </div>
    `;
  }

  private renderLoginForm() {
    return html`
      <form @submit="${this.handleLogin}">
        <div class="form-group">
          <label class="form-label">Username</label>
          <input
            type="text"
            class="form-input"
            placeholder="Enter your username"
            .value="${this.loginData.username}"
            @input="${(e: Event) => this.handleInputChange(e, 'username')}"
            ?disabled="${this.isLoading}"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label">Password</label>
          <input
            type="password"
            class="form-input"
            placeholder="Enter your password"
            .value="${this.loginData.password}"
            @input="${(e: Event) => this.handleInputChange(e, 'password')}"
            ?disabled="${this.isLoading}"
            required
          />
        </div>

        <button
          type="submit"
          class="submit-button"
          ?disabled="${this.isLoading || !this.loginData.username || !this.loginData.password}"
        >
          ${this.isLoading ? html`<span class="loading"></span>` : 'Login'}
        </button>

        <div class="helper-text">
          <a href="#" @click="${(e: Event) => { e.preventDefault(); this.switchToRecovery(); }}">
            Forgot password?
          </a>
        </div>
      </form>
    `;
  }

  private renderRegisterForm() {
    return html`
      <form @submit="${this.handleRegister}">
        <div class="form-group">
          <label class="form-label">Username</label>
          <input
            type="text"
            class="form-input"
            placeholder="Choose a username (min 3 characters)"
            .value="${this.registerData.username}"
            @input="${(e: Event) => this.handleInputChange(e, 'username')}"
            ?disabled="${this.isLoading}"
            required
            minlength="3"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Password</label>
          <input
            type="password"
            class="form-input"
            placeholder="Create a strong password"
            .value="${this.registerData.password}"
            @input="${(e: Event) => this.handleInputChange(e, 'password')}"
            ?disabled="${this.isLoading}"
            required
          />
          ${this.passwordStrength ? html`
            <div class="password-strength ${this.passwordStrength} show">
              Password strength: <strong>${this.passwordStrength.toUpperCase()}</strong>
            </div>
          ` : ''}
          <ul class="password-requirements">
            <li>At least 8 characters</li>
            <li>One uppercase, one lowercase letter</li>
            <li>One number and one special character</li>
          </ul>
        </div>

        <div class="form-group">
          <label class="form-label">Confirm Password</label>
          <input
            type="password"
            class="form-input"
            placeholder="Re-enter your password"
            .value="${this.registerData.confirmPassword}"
            @input="${(e: Event) => this.handleInputChange(e, 'confirmPassword')}"
            ?disabled="${this.isLoading}"
            required
          />
        </div>

        <div class="security-section">
          <h3 class="section-title">🛡️ Security Questions (Optional but Recommended)</h3>
          <p class="section-description">Help recover your account if you forget your password</p>

          ${this.registerData.securityQuestions?.map((qa, index) => html`
            <div class="form-group">
              <label class="form-label">Question ${index + 1}</label>
              <select
                class="form-input"
                .value="${qa.question}"
                @change="${(e: Event) => this.handleSecurityQuestionChange(e, index, 'question')}"
                ?disabled="${this.isLoading}"
              >
                <option value="">Select a question...</option>
                ${this.securityQuestionOptions.map(q => html`
                  <option value="${q}">${q}</option>
                `)}
              </select>
              ${qa.question ? html`
                <input
                  type="text"
                  class="form-input"
                  placeholder="Your answer"
                  .value="${qa.answer}"
                  @input="${(e: Event) => this.handleSecurityQuestionChange(e, index, 'answer')}"
                  ?disabled="${this.isLoading}"
                  style="margin-top: 8px;"
                />
              ` : ''}
            </div>
          `)}
        </div>

        <button
          type="submit"
          class="submit-button"
          ?disabled="${this.isLoading || !this.registerData.username || !this.registerData.password || !this.registerData.confirmPassword}"
        >
          ${this.isLoading ? html`<span class="loading"></span>` : 'Create Account'}
        </button>

        <div class="helper-text">
          Already have an account? Click "Login" above
        </div>
      </form>
    `;
  }

  private renderRecoveryUI() {
    return html`
      <div class="recovery-container">
        <button class="back-button" @click="${this.backToLogin}">
          ← Back to Login
        </button>

        <h2 class="recovery-title">Account Recovery</h2>

        ${this.errorMessage ? html`
          <div class="error-message">${this.errorMessage}</div>
        ` : ''}

        ${this.successMessage ? html`
          <div class="success-message">${this.successMessage}</div>
        ` : ''}

        ${this.recoveryStep === 'username' ? this.renderRecoveryStep1() : ''}
        ${this.recoveryStep === 'method' ? this.renderRecoveryStep2() : ''}
        ${this.recoveryStep === 'verify' ? this.renderRecoveryStep3() : ''}
      </div>
    `;
  }

  private renderRecoveryStep1() {
    return html`
      <form @submit="${this.handleRecoverySubmit}">
        <p class="step-description">Enter your username to see available recovery options</p>

        <div class="form-group">
          <label class="form-label">Username</label>
          <input
            type="text"
            class="form-input"
            placeholder="Enter your username"
            .value="${this.recoveryData.username}"
            @input="${(e: Event) => this.handleInputChange(e, 'username')}"
            ?disabled="${this.isLoading}"
            required
          />
        </div>

        <button
          type="submit"
          class="submit-button"
          ?disabled="${this.isLoading || !this.recoveryData.username}"
        >
          ${this.isLoading ? html`<span class="loading"></span>` : 'Continue'}
        </button>
      </form>
    `;
  }

  private renderRecoveryStep2() {
    return html`
      <div class="recovery-methods">
        <p class="step-description">Choose a recovery method:</p>

        ${this.recoveryOptions?.hasSecurityQuestions ? html`
          <button
            class="recovery-method-button"
            @click="${() => this.selectRecoveryMethod('questions')}"
            ?disabled="${this.isLoading}"
          >
            <div class="method-icon">❓</div>
            <div class="method-content">
              <h3>Security Questions</h3>
              <p>Answer your security questions to reset password</p>
            </div>
          </button>
        ` : ''}

        ${this.recoveryOptions?.hasRecoveryKey ? html`
          <button
            class="recovery-method-button"
            @click="${() => this.selectRecoveryMethod('key')}"
            ?disabled="${this.isLoading}"
          >
            <div class="method-icon">🔑</div>
            <div class="method-content">
              <h3>Recovery Key</h3>
              <p>Use your saved recovery key to reset password</p>
            </div>
          </button>
        ` : ''}
      </div>
    `;
  }

  private renderRecoveryStep3() {
    return html`
      <form @submit="${this.handleRecoverySubmit}">
        ${this.recoveryData.method === 'questions' ? html`
          <p class="step-description">Answer your security questions:</p>

          ${this.recoveryOptions?.questions?.map((question, index) => html`
            <div class="form-group">
              <label class="form-label">${question}</label>
              <input
                type="text"
                class="form-input"
                placeholder="Your answer"
                .value="${this.recoveryData.answers?.[index] || ''}"
                @input="${(e: Event) => this.handleInputChange(e, `answer-${index}`)}"
                ?disabled="${this.isLoading}"
                required
              />
            </div>
          `)}
        ` : html`
          <p class="step-description">Enter your recovery key:</p>

          <div class="form-group">
            <label class="form-label">Recovery Key</label>
            <input
              type="text"
              class="form-input"
              placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
              .value="${this.recoveryData.recoveryKey || ''}"
              @input="${(e: Event) => this.handleInputChange(e, 'recoveryKey')}"
              ?disabled="${this.isLoading}"
              required
            />
          </div>
        `}

        <div class="form-group">
          <label class="form-label">New Password</label>
          <input
            type="password"
            class="form-input"
            placeholder="Create a new password"
            .value="${this.recoveryData.newPassword}"
            @input="${(e: Event) => this.handleInputChange(e, 'newPassword')}"
            ?disabled="${this.isLoading}"
            required
          />
          ${this.passwordStrength ? html`
            <div class="password-strength ${this.passwordStrength} show">
              Password strength: <strong>${this.passwordStrength.toUpperCase()}</strong>
            </div>
          ` : ''}
        </div>

        <div class="form-group">
          <label class="form-label">Confirm New Password</label>
          <input
            type="password"
            class="form-input"
            placeholder="Re-enter your new password"
            .value="${this.recoveryData.confirmPassword}"
            @input="${(e: Event) => this.handleInputChange(e, 'confirmPassword')}"
            ?disabled="${this.isLoading}"
            required
          />
        </div>

        <button
          type="submit"
          class="submit-button"
          ?disabled="${this.isLoading}"
        >
          ${this.isLoading ? html`<span class="loading"></span>` : 'Reset Password'}
        </button>
      </form>
    `;
  }

  private renderRecoveryKeyModal() {
    return html`
      <div class="modal-overlay">
        <div class="modal-content recovery-key-modal">
          <div class="modal-header">
            <h2>⚠️ Save Your Recovery Key</h2>
          </div>

          <div class="modal-body">
            <div class="warning-box">
              <p><strong>IMPORTANT:</strong> This is your only chance to save this key!</p>
              <p>You will need it to recover your account if you forget your password.</p>
            </div>

            <div class="recovery-key-display">
              <code>${this.generatedRecoveryKey}</code>
            </div>

            <div class="modal-actions">
              <button class="action-button primary" @click="${this.downloadRecoveryKey}">
                📥 Download as Text File
              </button>
              <button class="action-button secondary" @click="${this.copyRecoveryKey}">
                📋 Copy to Clipboard
              </button>
            </div>

            <div class="checkbox-group">
              <label>
                <input type="checkbox" id="confirm-saved" />
                <span>I have saved my recovery key in a secure location</span>
              </label>
            </div>
          </div>

          <div class="modal-footer">
            <button
              class="submit-button"
              @click="${this.closeRecoveryKeyModal}"
              ?disabled="${!(this.shadowRoot?.querySelector('#confirm-saved') as HTMLInputElement)?.checked}"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    `;
  }
}