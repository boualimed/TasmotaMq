import { MqttSettings } from '../models/mqtt-settings.model';
import { Device, TasmotaTimer } from '../models/device.model';
import { MQTT_CONFIG, MQTT_COMMANDS, TOPIC_PATTERNS, TIMER_COMMANDS } from '../constants/mqtt.constants';
import { logger } from '../utils/logger.util';
import { safeJsonParse } from '../utils/json-parser.util';
import { CommandType } from './command-shield.service';


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
  isRetained?: boolean;
}

export interface CommandTracker {
  commandId: string;
  topic: string;
  payload: string;
  timestamp: Date;
  status: 'pending' | 'acknowledged' | 'timeout' | 'failed';
  retryCount: number;
}
export interface QueuedCommand {
  topic: string;
  payload: string;
  qos: number;
  timestamp: Date;
}

enum CommandPriority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2
}

export class MqttService {
  private client: any = null;
  private connectionTimeout: any = null;
  private status: ConnectionStatus = 'disconnected';
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private messageListeners: Set<(message: MqttMessage) => void> = new Set();

  private telegramHandler: any = null;
  private deviceService: any = null;
  private telegramHandlerReady = false;

  // Command acknowledgment tracking
  private commandTrackers = new Map<string, CommandTracker>();
  private readonly COMMAND_TIMEOUT = 5000;
  private readonly MAX_RETRIES = 3;

   // Message deduplication
   private messageCache = new Map<string, { hash: string; timestamp: number }>();
  private readonly MESSAGE_CACHE_TTL = 2000;

  // Device locking for race condition prevention
  private deviceLocks = new Map<string, Promise<void>>();

