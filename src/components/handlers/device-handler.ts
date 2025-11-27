// handlers/device-handler.ts - SHIELD INTEGRATED VERSION
// Device CRUD Operations with Command Shield Protection

import { deviceService } from '../../services/device-service';
import { mqttService } from '../../services/mqtt-service';
import { commandShield } from '../../services/command-shield.service'; // 🛡️ NEW
import { deviceMonitorService } from '../../services/device-monitor.service';
import { notificationService } from '../../services/notification.service';
import { logger } from '../../utils/logger.util';
import { authService } from '../../services/auth.service'; // 🛡️ NEW
import { MQTT_COMMANDS } from '../../constants/mqtt.constants';
import { Device, NewDeviceInput, DEFAULT_NEW_DEVICE, SensorConfig, SensorType } from '../../models/device.model';
import { enforceFeatureAccess, checkAndWarnLimits } from '../../utils/feature-guard.util';

export class DeviceHandler {
  private dimmerDebounceTimers = new Map<string, any>();
  private readonly DIMMER_DEBOUNCE_MS = 150;

  constructor(
    private onStateChange: () => void,
    private showError: (message: string) => void,
    private trackFeatureUsage: (feature: string, amount: number) => void
  ) {}

  // =============================================================================
  // CRUD Operations (NO CHANGES NEEDED)
  // =============================================================================

  handleAddDevice(
    newDevice: NewDeviceInput,
    validateForm: () => { isValid: boolean; errors: any[] },
    validateShutterConfig: () => { isValid: boolean; errors: string[]; warnings: string[] },
    subscribeToDevice: (device: Device) => void,
    updateUserSession: () => void
  ): NewDeviceInput | null {
    const allowed = enforceFeatureAccess(
      'add_device',
      () => {
        const validation = validateForm();

        if (!validation.isValid) {
          const errorMessages = validation.errors.map((e: any) => `• ${e.message}`).join('\n');
          this.showError(`Cannot add device:\n${errorMessages}`);

          notificationService.error(
            `❌ Device validation failed: ${validation.errors.length} error(s)`,
            5000
          );

          validation.errors.forEach((error: any) => {
            logger.addLog('error', `Validation: ${error.field} - ${error.message}`);
          });

          return;
        }

        if (newDevice.type === 'shutter') {
          const shutterValidation = validateShutterConfig();

          if (!shutterValidation.isValid) {
            const errorMessages = shutterValidation.errors.join('\n• ');
            this.showError(`Shutter configuration errors:\n• ${errorMessages}`);

            notificationService.error(
              '❌ Shutter validation failed - check configuration',
              5000
            );

            shutterValidation.errors.forEach(error => {
              logger.addLog('error', `Shutter validation: ${error}`);
            });

            return;
          }

          if (shutterValidation.warnings.length > 0) {
            shutterValidation.warnings.forEach(warning => {
              notificationService.warning(`⚠️ ${warning}`, 6000);
              logger.addLog('warning', `Shutter: ${warning}`);
            });
          }

          if (!newDevice.shutterIndex) {
            const error = '🔥 CRITICAL: shutterIndex is undefined before device creation!';
            console.error(error, newDevice);
            notificationService.error(error, 5000);
            logger.addLog('error', error);
            return;
          }

          if (!newDevice.shutterMode) {
            const error = '🔥 CRITICAL: shutterMode is undefined before device creation!';
            console.error(error, newDevice);
            notificationService.error(error, 5000);
            logger.addLog('error', error);
            return;
          }
        }

        let device: Device;
        try {
          device = deviceService.createDevice(newDevice);
        } catch (error: any) {
          console.error('❌ Device creation failed:', error);
          notificationService.error(`❌ Device creation failed: ${error.message}`, 5000);
          logger.addLog('error', `Device creation failed: ${error.message}`);
          return;
        }

        if (device.type === 'shutter') {
          if (!device.baseTopic) {
            logger.addLog('error', '🔥 CRITICAL: Device created without baseTopic!');
            notificationService.error('❌ Device creation failed: missing baseTopic', 5000);
            return;
          }

          if (!device.shutterIndex) {
            logger.addLog('error', '🔥 CRITICAL: Device created without shutterIndex!');
            notificationService.error('❌ Device creation failed: missing shutterIndex', 5000);
            return;
          }
        }

        deviceService.addDevice(device);

        logger.addLog('success', `✅ Added ${device.type} device: ${device.name}`);
        notificationService.success(`📱 ${device.name} added successfully!`, 3000);

        if (mqttService.isConnected && mqttService.isConnected() && device.isEnabled !== false) {
          try {
            subscribeToDevice(device);
            notificationService.info(`📡 Subscribed to ${device.name} topics`, 2500);
            logger.addLog('info', `📡 Subscribed to ${device.name}`);
          } catch (error: any) {
            logger.addLog('error', `❌ Subscription failed: ${error.message}`);
            notificationService.error(
              `⚠️ Device added but subscription failed: ${error.message}`,
              6000
            );
          }
        } else if (!mqttService.isConnected || !mqttService.isConnected()) {
          notificationService.info(
            `📱 ${device.name} added. Connect to MQTT to control it.`,
            4000
          );
        }

        updateUserSession();
        this.onStateChange();
        checkAndWarnLimits();
      },
      () => {
        logger.addLog('warning', 'Device limit reached');
      }
    );

    if (!allowed) {
      this.showError('Device limit reached. Upgrade your plan to add more devices.');
      setTimeout(() => {
        this.showError('');
      }, 5000);
      return newDevice;
    }

    return { ...DEFAULT_NEW_DEVICE };
  }

