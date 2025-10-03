import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { router, resolveRouterPath } from '../router';

@customElement('firebase-dropdown')
export class SettingsDropdown extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    .settings-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.9rem;
      font-weight: 600;
      box-shadow: 0 2px 10px rgba(102, 126, 234, 0.3);
    }

    .settings-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }

    .settings-icon {
      font-size: 1.2rem;
      animation: rotate 2s linear infinite;
      animation-play-state: paused;
    }

    .settings-button:hover .settings-icon {
      animation-play-state: running;
    }

    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .dropdown-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
      min-width: 250px;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-10px);
      transition: all 0.3s ease;
      z-index: 100;
      overflow: hidden;
    }

    .dropdown-menu.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .dropdown-header {
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-weight: 600;
      font-size: 0.95rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      color: #374151;
      text-decoration: none;
      border-bottom: 1px solid #f3f4f6;
    }

    .dropdown-item:last-child {
      border-bottom: none;
    }

    .dropdown-item:hover {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
      padding-left: 20px;
    }

    .dropdown-item-icon {
      font-size: 1.3rem;
      width: 24px;
      text-align: center;
    }

    .dropdown-item-content {
      flex: 1;
    }

    .dropdown-item-title {
      font-weight: 600;
      font-size: 0.9rem;
      color: #1f2937;
      margin-bottom: 2px;
    }

    .dropdown-item-description {
      font-size: 0.75rem;
      color: #6b7280;
      line-height: 1.3;
    }

    .dropdown-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 99;
      display: none;
    }

    .dropdown-overlay.open {
      display: block;
    }
  `;

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
      </div>
    `;
  }
}