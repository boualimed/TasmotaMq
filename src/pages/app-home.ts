import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('app-home')
export class AppHome extends LitElement {
//  @state() private showFeatures = false;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      min-height: 100vh;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
      position: relative;
      overflow-x: hidden;
    }

    /* Animated background particles */
    .bg-particles {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      z-index: 0;
    }

    .particle {
      position: absolute;
      width: 4px;
      height: 4px;
      background: rgba(59, 130, 246, 0.3);
      border-radius: 50%;
      animation: float-particle 20s infinite;
    }

    .particle:nth-child(1) { left: 10%; animation-delay: 0s; }
    .particle:nth-child(2) { left: 20%; animation-delay: 2s; }
    .particle:nth-child(3) { left: 30%; animation-delay: 4s; }
    .particle:nth-child(4) { left: 40%; animation-delay: 1s; }
    .particle:nth-child(5) { left: 50%; animation-delay: 3s; }
    .particle:nth-child(6) { left: 60%; animation-delay: 5s; }
    .particle:nth-child(7) { left: 70%; animation-delay: 2.5s; }
    .particle:nth-child(8) { left: 80%; animation-delay: 4.5s; }
    .particle:nth-child(9) { left: 90%; animation-delay: 1.5s; }

    @keyframes float-particle {
      0% {
        transform: translateY(100vh) scale(0);
        opacity: 0;
      }
      10% {
        opacity: 1;
      }
      90% {
        opacity: 1;
      }
      100% {
        transform: translateY(-100vh) scale(1);
        opacity: 0;
      }
    }

    /* Main container */
    .container {
      position: relative;
      z-index: 1;
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    /* Header section */
    .header {
      text-align: center;
      margin-bottom: 60px;
      animation: fadeInDown 0.8s ease-out;
    }

    .logo-wrapper {
      display: inline-block;
      margin-bottom: 30px;
      position: relative;
    }

    .logo {
      width: 120px;
      height: 120px;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      border-radius: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 20px 50px rgba(59, 130, 246, 0.3);
      animation: pulse-logo 3s ease-in-out infinite;
      position: relative;
      overflow: hidden;
    }

    .logo::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(
        45deg,
        transparent,
        rgba(255, 255, 255, 0.1),
        transparent
      );
      transform: rotate(45deg);
      animation: shine 3s infinite;
    }

    @keyframes shine {
      0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
      100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
    }

    .logo-icon {
      font-size: 4rem;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
    }

    @keyframes pulse-logo {
      0%, 100% {
        transform: scale(1);
        box-shadow: 0 20px 50px rgba(59, 130, 246, 0.3);
      }
      50% {
        transform: scale(1.05);
        box-shadow: 0 25px 60px rgba(59, 130, 246, 0.5);
      }
    }

    .title {
      font-size: clamp(2.5rem, 5vw, 4rem);
      font-weight: 800;
      background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 20px;
      line-height: 1.2;
      letter-spacing: -0.02em;
    }

    .subtitle {
      font-size: clamp(1.1rem, 2.5vw, 1.5rem);
      color: #cbd5e1;
      margin-bottom: 20px;
      line-height: 1.6;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }

    .version-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      padding: 8px 16px;
      border-radius: 50px;
      color: #93c5fd;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 40px;
    }

    /* Feature cards */
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
      width: 100%;
      margin-bottom: 60px;
      animation: fadeInUp 0.8s ease-out 0.2s both;
    }

    .feature-card {
      background: rgba(30, 41, 59, 0.5);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(148, 163, 184, 0.1);
      border-radius: 20px;
      padding: 32px;
      transition: all 0.3s ease;
      cursor: default;
    }

    .feature-card:hover {
      transform: translateY(-5px);
      background: rgba(30, 41, 59, 0.7);
      border-color: rgba(59, 130, 246, 0.3);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }

    .feature-icon {
      font-size: 2.5rem;
      margin-bottom: 16px;
      display: block;
    }

    .feature-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 12px;
    }

    .feature-description {
      font-size: 0.95rem;
      color: #94a3b8;
      line-height: 1.6;
    }

    /* CTA Section */
    .cta-section {
      text-align: center;
      animation: fadeInUp 0.8s ease-out 0.4s both;
    }

    .cta-buttons {
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .cta-button {
      position: relative;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      border: none;
      padding: 18px 40px;
      font-size: 1.1rem;
      font-weight: 600;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
      overflow: hidden;
      font-family: inherit;
    }

    .cta-button::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.2),
        transparent
      );
      transition: left 0.5s;
    }

    .cta-button:hover::before {
      left: 100%;
    }

    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 15px 40px rgba(59, 130, 246, 0.4);
    }

    .cta-button:active {
      transform: translateY(0);
    }

    .cta-button.secondary {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.3);
      box-shadow: none;
    }

    .cta-button.secondary:hover {
      background: rgba(30, 41, 59, 0.8);
      border-color: rgba(148, 163, 184, 0.5);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }

    /* Stats section */
    .stats {
      display: flex;
      gap: 40px;
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 60px;
      animation: fadeInUp 0.8s ease-out 0.6s both;
    }

    .stat-item {
      text-align: center;
    }

    .stat-value {
      font-size: 2.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      display: block;
    }

    .stat-label {
      font-size: 0.875rem;
      color: #94a3b8;
      margin-top: 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Animations */
    @keyframes fadeInDown {
      from {
        opacity: 0;
        transform: translateY(-30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .container {
        padding: 30px 20px;
      }

      .header {
        margin-bottom: 40px;
      }

      .logo {
        width: 100px;
        height: 100px;
        border-radius: 25px;
      }

      .logo-icon {
        font-size: 3rem;
      }

      .title {
        font-size: 2rem;
      }

      .subtitle {
        font-size: 1rem;
      }

      .features {
        gap: 16px;
        margin-bottom: 40px;
      }

      .feature-card {
        padding: 24px;
      }

      .cta-buttons {
        flex-direction: column;
        width: 100%;
      }

      .cta-button {
        width: 100%;
      }

      .stats {
        gap: 30px;
        margin-top: 40px;
      }

      .stat-value {
        font-size: 2rem;
      }
    }

    @media (max-width: 480px) {
      .features {
        grid-template-columns: 1fr;
      }
    }

    /* Footer */
    .footer {
      text-align: center;
      color: #64748b;
      font-size: 0.875rem;
      margin-top: 60px;
      padding: 20px;
      border-top: 1px solid rgba(148, 163, 184, 0.1);
    }

    .footer a {
      color: #3b82f6;
      text-decoration: none;
      transition: color 0.2s;
    }

    .footer a:hover {
      color: #60a5fa;
    }
  `;
  showFeatures: boolean | undefined;

  connectedCallback() {
    super.connectedCallback();
    // Trigger feature cards animation after component loads
    setTimeout(() => {
      this.showFeatures = true;
    }, 300);
  }

  private handleGetStarted() {
    this.dispatchEvent(new CustomEvent('navigate', {
      detail: { page: 'auth-login' },
      bubbles: true,
      composed: true
    }));
  }

  private handleLearnMore() {
    // Scroll to features or open documentation
    const featuresSection = this.shadowRoot?.querySelector('.features');
    featuresSection?.scrollIntoView({ behavior: 'smooth' });
  }

  render() {
    return html`
      <!-- Animated background -->
      <div class="bg-particles">
        ${Array.from({ length: 9 }).map(() => html`<div class="particle"></div>`)}
      </div>

      <div class="container">
        <!-- Header -->
        <div class="header">
          <div class="logo-wrapper">
            <div class="logo">
              <span class="logo-icon">🏠</span>
            </div>
          </div>

          <h1 class="title">Tasmota Home Controller</h1>
          <p class="subtitle">
            Your complete smart home management solution. Control devices,
            automate routines, and monitor your home—all from one powerful dashboard.
          </p>

          <div class="version-badge">
            <span>⚡</span>
            <span>PWA • Offline-Ready • Fast</span>
          </div>
        </div>

        <!-- Features -->
        <div class="features">
          <div class="feature-card">
            <span class="feature-icon">🔌</span>
            <h3 class="feature-title">Device Control</h3>
            <p class="feature-description">
              Manage switches, dimmers, shutters, and sensors with real-time
              MQTT communication. Support for multi-relay configurations.
            </p>
          </div>

          <div class="feature-card">
            <span class="feature-icon">🤖</span>
            <h3 class="feature-title">Smart Automation</h3>
            <p class="feature-description">
              Create rules and scripts to automate your devices. AI-powered
              insights help optimize your home's energy usage.
            </p>
          </div>

          <div class="feature-card">
            <span class="feature-icon">📊</span>
            <h3 class="feature-title">Real-time Monitoring</h3>
            <p class="feature-description">
              Track sensor data with live charts. Monitor temperature, humidity,
              energy consumption, and more with detailed analytics.
            </p>
          </div>

          <div class="feature-card">
            <span class="feature-icon">✅</span>
            <h3 class="feature-title">Device Validation</h3>
            <p class="feature-description">
              Automatic configuration validation ensures your Tasmota devices
              are set up correctly with smart capability detection.
            </p>
          </div>

          <div class="feature-card">
            <span class="feature-icon">☁️</span>
            <h3 class="feature-title">Cloud Sync</h3>
            <p class="feature-description">
              Seamless synchronization with Firebase and Supabase. Access your
              devices from anywhere, anytime.
            </p>
          </div>

          <div class="feature-card">
            <span class="feature-icon">🔒</span>
            <h3 class="feature-title">Secure & Private</h3>
            <p class="feature-description">
              Your data stays secure with encrypted connections. Local control
              works even without internet access.
            </p>
          </div>
        </div>

        <!-- CTA -->
        <div class="cta-section">
          <div class="cta-buttons">
            <button class="cta-button" @click="${this.handleGetStarted}">
              🚀 Get Started
            </button>
            <button class="cta-button secondary" @click="${this.handleLearnMore}">
              📖 Learn More
            </button>
          </div>
        </div>

        <!-- Stats -->
        <div class="stats">
          <div class="stat-item">
            <span class="stat-value">∞</span>
            <span class="stat-label">Devices Supported</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">24/7</span>
            <span class="stat-label">Real-time Control</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">100%</span>
            <span class="stat-label">Offline Ready</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>
            Built with ❤️ using
            <a href="https://lit.dev" target="_blank" rel="noopener">Lit</a> •
            <a href="https://www.pwabuilder.com" target="_blank" rel="noopener">PWABuilder</a> •
            <a href="https://tasmota.github.io" target="_blank" rel="noopener">Tasmota</a>
          </p>
          <p style="margin-top: 10px; opacity: 0.7;">
            © 2025 Tasmota Home Controller
          </p>
        </div>
      </div>
    `;
  }
}