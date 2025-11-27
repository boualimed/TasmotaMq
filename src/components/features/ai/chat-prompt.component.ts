import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { chatService } from '../../../services/chat-command.service';
import { userSessionManager } from '../../../services/user-session.manager';
import { shieldHandler } from '../../handlers/shield-handler';
import '../../../styles/chat-prompt.styles';
import { chatPrompt } from '../../../styles/chat-prompt.styles';

@customElement('chat-prompt')
export class ChatPrompt extends LitElement {
  static styles = chatPrompt;

  @state() private isOpen = false;
  @state() private messages: Array<{
    role: 'user' | 'assistant' | 'system' | 'error' | 'warning' | 'shield';
    content: string;
    safetyScore?: number;
    shieldBlocked?: boolean;
  }> = [];
  @state() private inputValue = '';
  @state() private isProcessing = false;
  @state() private quotaInfo: {
    used: number;
    limit: number;
    tier: string;
  } | null = null;
  @state() private shieldStatus: any = null;

  private sessionUnsubscribe?: () => void;
  private shieldUnsubscribe?: () => void;

  connectedCallback() {
    super.connectedCallback();

    // Subscribe to session changes
    this.sessionUnsubscribe = userSessionManager.subscribe((session) => {
      if (session) {
        this.updateQuotaInfo(session);
      } else {
        this.quotaInfo = null;
        this.messages = [];
      }
    });

    // 🛡️ Subscribe to shield status changes
    this.shieldUnsubscribe = shieldHandler.onStatusChange((status) => {
      this.shieldStatus = status;

      // If emergency stop is activated while chat is open, notify user
      if (this.isOpen && status.emergencyStopActive) {
        this.messages = [...this.messages, {
          role: 'shield',
          content: '🚨 EMERGENCY STOP ACTIVATED - All commands are blocked',
          shieldBlocked: true
        }];
      }
    });

    // Initialize quota info
    const session = userSessionManager.getCurrentSession();
    if (session) {
      this.updateQuotaInfo(session);
    }

    // Initialize shield status
    this.shieldStatus = shieldHandler.getStatus();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.sessionUnsubscribe?.();
    this.shieldUnsubscribe?.();
  }

  private updateQuotaInfo(session: any) {
    this.quotaInfo = {
      used: session.usage.aiQueriesUsed,
      limit: session.usage.monthlyQuota.aiQueries,
      tier: session.subscription.tier
    };
  }

  render() {
    return html`
      ${this.isOpen ? this.renderChat() : this.renderToggleButton()}
    `;
  }

  private renderToggleButton() {
    const session = userSessionManager.getCurrentSession();
    const hasAIAccess = session?.features.aiInsights;
    const emergencyActive = this.shieldStatus?.emergencyStopActive;

    return html`
      <button
        class="toggle-button ${!hasAIAccess || emergencyActive ? 'disabled' : ''}"
        @click="${() => this.handleToggleOpen()}"
        title="${!hasAIAccess ? 'AI Assistant requires Pro subscription' :
                emergencyActive ? '🚨 Emergency Stop Active' :
                'Open AI Assistant'}"
      >
        ${emergencyActive ? '🚨' : '🤖'}
        ${!hasAIAccess ? html`<span class="pro-badge">PRO</span>` : ''}
      </button>
    `;
  }

  private handleToggleOpen() {
    const session = userSessionManager.getCurrentSession();

    if (!session) {
      this.messages = [{
        role: 'error',
        content: '🔒 Please log in to use AI assistant.'
      }];
      this.isOpen = true;
      return;
    }

    const aiPermission = userSessionManager.canPerformAction('use_ai');
    if (!aiPermission.allowed) {
      this.messages = [{
        role: 'warning',
        content: `${aiPermission.reason}\n\n💡 Upgrade to ${aiPermission.upgradeRequired?.toUpperCase()} tier to unlock AI features.`
      }];
      this.isOpen = true;
      return;
    }

    // 🛡️ Check shield status
    if (this.shieldStatus?.emergencyStopActive) {
      this.messages = [{
        role: 'shield',
        content: '🚨 EMERGENCY STOP ACTIVE\n\nAll commands are blocked for safety. Clear the emergency stop in Shield Dashboard to resume.',
        shieldBlocked: true
      }];
      this.isOpen = true;
      return;
    }

    this.isOpen = true;
  }

