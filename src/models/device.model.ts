export type DeviceType = 'switch' | 'sensor';

export interface Device {
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
}

export interface NewDeviceInput {
  name: string;
  topic: string;
  baseTopic: string;
  type: DeviceType;
  jsonPath: string;
  useAutoDiscovery: boolean;
}

export const DEFAULT_NEW_DEVICE: NewDeviceInput = {
  name: '',
  topic: '',
  baseTopic: '',
  type: 'switch',
  jsonPath: '',
  useAutoDiscovery: true
};