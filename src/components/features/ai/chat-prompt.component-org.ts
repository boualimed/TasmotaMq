import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { chatService } from '../../../services/chat-command.service';
import { userSessionManager } from '../../../services/user-session.manager';
import '../../../styles/chat-prompt.styles';
import { chatPrompt } from '../../../styles/chat-prompt.styles';

@customElement('chat-prompt')
export class ChatPrompt extends LitElement {
  static styles = chatPrompt;

  @state() private isOpen = false;
  @state() private messages: Array<{
    role: 'user' | 'assistant' | 'system' | 'error' | 'warning';
    content: string;
  }> = [];
  @state() private inputValue = '';
  @state() private isProcessing = false;
  @state() private quotaInfo: {
    used: number;
    limit: number;
    tier: string;
  } | null = null;

  private sessionUnsubscribe?: () => void;

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

    // Initialize quota info
    const session = userSessionManager.getCurrentSession();
    if (session) {
      this.updateQuotaInfo(session);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.sessionUnsubscribe?.();
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

    return html`
      <button
        class="toggle-button ${!hasAIAccess ? 'disabled' : ''}"
        @click="${() => this.handleToggleOpen()}"
        title="${!hasAIAccess ? 'AI Assistant requires Pro subscription' : 'Open AI Assistant'}"
      >
        🤖
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

    this.isOpen = true;
  }

  private renderChat() {
    const session = userSessionManager.getCurrentSession();
    const hasAIAccess = session?.features.aiInsights;

    return html`
      <div class="chat-container">
        ${this.renderHeader()}
        ${this.renderQuotaBar()}

        <div class="chat-messages">
          ${this.messages.length === 0 ? this.renderWelcomeMessage(hasAIAccess) :
            this.messages.map(msg => html`
              <div class="message ${msg.role}">
                ${msg.content}
              </div>
            `)
          }
        </div>

        ${this.renderInputArea(hasAIAccess)}
      </div>
    `;
  }

  private renderHeader() {
    return html`
      <div class="chat-header">
        <div class="chat-title">
          🤖 AI Assistant
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
        👋 Hi! I can help you control your devices. Try:
        <br>• "Turn off the living room light"
        <br>• "Set bedroom dimmer to 50%"
        <br>• "Open the window blinds"
        <br>• "What's the temperature in the kitchen?"
      </div>
    `;
  }

  private renderInputArea(hasAIAccess?: boolean) {
    const isQuotaExceeded = this.quotaInfo &&
      this.quotaInfo.limit !== -1 &&
      this.quotaInfo.used >= this.quotaInfo.limit;

    return html`
      <div class="chat-input-container">
        <textarea
          class="chat-input"
          rows="2"
          placeholder="${!hasAIAccess ? 'AI Assistant requires PRO subscription...' :
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
          ?disabled="${this.isProcessing || !hasAIAccess || isQuotaExceeded}"
        ></textarea>
        <button
          class="send-button"
          @click="${this.handleSend}"
          ?disabled="${this.isProcessing || !this.inputValue.trim() || !hasAIAccess || isQuotaExceeded}"
        >
          ${this.isProcessing ? '⏳ Processing...' :
            !hasAIAccess ? '🔒 Locked' :
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

    // Add user message
    this.messages = [...this.messages, { role: 'user', content: message }];
    this.inputValue = '';
    this.isProcessing = true;

    try {
      const response = await chatService.processCommand(message);

      if (response.success) {
        this.messages = [
          ...this.messages,
          { role: 'system', content: response.message }
        ];
      } else {
        // Check if it's a quota/upgrade issue
        if (response.quotaExceeded || response.upgradeRequired) {
          this.messages = [
            ...this.messages,
            {
              role: 'warning',
              content: `${response.message}\n\n💡 <a href="/settings/subscription">Upgrade your plan</a>`
            }
          ];
        } else {
          this.messages = [
            ...this.messages,
            { role: 'error', content: response.message }
          ];
        }
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