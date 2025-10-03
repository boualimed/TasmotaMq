import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { authService } from '../services/auth.service';

@customElement('protected-route')
export class ProtectedRoute extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
  `;

  @state() private isAuthenticated = false;

  private unsubscribe?: () => void;

  connectedCallback() {
    super.connectedCallback();

    // Check initial auth state
    this.isAuthenticated = authService.isAuthenticated();

    // Subscribe to auth changes
    this.unsubscribe = authService.subscribe((isAuth) => {
      this.isAuthenticated = isAuth;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribe?.();
  }

  render() {
    if (!this.isAuthenticated) {
      return html`<auth-login></auth-login>`;
    }

    return html`<slot></slot>`;
  }
}