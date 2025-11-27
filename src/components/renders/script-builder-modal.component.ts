import { LitElement, TemplateResult, html } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { scriptService } from '../../services/script.service';
import { deviceService } from '../../services/device-service';
import { TasmotaScript, ScriptTemplate } from '../../models/script.model';
import { notificationService } from '../../services/notification.service';
import { Device } from '../../models/device.model';
import { scriptBuilder } from '../../styles/script-builder.styles';
import { commandShield } from '../../services/command-shield.service';

@customElement('script-builder-modal')
export class ScriptBuilderModal extends LitElement {
  static styles = scriptBuilder;

  @property({ type: String }) deviceId!: string;

  @state() private activeTab: 'templates' | 'editor' | 'active' = 'templates';
  @state() private templates: ScriptTemplate[] = [];
  @state() private selectedTemplate: ScriptTemplate | null = null;
  @state() private templateVariables: Record<string, any> = {};
  @state() private currentScript: TasmotaScript | null = null;
  @state() private isUploading = false;
  @state() private uploadProgress = 0;

  private get device(): Device {
    return deviceService.getDevice(this.deviceId) as Device;
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  private async loadData() {
    this.templates = scriptService.getScriptTemplates();
    this.currentScript = scriptService.getScriptForDevice(this.deviceId) || null;
  }

  private getSectionTypeName(type: string): string {
    const names: Record<string, string> = {
      'define': '>D - Variables',
      'boot': '>B - Boot Sequence',
      'sensor': '>S - Sensor Readings',
      'event': '>E - Events',
      'web': '>W - Web UI',
      'json': '>J - JSON Modification',
      'button': '>R - Button/Switch',
      'mqtt': '>m - MQTT Handler',
      'function': '>F - Custom Functions'
    };
    return names[type] || type.toUpperCase();
  }

  render() {
    return html`
      <div class="modal-overlay" @click="${this.handleOverlayClick}">
        <div class="modal-container" @click="${(e: Event) => e.stopPropagation()}">
          <div class="modal-header">
            <div class="modal-title">
              🔧 Script Builder
              <span class="device-badge">${this.device.name}</span>
            </div>
            <button class="modal-close" @click="${this.close}">×</button>
          </div>
          ${this.renderShieldStatus()}

          <div class="modal-content">
            <div class="warning-banner">
              ⚠️ Requires tasmota32-scripting.bin firmware
            </div>

            <div class="tabs">
              <button
                class="tab ${this.activeTab === 'templates' ? 'active' : ''}"
                @click="${() => this.activeTab = 'templates'}"
              >
                📋 Templates
              </button>
              <button
                class="tab ${this.activeTab === 'editor' ? 'active' : ''}"
                @click="${() => this.activeTab = 'editor'}"
              >
                ✏️ Editor
              </button>
              <button
                class="tab ${this.activeTab === 'active' ? 'active' : ''}"
                @click="${() => this.activeTab = 'active'}"
              >
                🔧 Active Script
              </button>
            </div>

            ${this.activeTab === 'templates' ? this.renderTemplates() : ''}
            ${this.activeTab === 'editor' ? this.renderEditor() : ''}
            ${this.activeTab === 'active' ? this.renderActiveScript() : ''}
          </div>
        </div>
      </div>
    `;
  }

  private renderTemplates() {
    return html`
      <div class="section">
        <div class="section-header">
          <div class="section-title">Script Templates</div>
          <button class="button secondary" @click="${() => this.refreshTemplates()}">
            🔄 Refresh
          </button>
        </div>

        <div class="template-grid">
          ${this.templates.map(template => html`
            <div
              class="template-card ${this.selectedTemplate?.id === template.id ? 'selected' : ''}"
              @click="${() => this.selectTemplate(template)}"
            >
              <div class="template-name">${template.name}</div>
              <div class="template-description">${template.description}</div>
              <div class="template-meta">
                <span class="template-badge">${template.category}</span>
                <span class="complexity-badge ${template.complexity}">${template.complexity}</span>
              </div>
            </div>
          `)}
        </div>

        ${this.selectedTemplate ? this.renderTemplateConfig() : ''}
      </div>
    `;
  }

  private renderTemplateConfig() {
    return html`
      <div class="config-form">
        <div class="form-group">
          <label class="form-label">Template: ${this.selectedTemplate?.name}</label>
          <div class="form-help">${this.selectedTemplate?.description}</div>
        </div>

        ${this.selectedTemplate?.variables.map(variable => html`
          <div class="form-group">
            <label class="form-label">${variable.label}</label>
            <input
              class="form-input"
              type="${variable.type === 'number' ? 'number' : variable.type === 'boolean' ? 'checkbox' : 'text'}"
              .value="${this.templateVariables[variable.key] || variable.default || ''}"
              @input="${(e: Event) => this.handleVariableChange(variable.key, (e.target as HTMLInputElement).value)}"
            />
            ${variable.description ? html`
              <div class="form-help">${variable.description}</div>
            ` : ''}
          </div>
        `)}

        <div class="form-group">
          <label class="form-label">Script Preview</label>
          <div class="script-preview">${this.generatePreview()}</div>
        </div>

        <div class="button-group">
          <button
            class="button primary"
            @click="${() => this.createScriptFromTemplate()}"
            ?disabled="${this.isUploading}"
          >
            ✅ Create & Upload Script
          </button>
          <button class="button secondary" @click="${() => this.selectedTemplate = null}">
            Cancel
          </button>
        </div>
      </div>
    `;
  }

  private renderEditor() {
    if (!this.currentScript) {
      return html`
        <div class="empty-state">
          <div class="empty-icon">✏️</div>
          <div class="empty-text">
            No script created yet. Choose a template or create from active script.
          </div>
        </div>
      `;
    }

    return html`
      <div class="section">
        <div class="section-header">
          <div class="section-title">Edit Script: ${this.currentScript.name}</div>
        </div>

        <div class="script-editor">
          ${this.currentScript.sections.map((section, index) => html`
            <div class="section-editor">
              <div class="section-header-edit">
                <span class="section-type">${this.getSectionTypeName(section.type)}</span>
                <div class="checkbox-group">
                  <input
                    type="checkbox"
                    class="checkbox"
                    .checked="${section.enabled}"
                    @change="${(e: Event) => this.toggleSection(index, (e.target as HTMLInputElement).checked)}"
                  />
                  <label class="form-label">Enabled</label>
                </div>
              </div>
              <textarea
                class="code-editor"
                .value="${section.code}"
                @input="${(e: Event) => this.updateSectionCode(index, (e.target as HTMLTextAreaElement).value)}"
                ?disabled="${!section.enabled}"
              ></textarea>
            </div>
          `)}
        </div>

        <div class="button-group">
          <button
            class="button primary"
            @click="${() => this.uploadScript()}"
            ?disabled="${this.isUploading}"
          >
            📤 Upload Script to Device
          </button>
          <button class="button secondary" @click="${() => this.previewFullScript()}">
            👁️ Preview Full Script
          </button>
        </div>

        ${this.isUploading ? this.renderUploadProgress() : ''}
      </div>
    `;
  }

  private renderActiveScript() {
    if (!this.currentScript) {
      return html`
        <div class="empty-state">
          <div class="empty-icon">🔧</div>
          <div class="empty-text">No active script on this device</div>
        </div>
      `;
    }

    return html`
      <div class="section">
        <div class="section-header">
          <div class="section-title">Active Script</div>
        </div>

        <div class="script-item">
          <div class="script-header">
            <div class="script-info">
              <div class="script-name">
                ${this.currentScript.name}
                <span class="status-badge ${this.currentScript.enabled ? 'enabled' : 'disabled'}">
                  ${this.currentScript.enabled ? '✓ Enabled' : '○ Disabled'}
                </span>
              </div>
              <div class="script-meta">
                ${this.currentScript.description || 'No description'}
              </div>
              <div class="script-meta" style="margin-top: 4px;">
                Created: ${this.currentScript.createdAt.toLocaleDateString()} |
                Updated: ${this.currentScript.updatedAt.toLocaleString()}
              </div>
            </div>
            <div class="script-actions">
              <button
                class="icon-button"
                @click="${() => this.editScript()}"
                title="Edit script"
              >
                ✏️ Edit
              </button>
              <button
                class="icon-button danger"
                @click="${() => this.deleteScript()}"
                title="Delete script"
              >
                🗑️ Delete
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Full Script Code</label>
            <div class="script-preview">${this.currentScript.scriptText}</div>
          </div>
        </div>
      </div>
    `;
  }

  private renderUploadProgress() {
    return html`
      <div class="upload-progress">
        <div class="progress-text">Uploading... ${this.uploadProgress}%</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${this.uploadProgress}%"></div>
        </div>
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

  private selectTemplate(template: ScriptTemplate) {
    this.selectedTemplate = template;
    this.templateVariables = {};
    template.variables.forEach(v => {
      this.templateVariables[v.key] = v.default;
    });
    this.requestUpdate();
  }

  private handleVariableChange(key: string, value: any) {
    this.templateVariables = { ...this.templateVariables, [key]: value };
    this.requestUpdate();
  }

  private generatePreview(): string {
    if (!this.selectedTemplate) return '';

    const script = scriptService.applyTemplate(
      this.selectedTemplate,
      this.device.id,
      this.templateVariables
    );

    return script.scriptText;
  }

  private async createScriptFromTemplate() {
    if (!this.selectedTemplate) return;

    try {
      const script = scriptService.applyTemplate(
        this.selectedTemplate,
        this.device.id,
        this.templateVariables
      );

      this.isUploading = true;
      this.uploadProgress = 0;

      await scriptService.uploadScript(script, (progress) => {
        this.uploadProgress = progress;
        this.requestUpdate();
      });

      this.loadData();
      this.selectedTemplate = null;
      this.activeTab = 'active';
      this.isUploading = false;

      notificationService.success(`✅ Script "${script.name}" uploaded successfully!`, 3000);
    } catch (error: any) {
      this.isUploading = false;
      notificationService.error(`❌ Failed to upload script: ${error.message}`, 4000);
    }
  }

  private toggleSection(index: number, enabled: boolean) {
    if (!this.currentScript) return;
    this.currentScript.sections[index].enabled = enabled;
    this.currentScript.scriptText = scriptService.buildScriptText(this.currentScript.sections);
    this.requestUpdate();
  }

  private updateSectionCode(index: number, code: string) {
    if (!this.currentScript) return;
    this.currentScript.sections[index].code = code;
    this.currentScript.scriptText = scriptService.buildScriptText(this.currentScript.sections);
    this.requestUpdate();
  }

  private async uploadScript() {
    if (!this.currentScript) return;

    try {
      this.isUploading = true;
      this.uploadProgress = 0;

      await scriptService.uploadScript(this.currentScript, (progress) => {
        this.uploadProgress = progress;
        this.requestUpdate();
      });

      this.loadData();
      this.activeTab = 'active';
      this.isUploading = false;

      notificationService.success('✅ Script uploaded successfully!', 3000);
    } catch (error: any) {
      this.isUploading = false;
      notificationService.error(`❌ Failed to upload script: ${error.message}`, 4000);
    }
  }

  private previewFullScript() {
    if (!this.currentScript) return;
    alert(this.currentScript.scriptText); // Simple preview, could be improved with a modal
  }

  private editScript() {
    this.activeTab = 'editor';
  }

  private async deleteScript() {
    if (!this.currentScript || !confirm(`Delete script "${this.currentScript.name}"?`)) return;

    try {
      await scriptService.deleteScript(this.currentScript);
      this.loadData();
      notificationService.success('Script deleted successfully', 3000);
    } catch (error: any) {
      notificationService.error(`Failed to delete script: ${error.message}`, 4000);
    }
  }

  private refreshTemplates() {
    this.loadData();
    notificationService.info('Templates refreshed', 2000);
  }

  private handleOverlayClick(e: Event) {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close();
    }
  }

  private close() {
    this.dispatchEvent(new CustomEvent('close', {
      bubbles: true,
      composed: true
    }));
  }
}