  handleRemoveDevice(deviceId: string): void {
    if (!confirm('Are you sure you want to remove this device?')) return;

    const removed = deviceService.removeDevice(deviceId);
    if (removed) {
      mqttService.unsubscribeFromDevice(removed);
      deviceMonitorService.stopMonitoring(deviceId);
      notificationService.success(`Device "${removed.name}" removed successfully`);

      this.trackFeatureUsage('device', -1);

      this.onStateChange();
    } else {
      notificationService.error('Device not found');
    }
  }

  handleToggleDeviceEnabled(deviceId: string): void {
    const device = deviceService.getDevice(deviceId);
    if (!device) return;

    const newEnabledState = !(device.isEnabled ?? true);

    if (!newEnabledState && mqttService.isConnected && mqttService.isConnected()) {
      mqttService.unsubscribeFromDevice(device);
      deviceMonitorService.stopMonitoring(deviceId);
      logger.addLog('info', `📕 Disabled device: ${device.name}`);
      notificationService.info(`📕 ${device.name} disabled`, 2500);
    }

    if (newEnabledState && mqttService.isConnected && mqttService.isConnected()) {
      mqttService.subscribeToDevice(device);
      logger.addLog('info', `📗 Enabled device: ${device.name}`);
      notificationService.success(`📗 ${device.name} enabled`, 2500);
    }

    deviceService.updateDevice(deviceId, {
      isEnabled: newEnabledState,
      ...(newEnabledState && { isConnected: false })
    });
  }

  // =============================================================================
  // 🛡️ Device Control - SHIELD INTEGRATED
  // =============================================================================

