import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('app-home')
export class EmptyStateCanvas extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 100vh;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
    }

    .empty-container {
      text-align: center;
      max-width: 500px;
      width: 100%;
    }

    .title {
      font-size: 2.5rem;
      font-weight: 700;
      color: #334155;
      margin-bottom: 20px;
      line-height: 1.2;
    }

    .subtitle {
      font-size: 1.3rem;
      color: #64748b;
      margin-bottom: 60px;
      line-height: 1.4;
    }

    .illustration {
      margin-bottom: 60px;
      position: relative;
    }

    .house-svg {
      width: 350px;
      height: 280px;
      margin: 0 auto;
      display: block;
    }

    .cta-button {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      border: none;
      padding: 20px 40px;
      font-size: 1.3rem;
      font-weight: 600;
      border-radius: 50px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
      text-decoration: none;
      display: inline-block;
    }

    .cta-button:hover {
      transform: translateY(-3px);
      box-shadow: 0 15px 35px rgba(59, 130, 246, 0.4);
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
    }

    .cta-button:active {
      transform: translateY(-1px);
    }

    /* Animations */
    @keyframes float {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-8px);
      }
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.8;
        transform: scale(1.05);
      }
    }

    .floating {
      animation: float 3s ease-in-out infinite;
    }

    .pulsing {
      animation: pulse 2s ease-in-out infinite;
    }

    .hand-left {
      animation: float 3s ease-in-out infinite;
      animation-delay: 0.5s;
    }

    .hand-right {
      animation: float 3s ease-in-out infinite;
      animation-delay: 1s;
    }

    @media (max-width: 768px) {
      .title {
        font-size: 2rem;
      }

      .subtitle {
        font-size: 1.1rem;
        margin-bottom: 40px;
      }

      .house-svg {
        width: 280px;
        height: 220px;
      }

      .cta-button {
        padding: 18px 35px;
        font-size: 1.2rem;
      }

      .illustration {
        margin-bottom: 40px;
      }
    }

    @media (max-width: 480px) {
      :host {
        padding: 20px;
      }

      .title {
        font-size: 1.8rem;
      }

      .house-svg {
        width: 250px;
        height: 200px;
      }
    }
  `;

  private handleAddComponent() {
    const event = new CustomEvent('navigate', {
      detail: { page: 'auth-login' },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  render() {
    return html`
      <div class="empty-container">
        <h1 class="title">Welcome to Tasmota Home!</h1>
        <p class="subtitle">Let's build your smart dashboard.</p>

        <div class="illustration">
          <svg class="house-svg" viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- House outline -->
            <path d="M80 160 L200 80 L320 160 L320 280 L80 280 Z"
                  fill="#e2e8f0"
                  stroke="#cbd5e1"
                  stroke-width="3"/>

            <!-- House roof -->
            <path d="M60 160 L200 60 L340 160 L320 160 L200 80 L80 160 Z"
                  fill="#cbd5e1"
                  stroke="#94a3b8"
                  stroke-width="2"/>

            <!-- Windows -->
            <rect x="120" y="120" width="40" height="40"
                  fill="white"
                  stroke="#cbd5e1"
                  stroke-width="2"
                  rx="4"/>
            <rect x="240" y="120" width="40" height="40"
                  fill="white"
                  stroke="#cbd5e1"
                  stroke-width="2"
                  rx="4"/>

            <!-- Door -->
            <rect x="180" y="200" width="40" height="80"
                  fill="white"
                  stroke="#cbd5e1"
                  stroke-width="2"
                  rx="4"/>

            <!-- Door handle -->
            <circle cx="210" cy="240" r="2" fill="#94a3b8"/>

            <!-- Ceiling light -->
            <ellipse cx="200" cy="110" rx="15" ry="8"
                     fill="#bfdbfe"
                     stroke="#93c5fd"
                     stroke-width="2"
                     class="floating"/>

            <!-- Couch -->
            <rect x="100" y="220" width="60" height="40"
                  fill="#bfdbfe"
                  stroke="#93c5fd"
                  stroke-width="2"
                  rx="8"/>
            <!-- Couch back -->
            <rect x="100" y="210" width="60" height="15"
                  fill="#bfdbfe"
                  stroke="#93c5fd"
                  stroke-width="2"
                  rx="8"/>

            <!-- Coffee table -->
            <rect x="250" y="240" width="40" height="25"
                  fill="#bfdbfe"
                  stroke="#93c5fd"
                  stroke-width="2"
                  rx="4"/>

            <!-- Left hand with device -->
            <g class="hand-left">
              <ellipse cx="50" cy="200" rx="25" ry="15"
                       fill="#fbbf24"
                       stroke="#f59e0b"
                       stroke-width="2"
                       transform="rotate(-15 50 200)"/>
              <!-- Device in hand -->
              <rect x="35" y="190" width="20" height="20"
                    fill="white"
                    stroke="#3b82f6"
                    stroke-width="2"
                    rx="4"
                    transform="rotate(-15 45 200)"/>
              <!-- Power icon -->
              <circle cx="45" cy="200" r="6"
                      fill="none"
                      stroke="#3b82f6"
                      stroke-width="2"
                      transform="rotate(-15 45 200)"/>
              <line x1="45" y1="194" x2="45" y2="200"
                    stroke="#3b82f6"
                    stroke-width="2"
                    transform="rotate(-15 45 200)"/>
            </g>

            <!-- Right hand with device -->
            <g class="hand-right">
              <ellipse cx="350" cy="180" rx="25" ry="15"
                       fill="#fbbf24"
                       stroke="#f59e0b"
                       stroke-width="2"
                       transform="rotate(15 350 180)"/>
              <!-- Device in hand -->
              <circle cx="350" cy="180" r="15"
                      fill="white"
                      stroke="#3b82f6"
                      stroke-width="2"/>
              <!-- WiFi icon -->
              <path d="M340 185 Q350 175 360 185"
                    fill="none"
                    stroke="#3b82f6"
                    stroke-width="2"/>
              <path d="M343 182 Q350 178 357 182"
                    fill="none"
                    stroke="#3b82f6"
                    stroke-width="2"/>
              <path d="M346 179 Q350 177 354 179"
                    fill="none"
                    stroke="#3b82f6"
                    stroke-width="2"/>
            </g>

            <!-- WiFi signals from left device -->
            <g class="pulsing">
              <path d="M70 190 Q85 185 100 190"
                    fill="none"
                    stroke="#93c5fd"
                    stroke-width="2"
                    opacity="0.6"/>
              <path d="M75 195 Q85 192 95 195"
                    fill="none"
                    stroke="#93c5fd"
                    stroke-width="2"
                    opacity="0.4"/>
            </g>

            <!-- WiFi signals from right device -->
            <g class="pulsing">
              <path d="M330 170 Q315 165 300 170"
                    fill="none"
                    stroke="#93c5fd"
                    stroke-width="2"
                    opacity="0.6"/>
              <path d="M325 175 Q315 172 305 175"
                    fill="none"
                    stroke="#93c5fd"
                    stroke-width="2"
                    opacity="0.4"/>
            </g>
          </svg>
        </div>

        <button class="cta-button" @click="${this.handleAddComponent}">
          Add Your First Component
        </button>
      </div>
    `;
  }
}