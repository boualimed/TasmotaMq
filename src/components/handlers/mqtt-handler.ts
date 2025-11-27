// handlers/mqtt-handler.ts
// MQTT Connection & Message Handling

 import { mqttService } from '../../services/mqtt-service';
import { deviceService } from '../../services/device-service';
import { deviceMonitorService } from '../../services/device-monitor.service';
import { deviceValidationService } from '../../services/device-validation.service';
import { ollamaAIService, DeviceContext } from '../../services/ollama-ai.service';
import { notificationService } from '../../services/notification.service';
import { logger } from '../../utils/logger.util';
import { extractJsonValue } from '../../utils/json-parser.util';
import { MQTT_COMMANDS } from '../../constants/mqtt.constants';
import { MqttSettings } from '../../models/mqtt-settings.model';
import { Device, TasmotaTimer } from '../../models/device.model';
import { supabaseService } from '../../services/supabase.service';
import { authService } from '../../services/auth.service';
import { userSessionManager } from '../../services/user-session.manager';
import { indexedDBService } from '../../services/indexeddb.service';

export class MqttHandler {
  private subscribedTopics = new Set<string>();
  private dimmerDebounceTimers = new Map<string, any>();
  //private readonly DIMMER_DEBOUNCE_MS = 150;

  constructor(
    private onStateChange: () => void,
    private showError: (message: string) => void
  ) {}

  // =============================================================================
  // Connection Management
  // =============================================================================

  async handleConnect(mqttSettings: MqttSettings): Promise<void> {
    try {
      console.log('🔌 User initiated connection...', {
        host: mqttSettings.host,
        port: mqttSettings.port
      });

      if (mqttService.getStatus() === 'connecting') {
        console.warn('⚠️ Connection already in progress, ignoring duplicate request');
        return;
      }

      await mqttService.connect(mqttSettings);
      this.subscribeToAllDevices();

      setTimeout(() => {
        this.autoValidateDevices();
      }, 2000);

      this.onStateChange();
    } catch (error: any) {
      this.showError(error.message || 'Connection failed');
    }
  }

  handleDisconnect(saveState: () => void): void {
    console.log('🔌 Manual disconnect requested by user');
    this.subscribedTopics.clear();
    mqttService.disconnect();
    saveState();
  }

  handleCancelConnection(): void {
    console.log('🚫 Connection cancelled by user');
    this.subscribedTopics.clear();
    mqttService.cancelConnection();
  }

  // =============================================================================
  // Subscription Management
  // =============================================================================

  private async subscribeToAllDevices(): Promise<void> {
    if (!mqttService.isConnected || !mqttService.isConnected()) {
      console.log('ℹ️ Cannot subscribe to devices: MQTT not connected');
      return;
    }

    const devices = deviceService.getDevices();
    const STAGGER_MS = devices.length > 30 ? 200 : 50;

    for (const device of devices) {
      if (device.isEnabled === false) continue;

      try {
        if (device.type === 'shutter') {
          mqttService.subscribeToShutter(device);
        } else {
          mqttService.subscribeToDevice(device);
        }

        if (device.baseTopic && device.timersEnabled) {
          const resultTopic = `stat/${device.baseTopic}/RESULT`;
          if (!this.subscribedTopics.has(resultTopic)) {
            try {
              mqttService.subscribe(resultTopic);
              this.subscribedTopics.add(resultTopic);
            } catch (err) {
              logger.addLog('warning', `Failed to subscribe to timer updates for ${device.name}`);
            }
          }
        }
      } catch (err) {
        logger.addLog('warning', `Failed to subscribe to device ${device.name}: ${String(err)}`);
      }

      if (STAGGER_MS > 0) {
        await new Promise(resolve => setTimeout(resolve, STAGGER_MS));
      }
    }
  }