  private renderChat() {
    const session = userSessionManager.getCurrentSession();
    const hasAIAccess = session?.features.aiInsights;
    const emergencyActive = this.shieldStatus?.emergencyStopActive;
    const pauseActive = this.shieldStatus?.globalPauseActive;

    return html`
      <div class="chat-container">
        ${this.renderHeader()}
        ${this.renderShieldBanner()}
        ${this.renderQuotaBar()}

        <div class="chat-messages">
          ${this.messages.length === 0 ? this.renderWelcomeMessage(hasAIAccess) :
            this.messages.map(msg => html`
              <div class="message ${msg.role} ${msg.shieldBlocked ? 'blocked' : ''}">
                ${msg.content}
                ${msg.safetyScore !== undefined ? html`
                  <div class="safety-badge" style="margin-top: 8px; font-size: 0.85em; opacity: 0.8;">
                    🛡️ Safety Score: ${msg.safetyScore}/100
                  </div>
                ` : ''}
              </div>
            `)
          }
        </div>

        ${this.renderInputArea(hasAIAccess, emergencyActive, pauseActive)}
      </div>
    `;
  }

  private renderHeader() {
    return html`
      <div class="chat-header">
        <div class="chat-title">
          ${this.shieldStatus?.emergencyStopActive ? '🚨' : '🤖'} AI Assistant
          ${this.quotaInfo ? html`
            <span class="tier-badge ${this.quotaInfo.tier}">
              ${this.quotaInfo.tier.toUpperCase()}
            </span>
          ` : ''}
        </div>
        <button
          style="background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 1.5rem;"
          @click="${() => this.isOpen = false}"
        >
          ×
        </button>
      </div>
    `;
  }

  private renderShieldBanner() {
    if (this.shieldStatus?.emergencyStopActive) {
      return html`
        <div style="background: linear-gradient(135deg, #dc2626, #991b1b); padding: 12px; color: white; font-size: 0.9em; border-radius: 8px; margin-bottom: 12px; animation: pulse 2s infinite;">
          🚨 <strong>EMERGENCY STOP ACTIVE</strong><br>
          All commands blocked. Go to Shield Dashboard to clear.
        </div>
      `;
    }

    if (this.shieldStatus?.globalPauseActive) {
      const remaining = Math.ceil((this.shieldStatus.globalPauseUntil - Date.now()) / 1000);
      return html`
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 12px; color: white; font-size: 0.9em; border-radius: 8px; margin-bottom: 12px;">
          ⏸️ <strong>Commands Paused</strong> (${remaining}s remaining)<br>
          ${this.shieldStatus.pauseReason || 'Safety pause in effect'}
        </div>
      `;
    }

    return html`
      <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 8px 12px; color: white; font-size: 0.85em; border-radius: 6px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
        <span>🛡️ <strong>Shield Active</strong></span>
        <span style="opacity: 0.9; font-size: 0.9em;">All commands validated</span>
      </div>
    `;
  }

