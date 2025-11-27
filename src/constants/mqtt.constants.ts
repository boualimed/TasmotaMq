// mqtt.constants.ts - CORRECTED VERSION

export const MQTT_CONFIG = {
  CONNECTION_TIMEOUT: 15000,
  MQTT_PATH: '/mqtt',
  MAX_LOGS: 50,
  DISPLAY_LOGS: 10,
  DEVICE_OFFLINE_TIMEOUT: 30000
} as const;

export const MQTT_COMMANDS = {
  ON: 'ON',
  OFF: 'OFF',
  // Dimmer commands
  DIMMER_MIN: 0,
  DIMMER_MAX: 100,
  // Shutter commands
  SHUTTER_OPEN: 'Open',
  SHUTTER_CLOSE: 'Close',
  SHUTTER_STOP: 'Stop',
  SHUTTER_MIN: 0,
  SHUTTER_MAX: 100,
  TIMERS: 'Timers', // Get all timers status
  TIMER: 'Timer', // Configure specific timer
} as const;

export const TOPIC_PATTERNS = {
  // Switch topics
  COMMAND: (baseTopic: string) => `cmnd/${baseTopic}/POWER`,
  STAT: (baseTopic: string) => `stat/${baseTopic}/POWER`,
  RESULT: (baseTopic: string) => `stat/${baseTopic}/RESULT`,

  // Sensor topics
  SENSOR: (baseTopic: string) => `tele/${baseTopic}/SENSOR`,

  // Common topics
  LWT: (baseTopic: string) => `tele/${baseTopic}/LWT`,
  STATE: (baseTopic: string) => `tele/${baseTopic}/STATE`,
  INFO1: (baseTopic: string) => `tele/${baseTopic}/INFO1`,
  INFO2: (baseTopic: string) => `tele/${baseTopic}/INFO2`,
  INFO3: (baseTopic: string) => `tele/${baseTopic}/INFO3`,

  // Dimmer topics
  DIMMER_COMMAND: (baseTopic: string) => `cmnd/${baseTopic}/Dimmer`,
  DIMMER_RESULT: (baseTopic: string) => `stat/${baseTopic}/RESULT`,
  DIMMER_POWER_COMMAND: (baseTopic: string, channel: number = 2) => `cmnd/${baseTopic}/POWER${channel}`,
  DIMMER_POWER_STAT: (baseTopic: string, channel: number = 2) => `stat/${baseTopic}/POWER${channel}`,



  // ✅ CORRECTED: Validation topics
  // Command: cmnd/tasmota_110CE1/Status 0
  // Response: stat/tasmota_110CE1/STATUS, STATUS1, STATUS2, etc.
  STATUS_COMMAND: (baseTopic: string) => `cmnd/${baseTopic}/Status`,  // Send "0" as payload
  STATUS: (baseTopic: string) => `stat/${baseTopic}/STATUS`,          // Basic module info
  STATUS1: (baseTopic: string) => `stat/${baseTopic}/STATUS1`,        // StatusPRM
  STATUS2: (baseTopic: string) => `stat/${baseTopic}/STATUS2`,        // StatusFWR (firmware)
  STATUS3: (baseTopic: string) => `stat/${baseTopic}/STATUS3`,        // StatusLOG
  STATUS4: (baseTopic: string) => `stat/${baseTopic}/STATUS4`,        // StatusMEM (features)
  STATUS5: (baseTopic: string) => `stat/${baseTopic}/STATUS5`,        // StatusNET
  STATUS6: (baseTopic: string) => `stat/${baseTopic}/STATUS6`,        // StatusMQT
  STATUS7: (baseTopic: string) => `stat/${baseTopic}/STATUS7`,        // StatusTIM
  STATUS8: (baseTopic: string) => `stat/${baseTopic}/STATUS8`,        // StatusSNS (alternative)
  STATUS10: (baseTopic: string) => `stat/${baseTopic}/STATUS10`,      // StatusSNS (sensors)
  STATUS11: (baseTopic: string) => `stat/${baseTopic}/STATUS11`,      // StatusSTS (state/power)

   // Timer topics
   TIMER_COMMAND: (baseTopic: string, timerId?: number) =>
    timerId ? `cmnd/${baseTopic}/Timer${timerId}` : `cmnd/${baseTopic}/Timers`,
  TIMER_RESULT: (baseTopic: string) => `stat/${baseTopic}/RESULT`,

// 🔥 CORRECTED: Shutter command topics (NO index in topic path!)
  // Command: cmnd/{baseTopic}/ShutterPosition (NOT ShutterPosition1!)
  // The shutter index is sent in the PAYLOAD, not the topic!
  SHUTTER_POSITION_COMMAND: (baseTopic: string) =>
    `cmnd/${baseTopic}/ShutterPosition`,

  SHUTTER_STOP_COMMAND: (baseTopic: string) =>
    `cmnd/${baseTopic}/ShutterStop`,

  SHUTTER_OPEN_COMMAND: (baseTopic: string) =>
    `cmnd/${baseTopic}/ShutterOpen`,

  SHUTTER_CLOSE_COMMAND: (baseTopic: string) =>
    `cmnd/${baseTopic}/ShutterClose`,

  // 🔥 CORRECTED: Status topics
  // Response comes to: stat/{baseTopic}/RESULT with {"Shutter1": {...}}
  // Also published to: stat/{baseTopic}/SHUTTER1 (value only)
  SHUTTER_RESULT: (baseTopic: string) =>
    `stat/${baseTopic}/RESULT`,

  SHUTTER_STATUS: (baseTopic: string, index: number) =>
    `stat/${baseTopic}/SHUTTER${index}`,

  // Calibration commands (these DO use ShutterXxx format with index)
  SHUTTER_OPEN_DURATION: (baseTopic: string, index: number) =>
    `cmnd/${baseTopic}/ShutterOpenDuration${index}`,

  SHUTTER_CLOSE_DURATION: (baseTopic: string, index: number) =>
    `cmnd/${baseTopic}/ShutterCloseDuration${index}`,

  SHUTTER_SET_CLOSE: (baseTopic: string, index: number) =>
    `cmnd/${baseTopic}/ShutterSetClose${index}`,

  SHUTTER_SET_OPEN: (baseTopic: string, index: number) =>
    `cmnd/${baseTopic}/ShutterSetOpen${index}`,

  SHUTTER_SET_HALFWAY: (baseTopic: string, index: number) =>
    `cmnd/${baseTopic}/ShutterSetHalfway${index}`,

  SHUTTER_INVERT: (baseTopic: string, index: number) =>
    `cmnd/${baseTopic}/ShutterInvert${index}`,

  SHUTTER_TILT: (baseTopic: string, index: number) =>
    `cmnd/${baseTopic}/ShutterTilt${index}`,

  // Power relay topics (shutters control POWER1/POWER2)
  POWER_COMMAND: (baseTopic: string, channel: number) =>
    `cmnd/${baseTopic}/POWER${channel}`,

  POWER_STATUS: (baseTopic: string, channel: number) =>
    `stat/${baseTopic}/POWER${channel}`,

} as const;

