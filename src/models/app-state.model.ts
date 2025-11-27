import { MqttSettings } from './mqtt-settings.model';
import { Device } from './device.model';

export interface AppState {
  mqttSettings: MqttSettings;
  devices: Device[];
}

export interface LogEntry {
  type: 'warning' |'info' | 'success' | 'error';
  message: string;
  timestamp: Date;
}