// device-validation.service.ts - CORRECTED VERSION
// Properly handles Tasmota's Status 0 command which returns multiple separate messages

import { Device } from '../models/device.model';
import { DeviceCapabilities, ValidationResult } from '../models/device.model';
//import { TOPIC_PATTERNS } from '../constants/mqtt.constants';
import { logger } from '../utils/logger.util';
import { getModuleInfo, moduleCapabilityDetector } from '../services/module-capabilities.service';

interface StatusCollection {
  STATUS?: any;      // Module info, FriendlyNames
  STATUS1?: any;     // StatusPRM
  STATUS2?: any;     // StatusFWR (firmware)
  STATUS3?: any;     // StatusLOG
  STATUS4?: any;     // StatusMEM (memory/features)
  STATUS5?: any;     // StatusNET
  STATUS6?: any;     // StatusMQT
  STATUS7?: any;     // StatusTIM
  STATUS8?: any;     // StatusSNS (sensors) - alternative
  STATUS10?: any;    // StatusSNS (sensors)
  STATUS11?: any;    // StatusSTS (state/power)
  receivedCount: number;
  expectedCount: number;
}

export class DeviceValidationService {
  private validationQueue = new Map<string, {
    device: Device;
    resolve: (result: ValidationResult) => void;
    reject: (error: Error) => void;
    timeout: any;
    statusCollection: StatusCollection;
  }>();

  private readonly VALIDATION_TIMEOUT = 15000; // Increased to 15s for multiple messages
  private readonly STATUS_COLLECTION_DELAY = 2000; // Wait 2s to collect all STATUS messages

  async validateDevice(
    device: Device,
    publishFn: (topic: string, payload: string) => void,
    subscribeFn: (topic: string) => void
  ): Promise<ValidationResult> {
    if (!device.baseTopic) {
      return this.createInvalidResult(device, ['Device has no baseTopic configured']);
    }

    return new Promise((resolve, reject) => {
      // Subscribe to ALL status topics using wildcard or individual topics
      const statusTopics = [
        `stat/${device.baseTopic}/STATUS`,
        `stat/${device.baseTopic}/STATUS1`,
        `stat/${device.baseTopic}/STATUS2`,
        `stat/${device.baseTopic}/STATUS3`,
        `stat/${device.baseTopic}/STATUS4`,
        `stat/${device.baseTopic}/STATUS5`,
        `stat/${device.baseTopic}/STATUS6`,
        `stat/${device.baseTopic}/STATUS7`,
        `stat/${device.baseTopic}/STATUS8`,
        `stat/${device.baseTopic}/STATUS10`,
        `stat/${device.baseTopic}/STATUS11`
      ];

      statusTopics.forEach(topic => subscribeFn(topic));

      // Set timeout
      const timeout = setTimeout(() => {
        this.handleValidationComplete(device.id, true);
      }, this.VALIDATION_TIMEOUT);

      // Initialize status collection
      const statusCollection: StatusCollection = {
        receivedCount: 0,
        expectedCount: 11 // STATUS + STATUS1-11 (STATUS9 doesn't exist)
      };

      // Queue the validation request
      this.validationQueue.set(device.id, {
        device,
        resolve,
        reject,
        timeout,
        statusCollection
      });

      // Send Status 0 command (capital S!)
      const statusCommand = `cmnd/${device.baseTopic}/Status`;
      publishFn(statusCommand, '0');

      logger.addLog('info', `🔍 Validating ${device.name}... (collecting STATUS messages)`);
    });
  }

  /**
   * Process incoming STATUS message
   */
  processStatusMessage(topic: string, payload: any): void {
    // Find which device this status belongs to
    for (const [deviceId, validation] of this.validationQueue.entries()) {
      const device = validation.device;
      const baseTopic = device.baseTopic!;

      // Check if this topic belongs to this device
      if (topic.startsWith(`stat/${baseTopic}/STATUS`)) {
        this.collectStatusMessage(deviceId, topic, payload);
        break;
      }
    }
  }

