
import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

// Declare Paho MQTT types
declare global {
  interface Window {
    Paho: {
      MQTT: {
        Client: new (host: string, port: number, path: string, clientId: string) => any;
        Message: new (payload: string) => any;
      };
    };
  }
}

interface MqttSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  useSSL: boolean;
  clientId: string;
  wasConnected: boolean;
}

interface Device {
  id: string;
  name: string;
  topic: string;
  baseTopic?: string;
  commandTopic?: string;
  statTopic?: string;
  resultTopic?: string;
  type: 'switch' | 'sensor';
  isConnected: boolean;
  isOn: boolean;
  sensorData?: any;
  jsonPath?: string;
  lastSeen?: Date;
}

interface AppState {
  mqttSettings: MqttSettings;
  devices: Device[];
}

// Persistent state storage using localStorage
const stateStorage = {
  save(state: AppState) {
    localStorage.setItem('appState', JSON.stringify(state));
  },

  load(): AppState | null {
    const raw = localStorage.getItem('appState');
    return raw ? JSON.parse(raw) : null;
  },

  clear() {
    localStorage.removeItem('appState');
  }
};


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

    .button-group {
      display: flex;
      gap: 10px;
    }

    .button-group .button {
      flex: 1;
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
      transition: transform 0.1s ease, box-shadow 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
    }

    .type-option .icon {
      font-size: 1.2rem;
    }

    .type-option:hover {
      border-color: #667eea;
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.15);
      transform: translateY(-1px);
    }

    .type-option:active {
      transform: translateY(0);
      background-color: #f3f4f6;
    }

    .type-option:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.25);
      border-color: #667eea;
    }

    .type-option.selected {
      border-color: #667eea;
      background: linear-gradient(135deg, rgba(102,126,234,0.08) 0%, rgba(118,75,162,0.08) 100%);
      box-shadow: inset 0 0 0 2px rgba(102, 126, 234, 0.15);
      color: #1f2937;
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

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 15px;
      opacity: 0.5;
    }

    .empty-title {
      font-size: 1.3rem;
      font-weight: 600;
      margin-bottom: 8px;
      color: #333;
    }

    .empty-subtitle {
      color: #666;
      font-size: 0.9rem;
    }

    .log-section {
      background: #1a1a1a;
      border-radius: 10px;
      padding: 15px;
      margin-top: 20px;
      max-height: 200px;
      overflow-y: auto;
    }

    .log-entry {
      color: #e5e5e5;
      font-family: monospace;
      font-size: 0.8rem;
      margin-bottom: 5px;
      padding: 5px;
      border-radius: 3px;
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

    .parser-title {
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
      font-size: 0.95rem;
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
      .config-container {
        padding: 15px;
      }

      .main-grid {
        grid-template-columns: 1fr;
      }

      .devices-grid {
        grid-template-columns: 1fr;
      }

      .device-controls {
        flex-direction: column;
      }

      .button-group {
        flex-direction: column;
      }
    }
  `;

  @state() private mqttSettings: MqttSettings = {
    host: 'localhost',
    port: 8080,
    username: '',
    password: '',
    useSSL: false,
    clientId: `tasmota_client_${Math.random().toString(36).substr(2, 9)}`,
    wasConnected: false
  };

  @state() private devices: Device[] = [];
  @state() private newDevice = {
    name: '',
    topic: '',
    baseTopic: '',
    type: 'switch' as 'switch' | 'sensor',
    jsonPath: ''
  };

  @state() private mqttClient: any = null;
  @state() private mqttConnected = false;
  @state() private isConnecting = false;
  @state() private connectionStatus = 'Disconnected';
  @state() private logs: Array<{type: 'info' | 'success' | 'error', message: string, timestamp: Date}> = [];
  @state() private errorMessage = '';

  private connectionTimeout: any = null;

  connectedCallback() {
    super.connectedCallback();
    this.loadState();

    if (this.mqttSettings.wasConnected && this.mqttSettings.host) {
      this.addLog('info', 'Attempting to auto-reconnect...');
      setTimeout(() => this.connectToMqtt(), 1000);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.saveState();
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }
  }

  private loadState() {
    const savedState = stateStorage.load();
    if (savedState) {
      this.mqttSettings = savedState.mqttSettings;
      this.devices = savedState.devices.map(d => ({
        ...d,
        isConnected: false,
        lastSeen: d.lastSeen ? new Date(d.lastSeen) : undefined
      }));
      this.addLog('success', 'Previous configuration loaded');
    }
  }

  private saveState() {
    const state: AppState = {
      mqttSettings: {
        ...this.mqttSettings,
        wasConnected: this.mqttConnected
      },
      devices: this.devices
    };
    stateStorage.save(state);
  }

  private handleBack() {
    this.saveState();
    if (this.mqttClient && this.mqttConnected) {
      this.mqttClient.disconnect();
    }

    const event = new CustomEvent('navigate', {
      detail: { page: 'home' },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  private addLog(type: 'info' | 'success' | 'error', message: string) {
    this.logs = [...this.logs.slice(-49), {
      type,
      message,
      timestamp: new Date()
    }];
  }

  private showError(message: string) {
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }

  private handleMqttSettingChange(e: Event, field: keyof MqttSettings) {
    const target = e.target as HTMLInputElement;
    const value = field === 'port' ? parseInt(target.value) :
                  field === 'useSSL' ? target.checked :
                  target.value;

    this.mqttSettings = { ...this.mqttSettings, [field]: value };
    this.saveState();
  }

  private handleDeviceInputChange(e: Event, field: keyof typeof this.newDevice) {
    const target = e.target as HTMLInputElement;
    this.newDevice = { ...this.newDevice, [field]: target.value };
  }

  private async connectToMqtt() {
    if (!this.mqttSettings.host) {
      this.showError('MQTT host is required');
      this.addLog('error', 'MQTT host is required');
      return;
    }

    this.isConnecting = true;
    this.connectionStatus = 'Connecting...';
    this.errorMessage = '';
    this.addLog('info', `Connecting to ${this.mqttSettings.host}:${this.mqttSettings.port}`);

    this.connectionTimeout = setTimeout(() => {
      if (this.isConnecting) {
        this.cancelConnection();
        this.showError('Connection timeout. Please check your broker settings.');
        this.addLog('error', 'Connection timeout after 15 seconds');
      }
    }, 15000);

    try {
      this.mqttClient = new window.Paho.MQTT.Client(
        this.mqttSettings.host,
        this.mqttSettings.port,
        '/mqtt',
        this.mqttSettings.clientId
      );

      this.mqttClient.onConnectionLost = this.onConnectionLost.bind(this);
      this.mqttClient.onMessageArrived = this.onMessageArrived.bind(this);

      const connectOptions: any = {
        onSuccess: this.onConnect.bind(this),
        onFailure: this.onConnectionFailure.bind(this),
        useSSL: this.mqttSettings.useSSL,
        timeout: 10
      };

      if (this.mqttSettings.username) {
        connectOptions.userName = this.mqttSettings.username;
        connectOptions.password = this.mqttSettings.password;
      }

      this.mqttClient.connect(connectOptions);

    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown connection error';
      this.showError(`Connection error: ${errorMsg}`);
      this.addLog('error', `Connection error: ${errorMsg}`);
      this.isConnecting = false;
      this.connectionStatus = 'Connection failed';
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
      }
    }
  }

  private cancelConnection() {
    if (this.isConnecting) {
      if (this.mqttClient) {
        try {
          this.mqttClient.disconnect();
        } catch (e) {
          // Ignore errors during cancellation
        }
      }
      this.isConnecting = false;
      this.connectionStatus = 'Connection cancelled';
      this.addLog('info', 'Connection attempt cancelled');

      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
      }
    }
  }

  private onConnect() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }

    this.mqttConnected = true;
    this.isConnecting = false;
    this.connectionStatus = 'Connected';
    this.errorMessage = '';
    this.addLog('success', 'Successfully connected to MQTT broker');
    this.saveState();

    this.devices.forEach(device => {
      try {
        if (device.type === 'switch') {
          // use prepared stat/result topics if available
          const statPowerTopic = device.statTopic || device.topic.replace('/cmnd/', '/stat/');
          const resultTopic = device.resultTopic || statPowerTopic.replace('/POWER', '/RESULT');

          this.mqttClient.subscribe(statPowerTopic);
          this.mqttClient.subscribe(resultTopic);
          this.addLog('info', `Subscribed to ${statPowerTopic} and ${resultTopic}`);

          // Request current state immediately after connecting
          const message = new window.Paho.MQTT.Message('');
          message.destinationName = device.commandTopic || device.topic;
          this.mqttClient.send(message);
          this.addLog('info', `Requested state from ${device.name}`);
        } else {
          const sub = device.baseTopic ? `tele/${device.baseTopic}/SENSOR` : device.topic;
          this.mqttClient.subscribe(sub);
          this.addLog('info', `Subscribed to sensor topic: ${sub}`);
        }
      } catch (error: any) {
        this.addLog('error', `Failed to subscribe to ${device.topic}: ${error.message}`);
      }
    });
  }

  private onConnectionLost(responseObject: any) {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }

    this.mqttConnected = false;
    this.connectionStatus = 'Connection lost';
    const errorMsg = responseObject.errorMessage || 'Unknown error';
    this.showError(`Connection lost: ${errorMsg}`);
    this.addLog('error', `Connection lost: ${errorMsg}`);
    this.saveState();

    this.devices = this.devices.map(device => ({
      ...device,
      isConnected: false
    }));
  }

  private onConnectionFailure(error: any) {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }

    this.isConnecting = false;
    this.connectionStatus = 'Connection failed';
    const errorMsg = error.errorMessage || error.message || 'Unknown error';

    let userMessage = 'Connection failed. ';
    if (errorMsg.includes('AMQJS0007E')) {
      userMessage += 'WebSocket connection failed. Please check if your MQTT broker supports WebSockets and the port is correct.';
    } else if (errorMsg.includes('AMQJS0008I')) {
      userMessage += 'Connection closed. The broker may have rejected the connection.';
    } else if (errorMsg.includes('timeout')) {
      userMessage += 'Connection timeout. Please check your broker address and network connection.';
    } else {
      userMessage += errorMsg;
    }

    this.showError(userMessage);
    this.addLog('error', `Connection failed: ${errorMsg}`);
  }

  private extractJsonValue(jsonData: any, path: string): any {
    if (!path) return jsonData;

    const keys = path.split('.');
    let value = jsonData;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }

    return value;
  }

  private flattenObject(obj: any, prefix = ''): Record<string, any> {
    const flattened: Record<string, any> = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          Object.assign(flattened, this.flattenObject(value, newKey));
        } else {
          flattened[newKey] = value;
        }
      }
    }

    return flattened;
  }

  private onMessageArrived(message: any) {
    const topic = message.destinationName;
    const payload = message.payloadString;

    this.addLog('info', `Received: ${topic} - ${payload}`);

    // try JSON parse, but stat/<device>/POWER from Tasmota may be plain "ON"/"OFF"
    let data: any = payload;
    try {
      data = JSON.parse(payload);
    } catch {
      // keep payload as string for simple POWER topics
    }

    this.devices = this.devices.map(device => {
      // switch devices: check statTopic and resultTopic (or compute them)
      if (device.type === 'switch') {
        const statPowerTopic = device.statTopic || (device.commandTopic || device.topic).replace('/cmnd/', '/stat/');
        const resultTopic = device.resultTopic || statPowerTopic.replace('/POWER', '/RESULT');

        if (topic === statPowerTopic || topic === resultTopic) {
          let isOn = device.isOn;

          if (typeof data === 'object') {
            if (data.POWER !== undefined) {
              isOn = data.POWER === 'ON';
            } else if (data.POWER1 !== undefined) {
              isOn = data.POWER1 === 'ON';
            } else if (data.RESULT && data.RESULT.POWER !== undefined) {
              isOn = data.RESULT.POWER === 'ON';
            } else if (data === 'ON' || data === 'OFF') {
              isOn = data === 'ON';
            }
          } else if (typeof data === 'string') {
            isOn = data === 'ON';
          }

          this.addLog('success', `${device.name} state updated: ${isOn ? 'ON' : 'OFF'}`);

          return {
            ...device,
            isConnected: true,
            isOn,
            lastSeen: new Date()
          };
        }
      }

      // sensors
      else if (device.type === 'sensor') {
        const sensorTopic = device.baseTopic ? `tele/${device.baseTopic}/SENSOR` : device.topic;
        if (topic === sensorTopic) {
          let sensorData = data;
          if (device.jsonPath) {
            const extracted = this.extractJsonValue(data, device.jsonPath);
            sensorData = extracted !== null ? extracted : data;
          }
          return {
            ...device,
            isConnected: true,
            sensorData,
            lastSeen: new Date()
          };
        }
      }

      return device;
    });

    this.saveState();
  }

  private disconnectMqtt() {
    if (this.mqttClient && this.mqttConnected) {
      try {
        this.mqttClient.disconnect();
        this.addLog('info', 'Disconnected from MQTT broker');
      } catch (error: any) {
        this.addLog('error', `Disconnect error: ${error.message}`);
      }
    }
    this.mqttConnected = false;
    this.connectionStatus = 'Disconnected';
    this.saveState();
  }

  private addDevice() {
    if (!this.newDevice.name || (!this.newDevice.topic && !this.newDevice.baseTopic)) {
      this.showError('Device name and either command topic or base Tasmota topic are required');
      this.addLog('error', 'Device name and either command topic or base Tasmota topic are required');
      return;
    }

    const base = this.newDevice.baseTopic?.trim();
    const commandTopic = base
      ? `cmnd/${base}/POWER`
      : this.newDevice.topic;
    const statTopic = base
      ? `stat/${base}/POWER`
      : this.newDevice.topic.replace(/cmnd\//, 'stat/').replace(/\/POWER$/, '/POWER');
    const resultTopic = base
      ? `stat/${base}/RESULT`
      : statTopic.replace(/\/POWER$/, '/RESULT');

    const device: Device = {
      id: Date.now().toString(),
      name: this.newDevice.name,
      topic: commandTopic,
      baseTopic: base || undefined,
      commandTopic,
      statTopic,
      resultTopic,
      type: this.newDevice.type,
      isConnected: this.mqttConnected,
      isOn: false,
      jsonPath: this.newDevice.jsonPath || undefined
    };

    this.devices = [...this.devices, device];
    this.addLog('success', `Added ${device.type} device: ${device.name}`);
    this.saveState();

    if (this.mqttConnected) {
      try {
        if (device.type === 'switch') {
          this.mqttClient.subscribe(device.statTopic);
          this.mqttClient.subscribe(device.resultTopic);
          this.addLog('info', `Subscribed to ${device.statTopic} and ${device.resultTopic}`);
          // Request current state by sending empty message to command topic (Tasmota will reply on stat)
          const message = new window.Paho.MQTT.Message('');
          message.destinationName = device.commandTopic;
          this.mqttClient.send(message);
          this.addLog('info', `Requested state from ${device.name}`);
        } else {
          const subscribeTopic = device.baseTopic ? `tele/${device.baseTopic}/SENSOR` : device.topic;
          this.mqttClient.subscribe(subscribeTopic);
          this.addLog('info', `Subscribed to sensor topic: ${subscribeTopic}`);
        }
      } catch (error: any) {
        this.addLog('error', `Failed to subscribe: ${error.message}`);
      }
    }

    this.newDevice = { name: '', topic: '', baseTopic: '', type: 'switch', jsonPath: '' };
  }

  private toggleDevice(device: Device) {
    if (!this.mqttConnected) {
      this.showError('Not connected to MQTT broker');
      this.addLog('error', 'Not connected to MQTT broker');
      return;
    }

    try {
      const command = device.isOn ? 'OFF' : 'ON';
      const destination = device.commandTopic || device.topic;
      const message = new window.Paho.MQTT.Message(command);
      message.destinationName = destination;

      this.mqttClient.send(message);
      this.addLog('info', `Sent ${command} to ${device.name} (${destination})`);

      // optimistic UI update; final state will come from broker stat topic
      this.devices = this.devices.map(d =>
        d.id === device.id ? { ...d, isOn: !d.isOn, lastSeen: new Date() } : d
      );
      this.saveState();
    } catch (error: any) {
      this.showError(`Failed to send command: ${error.message}`);
      this.addLog('error', `Failed to send command: ${error.message}`);
    }
  }



  private removeDevice(deviceId: string) {
    if (confirm('Are you sure you want to remove this device?')) {
      const device = this.devices.find(d => d.id === deviceId);
      if (device && this.mqttConnected) {
        try {
          if (device.type === 'switch') {
            this.mqttClient.unsubscribe(device.resultTopic);
            this.mqttClient.unsubscribe(device.statTopic);
          } else {
            const sub = device.baseTopic ? `tele/${device.baseTopic}/SENSOR` : device.topic;
            this.mqttClient.unsubscribe(sub);
          }
        } catch (error: any) {
          this.addLog('error', `Failed to unsubscribe: ${error.message}`);
        }
      }

      this.devices = this.devices.filter(d => d.id !== deviceId);
      this.addLog('info', `Removed device: ${device?.name || deviceId}`);
      this.saveState();
    }
  }

  private handleTypeSelect(type: 'switch' | 'sensor') {
    this.newDevice = {
      ...this.newDevice,
      type,
      jsonPath: type === 'switch' ? '' : this.newDevice.jsonPath
    };
    this.requestUpdate();
  }

  private onTypeOptionKeydown(e: KeyboardEvent, type: 'switch' | 'sensor') {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.handleTypeSelect(type);
    }
  }

  render() {
    return html`
      <div class="config-container">
        <div class="config-header">
          <button class="back-button" @click="${this.handleBack}">
            ←
          </button>
          <div class="header-text">
            <h1>Tasmota MQTT Controller</h1>
            <p>Configure MQTT connection and manage your Tasmota devices</p>
          </div>
        </div>

        ${this.errorMessage ? html`
          <div class="notification error">
            ⚠️ ${this.errorMessage}
          </div>
        ` : ''}

        <div class="main-grid">
          <div class="section">
            <div class="section-title">
              🔗 MQTT Connection Settings
            </div>

            <div class="connection-status ${this.mqttConnected ? 'connected' : this.isConnecting ? 'connecting' : 'disconnected'}">
              <span class="status-indicator ${this.mqttConnected ? 'connected' : this.isConnecting ? 'connecting' : 'disconnected'}"></span>
              ${this.connectionStatus}
            </div>

            <div class="form-group">
              <label class="form-label">MQTT Broker Host</label>
              <input
                type="text"
                class="form-input"
                placeholder="e.g., 192.168.1.100 or broker.hivemq.com"
                .value="${this.mqttSettings.host}"
                @input="${(e: Event) => this.handleMqttSettingChange(e, 'host')}"
                ?disabled="${this.mqttConnected || this.isConnecting}"
              />
            </div>

            <div class="form-group">
              <label class="form-label">WebSocket Port</label>
              <input
                type="number"
                class="form-input"
                placeholder="8080"
                .value="${this.mqttSettings.port}"
                @input="${(e: Event) => this.handleMqttSettingChange(e, 'port')}"
                ?disabled="${this.mqttConnected || this.isConnecting}"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Username (optional)</label>
              <input
                type="text"
                class="form-input"
                .value="${this.mqttSettings.username}"
                @input="${(e: Event) => this.handleMqttSettingChange(e, 'username')}"
                ?disabled="${this.mqttConnected || this.isConnecting}"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Password (optional)</label>
              <input
                type="password"
                class="form-input"
                .value="${this.mqttSettings.password}"
                @input="${(e: Event) => this.handleMqttSettingChange(e, 'password')}"
                ?disabled="${this.mqttConnected || this.isConnecting}"
              />
            </div>

            <div class="checkbox-group">
              <input
                type="checkbox"
                class="checkbox"
                .checked="${this.mqttSettings.useSSL}"
                @change="${(e: Event) => this.handleMqttSettingChange(e, 'useSSL')}"
                ?disabled="${this.mqttConnected || this.isConnecting}"
              />
              <label class="form-label">Use SSL/TLS (WSS)</label>
            </div>

            <div class="form-group">
              <label class="form-label">Client ID</label>
              <input
                type="text"
                class="form-input"
                .value="${this.mqttSettings.clientId}"
                @input="${(e: Event) => this.handleMqttSettingChange(e, 'clientId')}"
                ?disabled="${this.mqttConnected || this.isConnecting}"
              />
            </div>

            ${this.isConnecting ? html`
              <button class="button warning" @click="${this.cancelConnection}">
                Cancel Connection
              </button>
            ` : this.mqttConnected ? html`
              <button class="button danger" @click="${this.disconnectMqtt}">
                Disconnect
              </button>
            ` : html`
              <button
                class="button primary"
                @click="${this.connectToMqtt}"
              >
                Connect to MQTT
              </button>
            `}
          </div>

          <div class="section">
            <div class="section-title">
              📱 Device Management
            </div>

            <div class="device-type-selector">
              <div
                class="type-option ${this.newDevice.type === 'switch' ? 'selected' : ''}"
                role="button"
                tabindex="0"
                aria-pressed="${this.newDevice.type === 'switch'}"
                aria-label="Select switch device type"
                @click="${() => this.handleTypeSelect('switch')}"
                @keydown="${(e: KeyboardEvent) => this.onTypeOptionKeydown(e, 'switch')}"
              >
                <div class="icon">💡</div>
                <div>Switch</div>
              </div>
              <div
                class="type-option ${this.newDevice.type === 'sensor' ? 'selected' : ''}"
                role="button"
                tabindex="0"
                aria-pressed="${this.newDevice.type === 'sensor'}"
                aria-label="Select sensor device type"
                @click="${() => this.handleTypeSelect('sensor')}"
                @keydown="${(e: KeyboardEvent) => this.onTypeOptionKeydown(e, 'sensor')}"
              >
                <div class="icon">🌡️</div>
                <div>Sensor</div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Device Name</label>
              <input
                type="text"
                class="form-input"
                placeholder="${this.newDevice.type === 'switch' ? 'e.g., Living Room Light' : 'e.g., Temperature Sensor'}"
                .value="${this.newDevice.name}"
                @input="${(e: Event) => this.handleDeviceInputChange(e, 'name')}"
              />
            </div>

            <div class="form-group">
              <label class="form-label">
                ${this.newDevice.type === 'switch' ? 'MQTT Command Topic' : 'MQTT Telemetry Topic'}
              </label>

              <input
                type="text"
                class="form-input"
                placeholder="Tasmota device id e.g., tasmota_110CE1 (preferred)"
                .value="${this.newDevice.baseTopic}"
                @input="${(e: Event) => this.handleDeviceInputChange(e, 'baseTopic')}"
              />

              <div style="height:8px"></div>

              <input
                type="text"
                class="form-input"
                placeholder="${this.newDevice.type === 'switch' ? 'e.g., cmnd/tasmota_device/POWER' : 'e.g., tele/tasmota_110CE1/SENSOR'}"
                .value="${this.newDevice.topic}"
                @input="${(e: Event) => this.handleDeviceInputChange(e, 'topic')}"
              />

              <div class="parser-help" style="margin-top:8px">
                Tip: For most Tasmota installs type the device id (wildcard) like <code>tasmota_110CE1</code> above.
                The app will build subscriptions for <code>stat/&lt;id&gt;/POWER</code> and <code>stat/&lt;id&gt;/RESULT</code>.
                Use the full topic field only when your broker topics are non-standard.
              </div>
            </div>

            ${this.newDevice.type === 'sensor' ? html`
              <div class="sensor-parser">
                <div class="parser-title">JSON Path Parser (Optional)</div>
                <div class="form-group">
                  <input
                    type="text"
                    class="form-input"
                    placeholder="e.g., AM2301 or leave empty for full JSON"
                    .value="${this.newDevice.jsonPath}"
                    @input="${(e: Event) => this.handleDeviceInputChange(e, 'jsonPath')}"
                  />
                  <div class="parser-help">
                    <strong>Examples:</strong><br>
                    • <code>AM2301</code> - Extract only AM2301 object<br>
                    • <code>AM2301.Temperature</code> - Extract just temperature value<br>
                    • Leave empty to show full JSON payload
                  </div>
                </div>
              </div>
            ` : ''}

            <button
              class="button secondary"
              @click="${this.addDevice}"
              ?disabled="${!this.newDevice.name || (!this.newDevice.topic && !this.newDevice.baseTopic)}"
            >
              Add ${this.newDevice.type === 'switch' ? 'Switch' : 'Sensor'} Device
            </button>

            <div class="log-section">
              <div style="color: #9ca3af; font-size: 0.8rem; margin-bottom: 10px;">MQTT Activity Log:</div>
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
          <div class="section-title">
            🏠 Connected Devices (${this.devices.length})
          </div>

          ${this.devices.length === 0 ? html`
            <div class="empty-state">
              <div class="empty-icon">📱</div>
              <div class="empty-title">No devices configured</div>
              <div class="empty-subtitle">Add your first Tasmota device above to get started</div>
            </div>
          ` : html`
            <div class="devices-grid">
              ${this.devices.map(device => html`
                <div class="device-card ${device.type === 'sensor' ? 'sensor-card' : device.isConnected ? 'connected' : 'disconnected'}">
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
                      <span class="device-info-value">${device.type === 'switch' ? 'Switch' : 'Sensor'}</span>
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
                    ${device.lastSeen ? html`
                      <div class="device-info-item">
                        <span class="device-info-label">Last Seen:</span>
                        <span class="device-info-value">${device.lastSeen.toLocaleTimeString()}</span>
                      </div>
                    ` : ''}
                    ${device.jsonPath ? html`
                      <div class="device-info-item">
                        <span class="device-info-label">JSON Path:</span>
                        <span class="device-info-value">${device.jsonPath}</span>
                      </div>
                    ` : ''}
                    ${device.baseTopic ? html`
                      <div class="device-info-item">
                        <span class="device-info-label">Tasmota ID:</span>
                        <span class="device-info-value">${device.baseTopic}</span>
                      </div>
                    ` : ''}
                  </div>

                  ${device.type === 'sensor' && device.sensorData ? html`
                    <div class="sensor-values">
                      ${Object.entries(this.flattenObject(device.sensorData)).map(([key, value]) => html`
                        <div class="sensor-value-item">
                          <div class="sensor-value-label">${key}</div>
                          <div class="sensor-value">${value}</div>
                        </div>
                      `)}
                    </div>
                    <div class="sensor-raw">
                      ${JSON.stringify(device.sensorData, null, 2)}
                    </div>
                  ` : ''}

                  <div class="device-controls">
                    ${device.type === 'switch' ? html`
                      <button
                        class="toggle-button ${device.isOn ? 'on' : 'off'}"
                        @click="${() => this.toggleDevice(device)}"
                        ?disabled="${!this.mqttConnected}"
                      >
                        ${device.isOn ? 'Turn OFF' : 'Turn ON'}
                      </button>
                    ` : ''}
                    <button
                      class="remove-button"
                      @click="${() => this.removeDevice(device.id)}"
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