  subscribeToDevice(device: Device): void {
    if (!mqttService.isConnected || !mqttService.isConnected()) {
      notificationService.warning('⚠️ MQTT must be connected', 3000);
      return;
    }

    try {
      if (device.type === 'shutter') {
        this.subscribeToShutterWithValidation(device);
      } else {
        mqttService.subscribeToDevice(device);
      }
      notificationService.info(`📡 Subscribed to ${device.name} topics`, 2500);
      logger.addLog('info', `📡 Subscribed to ${device.name}`);
    } catch (error: any) {
      logger.addLog('error', `❌ Subscription failed: ${error.message}`);
      notificationService.error(
        `⚠️ Device added but subscription failed: ${error.message}`,
        6000
      );
    }
  }

  private subscribeToShutterWithValidation(device: Device): void {
    console.log('📡 Subscribing to shutter:', device.name);

    if (!device.baseTopic) {
      throw new Error('baseTopic is required for shutter subscription');
    }

    if (!device.shutterIndex) {
      throw new Error('shutterIndex is required for shutter subscription');
    }

    if (device.shutterIndex < 1 || device.shutterIndex > 16) {
      throw new Error(`shutterIndex must be 1-16, got: ${device.shutterIndex}`);
    }

    console.log('📡 Shutter subscription details:', {
      baseTopic: device.baseTopic,
      shutterIndex: device.shutterIndex,
      shutterMode: device.shutterMode,
      resultTopic: `stat/${device.baseTopic}/RESULT`,
      commandTopic: `cmnd/${device.baseTopic}/ShutterPosition${device.shutterIndex}`
    });

    try {
      mqttService.subscribeToShutter(device);
      logger.addLog('success', `✅ Subscribed to shutter ${device.name} (Index ${device.shutterIndex})`);
    } catch (error: any) {
      logger.addLog('error', `❌ Shutter subscription failed: ${error.message}`);
      throw error;
    }
  }

  // =============================================================================
  // Message Handling
  // =============================================================================

  handleMqttMessage(message: { topic: string; payload: any }): void {
    const { topic, payload } = message;

    if (topic.includes('/STATUS')) {
      deviceValidationService.processStatusMessage(topic, payload);
    }

    deviceService.getDevices().forEach((device: Device) => {
        if (device.isEnabled === false) return;

      this.queueMqttMessageToSupabase(device, topic, payload);

      if (this.isLwtMessage(device, topic)) {
        this.handleLwtMessage(device, topic, payload);
        return;
      }

      if (this.isStateTelemetryMessage(device, topic)) {
        this.handleStateTelemetryMessage(device);
      }

      switch (device.type) {
        case 'switch':
          this.handleSwitchMessage(device, topic, payload);
          break;
        case 'sensor':
          this.handleSensorMessage(device, topic, payload);
          break;
        case 'dimmer':
          this.handleDimmerMessage(device, topic, payload);
          break;
        case 'shutter':
          this.handleShutterMessage(device, topic, payload);
          break;
      }

      if (this.isTimerStatusMessage(device, topic)) {
        this.handleTimerStatusMessage(device, payload);
      }

      userSessionManager.trackUsage('mqttMessagesProcessed', 1);
      this.queueDeviceStateToSupabase(device);
    });
  }

  // =============================================================================
  // Device Type Handlers
  // =============================================================================

  private handleSwitchMessage(device: Device, topic: string, payload: any): void {
    const statPowerTopic = device.statTopic!;
    const resultTopic = device.resultTopic!;

    if (topic === statPowerTopic || topic === resultTopic) {
      const previousState = device.isOn;
      const isOn = this.parseSwitchState(device, payload, device.isOn);

      const updates = this.buildSwitchUpdates(device, isOn);
      deviceService.updateDevice(device.id, updates);

      if (previousState !== isOn) {
        this.recordDeviceHistoryToSupabase(device.id, isOn ? 'on' : 'off', previousState, isOn);
      }

      logger.addLog('success', `${device.name} (POWER${device.powerChannel || 1}) state updated: ${isOn ? 'ON' : 'OFF'}`);
      this.feedToAI(device, topic, { isOn, previousState, channel: device.powerChannel }, { isOn: previousState });
    }
  }

