// src/models/telegram.model.ts
// Enhanced Telegram models with support for all device types

export interface TelegramSettings {
    enabled: boolean;
    botToken: string;
    chatId: string;
    lastTestTime?: Date;
    testStatus?: 'success' | 'failed' | 'pending';

    // 🆕 Global messaging settings
    defaultCooldownMinutes: number;  // Default cooldown for new alerts
    quietHoursEnabled: boolean;      // Enable quiet hours
    quietHoursStart?: string;        // Format: "22:00"
    quietHoursEnd?: string;          // Format: "07:00"
    groupAlerts: boolean;            // Group multiple alerts into one message
    groupAlertDelay: number;         // Seconds to wait before sending grouped alert
  }

  export interface TelegramAlertConfig {
    deviceId: string;
    deviceName: string;              // 🆕 Store device name for easy reference
    deviceType: 'sensor' | 'switch' | 'dimmer' | 'shutter';  // 🆕 Device type
    enabled: boolean;

    // Alert configuration based on device type
    alertType: AlertType;            // 🆕 What to monitor

    // Threshold configuration
    minThreshold?: number;
    maxThreshold?: number;

    // Timing configuration
    cooldownMinutes: number;         // 🆕 Per-alert cooldown (customizable!)
    alertOnRestore: boolean;
    lastAlertTime?: Date;

    // 🆕 Advanced options
    priority: 'low' | 'normal' | 'high';  // Alert priority
    customMessage?: string;               // Custom alert message template
    onlyDuringHours?: {                   // Alert only during specific hours
      start: string;  // "09:00"
      end: string;    // "18:00"
    };
  }

  // 🆕 Alert types for different device types
  export type AlertType =
    // Sensor alerts
    | 'sensor_value'           // Monitor sensor value (temp, humidity, etc.)

    // Switch alerts
    | 'switch_state'           // Alert on ON/OFF state change
    | 'power_consumption'      // Alert on high power usage
    | 'energy_usage'           // Alert on daily energy consumption
    | 'current'                // Alert on high current
    | 'voltage'                // Alert on voltage issues

    // Dimmer alerts
    | 'dimmer_level'           // Alert on brightness level
    | 'dimmer_state'           // Alert on dimmer ON/OFF
    | 'dimmer_power'           // Alert on dimmer power consumption

    // Shutter alerts
    | 'shutter_position'       // Alert on position (open/closed)
    | 'shutter_stuck'          // Alert if shutter doesn't move
    | 'shutter_state';         // Alert on open/close/stop

  export interface TelegramNotification {
    id: string;
    deviceId: string;
    deviceName: string;
    deviceType: 'sensor' | 'switch' | 'dimmer' | 'shutter';  // 🆕
    alertType: AlertType;                                     // 🆕
    sensorType?: string;                                      // 🆕 Backward compatibility
    value: number | string | boolean;                         // 🆕 Support multiple value types
    threshold?: number;
    type: 'warning' | 'critical' | 'restore' | 'info';
    message: string;
    timestamp: Date;
    sent: boolean;
    error?: string;
    priority: 'low' | 'normal' | 'high';  // 🆕
  }

  export const DEFAULT_TELEGRAM_SETTINGS: TelegramSettings = {
    enabled: false,
    botToken: '',
    chatId: '',
    defaultCooldownMinutes: 5,  // 🆕 Configurable default
    quietHoursEnabled: false,
    groupAlerts: false,
    groupAlertDelay: 10
  };

  export const DEFAULT_ALERT_CONFIG: Partial<TelegramAlertConfig> = {
    enabled: true,
    cooldownMinutes: 5,  // Will use global default if not specified
    alertOnRestore: true,
    priority: 'normal'
  };

  // Alert severity levels
  export enum AlertSeverity {
    INFO = 'ℹ️',
    WARNING = '⚠️',
    CRITICAL = '🚨',
    RESTORE = '✅'
  }

  // 🆕 Backward compatibility - keep old SENSOR_ICONS
  export const SENSOR_ICONS: Record<string, string> = {
    temperature: '🌡️',
    humidity: '💧',
    pressure: '🔽',
    light: '💡',
    motion: '👁️',
    door: '🚪',
    window: '🪟',
    smoke: '💨',
    co2: '☁️',
    custom: '📊'
  };

  // 🆕 Device type icons for Telegram messages
  export const DEVICE_TYPE_ICONS: Record<string, string> = {
    sensor: '📊',
    switch: '💡',
    dimmer: '🔆',
    shutter: '🪟'
  };

  // 🆕 Alert type icons
  export const ALERT_TYPE_ICONS: Record<AlertType, string> = {
    sensor_value: '🌡️',
    switch_state: '🔌',
    power_consumption: '⚡',
    energy_usage: '🔋',
    current: '⚡',
    voltage: '🔌',
    dimmer_level: '💡',
    dimmer_state: '💡',
    dimmer_power: '⚡',
    shutter_position: '🪟',
    shutter_stuck: '⚠️',
    shutter_state: '🪟'
  };

  // 🆕 Alert type descriptions
  export const ALERT_TYPE_DESCRIPTIONS: Record<AlertType, string> = {
    sensor_value: 'Sensor Value',
    switch_state: 'Switch State Change',
    power_consumption: 'Power Consumption',
    energy_usage: 'Energy Usage',
    current: 'Current',
    voltage: 'Voltage',
    dimmer_level: 'Brightness Level',
    dimmer_state: 'Dimmer State',
    dimmer_power: 'Dimmer Power',
    shutter_position: 'Shutter Position',
    shutter_stuck: 'Shutter Stuck',
    shutter_state: 'Shutter State'
  };

  // 🆕 Get available alert types for device type
  export function getAvailableAlertTypes(deviceType: 'sensor' | 'switch' | 'dimmer' | 'shutter'): AlertType[] {
    switch (deviceType) {
      case 'sensor':
        return ['sensor_value'];

      case 'switch':
        return ['switch_state', 'power_consumption', 'energy_usage', 'current', 'voltage'];

      case 'dimmer':
        return ['dimmer_level', 'dimmer_state', 'dimmer_power'];

      case 'shutter':
        return ['shutter_position', 'shutter_stuck', 'shutter_state'];

      default:
        return [];
    }
  }

  // 🆕 Check if alert type requires thresholds
  export function alertTypeRequiresThreshold(alertType: AlertType): boolean {
    return [
      'sensor_value',
      'power_consumption',
      'energy_usage',
      'current',
      'voltage',
      'dimmer_level',
      'dimmer_power',
      'shutter_position'
    ].includes(alertType);
  }

  // 🆕 Check if alert type requires state monitoring (boolean)
  export function alertTypeRequiresState(alertType: AlertType): boolean {
    return [
      'switch_state',
      'dimmer_state',
      'shutter_state'
    ].includes(alertType);
  }

  // 🆕 Get unit for alert type
  export function getAlertTypeUnit(alertType: AlertType): string {
    const units: Partial<Record<AlertType, string>> = {
      power_consumption: 'W',
      energy_usage: 'kWh',
      current: 'A',
      voltage: 'V',
      dimmer_level: '%',
      dimmer_power: 'W',
      shutter_position: '%'
    };

    return units[alertType] || '';
  }