  /**
   * Collect STATUS messages (STATUS, STATUS1-11)
   */
  private collectStatusMessage(deviceId: string, topic: string, payload: any): void {
    const validation = this.validationQueue.get(deviceId);
    if (!validation) return;

    const { statusCollection } = validation;

    // Extract STATUS number from topic (e.g., "stat/tasmota_110CE1/STATUS11" -> "STATUS11")
    const match = topic.match(/STATUS(\d*)$/);
    if (!match) return;

    const statusKey = match[0]; // "STATUS", "STATUS1", "STATUS2", etc.

    // Store the payload
    (statusCollection as any)[statusKey] = payload;
    statusCollection.receivedCount++;

    logger.addLog('info', `📥 Received ${statusKey} for ${validation.device.name} (${statusCollection.receivedCount}/${statusCollection.expectedCount})`);

    // If we've received enough messages, start a timer to process
    if (statusCollection.receivedCount >= 8) { // Minimum critical messages
      // Clear any existing collection timer
      if ((validation as any).collectionTimer) {
        clearTimeout((validation as any).collectionTimer);
      }

      // Set a short delay to collect any remaining messages
      (validation as any).collectionTimer = setTimeout(() => {
        this.handleValidationComplete(deviceId, false);
      }, this.STATUS_COLLECTION_DELAY);
    }
  }

  /**
   * Handle validation completion (timeout or collection complete)
   */
  private handleValidationComplete(deviceId: string, isTimeout: boolean): void {
    const validation = this.validationQueue.get(deviceId);
    if (!validation) return;

    const { device, resolve, timeout, statusCollection } = validation;

    // Clear timeout
    clearTimeout(timeout);
    if ((validation as any).collectionTimer) {
      clearTimeout((validation as any).collectionTimer);
    }
    this.validationQueue.delete(deviceId);

    try {
      // Check if we have minimum required data
      if (!statusCollection.STATUS11 && !statusCollection.STATUS && isTimeout) {
        resolve(this.createUnknownResult(device, [
          'Validation timeout - device did not respond',
          `Received ${statusCollection.receivedCount} STATUS messages`
        ]));
        return;
      }

      // Extract capabilities from collected STATUS messages
      const capabilities = this.extractCapabilitiesFromCollection(statusCollection);

      // Validate against configured device type
      const result = this.validateCapabilities(device, capabilities, statusCollection);

      logger.addLog(
        result.isValid ? 'success' : 'warning',
        `Validation for ${device.name}: ${result.isValid ? '✅ Valid' : '⚠️ Mismatch detected'}`
      );

      resolve(result);
    } catch (error: any) {
      resolve(this.createUnknownResult(device, [`Validation error: ${error.message}`]));
    }
  }

