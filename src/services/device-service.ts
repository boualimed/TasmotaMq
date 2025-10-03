import { Device, NewDeviceInput } from '../models/device.model';
import { TOPIC_PATTERNS } from '../constants/mqtt.constants';

export class DeviceService {
  private devices: Device[] = [];
  private listeners: Set<(devices: Device[]) => void> = new Set();

  /**
   * Creates a new device from input
   */
  createDevice(input: NewDeviceInput): Device {
    const base = input.baseTopic?.trim();
    const commandTopic = base
      ? TOPIC_PATTERNS.COMMAND(base)
      : input.topic;
    const statTopic = base
      ? TOPIC_PATTERNS.STAT(base)
      : input.topic.replace(/cmnd\//, 'stat/').replace(/\/POWER$/, '/POWER');
    const resultTopic = base
      ? TOPIC_PATTERNS.RESULT(base)
      : statTopic.replace(/\/POWER$/, '/RESULT');
    const lwtTopic = base ? TOPIC_PATTERNS.LWT(base) : undefined;
    const stateTopic = base ? TOPIC_PATTERNS.STATE(base) : undefined;

    return {
      id: Date.now().toString(),
      name: input.name,
      topic: commandTopic,
      baseTopic: base || undefined,
      commandTopic,
      statTopic,
      resultTopic,
      lwtTopic,
      stateTopic,
      type: input.type,
      isConnected: false,
      isOn: false,
      jsonPath: input.jsonPath || undefined,
      useAutoDiscovery: input.useAutoDiscovery ?? true,
      lwtStatus: undefined
    };
  }

  /**
   * Adds a device to the list
   */
  addDevice(device: Device): void {
    this.devices = [...this.devices, device];
    this.notifyListeners();
  }

  /**
   * Removes a device by ID
   */
  removeDevice(deviceId: string): Device | null {
    const device = this.devices.find(d => d.id === deviceId);
    if (!device) return null;

    this.devices = this.devices.filter(d => d.id !== deviceId);
    this.notifyListeners();
    return device;
  }

  /**
   * Updates a device
   */
  updateDevice(deviceId: string, updates: Partial<Device>): void {
    this.devices = this.devices.map(d =>
      d.id === deviceId ? { ...d, ...updates, lastSeen: new Date() } : d
    );
    this.notifyListeners();
  }

  /**
   * Updates all devices connection status
   */
  setAllDevicesDisconnected(): void {
    this.devices = this.devices.map(d => ({ ...d, isConnected: false }));
    this.notifyListeners();
  }

  /**
   * Gets all devices
   */
  getDevices(): Device[] {
    return [...this.devices];
  }

  /**
   * Gets a device by ID
   */
  getDevice(deviceId: string): Device | undefined {
    return this.devices.find(d => d.id === deviceId);
  }

  /**
   * Sets all devices
   */
  setDevices(devices: Device[]): void {
    this.devices = [...devices];
    this.notifyListeners();
  }

  /**
   * Gets subscription topic for a device
   */
  getSubscriptionTopics(device: Device): string[] {
    if (device.type === 'switch') {
      return [device.statTopic!, device.resultTopic!];
    } else {
      return [device.baseTopic ? TOPIC_PATTERNS.SENSOR(device.baseTopic) : device.topic];
    }
  }

  /**
   * Subscribes to device updates
   */
  subscribe(listener: (devices: Device[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.devices]));
  }
}

// Singleton instance
export const deviceService = new DeviceService();