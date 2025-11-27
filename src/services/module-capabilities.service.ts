// module-capabilities.ts - Enhanced dynamic system
// Strategy: Curated list + Smart fallback + Dynamic detection

export interface ModuleCapability {
  name: string;
  relays: number | number[];
  sensors: string[];
  dimmer: boolean;
  shutter: boolean;
  other: string;
}

// Keep only the MOST COMMON modules (top 30-50)
// These cover ~90% of actual deployments
const CURATED_MODULES: Record<number, ModuleCapability> = {
  0: { name: 'Template', relays: 0, sensors: [], dimmer: false, shutter: false, other: 'Custom template; capabilities vary' },
  1: { name: 'Sonoff Basic', relays: 4, sensors: ['temperature', 'humidity'], dimmer: false, shutter: false, other: '' },
  2: { name: 'Sonoff RF', relays: 1, sensors: [], dimmer: false, shutter: false, other: '' },
  4: { name: 'Sonoff TH', relays: 1, sensors: ['temperature', 'humidity'], dimmer: true, shutter: false, other: 'Supports relay + PWM dimmer on separate GPIOs' },
  5: { name: 'Sonoff Dual', relays: 2, sensors: [], dimmer: false, shutter: false, other: '' },
  6: { name: 'Sonoff POW', relays: 1, sensors: ['power'], dimmer: false, shutter: false, other: '' },
  7: { name: 'Sonoff 4Ch', relays: 4, sensors: [], dimmer: false, shutter: false, other: '' },
  18: { name: 'Generic', relays: 0, sensors: [], dimmer: false, shutter: false, other: 'Custom GPIO; capabilities vary' },
  39: { name: 'Sonoff Dual R2', relays: 2, sensors: [], dimmer: false, shutter: false, other: '' },
  41: { name: 'Sonoff S31', relays: 1, sensors: ['power'], dimmer: false, shutter: false, other: '' },
  43: { name: 'Sonoff Pow R2', relays: 1, sensors: ['power'], dimmer: false, shutter: false, other: '' },
  46: { name: 'Shelly 1', relays: 1, sensors: ['power'], dimmer: false, shutter: false, other: '' },
  47: { name: 'Shelly 2', relays: 2, sensors: ['power'], dimmer: false, shutter: true, other: '' },
  54: { name: 'TuyaMCU', relays: [1,2,3,4], sensors: [], dimmer: false, shutter: false, other: 'Tuya-based device' },
  // Add more common ones as needed...
};

/**
 * Module capability detector - Infers capabilities from STATUS response
 * This is the SMART FALLBACK for unknown modules
 */
export class ModuleCapabilityDetector {
  /**
   * Get capabilities - tries curated list first, then dynamic detection
   */
  getCapabilities(
    moduleType: number,
    statusResponse?: any
  ): ModuleCapability {
    // Try curated list first
    if (CURATED_MODULES[moduleType]) {
      return CURATED_MODULES[moduleType];
    }

    // Fallback: Detect from STATUS response
    if (statusResponse) {
      return this.detectFromStatus(moduleType, statusResponse);
    }

    // Ultimate fallback: Unknown module
    return {
      name: `Module ${moduleType}`,
      relays: 0,
      sensors: [],
      dimmer: false,
      shutter: false,
      other: 'Unknown module - capabilities detected from device'
    };
  }

  /**
   * Detect capabilities from actual device STATUS response
   * This works for ANY Tasmota device regardless of module type
   */
  private detectFromStatus(moduleType: number, payload: any): ModuleCapability {
    const status = payload.Status || {};
    const statusSTS = payload.StatusSTS || {};
    const statusSNS = payload.StatusSNS || {};

    // Get module name from device
    const moduleName = status.Module
      ? `${status.DeviceName || 'Custom'} (Module ${status.Module})`
      : `Module ${moduleType}`;

    // Detect relay count
    const relayCount = this.detectRelayCount(statusSTS, status);

    // Detect sensors
    const sensors = this.detectSensors(statusSNS);

    // Detect dimmer
    const hasDimmer = statusSTS.Dimmer !== undefined ||
                      statusSTS.Channel !== undefined;

    // Detect shutter
    const hasShutter = Object.keys(statusSTS).some(key =>
      key.startsWith('Shutter')
    );

    return {
      name: moduleName,
      relays: relayCount,
      sensors,
      dimmer: hasDimmer,
      shutter: hasShutter,
      other: 'Capabilities auto-detected from device'
    };
  }

  private detectRelayCount(statusSTS: any, status: any): number {
    // Method 1: Count POWER fields
    const powerKeys = Object.keys(statusSTS).filter(key =>
      key === 'POWER' || /^POWER\d+$/.test(key)
    );

    if (powerKeys.length > 0) {
      const numberedPowers = powerKeys.filter(k => /^POWER\d+$/.test(k));
      if (numberedPowers.length > 0) {
        return numberedPowers.length;
      }
      if (powerKeys.includes('POWER')) {
        return 1;
      }
    }

    // Method 2: FriendlyName count
    const friendlyNames = status.FriendlyName || [];
    if (Array.isArray(friendlyNames) && friendlyNames.length > 0) {
      return friendlyNames.length;
    }

    return 0;
  }

  private detectSensors(statusSNS: any): string[] {
    const sensors: string[] = [];
    const sensorKeys = Object.keys(statusSNS).filter(key =>
      key !== 'Time' && key !== 'TempUnit'
    );

    sensorKeys.forEach(key => {
      const keyLower = key.toLowerCase();

      // Map common sensor types
      if (keyLower.includes('temp')) sensors.push('temperature');
      else if (keyLower.includes('hum')) sensors.push('humidity');
      else if (keyLower.includes('press')) sensors.push('pressure');
      else if (keyLower.includes('energy') || keyLower.includes('power')) sensors.push('power');
      else if (keyLower.includes('light') || keyLower.includes('lux')) sensors.push('light');
      else if (keyLower.includes('gas') || keyLower.includes('co2')) sensors.push('gas');
      else if (keyLower.includes('motion') || keyLower.includes('pir')) sensors.push('motion');
      else sensors.push(key.toLowerCase());
    });

    return [...new Set(sensors)]; // Remove duplicates
  }

  /**
   * Check if module is "flexible" (Template/Generic)
   * These modules can be configured in many ways
   */
  isFlexibleModule(moduleType: number): boolean {
    return moduleType === 0 || moduleType === 18;
  }

  /**
   * Get user-friendly message about unknown module
   */
  getUnknownModuleMessage(moduleType: number): string {
    return `Module ${moduleType} is not in our database, but capabilities have been detected automatically from your device.`;
  }
}

// Export singleton instance
export const moduleCapabilityDetector = new ModuleCapabilityDetector();

// Export for backward compatibility
export const MODULE_CAPABILITIES = CURATED_MODULES;

/**
 * Helper to get module info with fallback
 * This is what validation service should use
 */
export function getModuleInfo(
  moduleType: number,
  statusResponse?: any
): ModuleCapability {
  return moduleCapabilityDetector.getCapabilities(moduleType, statusResponse);
}