  /**
   * ✅ FIXED: Toggle switch with Command Shield protection
   */
  async handleToggleDevice(device: Device): Promise<void> {
    if (!this.validateToggle()) return;
    if (device.isEnabled === false) {
      this.showError('Device is disabled');
      return;
    }

    const newState = !device.isOn;
    const commandType = newState ? 'switch.on' : 'switch.off';

    try {
      // 🛡️ Route through Command Shield
      const result = await commandShield.executeCommand(
        device,
        commandType,
        newState,
        {
          requestedBy: this.getCurrentUserId(),
          reason: 'User toggle via UI',
          priority: 'normal'
        }
      );

      if (!result.success) {
        this.showError(result.error || 'Command failed');
        logger.addLog('error', `Toggle failed: ${result.error}`);
        return;
      }

      // ✅ Optimistic UI update (real state will come from MQTT)
      deviceService.updateDevice(device.id, { isOn: newState });

    } catch (error: any) {
      this.showError(`Failed to send command: ${error.message}`);
      logger.addLog('error', `Toggle error: ${error.message}`);
    }
  }

  /**
   * ✅ FIXED: Toggle dimmer with Command Shield protection
   */
  async handleToggleDimmer(device: Device): Promise<void> {
    if (!this.validateToggle()) return;
    if (device.isEnabled === false) {
      this.showError('Device is disabled');
      return;
    }

    const newState = !device.isOn;
    const commandType = newState ? 'dimmer.on' : 'dimmer.off';

    try {
      // 🛡️ Route through Command Shield
      const result = await commandShield.executeCommand(
        device,
        commandType,
        newState,
        {
          requestedBy: this.getCurrentUserId(),
          reason: 'User toggle dimmer via UI',
          priority: 'normal'
        }
      );

      if (!result.success) {
        this.showError(result.error || 'Command failed');
        logger.addLog('error', `Dimmer toggle failed: ${result.error}`);
        return;
      }

      // ✅ Optimistic UI update
      deviceService.updateDevice(device.id, { isOn: newState });

    } catch (error: any) {
      this.showError(`Failed to toggle dimmer: ${error.message}`);
      logger.addLog('error', `Dimmer toggle error: ${error.message}`);
    }
  }

  /**
   * ✅ FIXED: Set dimmer value with Command Shield protection and debouncing
   */
  handleSetDimmer(device: Device, value: number): void {
    if (!this.validateToggle()) return;
    if (device.isEnabled === false) {
      this.showError('Device is disabled');
      return;
    }

    // ✅ Immediate UI feedback (optimistic update)
    deviceService.updateDevice(device.id, {
      dimmerValue: value,
      isOn: value > 0
    });

    // Clear existing debounce timer
    const existing = this.dimmerDebounceTimers.get(device.id);
    if (existing) {
      clearTimeout(existing);
    }

    // 🛡️ Debounced Command Shield execution
    const timer = setTimeout(async () => {
      try {
        const result = await commandShield.executeCommand(
          device,
          'dimmer.set',
          value,
          {
            requestedBy: this.getCurrentUserId(),
            reason: 'User adjusted dimmer slider',
            priority: 'normal'
          }
        );

        if (!result.success) {
          logger.addLog('error', `Dimmer set failed: ${result.error}`);

          // Revert UI on failure
          try {
            if (device.commandTopic) {
              mqttService.publish(device.commandTopic, ''); // Request current state
            }
          } catch {}
        } else {
          logger.addLog('info', `✅ Dimmer set to ${value}% for ${device.name}`);
        }

      } catch (error: any) {
        this.showError(`Failed to set dimmer: ${error.message}`);
        logger.addLog('error', `Dimmer set error: ${error.message}`);

        // Revert UI on error
        try {
          if (device.commandTopic) {
            mqttService.publish(device.commandTopic, '');
          }
        } catch {}
      } finally {
        this.dimmerDebounceTimers.delete(device.id);
      }
    }, this.DIMMER_DEBOUNCE_MS);

    this.dimmerDebounceTimers.set(device.id, timer);
  }

  // =============================================================================
  // 🛡️ NEW: Shutter Control Methods (Add these!)
  // =============================================================================

