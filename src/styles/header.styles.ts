import { LitElement, css, html } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { resolveRouterPath } from '../router';

import '@shoelace-style/shoelace/dist/components/button/button.js';

@customElement('app-header')
export class AppHeader extends LitElement {
  @property({ type: String }) title = 'tasmotamqtt';

  @property({ type: Boolean }) enableBack: boolean = false;

  static styles = css`
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(30, 41, 59, 0.98);
      backdrop-filter: blur(20px);
      color: #f1f5f9;
      padding: 12px 20px;
      padding-top: 4px;
      position: fixed;
      left: env(titlebar-area-x, 0);
      top: env(titlebar-area-y, 0);
      height: env(titlebar-area-height, 50px);
      width: env(titlebar-area-width, 100%);
      -webkit-app-region: drag;
      border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 1000;
    }

    header h1 {
      margin-top: 0;
      margin-bottom: 0;
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    nav a {
      margin-left: 10px;
      color: #e2e8f0;
      text-decoration: none;
      padding: 8px 16px;
      border-radius: 8px;
      transition: all 0.3s ease;
      font-weight: 600;
      font-size: 0.9rem;
    }

    nav a:hover {
      background: rgba(59, 130, 246, 0.1);
      color: #93c5fd;
      transform: translateY(-1px);
    }

    #back-button-block {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    /* Custom Back Button Styling */
    sl-button::part(base) {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      border: none;
      border-radius: 10px;
      color: white;
      font-weight: 600;
      padding: 8px 18px;
      transition: all 0.3s ease;
      box-shadow: 0 2px 10px rgba(59, 130, 246, 0.3);
      -webkit-app-region: no-drag;
    }

    sl-button::part(base):hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
    }

    sl-button::part(base):active {
      transform: translateY(0);
    }

    /* Light Theme Override */
    @media (prefers-color-scheme: light) {
      header {
        background: rgba(248, 250, 252, 0.98);
        color: #1e293b;
        border-bottom: 1px solid rgba(148, 163, 184, 0.3);
      }

      header h1 {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      nav a {
        color: #475569;
      }

      nav a:hover {
        background: rgba(59, 130, 246, 0.1);
        color: #3b82f6;
      }
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      header {
        padding: 10px 16px;
      }

      header h1 {
        font-size: 1rem;
      }

      nav a {
        padding: 6px 12px;
        font-size: 0.85rem;
      }
    }

    @media (max-width: 480px) {
      header {
        padding: 8px 12px;
      }

      header h1 {
        font-size: 0.95rem;
      }

      #back-button-block {
        gap: 8px;
      }
    }

    /* Accessibility */
    nav a:focus-visible,
    sl-button:focus-visible {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }

    /* Animation for header appearance */
    @keyframes slideDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    header {
      animation: slideDown 0.4s ease-out;
    }
  `;

  render() {
    return html`
      <header>
        <div id="back-button-block">
          ${this.enableBack
            ? html`<sl-button size="small" href="${resolveRouterPath()}">
                Back
              </sl-button>`
            : null}

          <h1>${this.title}</h1>
        </div>
      </header>
    `;
  }
}