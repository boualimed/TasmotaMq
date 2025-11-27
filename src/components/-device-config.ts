// ADD these new imports to your existing imports
import { ollamaAIService, DeviceContext } from '../services/ollama-ai.service';
import '../components/ai-settings.component';

// Your existing imports...
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { deviceConfigStyles } from '../styles/device-config.styles';
import { MqttSettings, DEFAULT_MQTT_SETTINGS } from '../models/mqtt-settings.model';
import { Device, NewDeviceInput, DEFAULT_NEW_DEVICE } from '../models/device.model';
import { LogEntry } from '../models/app-state.model';
import { mqttService, ConnectionStatus } from '../services/mqtt-service';
import { deviceService } from '../services/device-service';
import { storageService } from '../services/storage-service';
import { notificationService, Notification } from '../services/notification.service';
import { deviceMonitorService } from '../services/device-monitor.service';
import { authService } from '../services/auth.service';
import { firebaseService } from '../services/firebase.service';
import { supabaseService } from '../services/supabase.service';
import { logger } from '../utils/logger.util';
import { flattenObject } from '../utils/json-parser.util';
import { extractJsonValue } from '../utils/json-parser.util';
import { TOPIC_PATTERNS } from '../constants/mqtt.constants';

@customElement('device-config')
export class DeviceConfig extends LitElement {
  static styles = deviceConfigStyles;

  @state() private mqttSettings: MqttSettings = { ...DEFAULT_MQTT_SETTINGS };
  @state() private devices: Device[] = [];
  @state() private newDevice: NewDeviceInput = { ...DEFAULT_NEW_DEVICE };
  @state() private connectionStatus: ConnectionStatus = 'disconnected';
  @state() private logs: LogEntry[] = [];
  @state() private errorMessage = '';
  @state() private notifications: Notification[] = [];
  @state() private currentUser: string = '';

  private unsubscribers: (() => void)[] = [];
  private deviceStatusMap: Map<string, boolean> = new Map();

