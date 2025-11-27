// device.model.ts - Fixed Shutter Implementation
export type DeviceType = 'switch' | 'sensor' | 'dimmer' | 'shutter';

export interface Device {
  shutterStopTopic: any;
  shutterCommandTopic: string;
  id: string;
  name: string;
  topic: string;
  baseTopic?: string;
  commandTopic?: string;
  statTopic?: string;
  resultTopic?: string;
  lwtTopic?: string;
  stateTopic?: string;
  type: DeviceType;
  isConnected: boolean;
  isOn: boolean;
  sensorData?: any;
  jsonPath?: string;
  lastSeen?: Date;
  lwtStatus?: 'Online' | 'Offline';
  useAutoDiscovery?: boolean;
  isEnabled?: boolean;

  // Dimmer properties
  dimmerValue?: number;
  dimmerCommandTopic?: string;
  powerChannel?: number;

  // 🆕 FIXED: Shutter properties according to Tasmota docs
  shutterPosition?: number; // 0-100 (0=closed, 100=open)
  shutterDirection?: -1 | 0 | 1; // -1=closing, 0=stopped, 1=opening
  shutterTarget?: number; // Target position
  shutterIndex?: number; // Shutter index (1-16 for ESP32, 1-4 for ESP8266)
  shutterMode?: number; // ShutterMode (1-6)
  shutterInvert?: boolean; // ShutterInvert (reverse position meaning)

  // Venetian blind support
  shutterTiltConfig?: {
    openAngle: number;
    closeAngle: number;
    duration: number; // in 1/20 seconds
    currentTilt?: number;


  };

  // Calibration
  shutterCalibration?: {
    openDuration: number; // seconds
    closeDuration: number; // seconds
    halfwayPosition?: number;
    calibrationPoints?: number[]; // [30%, 50%, 70%, 90%, 100%]
  };

  shutterPowerStates?: {
    power1: boolean; // UP relay (Mode 1)
    power2: boolean; // DOWN relay (Mode 1)
  };

  // Sensor properties
  sensorConfig?: SensorConfig;
  rulesEnabled?: boolean;
  activeRulesCount?: number;
  scriptEnabled?: boolean;

  validationStatus?: ValidationStatus;
  lastValidation?: Date;
  validationResult?: ValidationResult;
  capabilities?: DeviceCapabilities;

  // Organization
  category?: DeviceType;
  customOrder?: number;
  room?: string;

  // Timers
  timerConfig?: TimerConfig;
  timersEnabled?: boolean;
}

export interface NewDeviceInput {
  name: string;
  topic?: string;
  baseTopic?: string;
  type: DeviceType;
  jsonPath?: string;
  useAutoDiscovery: boolean;
  powerChannel?: number;
  sensorConfig?: SensorConfig;

  // 🆕 Shutter-specific fields
  shutterIndex?: number;
  shutterMode?: number;
  shutterInvert?: boolean;
}

export const DEFAULT_NEW_DEVICE: NewDeviceInput = {
  name: '',
  topic: '',
  baseTopic: '',
  type: 'switch',
  jsonPath: '',
  useAutoDiscovery: true,
  powerChannel: 1,
  sensorConfig: undefined,
  shutterIndex: 1,
  shutterMode: 1, // Default to Mode 1 (Normal operation)
  shutterInvert: false
}

export type SensorType =
  | 'temperature'
  | 'humidity'
  | 'pressure'
  | 'energy'
  | 'light'
  | 'gas'
  | 'motion'
  | 'distance'
  | 'multi'
  | 'custom';

  export interface SensorConfig {
    sensorType: SensorType;
    displayName?: string;
    icon?: string;
    unit?: string;
    colorScheme?: string;

    // 🆕 LIVE SENSOR DATA (runtime values – NOT saved to storage)
    currentValue?: number;          // Current reading (e.g. 23.5°C)
    previousValue?: number;         // For change-detection (optional but recommended)
    lastUpdated?: Date;             // Timestamp of last MQTT update
    trend?: 'up' | 'down' | 'stable'; // Optional UI helper
  }

export interface TasmotaStatus {
  Module: number;
  ModuleName: string;
  FriendlyName: string[];
  Features?: string[];
  Version?: string;
}

export interface TasmotaStatus2 {
  StatusFWR?: {
    Version: string;
    Hardware: string;
  };
}

export interface DeviceCapabilities {
  moduleType: number;
  moduleName: string;
  relayCount: number;
  hasSensor: boolean;
  hasScripting: boolean;
  hasShutter: boolean;
  hasDimmer: boolean;
  friendlyNames: string[];
  version: string;
  moduleInfo?: {
    expectedRelays: number | number[];
    expectedSensors: string[];
    supportsDimmer: boolean;
    supportsShutter: boolean;
  };
  rawData?: {
    deviceName: string;
    powerState: string;
    hasEnergyMonitoring: boolean;
    sensorKeys: string[];
  };
}

export interface ValidationResult {
  isValid: boolean;
  deviceId: string;
  expectedType: string;
  actualCapabilities?: DeviceCapabilities;
  mismatches: string[];
  warnings: string[];
  timestamp: Date;
}

export type ValidationStatus = 'valid' | 'invalid' | 'unknown' | 'checking';

export interface TasmotaTimer {
  id: number;
  enabled: boolean;
  mode: number;
  time: string;
  window: number;
  days: string;
  repeat: boolean;
  output: number;
  action: number;
}

export interface TimerConfig {
  timers: TasmotaTimer[];
  latitude?: number;
  longitude?: number;
}