  private parseSwitchState(device: Device, payload: any, currentState: boolean): boolean {
    const channel = device.powerChannel || 1;
    const powerField = channel === 1 ? 'POWER' : `POWER${channel}`;

    if (typeof payload === 'object') {
      if (payload[powerField] !== undefined) {
        return payload[powerField] === MQTT_COMMANDS.ON;
      }
      if (channel === 1 && payload.POWER1 !== undefined) {
        return payload.POWER1 === MQTT_COMMANDS.ON;
      }
      if (payload.RESULT?.[powerField] !== undefined) {
        return payload.RESULT[powerField] === MQTT_COMMANDS.ON;
      }
      if (channel === 1 && payload.RESULT?.POWER1 !== undefined) {
        return payload.RESULT.POWER1 === MQTT_COMMANDS.ON;
      }
      if (payload.POWER !== undefined) {
        return payload.POWER === MQTT_COMMANDS.ON;
      }
    } else if (typeof payload === 'string') {
      return payload === MQTT_COMMANDS.ON;
    }
    return currentState;
  }

  private buildSwitchUpdates(device: Device, isOn: boolean): Partial<Device> {
    const updates: Partial<Device> = {
      isOn,
      lastSeen: new Date()
    };

    if (!device.useAutoDiscovery || !device.lwtTopic) {
      updates.isConnected = true;
    } else {
      deviceMonitorService.markDeviceActivity(device);
    }

    return updates;
  }

  private handleSensorMessage(device: Device, topic: string, payload: any): void {
    const sensorTopic = device.baseTopic
      ? `tele/${device.baseTopic}/SENSOR`
      : device.topic;

    if (topic === sensorTopic) {
      const sensorData = this.parseSensorData(device, payload);
      const updates = this.buildSensorUpdates(device, sensorData);

      deviceService.updateDevice(device.id, updates);
      this.feedToAI(device, topic, sensorData);
      // ✅ CRITICAL FIX: Store sensor data to IndexedDB
      this.storeSensorDataToIndexedDB(device, topic, sensorData);

      this.feedToAI(device, topic, sensorData);
    }
  }

  private parseSensorData(device: Device, payload: any): any {
    if (device.jsonPath) {
      const extracted = extractJsonValue(payload, device.jsonPath);
      return extracted !== null ? extracted : payload;
    }
    return payload;
  }

  private buildSensorUpdates(device: Device, sensorData: any): Partial<Device> {
    const updates: Partial<Device> = {
      sensorData,
      lastSeen: new Date()
    };

    if (!device.useAutoDiscovery || !device.lwtTopic) {
      updates.isConnected = true;
    } else {
      deviceMonitorService.markDeviceActivity(device);
    }

    return updates;
  }

  // ✅ NEW METHOD: Store sensor data to IndexedDB
  private async storeSensorDataToIndexedDB(
    device: Device,
    topic: string,
    data: any
  ): Promise<void> {
    // Only store if IndexedDB is enabled
    if (!indexedDBService.isEnabled()) {
      return;
    }

    try {
      await indexedDBService.storeSensorData(
        device.id,
        device.name,
        topic,
        data
      );

      // Optional: Log successful storage (can be removed if too verbose)
      // logger.addLog('info', `💾 Stored sensor data for ${device.name}`);
    } catch (error: any) {
      // Silent fail - don't interrupt main message flow
      console.error(`Failed to store sensor data for ${device.name}:`, error);

      // Optional: Log error for debugging
      logger.addLog('warning', `⚠️ IndexedDB storage failed for ${device.name}: ${error.message}`);
    }
  }


  private handleDimmerMessage(device: Device, topic: string, payload: any): void {
    const resultTopic = device.resultTopic!;
    const powerChannel = device.powerChannel || 2;
    const powerName = `POWER${powerChannel}`;
    const powerTopic = device.baseTopic
      ? `stat/${device.baseTopic}/${powerName}`
      : resultTopic.replace('/RESULT', `/${powerName}`);

    if (topic === resultTopic || topic === powerTopic) {
      let dimmerValue = device.dimmerValue || 0;
      let isOn = device.isOn;

      if (typeof payload === 'object') {
        if (payload.Dimmer !== undefined) {
          dimmerValue = parseInt(payload.Dimmer);
        }

        if (payload[powerName] !== undefined) {
          isOn = payload[powerName] === MQTT_COMMANDS.ON;
        }

        if (payload.RESULT) {
          if (payload.RESULT.Dimmer !== undefined) {
            dimmerValue = parseInt(payload.RESULT.Dimmer);
          }
          if (payload.RESULT[powerName] !== undefined) {
            isOn = payload.RESULT[powerName] === MQTT_COMMANDS.ON;
          }
        }
      } else if (typeof payload === 'string') {
        if (topic === powerTopic) {
          isOn = payload === MQTT_COMMANDS.ON;
        }
      }

      const updates = this.buildDimmerUpdates(device, dimmerValue, isOn);
      deviceService.updateDevice(device.id, updates);

      logger.addLog('success', `${device.name} dimmer: ${dimmerValue}% ${isOn ? 'ON' : 'OFF'}`);
      this.feedToAI(device, topic, { dimmerValue, isOn });
    }
  }

