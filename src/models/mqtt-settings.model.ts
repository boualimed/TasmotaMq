export interface MqttSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  useSSL: boolean;
  clientId: string;
  wasConnected: boolean;
}

export const DEFAULT_MQTT_SETTINGS: MqttSettings = {
  host: 'localhost',
  port: 8080,
  username: '',
  password: '',
  useSSL: false,
  clientId: `tasmota_client_${Math.random().toString(36).substr(2, 9)}`,
  wasConnected: false
};