export const LWT_STATUS = {
  ONLINE: 'Online',
  OFFLINE: 'Offline'
} as const;

// timer-specific commands
export const TIMER_COMMANDS = {
  // Timer modes
  MODE_SCHEDULE: 0,
  MODE_SUNRISE: 1,
  MODE_SUNSET: 2,

  // Timer actions
  ACTION_OFF: 0,
  ACTION_ON: 1,
  ACTION_TOGGLE: 2,
  ACTION_RULE: 3,

  // Global timer control
  ENABLE_ALL: 'ON',
  DISABLE_ALL: 'OFF',

  // Timer configuration format
  // Timer<x> {"Arm":<0|1>,"Mode":<0|1|2>,"Time":"<hh:mm>","Window":<0-15>,"Days":"<bitmask>","Repeat":<0|1>,"Output":<1-16>,"Action":<0|1|2|3>}
} as const;

// 🔥 CORRECTED: Shutter command format
// For multi-shutter devices, format is: "<index> <position>"
// For single shutter: just "<position>"
export const SHUTTER_COMMANDS = {
  // Format: "1 100" for shutter 1 to position 100
  formatPosition: (index: number, position: number) =>
    index === 1 ? position.toString() : `${index} ${position}`,

  // Format: "1" to stop shutter 1
  formatStop: (index: number) =>
    index === 1 ? '' : index.toString(),

  // Format: "1" to open shutter 1
  formatOpen: (index: number) =>
    index === 1 ? '' : index.toString(),

  // Format: "1" to close shutter 1
  formatClose: (index: number) =>
    index === 1 ? '' : index.toString(),
};