  // Reconnection logic
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];
  private reconnectTimer: any = null;
  private lastSettings: MqttSettings | null = null;
  private connectionPromise: Promise<void> | null = null;

  // Offline command queue
  private commandQueue: QueuedCommand[] = [];
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly QUEUE_EXPIRY_MS = 30000;

   // 🛡️ Track if shield is registered
   private shieldRegistered = false;
   private shieldService: any = null;

  // =============================================================================
  // 🛡️ SHIELD REGISTRATION
  // =============================================================================

  /**
   * ✅ Called by command-shield to register itself
   * This creates a bidirectional link between shield and MQTT
   */
  registerCommandShield(shieldService: any): void {
    this.shieldService = shieldService;
    this.shieldRegistered = true;
    logger.addLog('success', '🛡️ Command Shield registered with MQTT service');
  }

  /**
   * ✅ Check if shield is active
   */
  isShieldActive(): boolean {
    return this.shieldRegistered && this.shieldService !== null;
  }


  //  Shutter command locking
  private shutterCommandLocks = new Map<string, {
    inProgress: boolean;
    lastCommand: Date;
    lastCommandType: string;
  }>();
  private readonly SHUTTER_COMMAND_COOLDOWN = 500;

  //  Pending Telegram checks
  private pendingTelegramChecks: Array<{
    topic: string;
    payload: any;
    timestamp: Date;
  }> = [];
  private readonly MAX_PENDING_CHECKS = 50;

  /**
   * Connects to MQTT broker
   */

   /**
   *  Connects to MQTT broker with race condition prevention
   */
   async connect(settings: MqttSettings): Promise<void> {
    // Prevent multiple simultaneous connections
    if (this.connectionPromise) {
      logger.addLog('warning', 'Connection already in progress, waiting...');
      return this.connectionPromise;
    }

    // Check if already connected
    if (this.status === 'connected') {
      logger.addLog('info', 'Already connected');
      return Promise.resolve();
    }

    // Store settings for reconnection
    this.lastSettings = settings;

    this.connectionPromise = this.performConnect(settings);

    try {
      await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
    }
  }

  private async performConnect(settings: MqttSettings): Promise<void> {
    if (!settings.host) {
      throw new Error('MQTT host is required');
    }

    this.setStatus('connecting');
    logger.addLog('info', `Connecting to ${settings.host}:${settings.port}`);

    return new Promise((resolve, reject) => {
      this.connectionTimeout = setTimeout(() => {
        this.performFullCleanup();
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
        this.performFullCleanup();
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

  /**
   * ✅ FIXED: Disconnects with complete cleanup
   */
  disconnect(): void {
    logger.addLog('info', 'Disconnecting from MQTT broker...');

    // Clear reconnection
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
    this.lastSettings = null;

    if (this.client && this.isConnected()) {
      try {
        this.client.disconnect();
        logger.addLog('info', 'Disconnected from MQTT broker');
      } catch (error: any) {
        logger.addLog('error', `Disconnect error: ${error.message}`);
      }
    }

    this.setStatus('disconnected');
    this.performFullCleanup();
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

   /**
   * ✅ FIXED: Subscribes with confirmation
   */
   subscribe(topic: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.isConnected()) {
        reject(new Error('Not connected to MQTT broker'));
        return;
      }

      try {
        this.client.subscribe(topic, {
          qos: 1,
          onSuccess: () => {
            logger.addLog('success', `✅ Confirmed subscription: ${topic}`);
            resolve();
          },
          onFailure: (error: any) => {
            const errorMsg = error.errorMessage || 'Unknown error';
            logger.addLog('error', `❌ Subscription failed: ${topic} - ${errorMsg}`);
            reject(new Error(`Subscription failed: ${errorMsg}`));
          },
          timeout: 5
        });
      } catch (error: any) {
        logger.addLog('error', `Subscription error: ${error.message}`);
        reject(error);
      }
    });
  }


  /**
   * Unsubscribes from a topic
   */

  /**
   * ✅ FIXED: Unsubscribes with confirmation
   */
  unsubscribe(topic: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.client || !this.isConnected()) {
        resolve(); // Already disconnected
        return;
      }

      try {
        this.client.unsubscribe(topic, {
          onSuccess: () => {
            logger.addLog('info', `✅ Unsubscribed from ${topic}`);
            resolve();
          },
          onFailure: (error: any) => {
            logger.addLog('warning', `⚠️ Unsubscribe failed: ${topic}`);
            resolve(); // Don't reject
          },
          timeout: 3
        });
      } catch (error: any) {
        logger.addLog('error', `Unsubscribe error: ${error.message}`);
        resolve(); // Don't reject
      }
    });
  }


  /**
   * Publishes a message to a topic
   */

  /**
   * ✅ FIXED: Publishes with QoS management and offline queueing
   */
  publish(topic: string, payload: string, qosOverride?: number): void {
    // Queue if offline
    if (!this.client || !this.isConnected()) {
      if (this.commandQueue.length < this.MAX_QUEUE_SIZE) {
        const qos = qosOverride ?? this.getQoSForCommand(topic, payload);
        this.commandQueue.push({
          topic,
          payload,
          qos,
          timestamp: new Date()
        });
        logger.addLog('warning', `⏳ Queued command (offline): ${topic}`);
        return;
      } else {
        throw new Error('Command queue full. MQTT not connected.');
      }
    }

    const qos = qosOverride ?? this.getQoSForCommand(topic, payload);

    try {
      const message = new window.Paho.MQTT.Message(payload);
      message.destinationName = topic;
      message.qos = qos;
      message.retained = false;

      this.client.send(message);
      logger.addLog('info', `Published (QoS ${qos}): ${topic} = ${payload}`);
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
    }
    else if (device.type === 'dimmer') {
      if (device.resultTopic) {
        this.subscribe(device.resultTopic);
      }

      // Subscribe to the specific power channel for dimmer power status
      const powerChannel = device.powerChannel || 2;
      const powerName = `POWER${powerChannel}`;

      if (device.baseTopic) {
        const powerTopic = `stat/${device.baseTopic}/${powerName}`;
        this.subscribe(powerTopic);
        logger.addLog('info', `Subscribed to dimmer power: ${powerTopic}`);
      }

      if (device.lwtTopic && device.useAutoDiscovery) {
        this.subscribe(device.lwtTopic);
        logger.addLog('info', `Subscribed to dimmer LWT: ${device.lwtTopic}`);
      }

      if (device.stateTopic && device.useAutoDiscovery) {
        this.subscribe(device.stateTopic);
      }

      if (device.commandTopic) {
        this.publish(device.commandTopic, '');
        if (device.baseTopic) {
          const powerCommandTopic = `cmnd/${device.baseTopic}/${powerName}`;
          this.publish(powerCommandTopic, '');
        }
      }
    } else {
      const topic = device.baseTopic ? TOPIC_PATTERNS.SENSOR(device.baseTopic) : device.topic;
      this.subscribe(topic);

      // Subscribe to LWT for sensor devices too
      if (device.lwtTopic && device.useAutoDiscovery) {
        this.subscribe(device.lwtTopic);
        logger.addLog('info', `Subscribed to sensor LWT: ${device.lwtTopic}`);
      }
    }
     // Log Telegram monitoring status
     if (this.telegramHandler) {
      const alertConfig = this.telegramHandler.getAlertConfig(device.id);
      if (alertConfig?.enabled) {
        console.log(`📱 [MQTT-Telegram] Real-time monitoring enabled for ${device.name}`);
        logger.addLog('info', `📱 Telegram monitoring: ${device.name}`);
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
    }
    else if (device.type === 'dimmer') {
      if (device.resultTopic) {
        this.unsubscribe(device.resultTopic);
      }
      if (device.baseTopic) {
        const powerChannel = device.powerChannel || 2;
        const powerName = `POWER${powerChannel}`;
        const powerTopic = `stat/${device.baseTopic}/${powerName}`;
        this.unsubscribe(powerTopic);
      }
      if (device.lwtTopic) {
        this.unsubscribe(device.lwtTopic);
      }
      if (device.stateTopic) {
        this.unsubscribe(device.stateTopic);
      }
    }
    else {
      const topic = device.baseTopic ? TOPIC_PATTERNS.SENSOR(device.baseTopic) : device.topic;
      this.unsubscribe(topic);
      if (device.lwtTopic) {
        this.unsubscribe(device.lwtTopic);
      }
    }
  }

 /**
   * ⚠️ DEPRECATED: Use commandShield.executeCommand() instead
   * This method is kept for backward compatibility but logs warnings
   */
 /**toggleSwitch(device: Device, turnOn: boolean): void {
  console.warn('⚠️ DEPRECATED: toggleSwitch() bypasses Command Shield!');
  console.warn('⚠️ Use: await commandShield.executeCommand(device, "switch.on", true)');
  logger.addLog('warning', '⚠️ Direct MQTT call detected (unsafe): toggleSwitch()');

  // If shield is registered, block direct access
  if (this.isShieldActive()) {
    const error = '🚫 BLOCKED: Direct MQTT commands are disabled. Use commandShield.executeCommand()';
    logger.addLog('error', error);
    throw new Error(error);
  }

  // Legacy fallback (only if shield not registered)
  this._internalToggleSwitch(device, turnOn);
}**/

public toggleSwitch(device: Device, state?: boolean): void {
  console.warn('⚠️ DEPRECATED: toggleSwitch() called directly. Use commandShield.executeCommand() instead.');
  logger.addLog('warning', '⚠️ Direct MQTT call bypassing shield - this is deprecated');

  // Still execute for backward compatibility, but log the warning
  this._internalToggleSwitch(device, state);
}

  /**
   * Checks if connected
   */

  /**
   * ✅ FIXED: Checks connection properly
   */
  isConnected(): boolean {
    return this.status === 'connected' &&
           this.client !== null &&
           typeof this.client.isConnected === 'function' &&
           this.client.isConnected();
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


  /**
   * ✅ FIXED: Handle connection success with queue flushing
   */
  private handleConnectSuccess(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    this.setStatus('connected');
    this.reconnectAttempts = 0; // Reset reconnect counter
    logger.addLog('success', 'Successfully connected to MQTT broker');

    // Flush queued commands
    this.flushCommandQueue().catch(error => {
      logger.addLog('error', `Failed to flush command queue: ${error.message}`);
    });
  }

  /**
   * ✅ FIXED: Handle connection lost with auto-reconnect
   */
  private handleConnectionLost(responseObject: any): void {
    this.performFullCleanup();
    this.setStatus('disconnected');
    const errorMsg = responseObject.errorMessage || 'Unknown error';
    logger.addLog('error', `Connection lost: ${errorMsg}`);

    // Attempt automatic reconnection
    if (this.lastSettings && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.scheduleReconnect();
    } else if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      logger.addLog('error', '❌ Max reconnection attempts reached');
      this.reconnectAttempts = 0;
    }
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

   /**
   * ✅ FIXED: Handle message arrival with deduplication
   */
   private handleMessageArrived(message: any): void {
    const topic = message.destinationName;
    const payloadString = message.payloadString;
    const isRetained = message.retained || false;

    // Generate message hash for deduplication
    const messageHash = this.hashMessage(topic, payloadString);
    if (this.isDuplicate(messageHash)) {
      logger.addLog('warning', `Duplicate message ignored: ${topic}`);
      return;
    }

    // Cache message
    this.cacheMessage(messageHash);

    const payload = safeJsonParse(payloadString);
    logger.addLog('info', `Received${isRetained ? ' (retained)' : ''}: ${topic}`);

    this.checkTelegramAlerts(topic, payload);

    this.messageListeners.forEach(listener => {
      listener({ topic, payload, isRetained });
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

  /**
   * ⚠️ DEPRECATED: Use commandShield.executeCommand() instead
   */
  setDimmer(device: Device, value: number): void {
    console.warn('⚠️ DEPRECATED: setDimmer() bypasses Command Shield!');
    logger.addLog('warning', '⚠️ Direct MQTT call detected (unsafe): setDimmer()');

    if (this.isShieldActive()) {
      const error = '🚫 BLOCKED: Direct MQTT commands are disabled. Use commandShield.executeCommand()';
      logger.addLog('error', error);
      throw new Error(error);
    }

    this._internalSetDimmer(device, value);
  }



  /**
   * Configure a specific timer
   */
 /** setTimer(device: Device, timerId: number, timer: Partial<TasmotaTimer>): void {
    if (!this.isConnected()) {
      throw new Error('MQTT not connected');
    }

    if (timerId < 1 || timerId > 16) {
      throw new Error('Timer ID must be between 1 and 16');
    }

    const topic = TOPIC_PATTERNS.TIMER_COMMAND(device.baseTopic!, timerId);

    const payload: any = {};

    if (timer.enabled !== undefined) payload.Enable = timer.enabled ? 1 : 0;
    if (timer.mode !== undefined) payload.Mode = timer.mode;
    if (timer.time !== undefined) payload.Time = timer.time;
    if (timer.window !== undefined) payload.Window = timer.window;
    if (timer.days !== undefined) payload.Days = timer.days;
    if (timer.repeat !== undefined) payload.Repeat = timer.repeat ? 1 : 0;
    if (timer.output !== undefined) payload.Output = timer.output;
    if (timer.action !== undefined) payload.Action = timer.action;

    this.publish(topic, JSON.stringify(payload));
  }**/

    public setTimer(device: Device, timerId: number, timer: Partial<TasmotaTimer>): void {
      console.warn('⚠️ DEPRECATED: setTimer() called directly. Use commandShield.executeCommand() instead.');
      logger.addLog('warning', '⚠️ Direct MQTT call bypassing shield - this is deprecated');

      // Still execute for backward compatibility, but log the warning
      this._internalSetTimer(device, timerId, timer);
    }


  /**
   * Enable/disable a specific timer
   */
  toggleTimer(device: Device, timerId: number, enabled: boolean): void {
    if (!this.isConnected()) {
      throw new Error('MQTT not connected');
    }

    const topic = TOPIC_PATTERNS.TIMER_COMMAND(device.baseTopic!, timerId);
    this.publish(topic, JSON.stringify({ Arm: enabled ? 1 : 0 }));
  }

  /**
   * Enable/disable all timers globally
   */
  toggleAllTimers(device: Device, enabled: boolean): void {
    if (!this.isConnected()) {
      throw new Error('MQTT not connected');
    }

    const topic = TOPIC_PATTERNS.TIMER_COMMAND(device.baseTopic!);
    this.publish(topic, enabled ? TIMER_COMMANDS.ENABLE_ALL : TIMER_COMMANDS.DISABLE_ALL);
  }

  /**
   * Request all timers status
   */
  requestTimersStatus(device: Device): void {
    if (!this.isConnected()) {
      throw new Error('MQTT not connected');
    }

    const topic = TOPIC_PATTERNS.TIMER_COMMAND(device.baseTopic!);
    this.publish(topic, ''); // Empty payload requests status
  }

  /**
   * Delete a timer
   */
  deleteTimer(device: Device, timerId: number): void {
    if (!this.isConnected()) {
      throw new Error('MQTT not connected');
    }

    const topic = TOPIC_PATTERNS.TIMER_COMMAND(device.baseTopic!, timerId);
    this.publish(topic, '0'); // Send "0" to delete timer
    }

    // Shutter Methods

  /**
   * 🔥 CORRECTED: Subscribe to shutter topics
   * Based on actual MQTT logs:
   * - stat/{baseTopic}/RESULT contains {"Shutter1": {...}}
   * - stat/{baseTopic}/SHUTTER1 contains position value
   * - stat/{baseTopic}/POWER1 and POWER2 show relay states
   */
  subscribeToShutter(device: Device): void {
    console.log('📡 [MQTT] Subscribing to shutter:', device.name);

    if (!device.baseTopic) {
      throw new Error('baseTopic is required');
    }

    if (!device.shutterIndex) {
      throw new Error('shutterIndex is required');
    }

    const shutterIndex = device.shutterIndex;

  try {
    // 🔥 CRITICAL: Subscribe to RESULT topic
    // This receives: {"Shutter1":{"Position":25,"Direction":1,"Target":25,"Tilt":0}}
    const resultTopic = `stat/${device.baseTopic}/RESULT`;
    console.log('📡 [MQTT] Subscribing to:', resultTopic);
    this.subscribe(resultTopic);

    // 🔥 Subscribe to SHUTTER{n} topic for position updates
    // This receives just the position value: "26"
    const shutterStatusTopic = `stat/${device.baseTopic}/SHUTTER${shutterIndex}`;
    console.log('📡 [MQTT] Subscribing to:', shutterStatusTopic);
    this.subscribe(shutterStatusTopic);

    // 🔥 Subscribe to POWER topics (shutters use POWER1 and POWER2 for relays)
    // POWER1 = UP relay, POWER2 = DOWN relay (Mode 1)
    const power1Topic = `stat/${device.baseTopic}/POWER1`;
    const power2Topic = `stat/${device.baseTopic}/POWER2`;
    console.log('📡 [MQTT] Subscribing to power topics:', power1Topic, power2Topic);
    this.subscribe(power1Topic);
    this.subscribe(power2Topic);

    // Subscribe to LWT if enabled
    if (device.lwtTopic && device.useAutoDiscovery) {
      console.log('📡 [MQTT] Subscribing to LWT:', device.lwtTopic);
      this.subscribe(device.lwtTopic);
    }

    // Subscribe to STATE for telemetry
    if (device.stateTopic && device.useAutoDiscovery) {
      console.log('📡 [MQTT] Subscribing to STATE:', device.stateTopic);
      this.subscribe(device.stateTopic);
    }

    // Request current status
    this.requestShutterStatus(device);

    logger.addLog('success', `✅ Subscribed to shutter ${device.name} (Index ${shutterIndex})`);
  } catch (error: any) {
    const errorMsg = `Failed to subscribe: ${error.message}`;
    console.error('❌ [MQTT]', errorMsg);
    logger.addLog('error', `❌ ${errorMsg}`);
    throw error;
  }
  }

  /**
   * 🔥 CORRECTED: Unsubscribe from shutter
   */
  unsubscribeFromShutter(device: Device): void {
    console.log('📡 [MQTT] Unsubscribing from shutter:', device.name);

    if (!device.baseTopic) {
      console.warn('⚠️ [MQTT] No baseTopic, skipping unsubscribe');
      return;
    }

  try {
    const resultTopic = `stat/${device.baseTopic}/RESULT`;
    const shutterStatusTopic = `stat/${device.baseTopic}/SHUTTER${device.shutterIndex}`;
    const power1Topic = `stat/${device.baseTopic}/POWER1`;
    const power2Topic = `stat/${device.baseTopic}/POWER2`;

    this.unsubscribe(resultTopic);
    this.unsubscribe(shutterStatusTopic);
    this.unsubscribe(power1Topic);
    this.unsubscribe(power2Topic);

    if (device.lwtTopic) {
      this.unsubscribe(device.lwtTopic);
    }

    if (device.stateTopic) {
      this.unsubscribe(device.stateTopic);
    }

    logger.addLog('info', `📡 Unsubscribed from shutter ${device.name}`);
  } catch (error: any) {
    console.error('❌ [MQTT] Unsubscribe error:', error);
  }
  }

  /**
   * 🔥 CORRECTED: Set shutter position
   *
   * Command format:
   * - Single shutter (index 1): cmnd/{baseTopic}/ShutterPosition → "100"
   * - Multiple shutters: cmnd/{baseTopic}/ShutterPosition → "2 100" (shutter 2 to 100%)
   *
   * Response: stat/{baseTopic}/RESULT → {"Shutter1":{"Position":100,"Direction":1,"Target":100}}
   */

    /**
   * ⚠️ DEPRECATED: Use commandShield.executeCommand() instead
   */
  async setShutterPosition(device: Device, position: number): Promise<void> {
    console.warn('⚠️ DEPRECATED: setShutterPosition() bypasses Command Shield!');
    logger.addLog('warning', '⚠️ Direct MQTT call detected (unsafe): setShutterPosition()');

    if (this.isShieldActive()) {
      const error = '🚫 BLOCKED: Direct MQTT commands are disabled. Use commandShield.executeCommand()';
      logger.addLog('error', error);
      throw new Error(error);
    }

    await this._internalSetShutterPosition(device, position);
  }

  /**
   * 🔥 CORRECTED: Stop shutter
   *
   * Command format:
   * - Single shutter: cmnd/{baseTopic}/ShutterStop → ""
   * - Multiple shutters: cmnd/{baseTopic}/ShutterStop → "2" (shutter index)
   */

 /**
   * ⚠️ DEPRECATED: Use commandShield.executeCommand() instead
   */
 async stopShutter(device: Device): Promise<void> {
  console.warn('⚠️ DEPRECATED: stopShutter() bypasses Command Shield!');
  logger.addLog('warning', '⚠️ Direct MQTT call detected (unsafe): stopShutter()');

  if (this.isShieldActive()) {
    const error = '🚫 BLOCKED: Direct MQTT commands are disabled. Use commandShield.executeCommand()';
    logger.addLog('error', error);
    throw new Error(error);
  }

  await this._internalStopShutter(device);
}


/**
   * ⚠️ DEPRECATED: Use commandShield.executeCommand() instead
   */
async openShutter(device: Device): Promise<void> {
  console.warn('⚠️ DEPRECATED: openShutter() bypasses Command Shield!');
  logger.addLog('warning', '⚠️ Direct MQTT call detected (unsafe): openShutter()');

  if (this.isShieldActive()) {
    const error = '🚫 BLOCKED: Direct MQTT commands are disabled. Use commandShield.executeCommand()';
    logger.addLog('error', error);
    throw new Error(error);
  }

  await this._internalOpenShutter(device);
}

/**
   * ⚠️ DEPRECATED: Use commandShield.executeCommand() instead
   */
async closeShutter(device: Device): Promise<void> {
  console.warn('⚠️ DEPRECATED: closeShutter() bypasses Command Shield!');
  logger.addLog('warning', '⚠️ Direct MQTT call detected (unsafe): closeShutter()');

  if (this.isShieldActive()) {
    const error = '🚫 BLOCKED: Direct MQTT commands are disabled. Use commandShield.executeCommand()';
    logger.addLog('error', error);
    throw new Error(error);
  }

  await this._internalCloseShutter(device);
}

  /**
   * 🔥 CORRECTED: Request shutter status
   */
  requestShutterStatus(device: Device): void {
    console.log(`📊 [MQTT] Requesting shutter status: ${device.name}`);

    if (!this.isConnected() || !device.baseTopic) {
      return;
    }

    try {
      // Request Status 13 for shutter info
      const topic = `cmnd/${device.baseTopic}/Status`;
      const payload = '13';

      console.log('📤 [MQTT] Requesting STATUS 13');
      this.publish(topic, payload);
    } catch (error: any) {
      console.error('❌ [MQTT] Status request failed:', error);
    }
  }


  /**
   * 🔥 CORRECTED: Set shutter tilt (Venetian blinds)
   *
   * Command: cmnd/{baseTopic}/ShutterTilt{index}
   * This one DOES use the index in the topic!
   */
  setShutterTilt(device: Device, angle: number): void {
    console.log(`🎚️ [MQTT] Setting tilt: ${device.name} to ${angle}°`);

    if (!this.isConnected()) {
      throw new Error('MQTT not connected');
    }

    if (!device.baseTopic || !device.shutterIndex) {
      throw new Error('baseTopic and shutterIndex required');
    }

    if (!device.shutterTiltConfig) {
      throw new Error('Tilt not configured');
    }

    try {
      // 🔥 NOTE: Tilt commands DO use index in topic
      const topic = `cmnd/${device.baseTopic}/ShutterTilt${device.shutterIndex}`;
      const payload = angle.toString();

      console.log('📤 [MQTT] Publishing tilt:', { topic, payload });

      this.publish(topic, payload, 1);
      logger.addLog('success', `🎚️ Set tilt to ${angle}°`);
    } catch (error: any) {
      console.error('❌ [MQTT] Tilt failed:', error);
      throw error;
    }
  }

  /**
   * 🔥 Calibration methods (these DO use index in topic)
   */
  setShutterOpenDuration(device: Device, seconds: number): void {
    if (!this.isConnected() || !device.baseTopic || !device.shutterIndex) return;

    // Topic includes index: ShutterOpenDuration1, ShutterOpenDuration2, etc.
    const topic = `cmnd/${device.baseTopic}/ShutterOpenDuration${device.shutterIndex}`;
    this.publish(topic, seconds.toFixed(1));
    logger.addLog('info', `Set open duration: ${seconds}s`);
  }

  setShutterCloseDuration(device: Device, seconds: number): void {
    if (!this.isConnected() || !device.baseTopic || !device.shutterIndex) return;

    const topic = `cmnd/${device.baseTopic}/ShutterCloseDuration${device.shutterIndex}`;
    this.publish(topic, seconds.toFixed(1));
    logger.addLog('info', `Set close duration: ${seconds}s`);
  }

  setShutterHalfway(device: Device, position: number): void {
    if (!this.isConnected() || !device.baseTopic || !device.shutterIndex) return;

    const topic = `cmnd/${device.baseTopic}/ShutterSetHalfway${device.shutterIndex}`;
    this.publish(topic, position.toString());
    logger.addLog('info', `Set halfway position: ${position}%`);
  }

  markShutterClosed(device: Device): void {
    if (!this.isConnected() || !device.baseTopic || !device.shutterIndex) return;

    const topic = `cmnd/${device.baseTopic}/ShutterSetClose${device.shutterIndex}`;
    this.publish(topic, '');
    logger.addLog('info', `Marked shutter ${device.shutterIndex} as closed`);
  }

    markShutterOpen(device: Device): void {
      if (!this.isConnected() || !device.baseTopic || !device.shutterIndex) return;

      const topic = `cmnd/${device.baseTopic}/ShutterSetOpen${device.shutterIndex}`;
      this.publish(topic, '');
      logger.addLog('info', `Marked shutter ${device.shutterIndex} as open`);
    }

    toggleShutterInvert(device: Device, invert: boolean): void {
      if (!this.isConnected() || !device.baseTopic || !device.shutterIndex) return;

      const topic = `cmnd/${device.baseTopic}/ShutterInvert${device.shutterIndex}`;
      this.publish(topic, invert ? '1' : '0');
      logger.addLog('info', `Set shutter invert: ${invert}`);
    }


  // =============================================================================
// Advanced Relay Control Methods
// =============================================================================

/**
 * Set pulse timer (auto-off after specified time)
 * Tasmota command: PulseTime<x> <deciseconds>
 *
 * @param device Device to control
 * @param deciseconds Time in deciseconds (10 = 1 second, 0 = disabled)
 *
 * Examples:
 * - 0 = Disabled
 * - 10 = 1 second
 * - 100 = 10 seconds
 * - 600 = 60 seconds (1 minute)
 */
setPulseTime(device: Device, deciseconds: number): void {
  if (!this.isConnected()) {
    throw new Error('MQTT not connected');
  }

  if (!device.baseTopic) {
    throw new Error('baseTopic is required');
  }

  const relay = device.powerChannel || 1;
  const topic = `cmnd/${device.baseTopic}/PulseTime${relay}`;
  const payload = deciseconds.toString();

  console.log(`⏱️ [MQTT] Setting PulseTime${relay}:`, payload);
  this.publish(topic, payload);
  logger.addLog('info', `⏱️ PulseTime${relay} = ${deciseconds / 10}s`);
}

/**
 * Set blink time (duration of each blink cycle)
 * Tasmota command: BlinkTime <deciseconds>
 *
 * @param device Device to control
 * @param deciseconds Duration in deciseconds (2-3600)
 */
setBlinkTime(device: Device, deciseconds: number): void {
  if (!this.isConnected()) {
    throw new Error('MQTT not connected');
  }

  if (!device.baseTopic) {
    throw new Error('baseTopic is required');
  }

  const topic = `cmnd/${device.baseTopic}/BlinkTime`;
  const payload = deciseconds.toString();

  console.log('💫 [MQTT] Setting BlinkTime:', payload);
  this.publish(topic, payload);
  logger.addLog('info', `💫 BlinkTime = ${deciseconds / 10}s`);
}

/**
 * Set blink count (number of blink cycles)
 * Tasmota command: BlinkCount <count>
 *
 * @param device Device to control
 * @param count Number of blinks (0 = infinite, 1-32000)
 */
setBlinkCount(device: Device, count: number): void {
  if (!this.isConnected()) {
    throw new Error('MQTT not connected');
  }

  if (!device.baseTopic) {
    throw new Error('baseTopic is required');
  }

  const topic = `cmnd/${device.baseTopic}/BlinkCount`;
  const payload = count.toString();

  console.log('💫 [MQTT] Setting BlinkCount:', payload);
  this.publish(topic, payload);
  logger.addLog('info', `💫 BlinkCount = ${count === 0 ? 'infinite' : count}`);
}

/**
 * Send BLINK command (start blinking)
 * Tasmota command: Power<x> BLINK
 *
 * @param device Device to control
 */
sendBlinkCommand(device: Device): void {
  if (!this.isConnected()) {
    throw new Error('MQTT not connected');
  }

  if (!device.baseTopic) {
    throw new Error('baseTopic is required');
  }

  const relay = device.powerChannel || 1;
  const powerName = relay === 1 ? 'POWER' : `POWER${relay}`;
  const topic = `cmnd/${device.baseTopic}/${powerName}`;
  const payload = 'BLINK';

  console.log(`💡 [MQTT] Sending BLINK to ${powerName}`);
  this.publish(topic, payload);
  logger.addLog('info', `💡 BLINK command sent to ${powerName}`);
}

/**
 * Send BLINK_TOGGLE command (toggle and start blinking)
 * Tasmota command: Power<x> BLINK_TOGGLE
 *
 * @param device Device to control
 */
sendBlinkToggleCommand(device: Device): void {
  if (!this.isConnected()) {
    throw new Error('MQTT not connected');
  }

  if (!device.baseTopic) {
    throw new Error('baseTopic is required');
  }

  const relay = device.powerChannel || 1;
  const powerName = relay === 1 ? 'POWER' : `POWER${relay}`;
  const topic = `cmnd/${device.baseTopic}/${powerName}`;
  const payload = 'BLINK_TOGGLE';

  console.log(`🔄 [MQTT] Sending BLINK_TOGGLE to ${powerName}`);
  this.publish(topic, payload);
  logger.addLog('info', `🔄 BLINK_TOGGLE command sent to ${powerName}`);
}

/**
 * Set power-on state (behavior after power loss)
 * Tasmota command: PowerOnState<x> <state>
 *
 * @param device Device to control
 * @param state 0=OFF, 1=ON, 2=Toggle, 3=Restore last, 4=ON without pulse, 5=Restore with pulse reset
 */
setPowerOnState(device: Device, state: number): void {
  if (!this.isConnected()) {
    throw new Error('MQTT not connected');
  }

  if (!device.baseTopic) {
    throw new Error('baseTopic is required');
  }

  if (state < 0 || state > 5) {
    throw new Error('PowerOnState must be 0-5');
  }

  const relay = device.powerChannel || 1;
  const topic = `cmnd/${device.baseTopic}/PowerOnState${relay}`;
  const payload = state.toString();

  console.log(`🔌 [MQTT] Setting PowerOnState${relay}:`, payload);
  this.publish(topic, payload);

  const stateNames = ['OFF', 'ON', 'Toggle', 'Restore', 'ON no pulse', 'Restore reset pulse'];
  logger.addLog('info', `🔌 PowerOnState${relay} = ${stateNames[state]}`);
}

/**
 * Set power lock (prevent relay control changes)
 * Tasmota command: PowerLock<x> <0|1>
 *
 * @param device Device to control
 * @param enabled true to lock, false to unlock
 */
setPowerLock(device: Device, enabled: boolean): void {
  if (!this.isConnected()) {
    throw new Error('MQTT not connected');
  }

  if (!device.baseTopic) {
    throw new Error('baseTopic is required');
  }

  const relay = device.powerChannel || 1;
  const topic = `cmnd/${device.baseTopic}/PowerLock${relay}`;
  const payload = enabled ? '1' : '0';

  console.log(`🔒 [MQTT] Setting PowerLock${relay}:`, payload);
  this.publish(topic, payload);
  logger.addLog('info', `🔒 PowerLock${relay} = ${enabled ? 'locked' : 'unlocked'}`);
}

/**
 * Set power retain (MQTT retain for power state)
 * Tasmota command: PowerRetain <0|1>
 *
 * @param device Device to control
 * @param enabled true to enable, false to disable
 */
setPowerRetain(device: Device, enabled: boolean): void {
  if (!this.isConnected()) {
    throw new Error('MQTT not connected');
  }

  if (!device.baseTopic) {
    throw new Error('baseTopic is required');
  }

  const topic = `cmnd/${device.baseTopic}/PowerRetain`;
  const payload = enabled ? '1' : '0';

  console.log('💾 [MQTT] Setting PowerRetain:', payload);
  this.publish(topic, payload);
  logger.addLog('info', `💾 PowerRetain = ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Set interlock (mutual exclusion between relays)
 * Tasmota command: Interlock <relays> or Interlock OFF
 *
 * @param device Device to control
 * @param relays Comma-separated relay numbers (e.g., "1,2") or "OFF"
 *
 * Examples:
 * - "1,2" = Relays 1 and 2 cannot be ON simultaneously
 * - "1,2,3" = Relays 1, 2, and 3 interlocked
 * - "OFF" = Disable interlock
 */
setInterlock(device: Device, relays: string): void {
  if (!this.isConnected()) {
    throw new Error('MQTT not connected');
  }

  if (!device.baseTopic) {
    throw new Error('baseTopic is required');
  }

  const topic = `cmnd/${device.baseTopic}/Interlock`;
  const payload = relays.toUpperCase() === 'OFF' ? 'OFF' : relays;

  console.log('🔗 [MQTT] Setting Interlock:', payload);
  this.publish(topic, payload);
  logger.addLog('info', `🔗 Interlock = ${payload}`);
}

/**
 * Toggle all relays simultaneously
 * Tasmota command: Power0 TOGGLE
 *
 * @param device Device to control
 */
toggleAllRelays(device: Device): void {
  if (!this.isConnected()) {
    throw new Error('MQTT not connected');
  }

  if (!device.baseTopic) {
    throw new Error('baseTopic is required');
  }

  const topic = `cmnd/${device.baseTopic}/Power0`;
  const payload = 'TOGGLE';

  console.log('🔄 [MQTT] Toggling all relays');
  this.publish(topic, payload);
  logger.addLog('info', '🔄 Toggled all relays');
}

/**
 * Request full device status
 * Tasmota command: Status 0
 *
 * @param device Device to query
 */
requestFullStatus(device: Device): void {
  if (!this.isConnected()) {
    throw new Error('MQTT not connected');
  }

  if (!device.baseTopic) {
    throw new Error('baseTopic is required');
  }

  const topic = `cmnd/${device.baseTopic}/Status`;
  const payload = '0';

  console.log('📊 [MQTT] Requesting full status');
  this.publish(topic, payload);
  logger.addLog('info', '📊 Requested full device status');
}

  /**
   * Register Telegram handler for real-time monitoring
   * Call this from device-config-logic after initialization
   */

    /**
   * ✅ FIXED: Register Telegram handler with pending check processing
   */
    registerTelegramHandler(telegramHandler: any, deviceServiceRef: any): void {
      this.telegramHandler = telegramHandler;
      this.deviceService = deviceServiceRef;
      this.telegramHandlerReady = true;

      logger.addLog('success', '📱 Telegram handler registered');

      // Process pending checks
      if (this.pendingTelegramChecks.length > 0) {
        logger.addLog('info',
          `📱 Processing ${this.pendingTelegramChecks.length} pending Telegram checks`
        );

        this.pendingTelegramChecks.forEach(check => {
          this.checkTelegramAlerts(check.topic, check.payload);
        });

        this.pendingTelegramChecks = [];
      }
    }
  /**
   * Unregister Telegram handler
   */
  unregisterTelegramHandler(): void {
    this.telegramHandler = null;
    this.deviceService = null;

    logger.addLog('info', '📱 Telegram handler unregistered');
    console.log('ℹ️ [MQTT-Telegram] Integration disabled');
  }

  /**
   * Check Telegram alerts immediately when MQTT message arrives
   * This ensures real-time monitoring without depending on state propagation
   */

  /**
   * ✅ FIXED: Telegram alerts with queueing
   */
  private checkTelegramAlerts(topic: string, payload: any): void {
    if (!this.telegramHandlerReady || !this.telegramHandler || !this.deviceService) {
      if (this.pendingTelegramChecks.length < this.MAX_PENDING_CHECKS) {
        this.pendingTelegramChecks.push({ topic, payload, timestamp: new Date() });
      }
      return;
    }

    try {
      const device = this.findDeviceByTopic(topic);
      if (!device) return;

      const sensorData = this.extractSensorData(device, topic, payload);
      if (!sensorData) return;

      this.telegramHandler.checkAndNotify(device, sensorData.type, sensorData.value);
    } catch (error: any) {
      console.error('❌ [MQTT-Telegram] Alert check failed:', error.message);
    }
  }

  /**
   * Find device by MQTT topic
   */
  private findDeviceByTopic(topic: string): any | null {
    if (!this.deviceService) {
      return null;
    }

    const devices = this.deviceService.getDevices();

    // Check all devices
    for (const device of devices) {
      // Sensor device - check tele/ topic
      if (device.type === 'sensor' && device.baseTopic) {
        const teleTopic = `tele/${device.baseTopic}/SENSOR`;
        if (topic === teleTopic) {
          return device;
        }
      }

      // Check stat/ topics
      if (device.baseTopic) {
        const statResult = `stat/${device.baseTopic}/RESULT`;
        const statState = `stat/${device.baseTopic}/STATE`;

        if (topic === statResult || topic === statState) {
          return device;
        }
      }

      // Check custom topic
      if (device.topic === topic) {
        return device;
      }

      // Check stat/result topics for switches/dimmers
      if (device.statTopic === topic || device.resultTopic === topic) {
        return device;
      }
    }

    return null;
  }

  /**
   * Extract sensor data from MQTT payload
   */
  private extractSensorData(device: any, topic: string, payload: any): { type: string; value: number } | null {
    // Handle sensor devices
    if (device.type === 'sensor') {
      return this.extractSensorValue(device, payload);
    }

    // Handle switch power monitoring (if device has power sensor)
    if (device.type === 'switch' && topic.includes('/STATE')) {
      return this.extractPowerData(payload);
    }

    // Handle dimmer level as sensor data
    if (device.type === 'dimmer' && payload.Dimmer !== undefined) {
      return {
        type: 'dimmer_level',
        value: payload.Dimmer
      };
    }

    // Handle shutter position as sensor data
    if (device.type === 'shutter' && payload[`Shutter${device.shutterIndex}`]) {
      const shutterData = payload[`Shutter${device.shutterIndex}`];
      if (shutterData.Position !== undefined) {
        return {
          type: 'shutter_position',
          value: shutterData.Position
        };
      }
    }

    return null;
  }
   /**
   * Extract sensor value using configured JSON path
   */
   private extractSensorValue(device: any, payload: any): { type: string; value: number } | null {
    if (!device.sensorConfig) {
      return null;
    }

    const sensorType = device.sensorConfig.sensorType;
    let value: number | undefined;

    // Use JSON path if configured
    if (device.jsonPath) {
      value = this.getValueByPath(payload, device.jsonPath);
    }
    // Use default sensor type paths
    else {
      value = this.getDefaultSensorValue(payload, sensorType);
    }

    if (value !== undefined && !isNaN(value)) {
      return {
        type: sensorType,
        value: Number(value)
      };
    }

    return null;
  }

  /**
   * Extract power monitoring data (for switches with power sensors)
   */
  private extractPowerData(payload: any): { type: string; value: number } | null {
    // Check for various power fields
    if (payload.ENERGY) {
      if (payload.ENERGY.Power !== undefined) {
        return { type: 'power', value: payload.ENERGY.Power };
      }
      if (payload.ENERGY.Current !== undefined) {
        return { type: 'current', value: payload.ENERGY.Current };
      }
      if (payload.ENERGY.Voltage !== undefined) {
        return { type: 'voltage', value: payload.ENERGY.Voltage };
      }
    }

    return null;
  }

   /**
   * Get value by JSON path (e.g., "DS18B20.Temperature")
   */
   private getValueByPath(obj: any, path: string): number | undefined {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return typeof current === 'number' ? current : parseFloat(current);
  }

  /**
   * Get default sensor value based on sensor type
   */
  private getDefaultSensorValue(payload: any, sensorType: string): number | undefined {
    // Common sensor mappings
    const sensorPaths: Record<string, string[]> = {
      temperature: ['DS18B20.Temperature', 'DHT11.Temperature', 'BME280.Temperature', 'Temperature'],
      humidity: ['DHT11.Humidity', 'BME280.Humidity', 'Humidity'],
      pressure: ['BME280.Pressure', 'BMP280.Pressure', 'Pressure'],
      light: ['APDS9960.Ambient', 'BH1750.Illuminance', 'Light'],
      co2: ['MHZ19B.CarbonDioxide', 'CO2'],
      tvoc: ['CCS811.TVOC', 'TVOC'],
      pm25: ['PMS5003.PM2.5', 'PM2_5'],
      pm10: ['PMS5003.PM10', 'PM10']
    };

    const paths = sensorPaths[sensorType] || [sensorType];

    for (const path of paths) {
      const value = this.getValueByPath(payload, path);
      if (value !== undefined) {
        return value;
      }
    }

    return undefined;
  }

  /**
   * ✅ NEW: Intelligent QoS selection
   */
  private getQoSForCommand(topic: string, payload: string): number {
    // Critical commands use QoS 2 (exactly once)
    if (topic.includes('/ShutterStop') ||
        topic.includes('/ShutterOpen') ||
        topic.includes('/ShutterClose') ||
        topic.includes('/PowerLock') ||
        payload === 'BLINK_TOGGLE') {
      return CommandPriority.HIGH; // QoS 2
    }

    // Normal commands use QoS 1 (at least once)
    if (topic.includes('/Power') ||
        topic.includes('/Dimmer') ||
        topic.includes('/ShutterPosition') ||
        topic.includes('/PulseTime') ||
        topic.includes('/BlinkTime') ||
        topic.includes('/BlinkCount') ||
        topic.includes('/PowerOnState') ||
        topic.includes('/Interlock')) {
      return CommandPriority.MEDIUM; // QoS 1
    }

    // Status requests can use QoS 0
    if (payload === '' || payload === '0' || topic.includes('/Status')) {
      return CommandPriority.LOW; // QoS 0
    }

    // Default to QoS 1 for safety
    return CommandPriority.MEDIUM;
  }

  /**
   * ✅ NEW: Shutter command execution with locking
   */
  private async executeShutterCommand(
    device: Device,
    commandType: string,
    command: () => Promise<void>
  ): Promise<void> {
    const lockKey = `${device.id}-shutter`;
    const lock = this.shutterCommandLocks.get(lockKey);
    const now = Date.now();

    // Check if command in progress
    if (lock?.inProgress) {
      throw new Error('Shutter command already in progress');
    }

    // Check cooldown (except for stop commands)
    if (lock && commandType !== 'stop') {
      const timeSinceLastCommand = now - lock.lastCommand.getTime();
      if (timeSinceLastCommand < this.SHUTTER_COMMAND_COOLDOWN) {
        const waitTime = this.SHUTTER_COMMAND_COOLDOWN - timeSinceLastCommand;
        throw new Error(`Please wait ${Math.ceil(waitTime / 100) / 10}s before next command`);
      }
    }

    // Set lock
    this.shutterCommandLocks.set(lockKey, {
      inProgress: true,
      lastCommand: new Date(),
      lastCommandType: commandType
    });

    try {
      await command();
    } finally {
      // Release lock
      const currentLock = this.shutterCommandLocks.get(lockKey);
      if (currentLock) {
        currentLock.inProgress = false;
        this.shutterCommandLocks.set(lockKey, currentLock);
      }
    }
  }

    /**
   * ✅ NEW: Schedule reconnection with exponential backoff
   */
    private scheduleReconnect(): void {
      const delay = this.RECONNECT_DELAYS[
        Math.min(this.reconnectAttempts, this.RECONNECT_DELAYS.length - 1)
      ];

      logger.addLog('info',
        `🔄 Reconnecting in ${delay/1000}s (attempt ${this.reconnectAttempts + 1}/${this.MAX_RECONNECT_ATTEMPTS})`
      );

      this.reconnectTimer = setTimeout(() => {
        this.reconnectAttempts++;
        this.attemptReconnect();
      }, delay);
    }

    /**
     * ✅ NEW: Attempt reconnection
     */
    private async attemptReconnect(): Promise<void> {
      if (!this.lastSettings) return;

      try {
        await this.connect(this.lastSettings);
        logger.addLog('success', '✅ Reconnected successfully');
      } catch (error: any) {
        logger.addLog('error', `Reconnection failed: ${error.message}`);
      }
    }

    /**
     * ✅ NEW: Flush queued commands after reconnection
     */
    private async flushCommandQueue(): Promise<void> {
      if (this.commandQueue.length === 0) return;

      logger.addLog('info', `📤 Flushing ${this.commandQueue.length} queued commands`);

      const now = Date.now();
      const validCommands = this.commandQueue.filter(cmd =>
        (now - cmd.timestamp.getTime()) < this.QUEUE_EXPIRY_MS
      );

      this.commandQueue = [];

      for (const cmd of validCommands) {
        try {
          await this.delay(50); // Throttle
          this.publish(cmd.topic, cmd.payload, cmd.qos);
          logger.addLog('success', `✅ Sent queued: ${cmd.topic}`);
        } catch (error) {
          logger.addLog('error', `❌ Failed queued command: ${cmd.topic}`);
        }
      }
  }
  /**
   * ✅ NEW: Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * ✅ NEW: Message deduplication helpers
   */
  private hashMessage(topic: string, payload: string): string {
    return `${topic}:${payload}:${Math.floor(Date.now() / 1000)}`;
  }

  private isDuplicate(hash: string): boolean {
    const cached = this.messageCache.get(hash);
    if (!cached) return false;
    return (Date.now() - cached.timestamp) < this.MESSAGE_CACHE_TTL;
  }

  private cacheMessage(hash: string): void {
    this.messageCache.set(hash, { hash, timestamp: Date.now() });

    // Cleanup old entries
    if (this.messageCache.size > 1000) {
      const now = Date.now();
      for (const [key, value] of this.messageCache) {
        if (now - value.timestamp > this.MESSAGE_CACHE_TTL) {
          this.messageCache.delete(key);
        }
      }
    }
  }
/**
   * ✅ New: Complete cleanup
   */
private performFullCleanup(): void {
  if (this.connectionTimeout) {
    clearTimeout(this.connectionTimeout);
    this.connectionTimeout = null;
  }

  if (this.commandTrackers) {
    this.commandTrackers.clear();
  }

  if (this.messageCache) {
    this.messageCache.clear();
  }

  if (this.deviceLocks) {
    this.deviceLocks.clear();
  }

  logger.addLog('warning',
    `Cleanup complete. Listeners: ${this.messageListeners.size} message, ${this.statusListeners.size} status`
  );
}

  // =============================================================================
  // 🛡️ INTERNAL METHODS - Only callable by Command Shield
  // =============================================================================

  /**
   * ✅ SAFE: Execute command after shield validation
   * Only called by commandShield.executeCommand()
   */
  /**async executeShieldedCommand(
    device: Device,
    commandType: CommandType,
    payload: any,
    shieldToken: string
  ): Promise<void> {
    // Verify call is from shield
    if (!this.verifyShieldToken(shieldToken)) {
      const error = '🚨 SECURITY VIOLATION: Unauthorized MQTT command!';
      logger.addLog('error', error);
      throw new Error(error);
    }

    if (!this.isConnected()) {
      throw new Error('MQTT not connected');
    }

    logger.addLog('info', `🛡️ Executing shielded command: ${commandType}`);

    // Route to appropriate internal method
    switch (commandType) {
      // ✅ Existing commands
      case 'switch.on':
      case 'switch.off':
        await this._internalToggleSwitch(device, commandType === 'switch.on');
        break;

      case 'dimmer.set':
        await this._internalSetDimmer(device, payload);
        break;

      case 'dimmer.on':
      case 'dimmer.off':
        await this._internalToggleDimmer(device, commandType === 'dimmer.on');
        break;

      case 'shutter.open':
        await this._internalOpenShutter(device);
        break;

      case 'shutter.close':
        await this._internalCloseShutter(device);
        break;

      case 'shutter.stop':
        await this._internalStopShutter(device);
        break;

      case 'shutter.position':
        await this._internalSetShutterPosition(device, payload);
        break;

      case 'shutter.tilt':
        await this._internalSetShutterTilt(device, payload);
        break;

      // 🆕 Advanced relay commands
      case 'relay.pulse':
        await this._internalSetPulseTime(device, payload);
        break;

      case 'relay.blink':
        await this._internalHandleBlinkCommand(device, payload);
        break;

      case 'relay.lock':
        await this._internalSetPowerLock(device, payload);
        break;

      case 'relay.config':
        await this._internalHandleRelayConfig(device, payload);
        break;

      case 'relay.toggleAll':
        await this._internalToggleAllRelays(device);
        break;

      default:
        throw new Error(`Unknown command type: ${commandType}`);
    }
  }**/
    async executeShieldedCommand(
      device: Device,
      commandType: CommandType,
      payload: any,
      shieldToken: string
    ): Promise<void> {
      // Verify call is from shield
      if (!this.verifyShieldToken(shieldToken)) {
        const error = '🚨 SECURITY VIOLATION: Unauthorized MQTT command!';
        logger.addLog('error', error);
        throw new Error(error);
      }

      if (!this.isConnected()) {
        throw new Error('MQTT not connected');
      }

      logger.addLog('info', `🛡️ Executing shielded command: ${commandType}`);

      // Route to appropriate internal method
      switch (commandType) {
        // ============================================================================
        // ✅ SWITCH COMMANDS
        // ============================================================================
        case 'switch.on':
        case 'switch.off':
          await this._internalToggleSwitch(device, commandType === 'switch.on');
          break;

        case 'switch.toggle':
          await this._internalToggleSwitch(device);
          break;

        // ============================================================================
        // ✅ DIMMER COMMANDS
        // ============================================================================
        case 'dimmer.set':
          await this._internalSetDimmer(device, payload);
          break;

        case 'dimmer.on':
        case 'dimmer.off':
          await this._internalToggleDimmer(device, commandType === 'dimmer.on');
          break;

        // ============================================================================
        // ✅ SHUTTER COMMANDS
        // ============================================================================
        case 'shutter.open':
          await this._internalOpenShutter(device);
          break;

        case 'shutter.close':
          await this._internalCloseShutter(device);
          break;

        case 'shutter.stop':
          await this._internalStopShutter(device);
          break;

        case 'shutter.position':
          await this._internalSetShutterPosition(device, payload);
          break;

        case 'shutter.tilt':
          await this._internalSetShutterTilt(device, payload);
          break;

        // ============================================================================
        // ✅ ADVANCED RELAY COMMANDS
        // ============================================================================
        case 'relay.pulse':
          await this._internalSetPulseTime(device, payload);
          break;

        case 'relay.blink':
          await this._internalHandleBlinkCommand(device, payload);
          break;

        case 'relay.lock':
          await this._internalSetPowerLock(device, payload);
          break;

        case 'relay.config':
          await this._internalHandleRelayConfig(device, payload);
          break;

        case 'relay.toggleAll':
          await this._internalToggleAllRelays(device);
          break;

        // ============================================================================
        // 🆕 TIMER COMMANDS (NEW)
        // ============================================================================
        case 'timer.set':
          await this._internalSetTimer(device, payload.timerId, payload.timer);
          break;

        case 'timer.delete':
          await this._internalDeleteTimer(device, payload.timerId);
          break;

        case 'timer.toggleAll':
          await this._internalToggleAllTimers(device, payload.enabled);
          break;

        // ============================================================================
        // 🆕 RULE/SCRIPT COMMANDS (NEW)
        // ============================================================================
        case 'rule.upload':
          await this._internalUploadRule(device, payload.ruleSlot, payload.ruleText);
          break;

        case 'rule.enable':
          await this._internalEnableRule(device, payload.ruleSlot, payload.enabled);
          break;

        case 'script.upload':
          await this._internalUploadScript(device, payload.scriptText);
          break;

        case 'script.enable':
          await this._internalEnableScript(device, payload.enabled);
          break;

        default:
          throw new Error(`Unknown command type: ${commandType}`);
      }
    }

    /**
   * ✅ Verify shield token
   */
   private verifyShieldToken(token: string): boolean {
    // Simple verification - in production use cryptographic signing
    return this.shieldService && token.startsWith('shield_');
  }
 // =============================================================================
  // 🔒 PRIVATE INTERNAL METHODS - Actual MQTT Operations
  // =============================================================================

  /**
   * 🔒 PRIVATE: Toggle switch (internal only)
   */
  private _internalToggleSwitch(device: Device, turnOn: boolean = false): void {
    const command = turnOn ? MQTT_COMMANDS.ON : MQTT_COMMANDS.OFF;
    const topic = device.commandTopic || device.topic;

    this.publish(topic, command);
    logger.addLog('info', `Sent ${command} to ${device.name}`);
  }

  /**
   * 🔒 PRIVATE: Toggle dimmer power (internal only)
   */
  private async _internalToggleDimmer(device: Device, turnOn: boolean): Promise<void> {
    const powerChannel = device.powerChannel || 2;
    const powerName = `POWER${powerChannel}`;
    const powerTopic = device.baseTopic
      ? `cmnd/${device.baseTopic}/${powerName}`
      : device.commandTopic!.replace('/Dimmer', `/${powerName}`);

    const command = turnOn ? MQTT_COMMANDS.ON : MQTT_COMMANDS.OFF;
    this.publish(powerTopic, command);
    logger.addLog('info', `Sent ${command} to dimmer ${device.name}`);
  }

  /**
   * 🔒 PRIVATE: Set dimmer value (internal only)
   */
  private _internalSetDimmer(device: Device, value: number): void {
    if (!this.client || !this.isConnected()) {
      throw new Error('MQTT not connected');
    }

    const clampedValue = Math.max(0, Math.min(100, Math.round(value)));
    const topic = device.dimmerCommandTopic || device.commandTopic!;

    this.publish(topic, clampedValue.toString());
  }

  /**
   * 🔒 PRIVATE: Set shutter position (internal only)
   */
  private async _internalSetShutterPosition(device: Device, position: number): Promise<void> {
    if (!this.isConnected() || !device.baseTopic || !device.shutterIndex) {
      throw new Error('Cannot set shutter position');
    }

    const clampedPosition = Math.max(0, Math.min(100, Math.round(position)));
    const topic = `cmnd/${device.baseTopic}/ShutterPosition`;
    const payload = device.shutterIndex === 1
      ? clampedPosition.toString()
      : `${device.shutterIndex} ${clampedPosition}`;

    this.publish(topic, payload, 1);
    logger.addLog('success', `📍 Shutter ${device.shutterIndex} → ${clampedPosition}%`);
  }

  /**
   * 🔒 PRIVATE: Stop shutter (internal only)
   */
  private async _internalStopShutter(device: Device): Promise<void> {
    if (!this.isConnected() || !device.baseTopic || !device.shutterIndex) {
      throw new Error('Cannot stop shutter');
    }

    const topic = `cmnd/${device.baseTopic}/ShutterStop`;
    const payload = device.shutterIndex === 1 ? '' : device.shutterIndex.toString();

    this.publish(topic, payload, 2); // QoS 2 for critical stop!
    logger.addLog('success', `⏹️ Stopped shutter ${device.shutterIndex}`);
  }

  /**
   * 🔒 PRIVATE: Open shutter (internal only)
   */
  private async _internalOpenShutter(device: Device): Promise<void> {
    if (!this.isConnected() || !device.baseTopic || !device.shutterIndex) {
      throw new Error('Cannot open shutter');
    }

    const topic = `cmnd/${device.baseTopic}/ShutterOpen`;
    const payload = device.shutterIndex === 1 ? '' : device.shutterIndex.toString();

    this.publish(topic, payload, 1);
    logger.addLog('success', `🔼 Opening shutter ${device.shutterIndex}`);
  }

  /**
   * 🔒 PRIVATE: Close shutter (internal only)
   */
  private async _internalCloseShutter(device: Device): Promise<void> {
    if (!this.isConnected() || !device.baseTopic || !device.shutterIndex) {
      throw new Error('Cannot close shutter');
    }

    const topic = `cmnd/${device.baseTopic}/ShutterClose`;
    const payload = device.shutterIndex === 1 ? '' : device.shutterIndex.toString();

    this.publish(topic, payload, 1);
    logger.addLog('success', `🔽 Closing shutter ${device.shutterIndex}`);
  }

  /**
   * 🔒 PRIVATE: Set shutter tilt (internal only)
   */
  private async _internalSetShutterTilt(device: Device, angle: number): Promise<void> {
    if (!this.isConnected() || !device.baseTopic || !device.shutterIndex) {
      throw new Error('Cannot set tilt');
    }

    if (!device.shutterTiltConfig) {
      throw new Error('Tilt not configured');
    }

    const topic = `cmnd/${device.baseTopic}/ShutterTilt${device.shutterIndex}`;
    const payload = angle.toString();

    this.publish(topic, payload, 1);
    logger.addLog('success', `🎚️ Set tilt to ${angle}°`);
  }

  /**
 * 🔒 PRIVATE: Set pulse time (internal only)
 */
private _internalSetPulseTime(device: Device, deciseconds: number): void {
  if (!device.baseTopic) {
    throw new Error('baseTopic is required');
  }

  const relay = device.powerChannel || 1;
  const topic = `cmnd/${device.baseTopic}/PulseTime${relay}`;
  const payload = deciseconds.toString();

  this.publish(topic, payload);
  logger.addLog('info', `⏱️ PulseTime${relay} = ${deciseconds / 10}s`);
}

/**
 * 🔒 PRIVATE: Handle blink commands (internal only)
 */
private _internalHandleBlinkCommand(device: Device, payload: any): void {
  if (!device.baseTopic) {
    throw new Error('baseTopic is required');
  }

  const relay = device.powerChannel || 1;
  const powerName = relay === 1 ? 'POWER' : `POWER${relay}`;

  switch (payload.type) {
    case 'time':
      // Set blink time
      const timeTopic = `cmnd/${device.baseTopic}/BlinkTime`;
      this.publish(timeTopic, payload.value.toString());
      logger.addLog('info', `💫 BlinkTime = ${payload.value / 10}s`);
      break;

    case 'count':
      // Set blink count
      const countTopic = `cmnd/${device.baseTopic}/BlinkCount`;
      this.publish(countTopic, payload.value.toString());
      logger.addLog('info', `💫 BlinkCount = ${payload.value === 0 ? 'infinite' : payload.value}`);
      break;

    case 'start':
      // Send BLINK command
      const blinkTopic = `cmnd/${device.baseTopic}/${powerName}`;
      this.publish(blinkTopic, 'BLINK');
      logger.addLog('info', `💡 BLINK command sent to ${powerName}`);
      break;

    case 'toggle':
      // Send BLINK_TOGGLE command
      const toggleTopic = `cmnd/${device.baseTopic}/${powerName}`;
      this.publish(toggleTopic, 'BLINK_TOGGLE');
      logger.addLog('info', `🔄 BLINK_TOGGLE command sent to ${powerName}`);
      break;

    default:
      throw new Error(`Unknown blink command type: ${payload.type}`);
  }
}

/**
 * 🔒 PRIVATE: Set power lock (internal only)
 */
private _internalSetPowerLock(device: Device, enabled: boolean): void {
  if (!device.baseTopic) {
    throw new Error('baseTopic is required');
  }

  const relay = device.powerChannel || 1;
  const topic = `cmnd/${device.baseTopic}/PowerLock${relay}`;
  const payload = enabled ? '1' : '0';

  this.publish(topic, payload);
  logger.addLog('info', `🔒 PowerLock${relay} = ${enabled ? 'locked' : 'unlocked'}`);
}

/**
 * 🔒 PRIVATE: Handle relay configuration commands (internal only)
 */
private _internalHandleRelayConfig(device: Device, payload: any): void {
  if (!device.baseTopic) {
    throw new Error('baseTopic is required');
  }

  switch (payload.type) {
    case 'powerOnState':
      // Set power-on state
      const relay = device.powerChannel || 1;
      const topic = `cmnd/${device.baseTopic}/PowerOnState${relay}`;
      this.publish(topic, payload.value.toString());

      const stateNames = ['OFF', 'ON', 'Toggle', 'Restore', 'ON no pulse', 'Restore reset pulse'];
      logger.addLog('info', `🔌 PowerOnState${relay} = ${stateNames[payload.value]}`);
      break;

    case 'interlock':
      // Set interlock
      const interlockTopic = `cmnd/${device.baseTopic}/Interlock`;
      const interlockPayload = payload.value.toUpperCase() === 'OFF' ? 'OFF' : payload.value;
      this.publish(interlockTopic, interlockPayload);
      logger.addLog('info', `🔗 Interlock = ${interlockPayload}`);
      break;

    default:
      throw new Error(`Unknown relay config type: ${payload.type}`);
  }
}

/**
 * 🔒 PRIVATE: Toggle all relays (internal only)
 */
private _internalToggleAllRelays(device: Device): void {
  if (!device.baseTopic) {
    throw new Error('baseTopic is required');
  }

  const topic = `cmnd/${device.baseTopic}/Power0`;
  const payload = 'TOGGLE';

  this.publish(topic, payload);
  logger.addLog('info', '🔄 Toggled all relays');
}

  /**
 * Internal method: Set timer (called only by shield)
 */
private async _internalSetTimer(
  device: Device,
  timerId: number,
  timer: Partial<TasmotaTimer>
): Promise<void> {
  const topic = `${device.commandTopic || device.topic}/Timer${timerId}`;

  const timerPayload: any = {};

  if (timer.enabled !== undefined) timerPayload.Enable = timer.enabled ? 1 : 0;
  if (timer.mode !== undefined) timerPayload.Mode = timer.mode;
  if (timer.time !== undefined) timerPayload.Time = timer.time;
  if (timer.window !== undefined) timerPayload.Window = timer.window;
  if (timer.days !== undefined) timerPayload.Days = timer.days;
  if (timer.repeat !== undefined) timerPayload.Repeat = timer.repeat ? 1 : 0;
  if (timer.output !== undefined) timerPayload.Output = timer.output;
  if (timer.action !== undefined) timerPayload.Action = timer.action;

  const payload = JSON.stringify(timerPayload);

  logger.addLog('info', `🛡️ [Internal] Setting timer ${timerId} for ${device.name}`);
  this.publish(topic, payload);
}

/**
 * Internal method: Delete timer (called only by shield)
 */
private async _internalDeleteTimer(
  device: Device,
  timerId: number
): Promise<void> {
  const topic = `${device.commandTopic || device.topic}/Timer${timerId}`;
  const payload = JSON.stringify({ Enable: 0, Mode: 0 });

  logger.addLog('info', `🛡️ [Internal] Deleting timer ${timerId} for ${device.name}`);
  this.publish(topic, payload);
}

/**
 * Internal method: Toggle all timers (called only by shield)
 */
private async _internalToggleAllTimers(
  device: Device,
  enabled: boolean
): Promise<void> {
  const topic = `${device.commandTopic || device.topic}/Timers`;
  const payload = enabled ? 'ON' : 'OFF';

  logger.addLog('info', `🛡️ [Internal] Toggling all timers ${enabled ? 'ON' : 'OFF'} for ${device.name}`);
  this.publish(topic, payload);
}

// ============================================================================
// 🆕 INTERNAL METHODS: Rule Commands (add these to mqtt-service.ts)
// ============================================================================

/**
 * Internal method: Upload rule (called only by shield)
 */
private async _internalUploadRule(
  device: Device,
  ruleSlot: string,
  ruleText: string
): Promise<void> {
  const topic = `${device.commandTopic || device.topic}/Rule${ruleSlot}`;

  // Split rule into chunks if too large (Tasmota limit ~511 chars per command)
  const maxChunkSize = 500;

  if (ruleText.length <= maxChunkSize) {
    logger.addLog('info', `🛡️ [Internal] Uploading rule ${ruleSlot} for ${device.name}`);
    this.publish(topic, ruleText);
  } else {
    // Upload in chunks
    logger.addLog('info', `🛡️ [Internal] Uploading rule ${ruleSlot} in chunks for ${device.name}`);

    let offset = 0;
    let chunk = 1;

    while (offset < ruleText.length) {
      const chunkText = ruleText.substring(offset, offset + maxChunkSize);
      const isFirst = offset === 0;
      const prefix = isFirst ? '' : '+'; // '+' appends to existing rule

      this.publish(topic, prefix + chunkText);

      // Wait between chunks to avoid overwhelming device
      await this.delay(100);

      offset += maxChunkSize;
      chunk++;
    }
  }
}

/**
 * Internal method: Enable/disable rule (called only by shield)
 */
private async _internalEnableRule(
  device: Device,
  ruleSlot: string,
  enabled: boolean
): Promise<void> {
  const topic = `${device.commandTopic || device.topic}/Rule${ruleSlot}`;
  const payload = enabled ? 'ON' : 'OFF';

  logger.addLog('info', `🛡️ [Internal] ${enabled ? 'Enabling' : 'Disabling'} rule ${ruleSlot} for ${device.name}`);
  this.publish(topic, payload);
}

/**
 * Internal method: Upload script (called only by shield)
 */
private async _internalUploadScript(
  device: Device,
  scriptText: string
): Promise<void> {
  const topic = `${device.commandTopic || device.topic}/Script`;

  // Scripts can be very large, need chunking
  const maxChunkSize = 500;

  logger.addLog('info', `🛡️ [Internal] Uploading script for ${device.name}`);

  let offset = 0;
  while (offset < scriptText.length) {
    const chunkText = scriptText.substring(offset, offset + maxChunkSize);
    const isFirst = offset === 0;
    const prefix = isFirst ? '' : '+';

    this.publish(topic, prefix + chunkText);
    await this.delay(100);

    offset += maxChunkSize;
  }
}

/**
 * Internal method: Enable/disable script (called only by shield)
 */
private async _internalEnableScript(
  device: Device,
  enabled: boolean
): Promise<void> {
  const topic = `${device.commandTopic || device.topic}/Script`;
  const payload = enabled ? '>D' : ''; // '>D' enables, empty disables

  logger.addLog('info', `🛡️ [Internal] ${enabled ? 'Enabling' : 'Disabling'} script for ${device.name}`);
  this.publish(topic, payload);
}

}




// Singleton instance
export const mqttService = new MqttService();