  private buildDimmerUpdates(device: Device, dimmerValue: number, isOn: boolean): Partial<Device> {
    const updates: Partial<Device> = {
      dimmerValue,
      isOn,
      lastSeen: new Date()
    };

    if (!device.useAutoDiscovery || !device.lwtTopic) {
      updates.isConnected = true;
    } else {
      deviceMonitorService.markDeviceActivity(device);
    }

    return updates;
  }

  private handleShutterMessage(device: Device, topic: string, payload: any): void {
    if (!device.baseTopic || !device.shutterIndex) return;

    const resultTopic = `stat/${device.baseTopic}/RESULT`;
    const shutterStatusTopic = `stat/${device.baseTopic}/SHUTTER${device.shutterIndex}`;
    const power1Topic = `stat/${device.baseTopic}/POWER1`;
    const power2Topic = `stat/${device.baseTopic}/POWER2`;

    if (topic === resultTopic) {
      this.parseShutterResult(device, topic, payload);
    }

    if (topic === shutterStatusTopic) {
      this.parseShutterStatusValue(device, payload);
    }

    if (topic === power1Topic || topic === power2Topic) {
      this.parseShutterPowerState(device, topic, payload);
    }
  }

  private parseShutterStatusValue(device: Device, payload: any): void {
    let position: number | undefined;

    if (typeof payload === 'number') {
      position = payload;
    } else if (typeof payload === 'string') {
      position = parseInt(payload);
    }

    if (position !== undefined && !isNaN(position)) {
      deviceService.updateDevice(device.id, {
        shutterPosition: position,
        lastSeen: new Date()
      });
    }
  }

  private parseShutterPowerState(device: Device, topic: string, payload: any): void {
    const isPower1 = topic.endsWith('/POWER1');
    const isPower2 = topic.endsWith('/POWER2');

    if (!isPower1 && !isPower2) return;

    const powerState = typeof payload === 'string' ? payload : payload.toString();
    const isOn = powerState === 'ON';

    if (device.shutterMode === 1) {
      if (!device.shutterPowerStates) {
        device.shutterPowerStates = { power1: false, power2: false };
      }

      if (isPower1) {
        device.shutterPowerStates.power1 = isOn;
      } else {
        device.shutterPowerStates.power2 = isOn;
      }

      const { power1, power2 } = device.shutterPowerStates;
      let direction: -1 | 0 | 1 = 0;

      if (power1 && !power2) {
        direction = 1;
      } else if (power2 && !power1) {
        direction = -1;
      } else {
        direction = 0;
      }

      if (device.shutterDirection !== direction) {
        deviceService.updateDevice(device.id, {
          shutterDirection: direction,
          lastSeen: new Date()
        });
      }
    }
  }