  /**
   * 🛡️ NEW: Open shutter with safety checks
   */
  async handleShutterOpen(device: Device): Promise<void> {
    if (!this.validateToggle()) return;
    if (device.isEnabled === false) {
      this.showError('Device is disabled');
      return;
    }

    try {
      const result = await commandShield.executeCommand(
        device,
        'shutter.open',
        {},
        {
          requestedBy: this.getCurrentUserId(),
          reason: 'User requested shutter open',
          priority: 'normal'
        }
      );

      if (!result.success) {
        this.showError(result.error || 'Command failed');
        return;
      }

      logger.addLog('success', `🔼 Opening shutter: ${device.name}`);

    } catch (error: any) {
      this.showError(`Failed to open shutter: ${error.message}`);
      logger.addLog('error', `Shutter open error: ${error.message}`);
    }
  }

  /**
   * 🛡️ NEW: Close shutter with safety checks
   */
  async handleShutterClose(device: Device): Promise<void> {
    if (!this.validateToggle()) return;
    if (device.isEnabled === false) {
      this.showError('Device is disabled');
      return;
    }

    try {
      const result = await commandShield.executeCommand(
        device,
        'shutter.close',
        {},
        {
          requestedBy: this.getCurrentUserId(),
          reason: 'User requested shutter close',
          priority: 'normal'
        }
      );

      if (!result.success) {
        this.showError(result.error || 'Command failed');
        return;
      }

      logger.addLog('success', `🔽 Closing shutter: ${device.name}`);

    } catch (error: any) {
      this.showError(`Failed to close shutter: ${error.message}`);
      logger.addLog('error', `Shutter close error: ${error.message}`);
    }
  }

  /**
   * 🛡️ NEW: Stop shutter (EMERGENCY - bypasses confirmation)
   */
  async handleShutterStop(device: Device): Promise<void> {
    if (!this.validateToggle()) return;

    try {
      // 🚨 EMERGENCY: High priority, skip confirmation
      const result = await commandShield.executeCommand(
        device,
        'shutter.stop',
        {},
        {
          requestedBy: this.getCurrentUserId(),
          reason: 'Emergency stop requested',
          priority: 'emergency',
          skipConfirmation: true // Immediate stop!
        }
      );

      if (!result.success) {
        this.showError(result.error || 'Stop command failed');
        logger.addLog('error', `❌ Shutter stop failed: ${result.error}`);
        return;
      }

      logger.addLog('success', `⏹️ Stopped shutter: ${device.name}`);
      notificationService.success(`⏹️ ${device.name} stopped`, 2000);

    } catch (error: any) {
      this.showError(`Failed to stop shutter: ${error.message}`);
      logger.addLog('error', `Shutter stop error: ${error.message}`);
    }
  }

  /**
   * 🛡️ NEW: Set shutter position with safety checks
   */
  async handleShutterPosition(device: Device, position: number): Promise<void> {
    if (!this.validateToggle()) return;
    if (device.isEnabled === false) {
      this.showError('Device is disabled');
      return;
    }

    // Validate position
    if (position < 0 || position > 100) {
      this.showError('Position must be between 0 and 100');
      return;
    }

    try {
      const result = await commandShield.executeCommand(
        device,
        'shutter.position',
        position,
        {
          requestedBy: this.getCurrentUserId(),
          reason: `User set shutter position to ${position}%`,
          priority: 'normal'
        }
      );

      if (!result.success) {
        this.showError(result.error || 'Command failed');
        return;
      }

      // ✅ Optimistic UI update
      deviceService.updateDevice(device.id, {
        shutterPosition: position,
        shutterTarget: position
      });

      logger.addLog('success', `📍 Shutter ${device.name} → ${position}%`);

    } catch (error: any) {
      this.showError(`Failed to set shutter position: ${error.message}`);
      logger.addLog('error', `Shutter position error: ${error.message}`);
    }
  }

