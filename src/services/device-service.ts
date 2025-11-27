// device-service.ts - CROSS-TAB SAFE VERSION
import { Device, DeviceType, NewDeviceInput } from '../models/device.model';
import { crossTabSync } from './cross-tab-sync.manager'; // 🆕
import { userSessionManager } from './user-session.manager'; // 🆕

/**
 * DeviceService - Cross-Tab Safe
 *
 * KEY CHANGES:
 * 1. No longer stores devices in-memory (uses userSessionManager instead)
 * 2. All mutations broadcast to other tabs
 * 3. Subscribes to cross-tab device updates
 * 4. Delegates storage to userSessionManager
 */
export class DeviceService {
  private subscribers: Set<(devices: Device[]) => void> = new Set();

  // 🆕 Message deduplication for cross-tab updates
  private lastBroadcastTimestamps = new Map<string, number>();
  private readonly BROADCAST_DEBOUNCE_MS = 100;

  constructor() {
    console.log('🔧 DeviceService initialized (cross-tab safe)');
    this.setupCrossTabSync();
  }

  // =============================================================================
  // 🆕 Cross-Tab Synchronization
  // =============================================================================

  private setupCrossTabSync(): void {
    // Listen for device updates from other tabs
    crossTabSync.on('DEVICE_UPDATE', () => {
      console.log('📥 [DeviceService] Received device update from another tab');

      // Update local state and notify subscribers
      const session = userSessionManager.getCurrentSession();
      if (session) {
        this.notifySubscribers();
      }
    });

    // Listen for device additions
    crossTabSync.on('DEVICE_ADDED', (data) => {
      console.log('📥 [DeviceService] Device added in another tab:', data.deviceId);
      this.notifySubscribers();
    });

    // Listen for device removals
    crossTabSync.on('DEVICE_REMOVED', (data) => {
      console.log('📥 [DeviceService] Device removed in another tab:', data.deviceId);
      this.notifySubscribers();
    });
  }

  /**
   * Broadcast device change to other tabs (with debouncing)
   */
  private broadcastDeviceChange(deviceId: string, type: 'UPDATE' | 'ADD' | 'REMOVE', data?: any): void {
    const now = Date.now();
    const lastBroadcast = this.lastBroadcastTimestamps.get(`${type}_${deviceId}`) || 0;

    // Debounce rapid broadcasts
    if (now - lastBroadcast < this.BROADCAST_DEBOUNCE_MS) {
      return;
    }

    this.lastBroadcastTimestamps.set(`${type}_${deviceId}`, now);

    // Broadcast based on type
    switch (type) {
      case 'UPDATE':
        crossTabSync.broadcast('DEVICE_UPDATE', { deviceId, updates: data });
        break;
      case 'ADD':
        crossTabSync.broadcast('DEVICE_ADDED', { deviceId, device: data });
        break;
      case 'REMOVE':
        crossTabSync.broadcast('DEVICE_REMOVED', { deviceId });
        break;
    }
  }

  // =============================================================================
  // Device CRUD Operations (🆕 CROSS-TAB SAFE)
  // =============================================================================

  /**
   * Get all devices (from session, not in-memory cache)
   */
  getDevices(): Device[] {
    const session = userSessionManager.getCurrentSession();
    return session?.devices || [];
  }

  /**
   * Get a single device by ID
   */
  getDevice(deviceId: string): Device | undefined {
    const devices = this.getDevices();
    return devices.find(d => d.id === deviceId);
  }

  /**
   * Set all devices (used when loading from storage)
   * 🆕 Now syncs to session manager
   */
  setDevices(devices: Device[]): void {
    console.log(`📝 [DeviceService] Setting ${devices.length} device(s)`);

    const session = userSessionManager.getCurrentSession();
    if (!session) {
      console.error('❌ [DeviceService] No active session');
      return;
    }

    // Update session
    userSessionManager.updateSessionField('devices', devices);

    // Notify local subscribers
    this.notifySubscribers();
  }