  /**
   * Extract capabilities from collected STATUS messages
   */
  private extractCapabilitiesFromCollection(collection: StatusCollection): DeviceCapabilities {
    // Extract from STATUS (basic info) or STATUS11 (state)
    const status = collection.STATUS?.Status || {};
    const statusSTS = collection.STATUS11?.StatusSTS || {};
    const statusFWR = collection.STATUS2?.StatusFWR || {};
    const statusSNS = collection.STATUS10?.StatusSNS || collection.STATUS8?.StatusSNS || {};
    const statusMEM = collection.STATUS4?.StatusMEM || {};

    const moduleType = status.Module || 0;
    const moduleName = status.DeviceName || status.FriendlyName?.[0] || 'Unknown';
    const friendlyNames = status.FriendlyName || [];

    // Detect dimmer FIRST (before counting relays)
    const hasDimmer = statusSTS.Dimmer !== undefined || statusSTS.Channel !== undefined;

    // Detect shutter
    const hasShutter = Object.keys(statusSTS).some(key => key.startsWith('Shutter'));

    // Detect relay count from StatusSTS (STATUS11)
    // CRITICAL FIX: Don't count dimmer/PWM channels as relays
    let relayCount = 0;
    const powerKeys = Object.keys(statusSTS).filter(key =>
      key === 'POWER' || /^POWER\d+$/.test(key)
    );

    if (powerKeys.length > 0) {
      // If device has dimmer, we need to be smarter about counting
      if (hasDimmer) {
        // For dimmer devices, only count POWER/POWER1 as actual relay
        // POWER2+ are typically dimmer control channels, not separate relays
        const actualRelayKeys = powerKeys.filter(k => k === 'POWER' || k === 'POWER1');
        relayCount = actualRelayKeys.length;
      } else if (hasShutter) {
        // For shutters, count pairs of relays (up/down)
        const numberedPowers = powerKeys.filter(k => /^POWER\d+$/.test(k));
        relayCount = numberedPowers.length;
      } else {
        // Normal relay counting
        const numberedPowers = powerKeys.filter(k => /^POWER\d+$/.test(k));
        if (numberedPowers.length > 0) {
          relayCount = numberedPowers.length;
        } else if (powerKeys.includes('POWER')) {
          relayCount = 1;
        }
      }
    }

    // Fallback to FriendlyName count (only if no dimmer/shutter)
    if (relayCount === 0 && friendlyNames.length > 0 && !hasDimmer && !hasShutter) {
      relayCount = friendlyNames.length;
    }

    // Detect sensors from StatusSNS (STATUS10)
    const sensorKeys = Object.keys(statusSNS).filter(key =>
      key !== 'Time' && key !== 'TempUnit'
    );
    const hasSensor = sensorKeys.length > 0;

    // Firmware version from STATUS2
    const version = statusFWR.Version || 'Unknown';

    // Check for scripting support in firmware version or features
    const hasScripting = version.toLowerCase().includes('scripting') ||
                         version.toLowerCase().includes('berry') ||
                         (statusMEM.Features &&
                          Array.isArray(statusMEM.Features) &&
                          statusMEM.Features.some((f: string) =>
                            f.toLowerCase().includes('scripting') ||
                            f.toLowerCase().includes('berry')
                          ));

    return {
      moduleType,
      moduleName,
      relayCount,
      hasSensor,
      hasScripting,
      hasShutter,
      hasDimmer,
      friendlyNames,
      version,
      rawData: {
        deviceName: status.DeviceName || moduleName,
        powerState: statusSTS.POWER || 'UNKNOWN',
        hasEnergyMonitoring: sensorKeys.some(k =>
          k.includes('ENERGY') || k.includes('Power') ||
          k.includes('Voltage') || k.includes('Current')
        ),
        sensorKeys
      }
    };
  }

  /**
   * Validate capabilities using smart module detection
   */
  private validateCapabilities(
    device: Device,
    capabilities: DeviceCapabilities,
    statusCollection: StatusCollection
  ): ValidationResult {
    const mismatches: string[] = [];
    const warnings: string[] = [];

    // Get module info using smart fallback
    const moduleInfo = getModuleInfo(capabilities.moduleType, statusCollection);

    // Store detected module info
    capabilities.moduleInfo = {
      expectedRelays: moduleInfo.relays,
      expectedSensors: moduleInfo.sensors,
      supportsDimmer: moduleInfo.dimmer,
      supportsShutter: moduleInfo.shutter
    };

    // ALWAYS show module info
    const moduleMessage = `Your device is: ${moduleInfo.name} (Module ${capabilities.moduleType})`;
    warnings.unshift(moduleMessage);

    // Special handling for flexible modules
    if (moduleCapabilityDetector.isFlexibleModule(capabilities.moduleType)) {
      warnings.push(
        `ℹ️ ${moduleInfo.name} detected - device uses custom GPIO configuration. Validation is based on detected capabilities.`
      );
    }

    // Validate relay count
    this.validateRelayCount(capabilities, moduleInfo, mismatches, warnings);

    // Validate sensors
    if (moduleInfo.sensors.length > 0 && !capabilities.hasSensor) {
      mismatches.push(
        `Module ${moduleInfo.name} is designed for sensors (${moduleInfo.sensors.join(', ')}), but no sensor data detected`
      );
    }

    // Validate based on device type
    this.validateDeviceType(device, capabilities, moduleInfo, mismatches, warnings);

    // Validate scripting
    if (device.scriptEnabled && !capabilities.hasScripting) {
      mismatches.push(
        `ℹ️ Scripting enabled but firmware ${capabilities.version} does not support scripting. Flash tasmota32-scripting.bin or tasmota32-berry.bin`
      );
    }

    // Add module capabilities summary
    if (moduleInfo.other) {
      warnings.push(`ℹ️ ${moduleInfo.other}`);
    }

    return {
      isValid: mismatches.length === 0,
      deviceId: device.id,
      expectedType: device.type,
      actualCapabilities: capabilities,
      mismatches,
      warnings,
      timestamp: new Date()
    };
  }

