export interface TasmotaScript {
    id: string;
    deviceId: string;
    deviceName: string;
    name: string;
    description?: string;
    enabled: boolean;
    sections: ScriptSection[];
    scriptText: string; // Full script as text
    isTemplate: boolean;
    createdAt: Date;
    updatedAt: Date;
    uploadProgress?: number; // For tracking line-by-line upload
  }

  export interface ScriptSection {
    type: ScriptSectionType;
    code: string;
    enabled: boolean;
  }

  export type ScriptSectionType =
    | 'define'      // >D - Variables
    | 'boot'        // >B - Boot sequence
    | 'sensor'      // >S - Sensor readings
    | 'event'       // >E - Events
    | 'web'         // >W - Web UI
    | 'json'        // >J - JSON modification
    | 'button'      // >R - Button/Switch
    | 'mqtt'        // >m - MQTT handler
    | 'function';   // >F - Custom functions

  export interface ScriptTemplate {
    id: string;
    name: string;
    description: string;
    category: 'sensor' | 'automation' | 'monitoring' | 'advanced' | 'web-ui';
    deviceTypes: ('switch' | 'dimmer' | 'shutter' | 'sensor')[];
    complexity: 'beginner' | 'intermediate' | 'advanced';
    sections: ScriptSection[];
    variables: ScriptVariable[];
    requirements: string[]; // e.g., ["tasmota32-scripting.bin", "Specific sensor"]
  }

  export interface ScriptVariable {
    key: string;
    label: string;
    type: 'number' | 'string' | 'boolean';
    default?: any;
    description?: string;
  }