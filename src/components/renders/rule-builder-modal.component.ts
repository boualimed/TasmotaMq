import { LitElement, TemplateResult, html} from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { ruleService } from '../../services/rule.service';
import { deviceService } from '../../services/device-service';
import { TasmotaRule, RuleTemplate } from '../../models/rule.model';
import { notificationService } from '../../services/notification.service';
import { Device } from '../../models/device.model';
import { ruleBuilder } from '../../styles/rule-builder.styles';
import { commandShield } from '../../services/command-shield.service';

@customElement('rule-builder-modal')
export class RuleBuilderModal extends LitElement {
  static styles = ruleBuilder

  @property({ type: Object }) device!: Device;
  @property({ type: Boolean }) open = false;

  @state() private activeTab: 'templates' | 'custom' | 'active' = 'templates';
  @state() private templates: RuleTemplate[] = [];
  @state() private rules: TasmotaRule[] = [];
  @state() private selectedTemplate: RuleTemplate | null = null;
  @state() private templateVariables: Record<string, any> = {};
  @state() private customRuleText = '';
  @state() private customRuleName = '';
  @state() private customRuleSlot: 1 | 2 | 3 = 1;

  connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  private loadData() {
    this.templates = ruleService.getRuleTemplates();
    this.rules = ruleService.getRulesForDevice(this.device.id);

    // Filter templates by device type
    this.templates = this.templates.filter(t =>
      t.deviceTypes.includes(this.device.type)
    );
  }

  render() {
    if (!this.open) return html``;

    return html`
      <div class="modal-overlay" @click="${() => this.handleOverlayClick()}">
        <div class="modal-container" @click="${(e: Event) => e.stopPropagation()}">
          ${this.renderHeader()}
          ${this.renderContent()}
        </div>
      </div>
    `;
  }

  private renderHeader() {
    return html`
      <div class="modal-header">
        <div class="modal-title">
          📜 Rules Manager
          <span class="device-badge">${this.device.name}</span>
        </div>
        <button class="modal-close" @click="${() => this.close()}">×</button>
      </div>
      ${this.renderShieldStatus()}
    `;
  }

  private renderContent() {
    return html`
      <div class="modal-content">
        ${this.renderTabs()}
        ${this.activeTab === 'templates' ? this.renderTemplates() : ''}
        ${this.activeTab === 'custom' ? this.renderCustom() : ''}
        ${this.activeTab === 'active' ? this.renderActiveRules() : ''}
      </div>
    `;
  }

  private renderTabs() {
    return html`
      <div class="tabs">
        <button
          class="tab ${this.activeTab === 'templates' ? 'active' : ''}"
          @click="${() => this.activeTab = 'templates'}"
        >
          📋 Templates (${this.templates.length})
        </button>
        <button
          class="tab ${this.activeTab === 'custom' ? 'active' : ''}"
          @click="${() => this.activeTab = 'custom'}"
        >
          ✏️ Custom Rule
        </button>
        <button
          class="tab ${this.activeTab === 'active' ? 'active' : ''}"
          @click="${() => this.activeTab = 'active'}"
        >
          ⚡ Active Rules (${this.rules.length})
        </button>
      </div>
    `;
  }

  private renderTemplates() {
    if (this.selectedTemplate) {
      return this.renderTemplateConfig();
    }

    return html`
      <div class="section">
        <div class="section-header">
          <div class="section-title">Choose a Template</div>
        </div>
        ${this.templates.length === 0 ? html`
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <div class="empty-text">No templates available for ${this.device.type} devices</div>
          </div>
        ` : html`
          <div class="template-grid">
            ${this.templates.map(template => this.renderTemplateCard(template))}
          </div>
        `}
      </div>
    `;
  }

  private renderTemplateCard(template: RuleTemplate) {
    return html`
      <div class="template-card" @click="${() => this.selectTemplate(template)}">
        <div class="template-name">${template.name}</div>
        <div class="template-description">${template.description}</div>
        <span class="template-category">${template.category}</span>
      </div>
    `;
  }