  private parseShutterResult(device: Device, topic: string, payload: any): void {
    if (typeof payload !== 'object') return;

    const shutterKey = `Shutter${device.shutterIndex}`;

    if (payload[shutterKey] !== undefined) {
      const shutterData = payload[shutterKey];
      const updates: Partial<Device> = { lastSeen: new Date() };

      if (shutterData.Position !== undefined) {
        updates.shutterPosition = parseInt(shutterData.Position);
      }

      if (shutterData.Direction !== undefined) {
        updates.shutterDirection = parseInt(shutterData.Direction) as -1 | 0 | 1;
      }

      if (shutterData.Target !== undefined) {
        updates.shutterTarget = parseInt(shutterData.Target);
      }

      if (shutterData.Tilt !== undefined && device.shutterTiltConfig) {
        const tilt = parseInt(shutterData.Tilt);
        device.shutterTiltConfig.currentTilt = tilt;
        updates.shutterTiltConfig = device.shutterTiltConfig;
      }

      if (!device.useAutoDiscovery || !device.lwtTopic) {
        updates.isConnected = true;
      } else {
        deviceMonitorService.markDeviceActivity(device);
      }

      deviceService.updateDevice(device.id, updates);

      const directionText =
        updates.shutterDirection === 1 ? '▲ Opening' :
        updates.shutterDirection === -1 ? '▼ Closing' :
        updates.shutterDirection === 0 ? '■ Stopped' : '';

      logger.addLog('success',
        `${device.name}: ${updates.shutterPosition}% ${directionText}` +
        (updates.shutterTarget !== updates.shutterPosition ? ` → ${updates.shutterTarget}%` : '')
      );

      this.feedToAI(device, topic, {
        position: updates.shutterPosition,
        direction: updates.shutterDirection,
        target: updates.shutterTarget,
        tilt: shutterData.Tilt
      });
    }

    if (payload.POWER1 !== undefined || payload.POWER2 !== undefined) {
      const power1On = payload.POWER1 === 'ON';
      const power2On = payload.POWER2 === 'ON';

      if (device.shutterMode === 1) {
        if (power1On && !power2On) {
          deviceService.updateDevice(device.id, { shutterDirection: 1 });
        } else if (power2On && !power1On) {
          deviceService.updateDevice(device.id, { shutterDirection: -1 });
        } else if (!power1On && !power2On) {
          deviceService.updateDevice(device.id, { shutterDirection: 0 });
        }
      }
    }
  }

  // =============================================================================
  // LWT & Telemetry
  // =============================================================================

  private isLwtMessage(device: Device, topic: string): boolean {
    return Boolean(device.lwtTopic && topic === device.lwtTopic);
  }

  private isStateTelemetryMessage(device: Device, topic: string): boolean {
    return Boolean(device.stateTopic && topic === device.stateTopic);
  }

  private handleLwtMessage(device: Device, topic: string, payload: any): void {
    const lwtStatus = typeof payload === 'string' ? payload : payload.toString();
    const isOnline = lwtStatus === 'Online';

    deviceService.updateDevice(device.id, {
      isConnected: isOnline,
      lwtStatus: lwtStatus as 'Online' | 'Offline',
      lastSeen: isOnline ? new Date() : device.lastSeen
    });

    this.recordDeviceHistoryToSupabase(device.id, isOnline ? 'online' : 'offline', !isOnline, isOnline);
    deviceMonitorService.setDeviceStatus(device.id, isOnline);

    if (lwtStatus === 'Online' && deviceValidationService.shouldValidate(device)) {
      // Validation will be handled externally
    }

    logger.addLog(
      isOnline ? 'success' : 'warning',
      `${device.name} LWT: ${lwtStatus}`
    );

    this.feedToAI(device, topic, { lwtStatus, isOnline });
  }

  private handleStateTelemetryMessage(device: Device): void {
    deviceService.updateDevice(device.id, {
      isConnected: true,
      lastSeen: new Date()
    });
    deviceMonitorService.markDeviceActivity(device);
    logger.addLog('info', `${device.name} telemetry received`);
  }

  // =============================================================================
  // Timer Handling
  // =============================================================================

  private isTimerStatusMessage(device: Device, topic: string): boolean {
    if (!device.baseTopic) return false;
    const resultTopic = `stat/${device.baseTopic}/RESULT`;
    return topic === resultTopic;
  }

