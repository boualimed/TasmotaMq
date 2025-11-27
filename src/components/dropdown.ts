import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { router, resolveRouterPath } from '../router';
import { dropdown } from '../styles/dropdown.styles';

@customElement('firebase-dropdown')
export class SettingsDropdown extends LitElement {
  static styles = dropdown;

  @state() private isOpen = false;

  private toggleDropdown(): void {
    this.isOpen = !this.isOpen;
  }

  private closeDropdown(): void {
    this.isOpen = false;
  }
/**
 *  private handleNavigation(route: string): void {
    this.dispatchEvent(new CustomEvent('navigate', {
      detail: { route },
      bubbles: true,
      composed: true
    }));
    this.closeDropdown();
  }
 */
  private handleNavigation(route: string): void {
    router.navigate(resolveRouterPath(route));
    this.closeDropdown();
  }

  render() {
    return html`
      <div class="dropdown-overlay ${this.isOpen ? 'open' : ''}" @click="${this.closeDropdown}"></div>

      <button class="settings-button" @click="${this.toggleDropdown}">
        <span class="settings-icon">⚙️</span>
        Settings
      </button>

      <div class="dropdown-menu ${this.isOpen ? 'open' : ''}">
        <div class="dropdown-header">
          Configuration Menu
        </div>

        <div class="dropdown-item" @click="${() => this.handleNavigation('firebase')}">
          <span class="dropdown-item-icon">🔥</span>
          <div class="dropdown-item-content">
            <div class="dropdown-item-title">Firebase Integration</div>
            <div class="dropdown-item-description">Configure cloud sync and real-time updates</div>
          </div>
        </div>

        <div class="dropdown-item" @click="${() => this.handleNavigation('supabase')}">
          <span class="dropdown-item-icon">🗄️</span>
          <div class="dropdown-item-content">
            <div class="dropdown-item-title">Supabase Integration</div>
            <div class="dropdown-item-description">Store MQTT messages in Postgres and view device history</div>
          </div>
        </div>
      </div>
    `;
  }
}