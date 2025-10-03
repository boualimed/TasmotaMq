import { Device } from '../models/device.model';
import { MQTT_CONFIG } from '../constants/mqtt.constants';

/**
 * Monitors device activity and marks devices as offline if no messages received
 */
export class DeviceMonitorService {
  private deviceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private activityCallback?: (deviceId: string, isActive: boolean) => void;

  /**
   * Marks a device as having recent activity
   */
  markDeviceActivity(device: Device): void {
    // Clear existing timer
    const existingTimer = this.deviceTimers.get(device.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // If not using LWT, mark as online immediately on any message
    if (!device.useAutoDiscovery || !device.lwtTopic) {
      this.activityCallback?.(device.id, true);
    }

    // Set new timeout - mark offline if no activity
    const timer = setTimeout(() => {
      // Only auto-mark offline if not using LWT (LWT will handle it explicitly)
      if (!device.useAutoDiscovery || !device.lwtTopic) {
        this.activityCallback?.(device.id, false);
      }
    }, MQTT_CONFIG.DEVICE_OFFLINE_TIMEOUT);

    this.deviceTimers.set(device.id, timer);
  }

  /**
   * Explicitly marks device as online or offline
   * Used for LWT messages
   */
  setDeviceStatus(deviceId: string, isOnline: boolean): void {
    this.activityCallback?.(deviceId, isOnline);

    // Clear timer if device is offline (no need to wait)
    if (!isOnline) {
      const timer = this.deviceTimers.get(deviceId);
      if (timer) {
        clearTimeout(timer);
        this.deviceTimers.delete(deviceId);
      }
    }
  }

  /**
   * Stops monitoring a device
   */
  stopMonitoring(deviceId: string): void {
    const timer = this.deviceTimers.get(deviceId);
    if (timer) {
      clearTimeout(timer);
      this.deviceTimers.delete(deviceId);
    }
  }

  /**
   * Stops monitoring all devices
   */
  stopAll(): void {
    this.deviceTimers.forEach(timer => clearTimeout(timer));
    this.deviceTimers.clear();
  }

  /**
   * Sets callback for device status changes
   */
  onDeviceStatusChange(callback: (deviceId: string, isActive: boolean) => void): void {
    this.activityCallback = callback;
  }
}

// Singleton instance
export const deviceMonitorService = new DeviceMonitorService();