  private renderQuotaBar() {
    if (!this.quotaInfo) return '';

    const { used, limit } = this.quotaInfo;
    const percentage = limit === -1 ? 0 : (used / limit) * 100;
    const isUnlimited = limit === -1;
    const isNearLimit = percentage > 80;

    return html`
      <div class="quota-bar">
        <div class="quota-info">
          <span class="quota-label">
            ${isUnlimited ? '♾️ Unlimited' : `${used} / ${limit} queries`}
          </span>
          ${isNearLimit && !isUnlimited ? html`
            <span class="quota-warning">⚠️ Near limit</span>
          ` : ''}
        </div>
        ${!isUnlimited ? html`
          <div class="quota-progress">
            <div
              class="quota-fill ${isNearLimit ? 'warning' : ''}"
              style="width: ${Math.min(percentage, 100)}%"
            ></div>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderWelcomeMessage(hasAIAccess?: boolean) {
    if (!hasAIAccess) {
      return html`
        <div class="message warning">
          🔒 AI Assistant is a <strong>PRO</strong> feature.
          <br><br>
          Upgrade your subscription to unlock:
          <br>• Natural language device control
          <br>• Smart automation suggestions
          <br>• Intelligent energy insights
          <br>• Priority support
          <br><br>
          💡 <a href="/settings/subscription">Upgrade to PRO</a>
        </div>
      `;
    }

    return html`
      <div class="message system">
        👋 Hi! I can help you control your devices safely.
        <br><br>
        🛡️ <strong>Shield Protection Active</strong> - All commands are validated for safety
        <br><br>
        Try commands like:
        <br>• "Turn off the living room light"
        <br>• "Set bedroom dimmer to 50%"
        <br>• "Open the window blinds"
        <br>• "What's the temperature in the kitchen?"
      </div>
    `;
  }

  private renderInputArea(hasAIAccess?: boolean, emergencyActive?: boolean, pauseActive?: boolean) {
    const isQuotaExceeded = this.quotaInfo &&
      this.quotaInfo.limit !== -1 &&
      this.quotaInfo.used >= this.quotaInfo.limit;

    const isBlocked = emergencyActive || pauseActive;
    const blockReason = emergencyActive ? '🚨 Emergency Stop Active' :
                       pauseActive ? '⏸️ Commands Paused' : '';

    return html`
      <div class="chat-input-container">
        <textarea
          class="chat-input"
          rows="2"
          placeholder="${!hasAIAccess ? 'AI Assistant requires PRO subscription...' :
                       isBlocked ? blockReason :
                       isQuotaExceeded ? 'Monthly quota exceeded. Upgrade for more...' :
                       'Ask me to control your devices...'}"
          .value="${this.inputValue}"
          @input="${(e: Event) => this.inputValue = (e.target as HTMLTextAreaElement).value}"
          @keydown="${(e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              this.handleSend();
            }
          }}"
          ?disabled="${this.isProcessing || !hasAIAccess || isQuotaExceeded || isBlocked}"
        ></textarea>
        <button
          class="send-button"
          @click="${this.handleSend}"
          ?disabled="${this.isProcessing || !this.inputValue.trim() || !hasAIAccess || isQuotaExceeded || isBlocked}"
        >
          ${this.isProcessing ? '⏳ Processing...' :
            !hasAIAccess ? '🔒 Locked' :
            isBlocked ? blockReason :
            isQuotaExceeded ? '⚠️ Quota Exceeded' :
            '📤 Send'}
        </button>
      </div>
    `;
  }

  private async handleSend() {
    const message = this.inputValue.trim();
    if (!message || this.isProcessing) return;

    const session = userSessionManager.getCurrentSession();
    if (!session) {
      this.messages = [...this.messages, {
        role: 'error',
        content: '🔒 Session expired. Please log in again.'
      }];
      return;
    }

    // 🛡️ Check shield status before processing
    if (this.shieldStatus?.emergencyStopActive) {
      this.messages = [...this.messages, {
        role: 'shield',
        content: '🚨 Cannot process commands - Emergency Stop is active',
        shieldBlocked: true
      }];
      return;
    }

    // Add user message
    this.messages = [...this.messages, { role: 'user', content: message }];
    this.inputValue = '';
    this.isProcessing = true;

    try {
      const response = await chatService.processCommand(message);

      if (response.success) {
        this.messages = [
          ...this.messages,
          {
            role: 'system',
            content: response.message,
            safetyScore: response.safetyScore
          }
        ];
      } else {
        // Determine message type based on response
        const messageRole = response.shieldBlocked ? 'shield' :
                          (response.quotaExceeded || response.upgradeRequired) ? 'warning' :
                          'error';

        let messageContent = response.message;

        // Add helpful links for upgrades
        if (response.quotaExceeded || response.upgradeRequired) {
          messageContent += '\n\n💡 <a href="/settings/subscription">Upgrade your plan</a>';
        }

        // Add shield dashboard link for blocked commands
        if (response.shieldBlocked) {
          messageContent += '\n\n🛡️ <a href="/shield/dashboard">View Shield Dashboard</a>';
        }

        this.messages = [
          ...this.messages,
          {
            role: messageRole,
            content: messageContent,
            safetyScore: response.safetyScore,
            shieldBlocked: response.shieldBlocked
          }
        ];
      }

      // Update quota display
      this.updateQuotaInfo(userSessionManager.getCurrentSession()!);

    } catch (error: any) {
      this.messages = [
        ...this.messages,
        { role: 'error', content: `Error: ${error.message}` }
      ];
    } finally {
      this.isProcessing = false;
    }

    // Scroll to bottom
    this.requestUpdate();
    setTimeout(() => {
      const messagesDiv = this.shadowRoot?.querySelector('.chat-messages');
      if (messagesDiv) {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }
    }, 100);
  }
}