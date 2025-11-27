// formatters.util.ts
// Formatting utilities for device configuration UI

import { DeviceType, SensorType } from '../../models/device.model';

/**
 * Safely format date to locale time string
 */
export function formatDateTime(date: Date | string | undefined): string {
  if (!date) return 'Never';

  try {
    const dateObj = date instanceof Date ? date : new Date(date);

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date:', date);
      return 'Invalid Date';
    }

    return dateObj.toLocaleTimeString();
  } catch (error) {
    console.error('Error formatting date:', error, date);
    return 'Error';
  }
}

/**
 * Convert camelCase or snake_case to readable format
 */
export function formatSensorLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1') // Add space before capitals
    .replace(/_/g, ' ') // Replace underscores with spaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

/**
 * Get icon for device type
 */
export function getDeviceIcon(type: DeviceType): string {
  const icons: Record<DeviceType, string> = {
    'switch': '💡',
    'dimmer': '🔆',
    'shutter': '🪟',
    'sensor': '🌡️'
  };
  return icons[type];
}

/**
 * Get placeholder text for device name input based on type
 */
export function getDeviceNamePlaceholder(type: DeviceType): string {
  const placeholders: Record<DeviceType, string> = {
    'switch': 'Living Room Light',
    'dimmer': 'Bedroom Dimmer',
    'shutter': 'Window Blinds',
    'sensor': 'Temperature Sensor'
  };
  return placeholders[type];
}

/**
 * Determine if a sensor key should display the configured unit
 */
export function shouldApplyUnit(key: string, sensorType?: SensorType): boolean {
  if (!sensorType) return false;

  const keyLower = key.toLowerCase();

  // Map sensor types to relevant keywords
  const typeKeywords: Record<SensorType, string[]> = {
    temperature: ['temperature', 'temp'],
    humidity: ['humidity', 'hum'],
    pressure: ['pressure', 'press'],
    energy: ['power', 'energy', 'voltage', 'current', 'watt'],
    light: ['light', 'lux', 'illuminance'],
    gas: ['gas', 'co2', 'tvoc', 'aqi'],
    motion: ['motion', 'movement', 'pir'],
    distance: ['distance', 'range', 'proximity'],
    multi: [],
    custom: []
  };

  const keywords = typeKeywords[sensorType] || [];
  return keywords.some(keyword => keyLower.includes(keyword));
}

/**
 * Get circle number symbols for power channels (1-8)
 */
export function getPowerChannelSymbol(channel: number): string {
  const circleNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];
  return circleNumbers[channel - 1] || `${channel}`;
}

/**
 * Format shutter position display text
 */
export function formatShutterPosition(position: number, isInverted: boolean): string {
  const displayPosition = isInverted ? 100 - position : position;
  let statusText = '';

  if (displayPosition === 100) {
    statusText = ' (Open)';
  } else if (displayPosition === 0) {
    statusText = ' (Closed)';
  }

  return `${displayPosition}%${statusText}`;
}

/**
 * Get shutter mode description
 */
export function getShutterModeDescription(mode: number): string {
  const descriptions: Record<number, string> = {
    1: '2 relays control UP/DOWN movement independently',
    2: 'Circuit-safe mode: one relay for power, one for direction',
    3: 'Garage door mode: pulse-based control',
    4: 'Stepper motor with precise positioning',
    5: 'Servo motor with position control',
    6: 'Servo motor with speed control'
  };
  return descriptions[mode] || 'Unknown mode';
}