export interface MqttSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  useSSL: boolean;
  clientId: string;
  wasConnected: boolean;
keepAliveInterval?: number;
}

export const DEFAULT_MQTT_SETTINGS: MqttSettings = {
  host: '127.0.0.1',
  port: 9001,
  username: '',
  password: '',
  useSSL: false,
  clientId: `tasmota_client_${Math.random().toString(36).substr(2, 9)}`,
  wasConnected: false,

};