  private validateRelayCount(
    capabilities: DeviceCapabilities,
    moduleInfo: any,
    mismatches: string[],
    warnings: string[]
  ): void {
    if (Array.isArray(moduleInfo.relays)) {
      if (!moduleInfo.relays.includes(capabilities.relayCount)) {
        mismatches.push(
          `Module ${moduleInfo.name} typically has ${moduleInfo.relays.join(' or ')} relay(s), but detected ${capabilities.relayCount} relay(s)`
        );
      }
    } else if (moduleInfo.relays > 0) {
      if (moduleInfo.relays !== capabilities.relayCount) {
        mismatches.push(
          `Module ${moduleInfo.name} expected ${moduleInfo.relays} relay(s), but detected ${capabilities.relayCount} relay(s)`
        );
      }
    } else if (capabilities.relayCount > 0 && moduleInfo.relays === 0) {
      warnings.push(
        `Detected ${capabilities.relayCount} relay(s) - module specification shows 0 relays (capabilities auto-detected)`
      );
    }
  }

  private validateDeviceType(
    device: Device,
    capabilities: DeviceCapabilities,
    moduleInfo: any,
    mismatches: string[],
    warnings: string[]
  ): void {
    switch (device.type) {
      case 'switch':
        this.validateSwitch(device, capabilities, moduleInfo, mismatches, warnings);
        break;
      case 'dimmer':
        this.validateDimmer(device, capabilities, moduleInfo, mismatches);
        break;
      case 'shutter':
        this.validateShutter(capabilities, moduleInfo, mismatches,);
        break;
      case 'sensor':
        this.validateSensor( capabilities, moduleInfo, mismatches, warnings);
        break;
    }
  }

  private validateSwitch(
    device: Device,
    capabilities: DeviceCapabilities,
    moduleInfo: any,
    mismatches: string[],
    warnings: string[]
  ): void {
    if (capabilities.relayCount === 0) {
      mismatches.push(
        `ℹ️ Cannot use as switch - Module ${moduleInfo.name} has no relays detected`
      );
    } else {
      const switchChannel = device.powerChannel || 1;
      if (switchChannel > capabilities.relayCount) {
        mismatches.push(
          `ℹ️ Power channel ${switchChannel} configured but Module ${moduleInfo.name} only has ${capabilities.relayCount} relay(s)`
        );
      } else if (capabilities.relayCount > 1) {
        const otherRelays = Array.from({length: capabilities.relayCount}, (_, i) => i + 1)
          .filter(n => n !== switchChannel)
          .join(', ');
        warnings.push(
          `ℹ️ Module ${moduleInfo.name} has ${capabilities.relayCount} relays. Using relay ${switchChannel}. Other relays: ${otherRelays}`
        );
      }
    }

    // Special case: Device has both relay and dimmer
    if (capabilities.hasDimmer) {
      warnings.push(
        `ℹ️ Module ${moduleInfo.name} has PWM/Dimmer capability on GPIO2. Currently configured as switch on POWER${device.powerChannel || 1}.`
      );
    }

    if (capabilities.hasSensor && capabilities.rawData?.sensorKeys.length) {
      warnings.push(
        `ℹ️ Module ${moduleInfo.name} has sensors (${capabilities.rawData.sensorKeys.join(', ')}) - consider also monitoring sensor data`
      );
    }
  }

