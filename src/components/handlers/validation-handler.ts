// handlers/validation-handler.ts
// Form & Device Validation Logic

import { deviceService } from '../../services/device-service';
import { NewDeviceInput } from '../../models/device.model';

export interface ValidationError {
  field: string;
  message: string;
}

export interface DeviceFormValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export class ValidationHandler {
  /**
   * Comprehensive device form validation
   */
  validateDeviceForm(newDevice: NewDeviceInput): DeviceFormValidation {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // 1. Device Name Validation
    if (!newDevice.name || newDevice.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Device name is required'
      });
    } else if (newDevice.name.trim().length < 3) {
      errors.push({
        field: 'name',
        message: 'Device name must be at least 3 characters'
      });
    } else if (newDevice.name.length > 50) {
      errors.push({
        field: 'name',
        message: 'Device name must be less than 50 characters'
      });
    }

    // Check for duplicate names
    const existingDevice = deviceService.getDevices().find(
      d => d.name.toLowerCase() === newDevice.name.trim().toLowerCase()
    );
    if (existingDevice) {
      errors.push({
        field: 'name',
        message: 'A device with this name already exists'
      });
    }

    // 2. Topic Validation
    const hasBaseTopic = newDevice.baseTopic && newDevice.baseTopic.trim().length > 0;
    const hasTopic = newDevice.topic && newDevice.topic.trim().length > 0;

    if (!hasBaseTopic && !hasTopic) {
      errors.push({
        field: 'topic',
        message: 'Either Device ID or full topic path is required'
      });
    }

    // Validate topic format
    if (hasBaseTopic) {
      const topicValidation = this.validateTopicFormat(newDevice.baseTopic!);
      if (!topicValidation.isValid) {
        errors.push({
          field: 'baseTopic',
          message: topicValidation.error || 'Invalid topic format'
        });
      }
    }

    if (hasTopic) {
      const topicValidation = this.validateTopicFormat(newDevice.topic!);
      if (!topicValidation.isValid) {
        errors.push({
          field: 'topic',
          message: topicValidation.error || 'Invalid topic format'
        });
      }
    }

    // 3. Type-specific validation
    switch (newDevice.type) {
      case 'switch':
      case 'dimmer':
        // Power channel validation
        if (!newDevice.powerChannel || newDevice.powerChannel < 1 || newDevice.powerChannel > 8) {
          errors.push({
            field: 'powerChannel',
            message: 'Power channel must be between 1 and 8'
          });
        }

        // Warn about common dimmer configuration
        if (newDevice.type === 'dimmer' && newDevice.powerChannel === 1) {
          warnings.push('Dimmers typically use POWER2 or higher. Using POWER1 may conflict with relays.');
        }
        break;

      case 'sensor':
        // Sensor type validation
        if (!newDevice.sensorConfig?.sensorType) {
          errors.push({
            field: 'sensorType',
            message: 'Sensor type is required'
          });
        }

        // JSON path validation (if provided)
        if (newDevice.jsonPath && newDevice.jsonPath.trim().length > 0) {
          const pathValidation = this.validateJsonPath(newDevice.jsonPath);
          if (!pathValidation.isValid) {
            warnings.push(pathValidation.error || 'JSON path format may be incorrect');
          }
        }

        // Custom sensor warnings
        if (newDevice.sensorConfig?.sensorType === 'custom') {
          if (!newDevice.sensorConfig.unit || newDevice.sensorConfig.unit.trim().length === 0) {
            warnings.push('Consider adding a unit for custom sensors (e.g., °C, %, ppm)');
          }
        }
        break;

      case 'shutter':
        // Shutter-specific validation
        if (!newDevice.useAutoDiscovery) {
          warnings.push('Shutters work best with auto-discovery enabled for position feedback');
        }
        break;
    }

    // 4. Auto-discovery validation
    if (!newDevice.useAutoDiscovery && !hasBaseTopic) {
      warnings.push('Without auto-discovery, ensure your device publishes to the specified topic');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate shutter configuration
   */
  validateShutterConfig(newDevice: NewDeviceInput): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (newDevice.type !== 'shutter') {
      return { isValid: true, errors, warnings };
    }

    console.log('🔍 [Validation] Checking shutter config:', {
      baseTopic: newDevice.baseTopic,
      shutterIndex: newDevice.shutterIndex,
      shutterMode: newDevice.shutterMode
    });

    // 🔥 CRITICAL: baseTopic validation
    if (!newDevice.baseTopic || newDevice.baseTopic.trim().length === 0) {
      errors.push('⚠️ CRITICAL: Device ID (baseTopic) is REQUIRED for shutters');
      console.error('❌ [Validation] baseTopic is missing');
    } else {
      const baseTopic = newDevice.baseTopic.trim();
      if (baseTopic.includes('/')) {
        warnings.push(`Device ID should be simple (e.g., "tasmota_ABC123"), not a full path. Got: "${baseTopic}"`);
      }
    }

    // 🔥 CRITICAL: Shutter index validation
    if (!newDevice.shutterIndex) {
      errors.push('⚠️ CRITICAL: Shutter index is REQUIRED');
      console.error('❌ [Validation] shutterIndex is missing or undefined:', newDevice.shutterIndex);
    } else if (newDevice.shutterIndex < 1) {
      errors.push('Shutter index must be at least 1');
    } else if (newDevice.shutterIndex > 16) {
      errors.push('Shutter index maximum is 16 (ESP32)');
    } else if (newDevice.shutterIndex > 4) {
      warnings.push(
        `⚠️ Shutter index ${newDevice.shutterIndex} requires ESP32. ` +
        `ESP8266 only supports 1-4.`
      );
    }

    // Mode validation
    if (!newDevice.shutterMode || newDevice.shutterMode < 1 || newDevice.shutterMode > 6) {
      errors.push('Shutter mode must be between 1 and 6');
      console.error('❌ [Validation] shutterMode is invalid:', newDevice.shutterMode);
    }

    // Check for duplicate shutter indices
    const existingShutters = deviceService.getDevices().filter(
      d => d.type === 'shutter' &&
           d.baseTopic === newDevice.baseTopic &&
           d.shutterIndex === newDevice.shutterIndex
    );

    if (existingShutters.length > 0) {
      errors.push(
        `⚠️ A shutter with index ${newDevice.shutterIndex} already exists on device "${newDevice.baseTopic}"`
      );
    }

    console.log('✅ [Validation] Result:', {
      isValid: errors.length === 0,
      errorCount: errors.length,
      warningCount: warnings.length
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate MQTT topic format
   */
  private validateTopicFormat(topic: string): { isValid: boolean; error?: string } {
    const trimmed = topic.trim();

    // Basic checks
    if (trimmed.length === 0) {
      return { isValid: false, error: 'Topic cannot be empty' };
    }

    if (trimmed.length > 200) {
      return { isValid: false, error: 'Topic is too long (max 200 characters)' };
    }

    // Check for invalid characters
    const invalidChars = /[+#\s]/;
    if (invalidChars.test(trimmed)) {
      return { isValid: false, error: 'Topic contains invalid characters (+, #, or spaces)' };
    }

    // Check for Tasmota format (if it looks like a base topic)
    if (!trimmed.includes('/')) {
      // This looks like a device ID (e.g., "tasmota_110CE1")
      if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
        return { isValid: false, error: 'Device ID should only contain letters, numbers, underscores, and hyphens' };
      }
    } else {
      // This looks like a full topic path
      const parts = trimmed.split('/');

      // Check each part
      for (const part of parts) {
        if (part.length === 0) {
          return { isValid: false, error: 'Topic cannot have empty segments (double slashes)' };
        }
      }

      // Validate Tasmota conventions
      const firstPart = parts[0];
      const validPrefixes = ['cmnd', 'stat', 'tele'];

      if (validPrefixes.includes(firstPart)) {
        if (parts.length < 3) {
          return { isValid: false, error: 'Tasmota topic format should be: cmnd/device_id/command' };
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Validate JSON path format
   */
  private validateJsonPath(jsonPath: string): { isValid: boolean; error?: string } {
    const trimmed = jsonPath.trim();

    if (trimmed.length === 0) {
      return { isValid: true }; // Empty is valid (will use entire payload)
    }

    const validPattern = /^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*$/;

    if (!validPattern.test(trimmed)) {
      return {
        isValid: false,
        error: 'JSON path should be in format: "SensorName" or "SensorName.Field"'
      };
    }

    return { isValid: true };
  }

  /**
   * Get validation error for a specific field
   */
  getFieldError(newDevice: NewDeviceInput, field: string): string | null {
    const validation = this.validateDeviceForm(newDevice);
    const error = validation.errors.find(e => e.field === field);
    return error ? error.message : null;
  }

  /**
   * Check if form has any errors
   */
  hasValidationErrors(newDevice: NewDeviceInput): boolean {
    return !this.validateDeviceForm(newDevice).isValid;
  }

  /**
   * Get all validation warnings
   */
  getValidationWarnings(newDevice: NewDeviceInput): string[] {
    return this.validateDeviceForm(newDevice).warnings;
  }
}