  /**
   * 🔥 CROSS-TAB SAFE: Add device with broadcast
   */
  addDevice(device: Device): void {
    console.log('➕ [DeviceService] Adding device:', device.name);

    // Validate device
    const validation = this.validateDevice(device);
    if (!validation.isValid) {
      const errorMsg = `Cannot add invalid device: ${validation.errors.join(', ')}`;
      console.error('❌ [DeviceService]', errorMsg, device);
      throw new Error(errorMsg);
    }

    // Get current devices from session
    const devices = this.getDevices();

    // Check for duplicates
    const existing = devices.find(d => d.id === device.id);
    if (existing) {
      console.warn('⚠️ [DeviceService] Device already exists:', device.id);
      throw new Error(`Device with ID ${device.id} already exists`);
    }

    // Add to session (this handles cross-tab sync internally)
    const updatedDevices = [...devices, device];
    userSessionManager.updateSessionField('devices', updatedDevices);

    console.log('✅ [DeviceService] Device added successfully:', {
      id: device.id,
      name: device.name,
      type: device.type
    });

    // Broadcast to other tabs
    this.broadcastDeviceChange(device.id, 'ADD', device);

    // Notify local subscribers
    this.notifySubscribers();
  }

  /**
   * 🔥 CROSS-TAB SAFE: Update device with broadcast
   */
  updateDevice(deviceId: string, updates: Partial<Device>): void {
    const devices = this.getDevices();
    const index = devices.findIndex(d => d.id === deviceId);

    if (index === -1) {
      console.warn(`⚠️ [DeviceService] Device ${deviceId} not found for update`);
      return;
    }

    const oldDevice = devices[index];
    const updatedDevice = { ...oldDevice, ...updates };

    // Update in session
    const updatedDevices = [...devices];
    updatedDevices[index] = updatedDevice;
    userSessionManager.updateSessionField('devices', updatedDevices);

    // Log significant changes
    if (updates.isOn !== undefined && updates.isOn !== oldDevice.isOn) {
      console.log(`🔄 [DeviceService] "${oldDevice.name}" turned ${updates.isOn ? 'ON' : 'OFF'}`);
    }

    // Broadcast to other tabs
    this.broadcastDeviceChange(deviceId, 'UPDATE', updates);

    // Notify local subscribers
    this.notifySubscribers();
  }

  /**
   * 🔥 CROSS-TAB SAFE: Remove device with broadcast
   */
  removeDevice(deviceId: string): Device | null {
    const devices = this.getDevices();
    const index = devices.findIndex(d => d.id === deviceId);

    if (index === -1) {
      console.warn(`⚠️ [DeviceService] Device ${deviceId} not found for removal`);
      return null;
    }

    const removed = devices[index];

    // Remove from session
    const updatedDevices = devices.filter(d => d.id !== deviceId);
    userSessionManager.updateSessionField('devices', updatedDevices);

    console.log(`➖ [DeviceService] Removed device "${removed.name}" (${removed.id})`);

    // Broadcast to other tabs
    this.broadcastDeviceChange(deviceId, 'REMOVE');

    // Notify local subscribers
    this.notifySubscribers();

    return removed;
  }

  // =============================================================================
  // Account Deletion Support
  // =============================================================================

  /**
   * 🆕 Clear all devices (cross-tab safe)
   */
  clearDevices(): void {
    const devices = this.getDevices();
    const count = devices.length;

    console.log(`🗑️ [DeviceService] Clearing all devices (${count} device(s))`);

    if (count > 0) {
      console.log('🗑️ Devices being cleared:', devices.map(d => ({
        id: d.id,
        name: d.name,
        type: d.type
      })));
    }

    // Clear in session
    userSessionManager.updateSessionField('devices', []);

    // Broadcast to other tabs
    crossTabSync.broadcast('DEVICES_CLEARED', {});

    // Notify local subscribers
    this.notifySubscribers();

    console.log('✅ [DeviceService] All devices cleared');
  }

  // =============================================================================
  // Device Creation - FIXED VERSION (no changes needed, just uses existing logic)
  // =============================================================================

  createDevice(input: NewDeviceInput): Device {
    console.log('🗝️ [DeviceService] Creating device:', input);

    const deviceId = this.generateDeviceId();
    const now = new Date();

    const device: Device = {
      id: deviceId,
      name: input.name,
      topic: input.topic || '',
      type: input.type,
      isConnected: false,
      isOn: false,
      lastSeen: now,
      useAutoDiscovery: input.useAutoDiscovery,
      isEnabled: true,
      category: input.type,
      customOrder: undefined,
      shutterStopTopic: undefined,
      shutterCommandTopic: ''
    };

    if (input.baseTopic && input.baseTopic.trim().length > 0) {
      device.baseTopic = input.baseTopic.trim();
      console.log('✅ [DeviceService] baseTopic set:', device.baseTopic);
    } else {
      console.warn('⚠️ [DeviceService] No baseTopic provided');
    }

    switch (input.type) {
      case 'switch':
        this.initializeSwitchDevice(device, input);
        break;
      case 'dimmer':
        this.initializeDimmerDevice(device, input);
        break;
      case 'sensor':
        this.initializeSensorDevice(device, input);
        break;
      case 'shutter':
        this.initializeShutterDevice(device, input);
        break;
    }

    console.log('✅ [DeviceService] Device created:', {
      id: device.id,
      name: device.name,
      type: device.type,
      baseTopic: device.baseTopic
    });

    return device;
  }