  private validateDimmer(
    device: Device,
    capabilities: DeviceCapabilities,
    moduleInfo: any,
    mismatches: string[],
    //warnings: string[]
  ): void {
    if (!capabilities.hasDimmer) {
      if (moduleInfo.dimmer) {
        mismatches.push(
          `ℹ️ Module ${moduleInfo.name} should support dimming but no dimmer detected. Check device configuration.`
        );
      } else {
        mismatches.push(
          `ℹ️ Module ${moduleInfo.name} does not support dimming. Choose a different module or device type.`
        );
      }
    }

    const dimmerChannel = device.powerChannel || 1;
    if (dimmerChannel > capabilities.relayCount) {
      mismatches.push(
        `ℹ️ Dimmer channel ${dimmerChannel} configured but Module ${moduleInfo.name} only has ${capabilities.relayCount} relay(s)`
      );
    }
  }

  private validateShutter(
//device: Device, //device: Device, //device: Device, // device: Device,
capabilities: DeviceCapabilities, moduleInfo: any, mismatches: string[]
   // warnings: string[]
  ): void {
    if (!capabilities.hasShutter) {
      if (moduleInfo.shutter) {
        mismatches.push(
          `ℹ️ Module ${moduleInfo.name} supports shutters but no shutter configuration detected. Run 'ShutterMode 1' command.`
        );
      } else {
        mismatches.push(
          `ℹ️ Module ${moduleInfo.name} does not support shutters. Requires module with 2+ relays and shutter configuration.`
        );
      }
    }

    if (capabilities.relayCount < 2 && !capabilities.hasShutter) {
      mismatches.push(
        `ℹ️ Module ${moduleInfo.name} only has ${capabilities.relayCount} relay(s). Shutters require 2 relays (up/down).`
      );
    }
  }

  private validateSensor(
//device: Device, //device: Device, //device: Device,
capabilities: DeviceCapabilities, moduleInfo: any, mismatches: string[], warnings: string[]): void {
    if (!capabilities.hasSensor) {
      mismatches.push(
        `ℹ️ No sensors detected on Module ${moduleInfo.name}. Device configured as sensor but no sensor data available.`
      );
      if (moduleInfo.sensors.length > 0) {
        mismatches.push(
          `Expected sensors: ${moduleInfo.sensors.join(', ')}. Check sensor connections.`
        );
      }
    } else {
      warnings.push(
        `ℹ️ Detected sensors: ${capabilities.rawData?.sensorKeys.join(', ') || 'unknown'}`
      );
    }

    if (capabilities.relayCount > 0) {
      warnings.push(
        `ℹ️ Module ${moduleInfo.name} has ${capabilities.relayCount} relay(s) available. You can also control switches.`
      );
    }
  }

  private createInvalidResult(device: Device, mismatches: string[]): ValidationResult {
    return {
      isValid: false,
      deviceId: device.id,
      expectedType: device.type,
      mismatches,
      warnings: [],
      timestamp: new Date()
    };
  }

  private createUnknownResult(device: Device, warnings: string[]): ValidationResult {
    return {
      isValid: false,
      deviceId: device.id,
      expectedType: device.type,
      mismatches: [],
      warnings,
      timestamp: new Date()
    };
  }

  shouldValidate(device: Device): boolean {
    if (!device.lastValidation) return true;

    const VALIDATION_INTERVAL = 5 * 60 * 1000;
    const lastValidationTime = device.lastValidation instanceof Date
      ? device.lastValidation.getTime()
      : new Date(device.lastValidation).getTime();

    return Date.now() - lastValidationTime > VALIDATION_INTERVAL;
  }
}

export const deviceValidationService = new DeviceValidationService();