  private renderTemplateConfig() {
    const template = this.selectedTemplate!;

    return html`
      <div class="section">
        <div class="section-header">
          <div class="section-title">Configure: ${template.name}</div>
          <button class="button secondary" @click="${() => this.selectedTemplate = null}">
            ← Back to Templates
          </button>
        </div>

        <div class="config-form">
          <div class="template-description" style="margin-bottom: 20px;">
            ${template.description}
          </div>

          ${template.variables.map(variable => html`
            <div class="form-group">
              <label class="form-label">${variable.label}</label>
              ${variable.options ? html`
                <select
                  class="form-input"
                  @change="${(e: Event) => this.handleVariableChange(variable.key, (e.target as HTMLSelectElement).value)}"
                >
                  ${variable.options.map(opt => html`
                    <option value="${opt}" ?selected="${this.templateVariables[variable.key] === opt || variable.default === opt}">
                      ${opt}
                    </option>
                  `)}
                </select>
              ` : html`
                <input
                  class="form-input"
                  type="${variable.type === 'number' ? 'number' : 'text'}"
                  .value="${this.templateVariables[variable.key] || variable.default || ''}"
                  @input="${(e: Event) => this.handleVariableChange(variable.key, (e.target as HTMLInputElement).value)}"
                />
              `}
            </div>
          `)}

          <div class="form-group">
            <label class="form-label">Rule Preview</label>
            <div class="rule-code">
              ${this.generatePreview()}
            </div>
          </div>

          <div class="button-group">
            <button class="button primary" @click="${() => this.createRuleFromTemplate()}">
              ✅ Create & Upload Rule
            </button>
            <button class="button secondary" @click="${() => this.selectedTemplate = null}">
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderCustom() {
    return html`
      <div class="section">
        <div class="section-header">
          <div class="section-title">Write Custom Rule</div>
        </div>

        <div class="custom-rule-editor">
          <div class="form-group">
            <label class="form-label">Rule Name</label>
            <input
              class="form-input"
              type="text"
              placeholder="e.g., My Custom Automation"
              .value="${this.customRuleName}"
              @input="${(e: Event) => this.customRuleName = (e.target as HTMLInputElement).value}"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Rule Slot</label>
            <select
              class="form-input"
              @change="${(e: Event) => this.customRuleSlot = parseInt((e.target as HTMLSelectElement).value) as 1 | 2 | 3}"
            >
              <option value="1" ?selected="${this.customRuleSlot === 1}">Rule 1</option>
              <option value="2" ?selected="${this.customRuleSlot === 2}">Rule 2</option>
              <option value="3" ?selected="${this.customRuleSlot === 3}">Rule 3</option>
            </select>
            <div class="form-help">
              Tasmota supports up to 3 rules per device
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Rule Code</label>
            <textarea
              class="code-editor"
              placeholder="ON System#Boot DO Power1 ON ENDON"
              .value="${this.customRuleText}"
              @input="${(e: Event) => this.customRuleText = (e.target as HTMLTextAreaElement).value}"
            ></textarea>
            <div class="form-help">
              Enter Tasmota rule syntax. Example: ON System#Boot DO Power1 ON ENDON
            </div>
          </div>

          <div class="button-group">
            <button
              class="button primary"
              @click="${() => this.createCustomRule()}"
              ?disabled="${!this.customRuleName || !this.customRuleText}"
            >
              ✅ Create & Upload Custom Rule
            </button>
            <button class="button secondary" @click="${() => this.clearCustomForm()}">
              Clear
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderActiveRules() {
    return html`
      <div class="section">
        <div class="section-header">
          <div class="section-title">Active Rules</div>
          <button class="button secondary" @click="${() => this.refreshRules()}">
            🔄 Refresh
          </button>
        </div>

        ${this.rules.length === 0 ? html`
          <div class="empty-state">
            <div class="empty-icon">📜</div>
            <div class="empty-text">No active rules for this device</div>
          </div>
        ` : html`
          <div class="rule-list">
            ${this.rules.map(rule => this.renderRuleItem(rule))}
          </div>
        `}
      </div>
    `;
  }

  private renderRuleItem(rule: TasmotaRule) {
    return html`
      <div class="rule-item">
        <div class="rule-header">
          <div class="rule-info">
            <div class="rule-name">
              ${rule.name}
              <span class="rule-slot-badge">Rule${rule.ruleSlot}</span>
              <span class="status-badge ${rule.enabled ? 'enabled' : 'disabled'}">
                ${rule.enabled ? '✓ Enabled' : '○ Disabled'}
              </span>
            </div>
            <div class="rule-meta">
              ${rule.description || 'No description'}
            </div>
          </div>
          <div class="rule-actions">
            <button
              class="icon-button ${rule.enabled ? 'warning' : 'secondary'}"
              @click="${() => this.toggleRule(rule)}"
              title="${rule.enabled ? 'Disable rule' : 'Enable rule'}"
            >
              ${rule.enabled ? '⏸️ Disable' : '▶️ Enable'}
            </button>
            <button
              class="icon-button danger"
              @click="${() => this.deleteRule(rule)}"
              title="Delete rule"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
        <div class="rule-code">${rule.ruleText}</div>
      </div>
    `;


  }

  private renderShieldStatus(): TemplateResult {
    const status = commandShield.getStatus();

    if (status.emergencyStopActive) {
      return html`
        <div class="shield-warning emergency">
          <span class="icon">🚨</span>
          <span class="text">Emergency Stop Active - Rules cannot be uploaded</span>
        </div>
      `;
    }

    if (status.globalPauseActive) {
      return html`
        <div class="shield-warning paused">
          <span class="icon">⏸️</span>
          <span class="text">Commands Paused - Rules cannot be uploaded</span>
        </div>
      `;
    }

    if (commandShield.isDeviceBlacklisted(this.device.id)) {
      return html`
        <div class="shield-warning blacklisted">
          <span class="icon">⛔</span>
          <span class="text">Device Blacklisted - Rules cannot be uploaded</span>
        </div>
      `;
    }

    return html`
      <div class="shield-status ok">
        <span class="icon">✅</span>
        <span class="text">Shield Active - Safe to upload rules</span>
      </div>
    `;
  }
  // Event Handlers

  private selectTemplate(template: RuleTemplate) {
    this.selectedTemplate = template;
    this.templateVariables = {};
    template.variables.forEach(v => {
      this.templateVariables[v.key] = v.default;
    });
  }

  private handleVariableChange(key: string, value: any) {
    this.templateVariables = { ...this.templateVariables, [key]: value };
    this.requestUpdate();
  }

  private generatePreview(): string {
    if (!this.selectedTemplate) return '';

    let preview = this.selectedTemplate.template;
    Object.entries(this.templateVariables).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value?.toString() || '');
    });

    return preview;
  }

  private async createRuleFromTemplate() {
    if (!this.selectedTemplate) return;

    try {
      const rule = ruleService.applyTemplate(
        this.selectedTemplate,
        this.device.id,
        this.templateVariables
      );

      await ruleService.uploadRule(rule);

      this.loadData();
      this.selectedTemplate = null;
      this.activeTab = 'active';

      notificationService.success(`✅ Rule "${rule.name}" created successfully!`, 3000);

      // Update device active rules count
      this.updateDeviceRulesCount();
    } catch (error: any) {
      notificationService.error(`❌ Failed to create rule: ${error.message}`, 4000);
    }
  }

  private async createCustomRule() {
    if (!this.customRuleName || !this.customRuleText) return;

    try {
      const rule: TasmotaRule = {
        id: `rule_${Date.now()}`,
        deviceId: this.device.id,
        deviceName: this.device.name,
        ruleSlot: this.customRuleSlot,
        name: this.customRuleName,
        enabled: true,
        triggers: [],
        actions: [],
        ruleText: this.customRuleText,
        isCustom: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await ruleService.uploadRule(rule);

      this.loadData();
      this.clearCustomForm();
      this.activeTab = 'active';

      notificationService.success(`✅ Custom rule created successfully!`, 3000);

      this.updateDeviceRulesCount();
    } catch (error: any) {
      notificationService.error(`❌ Failed to create custom rule: ${error.message}`, 4000);
    }
  }

  private clearCustomForm() {
    this.customRuleName = '';
    this.customRuleText = '';
    this.customRuleSlot = 1;
  }

  private async toggleRule(rule: TasmotaRule) {
    try {
      rule.enabled = !rule.enabled;
      await ruleService.uploadRule(rule);
      this.loadData();

      notificationService.success(
        `Rule ${rule.enabled ? 'enabled' : 'disabled'} successfully`,
        2500
      );

      this.updateDeviceRulesCount();
    } catch (error: any) {
      notificationService.error(`Failed to toggle rule: ${error.message}`, 4000);
    }
  }

  private async deleteRule(rule: TasmotaRule) {
    if (!confirm(`Delete rule "${rule.name}"?`)) return;

    try {
      await ruleService.deleteRule(rule);
      this.loadData();

      notificationService.success('Rule deleted successfully', 3000);

      this.updateDeviceRulesCount();
    } catch (error: any) {
      notificationService.error(`Failed to delete rule: ${error.message}`, 4000);
    }
  }

  private refreshRules() {
    this.loadData();
    notificationService.info('Rules refreshed', 2000);
  }

  private updateDeviceRulesCount() {
    const activeRulesCount = this.rules.filter(r => r.enabled).length;
    deviceService.updateDevice(this.device.id, {
      activeRulesCount,
      rulesEnabled: activeRulesCount > 0
    });
  }

  private handleOverlayClick() {
    this.close();
  }

  private close() {
    this.dispatchEvent(new CustomEvent('close', {
      bubbles: true,
      composed: true
    }));
  }
}