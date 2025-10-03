import { MqttSettings } from '../models/mqtt-settings.model';
import { Device } from '../models/device.model';
import { MQTT_CONFIG, MQTT_COMMANDS, TOPIC_PATTERNS } from '../constants/mqtt.constants';
import { logger } from '../utils/logger.util';
import { safeJsonParse, extractJsonValue } from '../utils/json-parser.util';

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

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'failed';

export interface MqttMessage {
  topic: string;
  payload: any;
}

export class MqttService {
  private client: any = null;
  private connectionTimeout: any = null;
  private status: ConnectionStatus = 'disconnected';
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private messageListeners: Set<(message: MqttMessage) => void> = new Set();

  /**
   * Connects to MQTT broker
   */
  async connect(settings: MqttSettings): Promise<void> {
    if (!settings.host) {
      throw new Error('MQTT host is required');
    }

    this.setStatus('connecting');
    logger.addLog('info', `Connecting to ${settings.host}:${settings.port}`);

    return new Promise((resolve, reject) => {
      this.connectionTimeout = setTimeout(() => {
        this.cleanup();
        this.setStatus('failed');
        const error = new Error('Connection timeout after 15 seconds');
        logger.addLog('error', error.message);
        reject(error);
      }, MQTT_CONFIG.CONNECTION_TIMEOUT);

      try {
        this.client = new window.Paho.MQTT.Client(
          settings.host,
          settings.port,
          MQTT_CONFIG.MQTT_PATH,
          settings.clientId
        );

        this.client.onConnectionLost = this.handleConnectionLost.bind(this);
        this.client.onMessageArrived = this.handleMessageArrived.bind(this);

        const connectOptions: any = {
          onSuccess: () => {
            this.handleConnectSuccess();
            resolve();
          },
          onFailure: (error: any) => {
            this.handleConnectFailure(error);
            reject(error);
          },
          useSSL: settings.useSSL,
          timeout: 10
        };

        if (settings.username) {
          connectOptions.userName = settings.username;
          connectOptions.password = settings.password;
        }

        this.client.connect(connectOptions);
      } catch (error: any) {
        this.cleanup();
        this.setStatus('failed');
        const errorMsg = error?.message || 'Unknown connection error';
        logger.addLog('error', `Connection error: ${errorMsg}`);
        reject(error);
      }
    });
  }

  /**
   * Disconnects from MQTT broker
   */
  disconnect(): void {
    if (this.client && this.isConnected()) {
      try {
        this.client.disconnect();
        logger.addLog('info', 'Disconnected from MQTT broker');
      } catch (error: any) {
        logger.addLog('error', `Disconnect error: ${error.message}`);
      }
    }
    this.setStatus('disconnected');
    this.cleanup();
  }

  /**
   * Cancels ongoing connection attempt
   */
  cancelConnection(): void {
    if (this.status === 'connecting') {
      if (this.client) {
        try {
          this.client.disconnect();
        } catch {
          // Ignore errors during cancellation
        }
      }
      this.setStatus('disconnected');
      this.cleanup();
      logger.addLog('info', 'Connection attempt cancelled');
    }
  }

