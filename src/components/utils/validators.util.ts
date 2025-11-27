// validators.util.ts
// Validation utilities for device configuration

import { Device } from '../../models/device.model';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fieldErrors: Record<string, string>;
}

export interface ShutterValidationResult {
  isValid: boolean;
  warnings: string[];
}

/**
 * Validate device form before submission
 */
export function validateDeviceForm(device: Partial<Device>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fieldErrors: Record<string, string> = {};

  // Device name validation
  if (!device.name || device.name.trim().length === 0) {
    errors.push('Device name is required');
    fieldErrors['name'] = 'Device name cannot be empty';
  } else if (device.name.trim().length < 2) {
    warnings.push('Device name is very short');
  }

  // Topic validation
  if (!device.baseTopic || device.baseTopic.trim().length === 0) {
    if (!device.topic || device.topic.trim().length === 0) {
      errors.push('Either Device ID or full topic path is required');
      fieldErrors['baseTopic'] = 'Device ID is required';
      fieldErrors['topic'] = 'Or provide full topic path';
    }
  }

  // Power channel validation (for switch/dimmer)
  if (device.type === 'switch' || device.type === 'dimmer') {
    const channel = device.powerChannel || 1;
    if (channel < 1 || channel > 8) {
      errors.push('Power channel must be between 1 and 8');
      fieldErrors['powerChannel'] = 'Invalid channel number';
    }

    // Dimmer-specific warnings
    if (device.type === 'dimmer' && channel === 1) {
      warnings.push('Dimmers typically use POWER2 (channel 2). Using POWER1 may conflict with switch functionality.');
    }
  }

  // Shutter validation
  if (device.type === 'shutter') {
    const shutterValidation = validateShutterConfig(device);
    if (!shutterValidation.isValid) {
      errors.push('Shutter configuration is incomplete');
    }
    warnings.push(...shutterValidation.warnings);
  }

  // Sensor validation
  if (device.type === 'sensor') {
    if (!device.sensorConfig?.sensorType) {
      warnings.push('No sensor type specified, using custom');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    fieldErrors
  };
}

/**
 * Validate shutter-specific configuration
 */
export function validateShutterConfig(device: Partial<Device>): ShutterValidationResult {
  const warnings: string[] = [];

  if (!device.shutterIndex) {
    warnings.push('No shutter index specified. Default is 1.');
  } else {
    const index = device.shutterIndex;
    if (index < 1 || index > 8) {
      warnings.push('Shutter index should be 1-4 for ESP8266 or 1-8 for ESP32');
    } else if (index > 4) {
      warnings.push('Shutter indices 5-8 require ESP32 hardware');
    }
  }

  if (!device.shutterMode) {
    warnings.push('No shutter mode specified. Default is Mode 1 (Normal).');
  } else {
    const mode = device.shutterMode;
    if (mode < 1 || mode > 6) {
      warnings.push('Shutter mode should be between 1 and 6');
    }

    // Mode-specific warnings
    if (mode === 3) {
      warnings.push('Mode 3 (Garage Motors) uses pulse control - ensure hardware supports it');
    } else if (mode === 4) {
      warnings.push('Mode 4 (Stepper Motor) requires proper stepper motor configuration in Tasmota');
    } else if (mode === 5 || mode === 6) {
      warnings.push('Servo modes require PWM-capable pins and servo configuration');
    }
  }

  if (device.shutterInvert) {
    warnings.push('Position inversion enabled: 0=Open, 100=Closed (reversed from default)');
  }

  return {
    isValid: warnings.filter(w => w.includes('should be')).length === 0,
    warnings
  };
}

/**
 * Get specific field error from validation result
 */
export function getFieldError(field: string, fieldErrors: Record<string, string>): string | null {
  return fieldErrors[field] || null;
}

/**
 * Check if a field has an error
 */
export function hasFieldError(field: string, fieldErrors: Record<string, string>): boolean {
  return field in fieldErrors;
}

/**
 * Validate MQTT topic format
 */
export function isValidMqttTopic(topic: string): boolean {
  if (!topic || topic.trim().length === 0) return false;

  // MQTT topic should not contain wildcards in publish topics
  if (topic.includes('#') || topic.includes('+')) {
    return false;
  }

  // Should not start or end with /
  if (topic.startsWith('/') || topic.endsWith('/')) {
    return false;
  }

  return true;
}

/**
 * Validate device ID format (Tasmota device ID)
 */
export function isValidDeviceId(deviceId: string): boolean {
  if (!deviceId || deviceId.trim().length === 0) return false;

  // Basic alphanumeric + underscore check
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  return validPattern.test(deviceId);
}

/**
 * Get validation warnings as array
 */
export function getValidationWarnings(validation: ValidationResult): string[] {
  return validation.warnings;
}

/**
 * Check if form is valid
 */
export function isFormValid(validation: ValidationResult): boolean {
  return validation.isValid;
}