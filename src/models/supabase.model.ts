export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

export interface SupabaseSettings {
  enabled: boolean;
  config: SupabaseConfig;
  storeMqttMessages: boolean;
  storeDeviceStates: boolean;
  retentionDays: number;
  batchSize: number;
  batchInterval: number; // milliseconds
}

export const DEFAULT_SUPABASE_SETTINGS: SupabaseSettings = {
  enabled: false,
  config: {
    url: '',
    anonKey: '',
    serviceRoleKey: ''
  },
  storeMqttMessages: true,
  storeDeviceStates: true,
  retentionDays: 30,
  batchSize: 50,
  batchInterval: 5000 // 5 seconds
};

// Database table structures
export interface MqttMessageRecord {
  id?: string;
  user_id: string;
  device_id: string;
  device_name: string;
  topic: string;
  payload: any;
  payload_type: 'json' | 'string' | 'number' | 'boolean';
  qos?: number;
  retained?: boolean;
  timestamp: string;
  created_at?: string;
}

export interface DeviceStateRecord {
  id?: string;
  user_id: string;
  device_id: string;
  device_name: string;
  device_type: 'switch' | 'sensor';
  is_connected: boolean;
  is_on?: boolean;
  sensor_data?: any;
  lwt_status?: string;
  last_seen: string;
  created_at?: string;
  updated_at?: string;
}

export interface DeviceHistoryRecord {
  id?: string;
  user_id: string;
  device_id: string;
  state_change: 'online' | 'offline' | 'on' | 'off';
  previous_value?: any;
  new_value?: any;
  timestamp: string;
}