  /**
   * Subscribes to a topic
   */
  subscribe(topic: string): void {
    if (!this.client || !this.isConnected()) {
      throw new Error('Not connected to MQTT broker');
    }

    try {
      this.client.subscribe(topic);
      logger.addLog('info', `Subscribed to ${topic}`);
    } catch (error: any) {
      logger.addLog('error', `Failed to subscribe to ${topic}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Unsubscribes from a topic
   */
  unsubscribe(topic: string): void {
    if (!this.client || !this.isConnected()) {
      return;
    }

    try {
      this.client.unsubscribe(topic);
      logger.addLog('info', `Unsubscribed from ${topic}`);
    } catch (error: any) {
      logger.addLog('error', `Failed to unsubscribe from ${topic}: ${error.message}`);
    }
  }

  /**
   * Publishes a message to a topic
   */
  publish(topic: string, payload: string): void {
    if (!this.client || !this.isConnected()) {
      throw new Error('Not connected to MQTT broker');
    }

    try {
      const message = new window.Paho.MQTT.Message(payload);
      message.destinationName = topic;
      this.client.send(message);
      logger.addLog('info', `Published to ${topic}: ${payload}`);
    } catch (error: any) {
      logger.addLog('error', `Failed to publish: ${error.message}`);
      throw error;
    }
  }

  /**
   * Subscribes to a device's topics including LWT
   */
  subscribeToDevice(device: Device): void {
    if (device.type === 'switch') {
      this.subscribe(device.statTopic!);
      this.subscribe(device.resultTopic!);

      // Subscribe to LWT for device availability
      if (device.lwtTopic && device.useAutoDiscovery) {
        this.subscribe(device.lwtTopic);
        logger.addLog('info', `Subscribed to LWT: ${device.lwtTopic}`);
      }

      // Subscribe to STATE for telemetry
      if (device.stateTopic && device.useAutoDiscovery) {
        this.subscribe(device.stateTopic);
        logger.addLog('info', `Subscribed to STATE: ${device.stateTopic}`);
      }

      // Request current state
      this.publish(device.commandTopic!, '');
      logger.addLog('info', `Requested state from ${device.name}`);
    } else {
      const topic = device.baseTopic ? TOPIC_PATTERNS.SENSOR(device.baseTopic) : device.topic;
      this.subscribe(topic);

      // Subscribe to LWT for sensor devices too
      if (device.lwtTopic && device.useAutoDiscovery) {
        this.subscribe(device.lwtTopic);
        logger.addLog('info', `Subscribed to sensor LWT: ${device.lwtTopic}`);
      }
    }
  }

  /**
   * Unsubscribes from a device's topics including LWT
   */
  unsubscribeFromDevice(device: Device): void {
    if (device.type === 'switch') {
      this.unsubscribe(device.statTopic!);
      this.unsubscribe(device.resultTopic!);
      if (device.lwtTopic) {
        this.unsubscribe(device.lwtTopic);
      }
      if (device.stateTopic) {
        this.unsubscribe(device.stateTopic);
      }
    } else {
      const topic = device.baseTopic ? TOPIC_PATTERNS.SENSOR(device.baseTopic) : device.topic;
      this.unsubscribe(topic);
      if (device.lwtTopic) {
        this.unsubscribe(device.lwtTopic);
      }
    }
  }

  /**
   * Toggles a switch device
   */
  toggleSwitch(device: Device, turnOn: boolean): void {
    const command = turnOn ? MQTT_COMMANDS.ON : MQTT_COMMANDS.OFF;
    const topic = device.commandTopic || device.topic;
    this.publish(topic, command);
    logger.addLog('info', `Sent ${command} to ${device.name}`);
  }

  /**
   * Checks if connected
   */
  isConnected(): boolean {
    return this.status === 'connected';
  }

  /**
   * Gets current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Subscribes to status changes
   */
  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  /**
   * Subscribes to incoming messages
   */
  onMessage(listener: (message: MqttMessage) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  private handleConnectSuccess(): void {
    this.cleanup();
    this.setStatus('connected');
    logger.addLog('success', 'Successfully connected to MQTT broker');
  }

  private handleConnectionLost(responseObject: any): void {
    this.cleanup();
    this.setStatus('disconnected');
    const errorMsg = responseObject.errorMessage || 'Unknown error';
    logger.addLog('error', `Connection lost: ${errorMsg}`);
  }

  private handleConnectFailure(error: any): void {
    this.cleanup();
    this.setStatus('failed');
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

    logger.addLog('error', userMessage);
  }

  private handleMessageArrived(message: any): void {
    const topic = message.destinationName;
    const payloadString = message.payloadString;
    const payload = safeJsonParse(payloadString);

    logger.addLog('info', `Received: ${topic} - ${payloadString}`);

    this.messageListeners.forEach(listener => {
      listener({ topic, payload });
    });
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.statusListeners.forEach(listener => listener(status));
  }

  private cleanup(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }
}

// Singleton instance
export const mqttService = new MqttService();