  connectedCallback() {
    super.connectedCallback();

    // Get current user
    const user = authService.getCurrentUser();
    this.currentUser = user?.username || 'User';

    this.loadState();
    this.setupSubscriptions();

    // NEW: Initialize AI service
    this.initializeAI();

    if (this.mqttSettings.wasConnected && this.mqttSettings.host) {
      logger.addLog('info', 'Attempting to auto-reconnect...');
      setTimeout(() => this.handleConnect(), 1000);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.saveState();
    this.cleanup();

    // NEW: Cleanup AI service
    ollamaAIService.destroy();
  }

  // NEW: Initialize AI service
  private initializeAI(): void {
    // Load from storage service instead of direct localStorage access
    const savedAIConfig = storageService.loadAIConfig();

    if (savedAIConfig) {
      ollamaAIService.initialize(savedAIConfig);
      logger.addLog('success', '🤖 AI service loaded from saved config');
    } else {
      // Initialize with defaults
      ollamaAIService.initialize({});
      logger.addLog('info', '🤖 AI service initialized with defaults');
    }
  }

  // NEW: Save AI configuration
  private saveAIConfig(): void {
    const config = ollamaAIService.getConfig();
    storageService.saveAIConfig(config);
    logger.addLog('info', '🤖 AI configuration saved');
  }

  // NEW: Trigger manual AI analysis
  private async handleAnalyzeNow(): Promise<void> {
    await ollamaAIService.analyzeNow();
  }

  private setupSubscriptions(): void {
    // Subscribe to MQTT status changes - WITH BROKER NOTIFICATIONS
    this.unsubscribers.push(
      mqttService.onStatusChange((status) => {
        const previousStatus = this.connectionStatus;
        this.connectionStatus = status;

        // Notify on status changes
        if (status === 'connected' && previousStatus !== 'connected') {
          notificationService.success(
            '🔗 Connected to MQTT broker successfully!',
            4000
          );
        } else if (status === 'disconnected' && previousStatus === 'connected') {
          notificationService.error(
            '🔌 Disconnected from MQTT broker',
            4000
          );
          // Stop monitoring all devices
          deviceMonitorService.stopAll();
        } else if (status === 'failed') {
          notificationService.error(
            '❌ Failed to connect to MQTT broker',
            5000
          );
        }

        if (status === 'disconnected') {
          deviceService.setAllDevicesDisconnected();
        }
      })
    );

    // Subscribe to MQTT messages
    this.unsubscribers.push(
      mqttService.onMessage((message) => {
        this.handleMqttMessage(message);
      })
    );

    // Subscribe to device changes - WITH STATUS NOTIFICATIONS
    this.unsubscribers.push(
      deviceService.subscribe((devices) => {
        // Check for status changes and notify
        devices.forEach(device => {
          const previousStatus = this.deviceStatusMap.get(device.id);
          const currentStatus = device.isConnected;

          // Only notify if status actually changed
          if (previousStatus !== undefined && previousStatus !== currentStatus) {
            if (currentStatus) {
              notificationService.success(
                `✅ ${device.name} is now ONLINE`,
                3000
              );
            } else {
              notificationService.warning(
                `⚠️ ${device.name} is now OFFLINE`,
                3000
              );
            }
          }

          // Update status map
          this.deviceStatusMap.set(device.id, currentStatus);
        });

        this.devices = devices;
        this.saveState();

        // Sync to Firebase if enabled
        this.syncToFirebase();
      })
    );

    // Subscribe to log changes
    this.unsubscribers.push(
      logger.subscribe((logs) => {
        this.logs = logs;
      })
    );

    // Subscribe to notifications
    this.unsubscribers.push(
      notificationService.subscribe((notifications) => {
        this.notifications = notifications;
      })
    );

    // Setup device monitor callback
    deviceMonitorService.onDeviceStatusChange((deviceId, isActive) => {
      deviceService.updateDevice(deviceId, { isConnected: isActive });
    });
  }

  private cleanup(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    deviceMonitorService.stopAll();
    mqttService.disconnect();
  }

  private loadState(): void {
    const savedState = storageService.load();
    if (savedState) {
      this.mqttSettings = savedState.mqttSettings;
      deviceService.setDevices(savedState.devices);

      // Initialize device status map
      savedState.devices.forEach(device => {
        this.deviceStatusMap.set(device.id, device.isConnected);
      });

      logger.addLog('success', 'Previous configuration loaded');
    }
  }

  private saveState(): void {
    storageService.save({
      mqttSettings: {
        ...this.mqttSettings,
        wasConnected: mqttService.isConnected()
      },
      devices: deviceService.getDevices()
    });
  }

  // MODIFIED: Enhanced with AI data feeding
  private handleMqttMessage(message: { topic: string; payload: any }): void {
    const { topic, payload } = message;

    deviceService.getDevices().forEach(device => {
      // Stream MQTT message to Supabase in real-time
      if (supabaseService.isEnabled()) {
        const user = authService.getCurrentUser();
        if (user) {
          supabaseService.queueMqttMessage(
            user.id,
            device.id,
            device.name,
            topic,
            payload
          );
        }
      }

      // Handle LWT (Last Will and Testament) - Device availability
      if (device.lwtTopic && topic === device.lwtTopic) {
        const lwtStatus = typeof payload === 'string' ? payload : payload.toString();
        const isOnline = lwtStatus === 'Online';

        // Immediately update status
        deviceService.updateDevice(device.id, {
          isConnected: isOnline,
          lwtStatus: lwtStatus as 'Online' | 'Offline',
          lastSeen: isOnline ? new Date() : device.lastSeen
        });

        // Record to Supabase history
        if (supabaseService.isEnabled()) {
          const user = authService.getCurrentUser();
          if (user) {
            supabaseService.recordDeviceHistory(
              user.id,
              device.id,
              isOnline ? 'online' : 'offline',
              !isOnline,
              isOnline
            );
          }
        }

        // Use monitor service for explicit status
        deviceMonitorService.setDeviceStatus(device.id, isOnline);

        logger.addLog(
          isOnline ? 'success' : 'warning',
          `${device.name} LWT: ${lwtStatus}`
        );

        // NEW: Feed LWT status to AI
        const context: DeviceContext = {
          deviceId: device.id,
          deviceName: device.name,
          deviceType: device.type,
          topic: topic,
          data: { lwtStatus, isOnline },
          timestamp: new Date()
        };
        ollamaAIService.processMqttData(context);

        return;
      }

      // Handle STATE telemetry messages - mark as active
      if (device.stateTopic && topic === device.stateTopic) {
        deviceService.updateDevice(device.id, {
          isConnected: true,
          lastSeen: new Date()
        });
        deviceMonitorService.markDeviceActivity(device);
        logger.addLog('info', `${device.name} telemetry received`);
      }

      // Handle switch devices
      if (device.type === 'switch') {
        const statPowerTopic = device.statTopic!;
        const resultTopic = device.resultTopic!;

        if (topic === statPowerTopic || topic === resultTopic) {
          let isOn = device.isOn;
          const previousState = device.isOn;

          if (typeof payload === 'object') {
            if (payload.POWER !== undefined) {
              isOn = payload.POWER === 'ON';
            } else if (payload.POWER1 !== undefined) {
              isOn = payload.POWER1 === 'ON';
            } else if (payload.RESULT?.POWER !== undefined) {
              isOn = payload.RESULT.POWER === 'ON';
            }
          } else if (typeof payload === 'string') {
            isOn = payload === 'ON';
          }

          const updates: Partial<Device> = {
            isOn,
            lastSeen: new Date()
          };

          // If using LWT, mark activity but don't override connection status
          // If not using LWT, mark as connected on any message
          if (!device.useAutoDiscovery || !device.lwtTopic) {
            updates.isConnected = true;
          } else {
            // Just mark activity, LWT handles connection status
            deviceMonitorService.markDeviceActivity(device);
          }

          deviceService.updateDevice(device.id, updates);

          // Record state change to Supabase
          if (previousState !== isOn && supabaseService.isEnabled()) {
            const user = authService.getCurrentUser();
            if (user) {
              supabaseService.recordDeviceHistory(
                user.id,
                device.id,
                isOn ? 'on' : 'off',
                previousState,
                isOn
              );
            }
          }

          logger.addLog('success', `${device.name} state updated: ${isOn ? 'ON' : 'OFF'}`);

          // NEW: Feed switch state to AI
          const context: DeviceContext = {
            deviceId: device.id,
            deviceName: device.name,
            deviceType: 'switch',
            topic: topic,
            data: { isOn, previousState },
            timestamp: new Date(),
            previousData: { isOn: previousState }
          };
          ollamaAIService.processMqttData(context);
        }
      }

      // Handle sensor devices
      else if (device.type === 'sensor') {
        const sensorTopic = device.baseTopic
          ? TOPIC_PATTERNS.SENSOR(device.baseTopic)
          : device.topic;

        if (topic === sensorTopic) {
          let sensorData = payload;
          if (device.jsonPath) {
            const extracted = extractJsonValue(payload, device.jsonPath);
            sensorData = extracted !== null ? extracted : payload;
          }

          const updates: Partial<Device> = {
            sensorData,
            lastSeen: new Date()
          };

          // If using LWT, mark activity but don't override connection status
          // If not using LWT, mark as connected on any message
          if (!device.useAutoDiscovery || !device.lwtTopic) {
            updates.isConnected = true;
          } else {
            // Just mark activity, LWT handles connection status
            deviceMonitorService.markDeviceActivity(device);
          }

          deviceService.updateDevice(device.id, updates);

          // NEW: Feed sensor data to AI for analysis
          const context: DeviceContext = {
            deviceId: device.id,
            deviceName: device.name,
            deviceType: 'sensor',
            topic: topic,
            data: sensorData,
            timestamp: new Date()
          };
          ollamaAIService.processMqttData(context);
        }
      }

      // Queue device state update to Supabase
      if (supabaseService.isEnabled()) {
        const user = authService.getCurrentUser();
        if (user) {
          supabaseService.queueDeviceState(user.id, device);
        }
      }
    });
  }

  private handleBack(): void {
    this.saveState();
    mqttService.disconnect();
    this.dispatchEvent(new CustomEvent('navigate', {
      detail: { page: 'home' },
      bubbles: true,
      composed: true
    }));
  }

  private showError(message: string): void {
    this.errorMessage = message;
    setTimeout(() => { this.errorMessage = ''; }, 5000);
  }

  private handleMqttSettingChange(e: Event, field: keyof MqttSettings): void {
    const target = e.target as HTMLInputElement;
    const value = field === 'port' ? parseInt(target.value) :
                  field === 'useSSL' ? target.checked :
                  target.value;

    this.mqttSettings = { ...this.mqttSettings, [field]: value };
    this.saveState();

    // Sync MQTT settings to Firebase
    this.syncMqttSettingsToFirebase();
  }

  private async syncToFirebase(): Promise<void> {
    if (!firebaseService.isEnabled()) return;

    const user = authService.getCurrentUser();
    if (!user) return;

    const result = await firebaseService.syncDevices(user.id, this.devices);
    if (!result.success) {
      console.error('Firebase sync failed:', result.error);
    }
  }

  private async syncMqttSettingsToFirebase(): Promise<void> {
    if (!firebaseService.isEnabled()) return;

    const user = authService.getCurrentUser();
    if (!user) return;

    const result = await firebaseService.syncMqttSettings(user.id, this.mqttSettings);
    if (!result.success) {
      console.error('Firebase MQTT sync failed:', result.error);
    }
  }

  private handleDeviceInputChange(e: Event, field: keyof NewDeviceInput): void {
    const target = e.target as HTMLInputElement;
    this.newDevice = { ...this.newDevice, [field]: target.value };
  }

  private async handleConnect(): Promise<void> {
    try {
      await mqttService.connect(this.mqttSettings);
      this.saveState();

      // Subscribe to all existing devices
      deviceService.getDevices().forEach(device => {
        mqttService.subscribeToDevice(device);
      });
    } catch (error: any) {
      this.showError(error.message || 'Connection failed');
    }
  }

  private handleDisconnect(): void {
    mqttService.disconnect();
    this.saveState();
  }

  private handleCancelConnection(): void {
    mqttService.cancelConnection();
  }

  private handleAddDevice(): void {
    if (!this.newDevice.name || (!this.newDevice.topic && !this.newDevice.baseTopic)) {
      this.showError('Device name and topic are required');
      logger.addLog('error', 'Device name and topic are required');
      return;
    }

    const device = deviceService.createDevice(this.newDevice);
    deviceService.addDevice(device);

    // Initialize device status in map
    this.deviceStatusMap.set(device.id, device.isConnected);

    logger.addLog('success', `Added ${device.type} device: ${device.name}`);
    notificationService.success(
      `📱 ${device.name} added successfully!`,
      3000
    );

    if (mqttService.isConnected()) {
      mqttService.subscribeToDevice(device);
      notificationService.info(
        `🔔 Subscribed to ${device.name} topics`,
        2500
      );
    }

    this.newDevice = { ...DEFAULT_NEW_DEVICE };
  }

  private handleToggleDevice(device: Device): void {
    if (!mqttService.isConnected()) {
      this.showError('Not connected to MQTT broker');
      logger.addLog('error', 'Not connected to MQTT broker');
      return;
    }

    try {
      mqttService.toggleSwitch(device, !device.isOn);
      // Optimistic UI update
      deviceService.updateDevice(device.id, { isOn: !device.isOn });
    } catch (error: any) {
      this.showError(`Failed to send command: ${error.message}`);
    }
  }

  private handleRemoveDevice(deviceId: string): void {
    if (!confirm('Are you sure you want to remove this device?')) return;

    const device = deviceService.removeDevice(deviceId);
    if (device && mqttService.isConnected()) {
      mqttService.unsubscribeFromDevice(device);
    }
    logger.addLog('info', `Removed device: ${device?.name || deviceId}`);
  }

  private handleTypeSelect(type: 'switch' | 'sensor'): void {
    this.newDevice = {
      ...this.newDevice,
      type,
      jsonPath: type === 'switch' ? '' : this.newDevice.jsonPath
    };
  }

  private getStatusClass(): string {
    return this.connectionStatus;
  }

  private getStatusText(): string {
    const statusMap = {
      connected: 'Connected',
      disconnected: 'Disconnected',
      connecting: 'Connecting...',
      failed: 'Connection failed'
    };
    return statusMap[this.connectionStatus];
  }

  private getNotificationIcon(type: string): string {
    const iconMap: Record<string, string> = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return iconMap[type] || 'ℹ️';
  }

  private dismissNotification(notificationId: string): void {
    notificationService.dismiss(notificationId);
  }

  private isDeviceAvailable(device: Device): boolean {
    // Device is available if connected
    // For LWT-enabled devices, also check LWT status
    if (device.useAutoDiscovery && device.lwtTopic) {
      return device.isConnected && device.lwtStatus === 'Online';
    }
    return device.isConnected;
  }

  private handleLogout(): void {
    if (confirm('Are you sure you want to log out?')) {
      this.saveState();
      mqttService.disconnect();
      authService.logout();

      // Router will handle redirect to login
      window.location.href = '/login';
    }
  }

  private handleSettingsNavigation(e: CustomEvent): void {
    const { route } = e.detail;

    switch (route) {
      case 'firebase':
        this.saveState();
        this.dispatchEvent(new CustomEvent('navigate', {
          detail: { page: 'dropdown' },
          bubbles: true,
          composed: true
        }));
        break;

      case 'devices':
        // Already on this page
        break;

      case 'export':
        // You can implement export logic or navigation here
        break;
    }
  }

  render() {
    const isConnected = this.connectionStatus === 'connected';
    const isConnecting = this.connectionStatus === 'connecting';
    const aiConfig = ollamaAIService.getConfig();

    return html`
      <!-- Notification Container -->
      <div class="notification-container">
        ${this.notifications.map(notif => html`
          <div
            class="notification-item ${notif.type}"
            @click="${() => this.dismissNotification(notif.id)}"
          >
            <span class="notification-icon">${this.getNotificationIcon(notif.type)}</span>
            <span class="notification-message">${notif.message}</span>
            <button
              class="notification-close"
              @click="${(e: Event) => {
                e.stopPropagation();
                this.dismissNotification(notif.id);
              }}"
            >
              ×
            </button>
          </div>
        `)}
      </div>

      <div class="config-container">
        <div class="config-header">
          <button class="back-button" @click="${this.handleBack}">←</button>
          <div class="header-text">
            <h1>Tasmota MQTT Controller</h1>
            <p>Configure MQTT connection and manage your Tasmota devices</p>
          </div>
          <div style="margin-left: auto; display: flex; align-items: center; gap: 15px;">
            <div class="user-info">
              👤 ${this.currentUser}
            </div>
            <button class="logout-button" @click="${this.handleLogout}">
              🚪 Logout
            </button>
          </div>
          <firebase-dropdown @navigate="${this.handleSettingsNavigation}"></firebase-dropdown>
        </div>

        ${this.errorMessage ? html`
          <div class="notification error">⚠️ ${this.errorMessage}</div>
        ` : ''}

        <div class="main-grid">
          <!-- MQTT Connection Section -->
          <div class="section">
            <div class="section-title">🔗 MQTT Connection Settings</div>

            <div class="connection-status ${this.getStatusClass()}">
              <span class="status-indicator ${this.getStatusClass()}"></span>
              ${this.getStatusText()}
            </div>

            <div class="form-group">
              <label class="form-label">MQTT Broker Host</label>
              <input
                type="text"
                class="form-input"
                placeholder="e.g., 192.168.1.100"
                .value="${this.mqttSettings.host}"
                @input="${(e: Event) => this.handleMqttSettingChange(e, 'host')}"
                ?disabled="${isConnected || isConnecting}"
              />
            </div>

            <div class="form-group">
              <label class="form-label">WebSocket Port</label>
              <input
                type="number"
                class="form-input"
                .value="${this.mqttSettings.port}"
                @input="${(e: Event) => this.handleMqttSettingChange(e, 'port')}"
                ?disabled="${isConnected || isConnecting}"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Username (optional)</label>
              <input
                type="text"
                class="form-input"
                .value="${this.mqttSettings.username}"
                @input="${(e: Event) => this.handleMqttSettingChange(e, 'username')}"
                ?disabled="${isConnected || isConnecting}"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Password (optional)</label>
              <input
                type="password"
                class="form-input"
                .value="${this.mqttSettings.password}"
                @input="${(e: Event) => this.handleMqttSettingChange(e, 'password')}"
                ?disabled="${isConnected || isConnecting}"
              />
            </div>

            <div class="checkbox-group">
              <input
                type="checkbox"
                class="checkbox"
                .checked="${this.mqttSettings.useSSL}"
                @change="${(e: Event) => this.handleMqttSettingChange(e, 'useSSL')}"
                ?disabled="${isConnected || isConnecting}"
              />
              <label class="form-label">Use SSL/TLS (WSS)</label>
            </div>

            ${isConnecting ? html`
              <button class="button warning" @click="${this.handleCancelConnection}">
                Cancel Connection
              </button>
            ` : isConnected ? html`
              <button class="button danger" @click="${this.handleDisconnect}">
                Disconnect
              </button>
            ` : html`
              <button class="button primary" @click="${this.handleConnect}">
                Connect to MQTT
              </button>
            `}
          </div>

          <!-- AI Settings Section -->
        <div class="section">
          <ai-settings @config-changed="${this.saveAIConfig}"></ai-settings>

          <!-- Manual Analysis Button -->
          ${aiConfig.enabled ? html`
            <button
              class="button secondary"
              @click="${this.handleAnalyzeNow}"
              style="margin-top: 10px; width: 100%;"
            >
              🧠 Analyze Now
            </button>
          ` : ''}
        </div>

          <!-- Device Management Section -->
          <div class="section">
            <div class="section-title">📱 Device Management</div>

            <div class="device-type-selector">
              <div
                class="type-option ${this.newDevice.type === 'switch' ? 'selected' : ''}"
                @click="${() => this.handleTypeSelect('switch')}"
              >
                <div>💡</div>
                <div>Switch</div>
              </div>
              <div
                class="type-option ${this.newDevice.type === 'sensor' ? 'selected' : ''}"
                @click="${() => this.handleTypeSelect('sensor')}"
              >
                <div>🌡️</div>
                <div>Sensor</div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Device Name</label>
              <input
                type="text"
                class="form-input"
                placeholder="${this.newDevice.type === 'switch' ? 'Living Room Light' : 'Temperature Sensor'}"
                .value="${this.newDevice.name}"
                @input="${(e: Event) => this.handleDeviceInputChange(e, 'name')}"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Tasmota Device ID</label>
              <input
                type="text"
                class="form-input"
                placeholder="e.g., tasmota_110CE1"
                .value="${this.newDevice.baseTopic}"
                @input="${(e: Event) => this.handleDeviceInputChange(e, 'baseTopic')}"
              />
              <input
                type="text"
                class="form-input"
                placeholder="Or full topic path"
                .value="${this.newDevice.topic}"
                @input="${(e: Event) => this.handleDeviceInputChange(e, 'topic')}"
                style="margin-top: 8px"
              />
              <div class="parser-help">
                Tip: Use device ID like <code>tasmota_110CE1</code> for standard setups
              </div>
            </div>

            <div class="checkbox-group">
              <input
                type="checkbox"
                class="checkbox"
                .checked="${this.newDevice.useAutoDiscovery}"
                @change="${(e: Event) => {
                  const target = e.target as HTMLInputElement;
                  this.newDevice = { ...this.newDevice, useAutoDiscovery: target.checked };
                }}"
              />
              <label class="form-label">
                Use LWT (Last Will Testament) for real-time device status
                <div style="font-size: 0.75rem; color: #666; margin-top: 4px;">
                  Requires Tasmota SetOption19 1 (enabled by default)
                </div>
              </label>
            </div>

            ${this.newDevice.type === 'sensor' ? html`
              <div class="form-group">
                <label class="form-label">JSON Path (Optional)</label>
                <input
                  type="text"
                  class="form-input"
                  placeholder="e.g., AM2301"
                  .value="${this.newDevice.jsonPath}"
                  @input="${(e: Event) => this.handleDeviceInputChange(e, 'jsonPath')}"
                />
                <div class="parser-help">
                  Examples: <code>AM2301</code> or <code>AM2301.Temperature</code>
                </div>
              </div>
            ` : ''}

            <button
              class="button secondary"
              @click="${this.handleAddDevice}"
              ?disabled="${!this.newDevice.name || (!this.newDevice.topic && !this.newDevice.baseTopic)}"
            >
              Add ${this.newDevice.type === 'switch' ? 'Switch' : 'Sensor'}
            </button>

            <div class="log-section">
              <div style="color: #9ca3af; font-size: 0.8rem; margin-bottom: 10px;">Activity Log:</div>
              ${this.logs.length === 0 ? html`
                <div class="log-entry info">No activity yet...</div>
              ` : this.logs.slice(-10).map(log => html`
                <div class="log-entry ${log.type}">
                  [${log.timestamp.toLocaleTimeString()}] ${log.message}
                </div>
              `)}
            </div>
          </div>
        </div>

        <div class="devices-section">
          <div class="section-title">🏠 Connected Devices (${this.devices.length})</div>

          ${this.devices.length === 0 ? html`
            <div class="empty-state">
              <div>📱</div>
              <div>No devices configured</div>
            </div>
          ` : html`
            <div class="devices-grid">
              ${this.devices.map(device => html`
                <div class="device-card ${device.isConnected ? 'connected' : ''}">
                  <div class="device-header">
                    <div class="device-name">
                      ${device.type === 'sensor' ? '🌡️' : '💡'} ${device.name}
                    </div>
                    <div class="device-status ${device.isConnected ? 'connected' : 'disconnected'}">
                      <span class="status-indicator ${device.isConnected ? 'connected' : 'disconnected'}"></span>
                      ${device.isConnected ? 'Online' : 'Offline'}
                    </div>
                  </div>

                  <div class="device-info">
                    <div class="device-info-item">
                      <span class="device-info-label">Type:</span>
                      <span class="device-info-value">${device.type}</span>
                    </div>
                    <div class="device-info-item">
                      <span class="device-info-label">Topic:</span>
                      <span class="device-info-value">${device.topic}</span>
                    </div>
                    ${device.type === 'switch' ? html`
                      <div class="device-info-item">
                        <span class="device-info-label">Status:</span>
                        <span class="device-info-value">${device.isOn ? 'ON' : 'OFF'}</span>
                      </div>
                    ` : ''}
                    ${device.useAutoDiscovery && device.lwtStatus ? html`
                      <div class="device-info-item">
                        <span class="device-info-label">Device Status:</span>
                        <span class="device-info-value" style="color: ${device.lwtStatus === 'Online' ? '#059669' : '#dc2626'}">
                          ${device.lwtStatus === 'Online' ? '🟢 Active' : '🔴 Idle'}
                        </span>
                      </div>
                    ` : ''}
                    ${device.lastSeen ? html`
                      <div class="device-info-item">
                        <span class="device-info-label">Last Seen:</span>
                        <span class="device-info-value">${device.lastSeen.toLocaleTimeString()}</span>
                      </div>
                    ` : ''}
                  </div>

                  ${device.type === 'sensor' && device.sensorData ? html`
                    <div class="sensor-values">
                      ${Object.entries(flattenObject(device.sensorData)).map(([key, value]) => html`
                        <div class="sensor-value-item">
                          <div class="sensor-value-label">${key}</div>
                          <div class="sensor-value">${value}</div>
                        </div>
                      `)}
                    </div>
                    <div class="sensor-raw">${JSON.stringify(device.sensorData, null, 2)}</div>
                  ` : ''}

                  <div class="device-controls">
                    ${device.type === 'switch' ? html`
                      <button
                        class="toggle-button ${device.isOn ? 'on' : 'off'}"
                        @click="${() => this.handleToggleDevice(device)}"
                        ?disabled="${!isConnected || !device.isConnected}"
                        title="${!isConnected ? 'MQTT broker disconnected' : !device.isConnected ? 'Device is offline' : ''}"
                      >
                        ${device.isOn ? 'Turn OFF' : 'Turn ON'}
                      </button>
                    ` : ''}
                    <button
                      class="remove-button"
                      @click="${() => this.handleRemoveDevice(device.id)}"
                      title="Remove device"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              `)}
            </div>
          `}
        </div>
      </div>
    `;
  }
}