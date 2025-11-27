import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('deletion-summary')
export class DeletionSummary extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .summary-container {
      background: rgba(239, 68, 68, 0.1);
      border: 2px solid rgba(239, 68, 68, 0.3);
      border-radius: 12px;
      padding: 24px;
      margin: 20px 0;
    }

    .summary-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #fca5a5;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .warning-icon {
      font-size: 1.5rem;
    }

    .deletion-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .deletion-item {
      padding: 12px;
      background: rgba(15, 23, 42, 0.5);
      border-radius: 8px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .item-icon {
      font-size: 1.25rem;
    }

    .item-content {
      flex: 1;
    }

    .item-title {
      font-weight: 600;
      color: #f1f5f9;
      margin-bottom: 4px;
    }

    .item-description {
      font-size: 0.875rem;
      color: #cbd5e1;
    }

    .grace-period {
      background: rgba(251, 146, 60, 0.1);
      border: 1px solid rgba(251, 146, 60, 0.3);
      border-radius: 8px;
      padding: 16px;
      margin-top: 16px;
    }

    .grace-period-title {
      font-weight: 600;
      color: #fdba74;
      margin-bottom: 8px;
    }

    .grace-period-date {
      font-size: 1.1rem;
      font-weight: 700;
      color: #fb923c;
    }
  `;

  @property({ type: Object }) deletionSummary?: {
    localStorage: string[];
    firebase?: boolean;
    supabase?: boolean;
  };

  @property({ type: Object }) gracePeriodEnds?: Date;

  render() {
    if (!this.deletionSummary) return html``;

    return html`
      <div class="summary-container">
        <div class="summary-title">
          <span class="warning-icon">⚠️</span>
          What will be deleted:
        </div>

        <ul class="deletion-list">
          ${this.renderLocalStorageItem()}
          ${this.deletionSummary.firebase ? this.renderFirebaseItem() : ''}
          ${this.deletionSummary.supabase ? this.renderSupabaseItem() : ''}
        </ul>

        ${this.gracePeriodEnds ? html`
          <div class="grace-period">
            <div class="grace-period-title">
              🕐 Grace Period: You can restore your account until:
            </div>
            <div class="grace-period-date">
              ${this.gracePeriodEnds.toLocaleDateString()} at ${this.gracePeriodEnds.toLocaleTimeString()}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderLocalStorageItem() {
    return html`
      <li class="deletion-item">
        <span class="item-icon">💾</span>
        <div class="item-content">
          <div class="item-title">Local Device Data</div>
          <div class="item-description">
            All your devices, MQTT settings, and AI configurations
          </div>
        </div>
      </li>
    `;
  }

  private renderFirebaseItem() {
    return html`
      <li class="deletion-item">
        <span class="item-icon">🔥</span>
        <div class="item-content">
          <div class="item-title">Cloud Backup (Firebase)</div>
          <div class="item-description">
            Synchronized device configurations and history
          </div>
        </div>
      </li>
    `;
  }

  private renderSupabaseItem() {
    return html`
      <li class="deletion-item">
        <span class="item-icon">📊</span>
        <div class="item-content">
          <div class="item-title">Analytics Data (Supabase)</div>
          <div class="item-description">
            MQTT messages, device history, and telemetry data
          </div>
        </div>
      </li>
    `;
  }
}