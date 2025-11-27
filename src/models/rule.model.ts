export interface TasmotaRule {
    id: string;
    deviceId: string;
    deviceName: string;
    ruleSlot: 1 | 2 | 3; // Tasmota supports Rule1, Rule2, Rule3
    name: string;
    description?: string;
    enabled: boolean;
    triggers: RuleTrigger[];
    actions: RuleAction[];
    ruleText: string; // Generated or manual Tasmota rule syntax
    isCustom: boolean; // true if user wrote raw rule text
    createdAt: Date;
    updatedAt: Date;
  }

  export interface RuleTrigger {
    type: TriggerType;
    condition?: string;
    value?: any;
  }

  export type TriggerType =
    | 'system_boot'           // System#Boot
    | 'wifi_connected'        // Wifi#Connected
    | 'mqtt_connected'        // Mqtt#Connected
    | 'time'                  // Time#Minute, Time#Set
    | 'switch_state'          // Power1#State, Power2#State
    | 'button_press'          // Button1#State, Switch1#State
    | 'sensor_value'          // AM2301#Temperature, etc.
    | 'timer_trigger'         // Clock#Timer
    | 'tele_period'           // Tele-AM2301#Temperature
    | 'mem_value'             // Mem1, Var1
    | 'custom';               // User-defined trigger

  export interface RuleAction {
    type: ActionType;
    command: string;
    value?: any;
    delay?: number; // Delay in seconds using Backlog
  }

  export type ActionType =
    | 'power_control'         // Power1 ON/OFF
    | 'dimmer_control'        // Dimmer 50
    | 'publish_mqtt'          // Publish topic payload
    | 'var_set'               // Var1 value
    | 'mem_set'               // Mem1 value
    | 'delay'                 // Delay 5
    | 'backlog'               // Backlog command1; command2
    | 'ruletimer'             // RuleTimer1 60
    | 'custom'                // User command
    | 'power_toggle'          //  TOGGLE
    | 'shutter_control'
    | 'send_telegram';

  export interface RuleTemplate {
    id: string;
    name: string;
    description: string;
    category: 'automation' | 'sensor' | 'timer' | 'conditional' | 'advanced';
    deviceTypes: ('switch' | 'dimmer' | 'shutter' | 'sensor')[];
    template: string;
    variables: RuleVariable[];
  }

  export interface RuleVariable {
    key: string;
    label: string;
    type: 'number' | 'string' | 'boolean' | 'time';
    default?: any;
    options?: string[]; // For dropdown selections
}
export interface SendTelegramAction extends RuleAction {
  type: 'send_telegram';
  message: string;      // supports {device}, {sensor}, {value}, {threshold}
}