  private handleTimerStatusMessage(device: Device, payload: any): void {
    if (!payload || typeof payload !== 'object') return;

    const timerKeys = Object.keys(payload).filter(key => key.startsWith('Timer'));

    if (timerKeys.length === 0 && !payload.Timers) return;

    const currentConfig = device.timerConfig || { timers: [] };
    let updated = false;

    if (payload.Timers !== undefined) {
      const globalEnabled = payload.Timers === 'ON';
      if (device.timersEnabled !== globalEnabled) {
        deviceService.updateDevice(device.id, { timersEnabled: globalEnabled });
        updated = true;
      }
    }

    timerKeys.forEach(key => {
      const timerIdMatch = key.match(/Timer(\d+)/);
      if (!timerIdMatch) return;

      const timerId = parseInt(timerIdMatch[1]);
      const timerData = payload[key];

      if (typeof timerData !== 'object') return;

      const timer: TasmotaTimer = {
        id: timerId,
        enabled: timerData.Arm === 1,
        mode: timerData.Mode ?? 0,
        time: timerData.Time || '00:00',
        window: timerData.Window ?? 0,
        days: timerData.Days || '1111111',
        repeat: timerData.Repeat === 1,
        output: timerData.Output ?? 1,
        action: timerData.Action ?? 1
      };

      const existingIndex = currentConfig.timers.findIndex((t: { id: number; }) => t.id === timerId);
      if (existingIndex >= 0) {
        currentConfig.timers[existingIndex] = timer;
      } else {
        currentConfig.timers.push(timer);
      }
      updated = true;
    });

    if (updated) {
      deviceService.updateDevice(device.id, { timerConfig: currentConfig });
      logger.addLog('info', `${device.name} timer config updated`);
    }
  }

  // =============================================================================
  // AI Integration
  // =============================================================================

  private feedToAI(
    device: Device,
    topic: string,
    data: any,
    previousData?: any
  ): void {
    if (!ollamaAIService.getConfig().enabled) return;

    const context: DeviceContext = {
      deviceId: device.id,
      deviceName: device.name,
      deviceType: device.type,
      topic,
      data,
      timestamp: new Date(),
      ...(previousData && { previousData })
    };

    ollamaAIService.processMqttData(context);
  }

  // =============================================================================
  // Validation
  // =============================================================================

  private async autoValidateDevices(): Promise<void> {
    const devices = deviceService.getDevices();

    for (const device of devices) {
      if (device.isEnabled !== false && deviceValidationService.shouldValidate(device)) {
        const STAGGER_MS = devices.length > 30 ? 1500 : 800;
        await new Promise(resolve => setTimeout(resolve, STAGGER_MS));
        // Validation handled by validation handler
      }
    }
  }

  // =============================================================================
  // Storage Integration
  // =============================================================================

  private queueMqttMessageToSupabase(device: Device, topic: string, payload: any): void {
    if (!supabaseService.isEnabled()) return;

    const user = authService.getCurrentUser();
    if (!user) return;

    supabaseService.queueMqttMessage(user.id, device.id, device.name, topic, payload);
  }

  private recordDeviceHistoryToSupabase(
    deviceId: string,
    status: string,
    previousState: boolean,
    currentState: boolean
  ): void {
    if (!supabaseService.isEnabled()) return;
    const user = authService.getCurrentUser();
    if (!user) return;

    const mappedStatus = ((): "online" | "offline" | "on" | "off" => {
      const s = String(status).toLowerCase();
      if (s === 'online' || s === 'offline' || s === 'on' || s === 'off') {
        return s as "online" | "offline" | "on" | "off";
      }
      if (s === 'connected' || s === 'active') return 'online';
      if (s === 'disconnected' || s === 'idle' || s === 'inactive') return 'offline';
      if (s === 'true') return 'on';
      if (s === 'false') return 'off';
      return currentState ? 'on' : 'off';
    })();

    supabaseService.recordDeviceHistory(user.id, deviceId, mappedStatus, previousState, currentState);
  }

  private queueDeviceStateToSupabase(device: Device): void {
    if (!supabaseService.isEnabled()) return;

    const user = authService.getCurrentUser();
    if (!user) return;

    supabaseService.queueDeviceState(user.id, device);
  }

  // =============================================================================
  // Cleanup
  // =============================================================================

  cleanup(): void {
    this.subscribedTopics.clear();
    this.dimmerDebounceTimers.forEach(timer => clearTimeout(timer));
    this.dimmerDebounceTimers.clear();
  }
}