  // =============================================================================
  // Device Type Initialization (keeping your existing methods)
  // =============================================================================

  private initializeShutterDevice(device: Device, input: NewDeviceInput): void {
    console.log('🪟 [DeviceService] Initializing shutter device');

    if (!input.shutterIndex) {
      throw new Error('shutterIndex is required for shutter devices');
    }

    if (input.shutterIndex < 1 || input.shutterIndex > 16) {
      throw new Error(`shutterIndex must be 1-16, got: ${input.shutterIndex}`);
    }

    device.shutterIndex = input.shutterIndex;
    device.shutterMode = input.shutterMode;
    device.shutterInvert = input.shutterInvert || false;
    device.shutterPosition = 0;
    device.shutterDirection = 0;
    device.shutterTarget = 0;

    if (!device.baseTopic) {
      throw new Error('baseTopic is required for shutter devices');
    }

    device.commandTopic = `cmnd/${device.baseTopic}/ShutterPosition${device.shutterIndex}`;
    device.resultTopic = `stat/${device.baseTopic}/RESULT`;
    device.statTopic = `stat/${device.baseTopic}/STATUS13`;

    if (device.useAutoDiscovery) {
      device.lwtTopic = `tele/${device.baseTopic}/LWT`;
      device.stateTopic = `tele/${device.baseTopic}/STATE`;
      device.lwtStatus = 'Offline';
    }

    device.shutterCalibration = {
      openDuration: 10,
      closeDuration: 10,
      halfwayPosition: 50,
      calibrationPoints: undefined
    };
  }

  private initializeSwitchDevice(device: Device, input: NewDeviceInput): void {
    device.powerChannel = input.powerChannel || 1;

    if (device.baseTopic) {
      const powerName = device.powerChannel === 1 ? 'POWER' : `POWER${device.powerChannel}`;
      device.commandTopic = `cmnd/${device.baseTopic}/${powerName}`;
      device.statTopic = `stat/${device.baseTopic}/${powerName}`;
      device.resultTopic = `stat/${device.baseTopic}/RESULT`;

      if (device.useAutoDiscovery) {
        device.lwtTopic = `tele/${device.baseTopic}/LWT`;
        device.stateTopic = `tele/${device.baseTopic}/STATE`;
        device.lwtStatus = 'Offline';
      }
    }
  }

  private initializeDimmerDevice(device: Device, input: NewDeviceInput): void {
    device.powerChannel = input.powerChannel || 2;
    device.dimmerValue = 0;

    if (device.baseTopic) {
      device.dimmerCommandTopic = `cmnd/${device.baseTopic}/Dimmer`;
      device.commandTopic = device.dimmerCommandTopic;
      device.resultTopic = `stat/${device.baseTopic}/RESULT`;

      if (device.useAutoDiscovery) {
        device.lwtTopic = `tele/${device.baseTopic}/LWT`;
        device.stateTopic = `tele/${device.baseTopic}/STATE`;
        device.lwtStatus = 'Offline';
      }
    }
  }

  private initializeSensorDevice(device: Device, input: NewDeviceInput): void {
    device.jsonPath = input.jsonPath;
    device.sensorConfig = input.sensorConfig;

    if (device.baseTopic) {
      device.topic = `tele/${device.baseTopic}/SENSOR`;

      if (device.useAutoDiscovery) {
        device.lwtTopic = `tele/${device.baseTopic}/LWT`;
        device.stateTopic = `tele/${device.baseTopic}/STATE`;
        device.lwtStatus = 'Offline';
      }
    }
  }