  /**
   * 🛡️ NEW: Set shutter tilt (Venetian blinds)
   */
  async handleShutterTilt(device: Device, angle: number): Promise<void> {
    if (!this.validateToggle()) return;
    if (device.isEnabled === false) {
      this.showError('Device is disabled');
      return;
    }

    if (!device.shutterTiltConfig) {
      this.showError('Tilt not configured for this shutter');
      return;
    }

    try {
      const result = await commandShield.executeCommand(
        device,
        'shutter.tilt',
        angle,
        {
          requestedBy: this.getCurrentUserId(),
          reason: `User adjusted tilt to ${angle}°`,
          priority: 'normal'
        }
      );

      if (!result.success) {
        this.showError(result.error || 'Command failed');
        return;
      }

      logger.addLog('success', `🎚️ Shutter tilt: ${device.name} → ${angle}°`);

    } catch (error: any) {
      this.showError(`Failed to set tilt: ${error.message}`);
      logger.addLog('error', `Shutter tilt error: ${error.message}`);
    }
  }

  // =============================================================================
  // Sensor Configuration (NO CHANGES NEEDED)
  // =============================================================================

  handleSensorConfigChange(
    currentConfig: SensorConfig | undefined,
    field: keyof SensorConfig,
    value: any
  ): SensorConfig {
    const config = currentConfig || {} as SensorConfig;

    const updatedConfig = {
      ...config,
      [field]: value
    };

    if (field === 'sensorType') {
      const defaults = this.getSensorDefaults(value as SensorType);
      return {
        ...updatedConfig,
        ...defaults
      };
    }

    return updatedConfig;
  }

  private getSensorDefaults(sensorType: SensorType): Partial<SensorConfig> {
    const defaults: Record<SensorType, Partial<SensorConfig>> = {
      temperature: {
        displayName: 'Temperature',
        icon: '🌡️',
        unit: '°C',
        colorScheme: 'temperature'
      },
      humidity: {
        displayName: 'Humidity',
        icon: '💧',
        unit: '%',
        colorScheme: 'humidity'
      },
      pressure: {
        displayName: 'Pressure',
        icon: '📽',
        unit: 'hPa',
        colorScheme: 'pressure'
      },
      energy: {
        displayName: 'Energy',
        icon: '⚡',
        unit: 'W',
        colorScheme: 'energy'
      },
      light: {
        displayName: 'Light',
        icon: '💡',
        unit: 'lux',
        colorScheme: 'light'
      },
      gas: {
        displayName: 'Gas',
        icon: '💨',
        unit: 'ppm',
        colorScheme: 'gas'
      },
      motion: {
        displayName: 'Motion',
        icon: '🚶',
        unit: '',
        colorScheme: 'motion'
      },
      distance: {
        displayName: 'Distance',
        icon: '📏',
        unit: 'cm',
        colorScheme: 'distance'
      },
      multi: {
        displayName: 'Multi-sensor',
        icon: '📊',
        unit: '',
        colorScheme: 'multi'
      },
      custom: {
        displayName: 'Custom Sensor',
        icon: '⚙️',
        unit: '',
        colorScheme: 'default'
      }
    };

    return defaults[sensorType] || defaults.custom;
  }

  // =============================================================================
  // Helpers
  // =============================================================================

  private validateToggle(): boolean {
    if (!mqttService.isConnected || !mqttService.isConnected()) {
      this.showError('Not connected to MQTT broker');
      logger.addLog('error', 'Not connected to MQTT broker');
      return false;
    }
    return true;
  }

  public isMqttReady(): boolean {
    // This public method simply delegates the check to the private one.
    return this.validateToggle();
}
  /**
   * 🛡️ NEW: Get current user ID for command tracking
   */
  private getCurrentUserId(): string {
    try {
      const user = authService.getCurrentUser();
      return user?.id || user?.passwordHash || 'anonymous';
    } catch {
      return 'anonymous';
    }
  }

  cleanup(): void {
    this.dimmerDebounceTimers.forEach(timer => clearTimeout(timer));
    this.dimmerDebounceTimers.clear();
  }
}