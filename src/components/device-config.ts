import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

// Models
import { MqttSettings, DEFAULT_MQTT_SETTINGS } from '../models/mqtt-settings.model';
import { Device, NewDeviceInput, DEFAULT_NEW_DEVICE } from '../models/device.model';
import { LogEntry } from '../models/app-state.model';

// Services
import { mqttService, ConnectionStatus } from '../services/mqtt-service';
import { deviceService } from '../services/device-service';
import { storageService } from '../services/storage-service';
import { notificationService, Notification } from '../services/notification.service';
import { deviceMonitorService } from '../services/device-monitor.service';
import { authService } from '../services/auth.service';

// Utils
import { logger } from '../utils/logger.util';
import { flattenObject } from '../utils/json-parser.util';
import { extractJsonValue } from '../utils/json-parser.util';
import { TOPIC_PATTERNS } from '../constants/mqtt.constants';

@customElement('device-config')
export class DeviceConfig extends LitElement {
  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding-bottom: 80px;
    }

    .config-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    .config-header {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 25px;
      background: white;
      padding: 20px;
      border-radius: 15px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }

    .back-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: rgba(102, 126, 234, 0.1);
      color: #667eea;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 1.2rem;
    }

    .back-button:hover {
      background: rgba(102, 126, 234, 0.2);
      transform: translateX(-2px);
    }

    .logout-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 20px;
      background: rgba(239, 68, 68, 0.1);
      color: #dc2626;
      border: 2px solid rgba(239, 68, 68, 0.2);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .logout-button:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.3);
      transform: translateY(-2px);
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      background: rgba(102, 126, 234, 0.1);
      border-radius: 10px;
      color: #667eea;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .header-text h1 {
      margin: 0;
      font-size: 1.8rem;
      font-weight: 700;
      color: #333;
    }

    .header-text p {
      margin: 5px 0 0;
      color: #666;
      font-size: 1rem;
    }

    .main-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 25px;
      margin-bottom: 25px;
    }

    .section {
      background: white;
      border-radius: 15px;
      padding: 25px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .section-title {
      font-size: 1.3rem;
      font-weight: 600;
      color: #333;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 15px;
    }

    .form-label {
      font-size: 0.9rem;
      font-weight: 500;
      color: #555;
    }

    .form-input {
      padding: 12px 15px;
      border: 2px solid #e1e5e9;
      border-radius: 10px;
      font-size: 1rem;
      transition: all 0.3s ease;
      background: #f8f9fa;
    }

    .form-input:focus {
      outline: none;
      border-color: #667eea;
      background: white;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 10px;
    }

    .checkbox {
      width: 18px;
      height: 18px;
      accent-color: #667eea;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 15px;
      border-radius: 10px;
      margin-bottom: 20px;
      font-weight: 500;
    }

    .connection-status.connected {
      background: rgba(16, 185, 129, 0.1);
      color: #059669;
      border: 2px solid rgba(16, 185, 129, 0.2);
    }

    .connection-status.disconnected {
      background: rgba(239, 68, 68, 0.1);
      color: #dc2626;
      border: 2px solid rgba(239, 68, 68, 0.2);
    }

    .connection-status.connecting {
      background: rgba(251, 191, 36, 0.1);
      color: #d97706;
      border: 2px solid rgba(251, 191, 36, 0.2);
    }

    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
    }

    .status-indicator.connected {
      background: #10b981;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
    }

    .status-indicator.disconnected {
      background: #ef4444;
    }

    .status-indicator.connecting {
      background: #f59e0b;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .button {
      padding: 12px 20px;
      border: none;
      border-radius: 10px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      width: 100%;
      margin-top: 10px;
    }

    .button.primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .button.primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
    }

    .button.secondary {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
    }

    .button.secondary:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(16, 185, 129, 0.3);
    }

    .button.danger {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
    }

    .button.warning {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
    }

    .button:disabled {
      background: #9ca3af;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .notification {
      padding: 15px;
      border-radius: 10px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.9rem;
    }

    .notification.error {
      background: rgba(239, 68, 68, 0.1);
      color: #dc2626;
      border: 2px solid rgba(239, 68, 68, 0.2);
    }

    .notification.success {
      background: rgba(16, 185, 129, 0.1);
      color: #059669;
      border: 2px solid rgba(16, 185, 129, 0.2);
    }

    .notification.warning {
      background: rgba(251, 191, 36, 0.1);
      color: #d97706;
      border: 2px solid rgba(251, 191, 36, 0.2);
    }

    .notification.info {
      background: rgba(59, 130, 246, 0.1);
      color: #2563eb;
      border: 2px solid rgba(59, 130, 246, 0.2);
    }

    .notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    }

    .notification-item {
      padding: 16px 20px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 0.95rem;
      font-weight: 500;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      animation: slideIn 0.3s ease-out;
      cursor: pointer;
      transition: transform 0.2s ease;
    }

    .notification-item:hover {
      transform: translateX(-5px);
    }

    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .notification-item.success {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
    }

    .notification-item.error {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(220, 38, 38, 0.95) 100%);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
    }

    .notification-item.warning {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.95) 0%, rgba(217, 119, 6, 0.95) 100%);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
    }

    .notification-item.info {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.95) 0%, rgba(37, 99, 235, 0.95) 100%);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
    }

    .notification-icon {
      font-size: 1.3rem;
      flex-shrink: 0;
    }

    .notification-message {
      flex: 1;
      line-height: 1.4;
    }

    .notification-close {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      transition: background 0.2s ease;
      flex-shrink: 0;
    }

    .notification-close:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .devices-section {
      background: white;
      border-radius: 15px;
      padding: 25px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      grid-column: 1 / -1;
    }

    .device-type-selector {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }

    .type-option {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 14px 16px;
      background: #ffffff;
      border: 2px solid #e1e5e9;
      border-radius: 12px;
      cursor: pointer;
      user-select: none;
      color: #374151;
      transition: all 0.2s ease;
    }

    .type-option:hover {
      border-color: #667eea;
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.15);
      transform: translateY(-1px);
    }

    .type-option.selected {
      border-color: #667eea;
      background: linear-gradient(135deg, rgba(102,126,234,0.08) 0%, rgba(118,75,162,0.08) 100%);
      box-shadow: inset 0 0 0 2px rgba(102, 126, 234, 0.15);
    }

    .devices-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .device-card {
      background: #f8f9fa;
      border-radius: 15px;
      padding: 20px;
      border: 2px solid #e1e5e9;
      transition: all 0.3s ease;
    }

    .device-card.connected {
      border-color: #10b981;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%);
    }

    .device-card.disconnected {
      border-color: #ef4444;
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(220, 38, 38, 0.05) 100%);
      opacity: 0.7;
    }

    .device-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .device-name {
      font-size: 1.1rem;
      font-weight: 600;
      color: #333;
    }

    .device-status {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.8rem;
      font-weight: 500;
      padding: 4px 8px;
      border-radius: 12px;
    }

    .device-status.connected {
      background: rgba(16, 185, 129, 0.1);
      color: #059669;
    }

    .device-status.disconnected {
      background: rgba(239, 68, 68, 0.1);
      color: #dc2626;
    }

    .device-info {
      margin-bottom: 15px;
    }

    .device-info-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
      font-size: 0.9rem;
    }

    .device-info-label {
      color: #666;
    }

    .device-info-value {
      color: #333;
      font-weight: 500;
      font-family: monospace;
    }

    .device-controls {
      display: flex;
      gap: 10px;
    }

    .toggle-button {
      flex: 1;
      padding: 12px;
      border: none;
      border-radius: 10px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .toggle-button.on {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
    }

    .toggle-button.off {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
    }

    .toggle-button:disabled {
      background: #9ca3af;
      cursor: not-allowed;
      opacity: 0.5;
    }

    .toggle-button:disabled:hover {
      transform: none;
    }

    .remove-button {
      background: #6b7280;
      color: white;
      border: none;
      padding: 12px 15px;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .remove-button:hover {
      background: #ef4444;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }

    .log-section {
      background: #1a1a1a;
      border-radius: 10px;
      padding: 15px;
      margin-top: 20px;
      max-height: 200px;
      overflow-y: auto;
      overflow-x: auto;
      word-wrap: break-word;
      word-break: break-word;
    }

    .log-entry {
      color: #e5e5e5;
      font-family: monospace;
      font-size: 0.8rem;
      margin-bottom: 5px;
      padding: 5px;
      border-radius: 3px;
    white-space: pre-wrap;
    overflow-wrap: break-word;
    }

    .log-entry.info {
      background: rgba(59, 130, 246, 0.1);
      color: #93c5fd;
    }

    .log-entry.success {
      background: rgba(16, 185, 129, 0.1);
      color: #6ee7b7;
    }

    .log-entry.error {
      background: rgba(239, 68, 68, 0.1);
      color: #fca5a5;
    }

    .sensor-values {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
    }

    .sensor-value-item {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #e0f2fe;
    }

    .sensor-value-item:last-child {
      border-bottom: none;
    }

    .sensor-value-label {
      color: #0369a1;
      font-weight: 500;
      font-size: 0.85rem;
    }

    .sensor-value {
      color: #0c4a6e;
      font-weight: 600;
      font-family: monospace;
    }

    .sensor-raw {
      background: #1e293b;
      color: #94a3b8;
      padding: 12px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 0.75rem;
      white-space: pre-wrap;
      overflow-x: auto;
      margin-top: 12px;
    }

    .parser-help {
      margin-top: 8px;
      padding: 12px;
      background: #eff6ff;
      border-left: 3px solid #3b82f6;
      border-radius: 4px;
      font-size: 0.85rem;
      color: #1e40af;
      line-height: 1.6;
    }

    .parser-help code {
      background: #dbeafe;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
      color: #1e3a8a;
    }

    @media (max-width: 768px) {
      .main-grid {
        grid-template-columns: 1fr;
      }
      .devices-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

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

    if (this.mqttSettings.wasConnected && this.mqttSettings.host) {
      logger.addLog('info', 'Attempting to auto-reconnect...');
      setTimeout(() => this.handleConnect(), 1000);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.saveState();
    this.cleanup();
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

  private handleMqttMessage(message: { topic: string; payload: any }): void {
    const { topic, payload } = message;

    deviceService.getDevices().forEach(device => {
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

        // Use monitor service for explicit status
        deviceMonitorService.setDeviceStatus(device.id, isOnline);

        logger.addLog(
          isOnline ? 'success' : 'warning',
          `${device.name} LWT: ${lwtStatus}`
        );

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
          logger.addLog('success', `${device.name} state updated: ${isOn ? 'ON' : 'OFF'}`);
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
          <firebase-dropdown @navigate="${this.handleSettingsNavigation}"></settings-dropdown>
        </div>

        ${this.errorMessage ? html`
          <div class="notification error">⚠️ ${this.errorMessage}</div>
        ` : ''}

        <div class="main-grid">
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