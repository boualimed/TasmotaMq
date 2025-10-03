export const MQTT_CONFIG = {
  CONNECTION_TIMEOUT: 15000, // 15 seconds
  MQTT_PATH: '/mqtt',
  MAX_LOGS: 50,
  DISPLAY_LOGS: 10,
  DEVICE_OFFLINE_TIMEOUT: 30000 // 30 seconds - faster offline detection for non-LWT devices
} as const;

export const MQTT_COMMANDS = {
  ON: 'ON',
  OFF: 'OFF'
} as const;

export const TOPIC_PATTERNS = {
  COMMAND: (baseTopic: string) => `cmnd/${baseTopic}/POWER`,
  STAT: (baseTopic: string) => `stat/${baseTopic}/POWER`,
  RESULT: (baseTopic: string) => `stat/${baseTopic}/RESULT`,
  SENSOR: (baseTopic: string) => `tele/${baseTopic}/SENSOR`,
  LWT: (baseTopic: string) => `tele/${baseTopic}/LWT`,
  STATE: (baseTopic: string) => `tele/${baseTopic}/STATE`,
  INFO1: (baseTopic: string) => `tele/${baseTopic}/INFO1`,
  INFO2: (baseTopic: string) => `tele/${baseTopic}/INFO2`,
  INFO3: (baseTopic: string) => `tele/${baseTopic}/INFO3`
} as const;

export const LWT_STATUS = {
  ONLINE: 'Online',
  OFFLINE: 'Offline'
} as const;