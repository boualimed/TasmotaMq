// auth-login.ts (completed and fixed: fixed typos in renderLoginForm, completed renderRegisterForm, added password match check in handleRegister for safety)
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { authLoginStyles } from '../styles/auth-login.styles';
import { authService } from '../services/auth.service';
import { LoginCredentials, RegisterCredentials } from '../models/auth.model';

@customElement('auth-login')
export class AuthLogin extends LitElement {
  static styles = authLoginStyles;

  @state() private mode: 'login' | 'register' = 'login';
  @state() private loginData: LoginCredentials = { username: '', password: '' };
  @state() private registerData: RegisterCredentials = { username: '', password: '', confirmPassword: '' };
  @state() private errorMessage = '';
  @state() private successMessage = '';
  @state() private isLoading = false;
  @state() private passwordStrength: 'weak' | 'medium' | 'strong' | '' = '';

  private handleInputChange(e: Event, field: string): void {
    const target = e.target as HTMLInputElement;
    const value = target.value;

    if (this.mode === 'login') {
      this.loginData = { ...this.loginData, [field]: value };
    } else {
      this.registerData = { ...this.registerData, [field]: value };

      // Check password strength on password input
      if (field === 'password' && value) {
        this.checkPasswordStrength(value);
      } else if (field === 'password' && !value) {
        this.passwordStrength = '';
      }
    }

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
        // Import router and navigate
        const { router, resolveRouterPath } = await import('../router.js');
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
        this.successMessage = 'Account created successfully! You can now log in.';
        this.registerData = { username: '', password: '', confirmPassword: '' };
        this.passwordStrength = '';

        // Switch to login tab after 2 seconds
        setTimeout(() => {
          this.mode = 'login';
          this.successMessage = '';
        }, 2000);
      } else {
        this.errorMessage = result.error || 'Registration failed';
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
            <div class="error-message">
              ${this.errorMessage}
            </div>
          ` : ''}

          ${this.successMessage ? html`
            <div class="success-message">
              ${this.successMessage}
            </div>
          ` : ''}

          ${this.mode === 'login' ? this.renderLoginForm() : this.renderRegisterForm()}
        </div>
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
          Don't have an account? Click "Register" above
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
}