  private generateDeviceId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `device_${timestamp}_${random}`;
  }

  // =============================================================================
  // Subscription Management (🆕 IMPROVED)
  // =============================================================================

  /**
   * Subscribe to device changes
   * 🆕 Also subscribes to session changes
   */
  subscribe(callback: (devices: Device[]) => void): () => void {
    this.subscribers.add(callback);

    // Immediately notify with current state
    callback(this.getDevices());

    // 🆕 Also subscribe to session changes
    const unsubscribeSession = userSessionManager.subscribe((session) => {
      if (session) {
        callback(session.devices);
      }
    });

    // Return combined unsubscribe function
    return () => {
      this.subscribers.delete(callback);
      unsubscribeSession();
    };
  }

  /**
   * Notify all subscribers of device changes
   */
  private notifySubscribers(): void {
    const devices = this.getDevices();

    this.subscribers.forEach(callback => {
      try {
        callback([...devices]); // Send copy to prevent mutation
      } catch (error) {
        console.error('❌ [DeviceService] Subscriber notification failed:', error);
      }
    });
  }

  // =============================================================================
  // Utility Methods (unchanged)
  // =============================================================================

  getDevicesByType(type: DeviceType): Device[] {
    return this.getDevices().filter(d => d.type === type);
  }

  getEnabledDevices(): Device[] {
    return this.getDevices().filter(d => d.isEnabled !== false);
  }

  getDisabledDevices(): Device[] {
    return this.getDevices().filter(d => d.isEnabled === false);
  }

  getConnectedDevices(): Device[] {
    return this.getDevices().filter(d => d.isConnected);
  }

  getOfflineDevices(): Device[] {
    return this.getDevices().filter(d => !d.isConnected);
  }

  deviceExists(deviceId: string): boolean {
    return this.getDevices().some(d => d.id === deviceId);
  }

  getDeviceCount(): number {
    return this.getDevices().length;
  }

  getStats(): {
    total: number;
    byType: Record<DeviceType, number>;
    enabled: number;
    disabled: number;
    connected: number;
    offline: number;
  } {
    const devices = this.getDevices();
    const byType: Record<DeviceType, number> = {
      switch: 0,
      dimmer: 0,
      shutter: 0,
      sensor: 0
    };

    let enabled = 0;
    let disabled = 0;
    let connected = 0;
    let offline = 0;

    devices.forEach(device => {
      byType[device.type]++;

      if (device.isEnabled !== false) {
        enabled++;
      } else {
        disabled++;
      }

      if (device.isConnected) {
        connected++;
      } else {
        offline++;
      }
    });

    return {
      total: devices.length,
      byType,
      enabled,
      disabled,
      connected,
      offline
    };
  }

  getSubscriptionTopics(device: Device): string[] {
    const topics: string[] = [];

    switch (device.type) {
      case 'switch':
        if (device.statTopic) topics.push(device.statTopic);
        if (device.resultTopic) topics.push(device.resultTopic);
        break;

      case 'dimmer':
        if (device.resultTopic) topics.push(device.resultTopic);
        if (device.baseTopic) {
          const channel = device.powerChannel || 2;
          topics.push(`stat/${device.baseTopic}/POWER${channel}`);
        }
        break;

      case 'shutter':
        if (device.resultTopic) topics.push(device.resultTopic);
        break;

      case 'sensor':
        if (device.statTopic) topics.push(device.statTopic);
        break;
    }

    if (device.lwtTopic) topics.push(device.lwtTopic);
    if (device.stateTopic) topics.push(device.stateTopic);

    return topics.filter(t => t && t.length > 0);
  }

  validateDevice(device: Device): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!device.id) errors.push('Device ID is missing');
    if (!device.name || device.name.trim().length === 0) errors.push('Device name is missing');
    if (!device.type) errors.push('Device type is missing');

    switch (device.type) {
      case 'shutter':
        if (!device.baseTopic) errors.push('baseTopic is required for shutter devices');
        if (!device.shutterIndex) errors.push('shutterIndex is required for shutter devices');
        if (!device.shutterMode) errors.push('shutterMode is required for shutter devices');
        if (!device.commandTopic) errors.push('commandTopic is missing for shutter device');
        if (!device.resultTopic) errors.push('resultTopic is missing for shutter device');
        break;

      case 'switch':
      case 'dimmer':
        if (!device.baseTopic && !device.topic) errors.push('baseTopic or topic is required');
        if (!device.commandTopic) errors.push('commandTopic is missing');
        break;

      case 'sensor':
        if (!device.baseTopic && !device.topic) errors.push('baseTopic or topic is required');
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  debugState(): void {
    const devices = this.getDevices();
    console.group('📊 DeviceService State (Cross-Tab Safe)');
    console.log('Total devices:', devices.length);
    console.log('Subscribers:', this.subscribers.size);
    console.log('Leader tab:', crossTabSync.isLeaderTab());
    console.table(devices.map(d => ({
      id: d.id,
      name: d.name,
      type: d.type,
      isOn: d.isOn,
      isConnected: d.isConnected
    })));
    console.log('Stats:', this.getStats());
    console.groupEnd();
  }
}

// Singleton instance
export const deviceService = new DeviceService();