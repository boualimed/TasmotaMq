import { mqttService } from './mqtt-service';
import { deviceService } from './device-service';
import { TasmotaRule, RuleTemplate } from '../models/rule.model';
import { logger } from '../utils/logger.util';
import { notificationService } from './notification.service';
import { commandShield } from './command-shield.service';

export class RuleService {
  private rules: Map<string, TasmotaRule[]> = new Map(); // deviceId -> rules[]
  private listeners: Set<(rules: TasmotaRule[]) => void> = new Set();

  /**
   * Upload rule to Tasmota device
   */
 /** async uploadRule(rule: TasmotaRule): Promise<void> {
    const device = deviceService.getDevice(rule.deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    if (!device.baseTopic) {
      throw new Error('Device must have a baseTopic to manage rules');
    }

    if (!mqttService.isConnected()) {
      throw new Error('MQTT not connected');
    }

    try {
      // Enable or disable the rule
      const ruleEnableTopic = `cmnd/${device.baseTopic}/Rule${rule.ruleSlot}`;
      const enableCommand = rule.enabled ? 'ON' : 'OFF';
      mqttService.publish(ruleEnableTopic, enableCommand);

      // Upload the rule content if enabled
      if (rule.enabled) {
        const ruleContentTopic = `cmnd/${device.baseTopic}/Rule${rule.ruleSlot}`;
        mqttService.publish(ruleContentTopic, rule.ruleText);

        logger.addLog('success', `Rule "${rule.name}" uploaded to ${device.name} (Rule${rule.ruleSlot})`);
        notificationService.success(`✅ Rule "${rule.name}" uploaded successfully`, 3000);
      } else {
        logger.addLog('info', `Rule ${rule.ruleSlot} disabled on ${device.name}`);
        notificationService.info(`Rule ${rule.ruleSlot} disabled on ${device.name}`, 2500);
      }

      // Save rule locally
      this.saveRule(rule);
    } catch (error: any) {
      logger.addLog('error', `Failed to upload rule: ${error.message}`);
      notificationService.error(`Failed to upload rule: ${error.message}`, 4000);
      throw error;
    }
  }**/

    /**
   * ✅ FIXED: Upload rule with shield protection
   */
    async uploadRule(rule: TasmotaRule): Promise<void> {
      // ✅ CRITICAL: Check shield status FIRST
      const shieldStatus = commandShield.getStatus();

      if (shieldStatus.emergencyStopActive) {
        const error = '🚨 Cannot upload rule - Emergency Stop is active';
        logger.addLog('error', error);
        notificationService.error(error, 5000);
        throw new Error(error);
      }

      if (shieldStatus.globalPauseActive) {
        const error = '⏸️ Cannot upload rule - Commands are paused';
        logger.addLog('warning', error);
        notificationService.warning(error, 4000);
        throw new Error(error);
      }

      // Check device
      const device = deviceService.getDevice(rule.deviceId);
      if (!device) {
        throw new Error('Device not found');
      }

      // Check if device is blacklisted
      if (commandShield.isDeviceBlacklisted(rule.deviceId)) {
        const error = `⛔ Cannot upload rule - Device "${device.name}" is blacklisted`;
        logger.addLog('error', error);
        notificationService.error(error, 5000);
        throw new Error(error);
      }

      if (!device.baseTopic) {
        throw new Error('Device must have a baseTopic to manage rules');
      }

      if (!mqttService.isConnected()) {
        throw new Error('MQTT not connected');
      }

      try {
        // ✅ Now safe to upload rule
        const ruleEnableTopic = `cmnd/${device.baseTopic}/Rule${rule.ruleSlot}`;
        const enableCommand = rule.enabled ? 'ON' : 'OFF';
        mqttService.publish(ruleEnableTopic, enableCommand);

        if (rule.enabled) {
          const ruleContentTopic = `cmnd/${device.baseTopic}/Rule${rule.ruleSlot}`;
          mqttService.publish(ruleContentTopic, rule.ruleText);

          logger.addLog('success', `✅ Rule "${rule.name}" uploaded to ${device.name} (Rule${rule.ruleSlot})`);
          notificationService.success(`✅ Rule "${rule.name}" uploaded successfully`, 3000);
        } else {
          logger.addLog('info', `Rule ${rule.ruleSlot} disabled on ${device.name}`);
          notificationService.info(`Rule ${rule.ruleSlot} disabled on ${device.name}`, 2500);
        }

        this.saveRule(rule);
      } catch (error: any) {
        logger.addLog('error', `Failed to upload rule: ${error.message}`);
        notificationService.error(`Failed to upload rule: ${error.message}`, 4000);
        throw error;
      }
    }
  /**
   * Delete rule from Tasmota device
   */
  /**async deleteRule(rule: TasmotaRule): Promise<void> {
    const device = deviceService.getDevice(rule.deviceId);
    if (!device || !device.baseTopic) {
      throw new Error('Device not found or missing baseTopic');
    }

    try {
      // Clear the rule by setting it to empty
      const ruleContentTopic = `cmnd/${device.baseTopic}/Rule${rule.ruleSlot}`;
      mqttService.publish(ruleContentTopic, '');

      // Disable the rule
      const ruleEnableTopic = `cmnd/${device.baseTopic}/Rule${rule.ruleSlot}`;
      mqttService.publish(ruleEnableTopic, 'OFF');

      // Remove from local storage
      this.removeRule(rule);

      logger.addLog('success', `Rule "${rule.name}" deleted from ${device.name}`);
      notificationService.success(`Rule deleted successfully`, 3000);
    } catch (error: any) {
      logger.addLog('error', `Failed to delete rule: ${error.message}`);
      notificationService.error(`Failed to delete rule: ${error.message}`, 4000);
      throw error;
    }
  }**/

  /**
   * ✅ FIXED: Delete rule with shield protection
   */
  async deleteRule(rule: TasmotaRule): Promise<void> {
    // ✅ CRITICAL: Check shield status FIRST
    const shieldStatus = commandShield.getStatus();

    if (shieldStatus.emergencyStopActive) {
      const error = '🚨 Cannot delete rule - Emergency Stop is active';
      logger.addLog('error', error);
      notificationService.error(error, 5000);
      throw new Error(error);
    }

    if (shieldStatus.globalPauseActive) {
      const error = '⏸️ Cannot delete rule - Commands are paused';
      logger.addLog('warning', error);
      notificationService.warning(error, 4000);
      throw new Error(error);
    }

    const device = deviceService.getDevice(rule.deviceId);
    if (!device || !device.baseTopic) {
      throw new Error('Device not found or missing baseTopic');
    }

    // Check if device is blacklisted
    if (commandShield.isDeviceBlacklisted(rule.deviceId)) {
      const error = `⛔ Cannot delete rule - Device "${device.name}" is blacklisted`;
      logger.addLog('error', error);
      notificationService.error(error, 5000);
      throw new Error(error);
    }

    try {
      // ✅ Now safe to delete rule
      const ruleContentTopic = `cmnd/${device.baseTopic}/Rule${rule.ruleSlot}`;
      mqttService.publish(ruleContentTopic, '');

      const ruleEnableTopic = `cmnd/${device.baseTopic}/Rule${rule.ruleSlot}`;
      mqttService.publish(ruleEnableTopic, 'OFF');

      this.removeRule(rule);

      logger.addLog('success', `Rule "${rule.name}" deleted from ${device.name}`);
      notificationService.success('Rule deleted successfully', 3000);
    } catch (error: any) {
      logger.addLog('error', `Failed to delete rule: ${error.message}`);
      notificationService.error(`Failed to delete rule: ${error.message}`, 4000);
      throw error;
    }
  }

  /**
   * Query current rules from device
   */
  /**async queryDeviceRules(deviceId: string): Promise<void> {
    const device = deviceService.getDevice(deviceId);
    if (!device || !device.baseTopic) {
      throw new Error('Device not found or missing baseTopic');
    }

    try {
      // Request all 3 rule slots
      for (let i = 1; i <= 3; i++) {
        const topic = `cmnd/${device.baseTopic}/Rule${i}`;
        mqttService.publish(topic, ''); // Empty payload requests current rule
      }

      logger.addLog('info', `Queried rules from ${device.name}`);
      notificationService.info(`Querying rules from ${device.name}...`, 2000);
    } catch (error: any) {
      logger.addLog('error', `Failed to query rules: ${error.message}`);
      throw error;
    }
  }**/

  /**
   * ✅ Query rules (read-only, doesn't need shield check)
   */
  async queryDeviceRules(deviceId: string): Promise<void> {
    const device = deviceService.getDevice(deviceId);
    if (!device || !device.baseTopic) {
      throw new Error('Device not found or missing baseTopic');
    }

    try {
      // Query is read-only, no shield check needed
      for (let i = 1; i <= 3; i++) {
        const topic = `cmnd/${device.baseTopic}/Rule${i}`;
        mqttService.publish(topic, '');
      }

      logger.addLog('info', `Queried rules from ${device.name}`);
      notificationService.info(`Querying rules from ${device.name}...`, 2000);
    } catch (error: any) {
      logger.addLog('error', `Failed to query rules: ${error.message}`);
      throw error;
    }
  }
  /**
   * Build rule text from structured rule
   */
  buildRuleText(rule: TasmotaRule): string {
    if (rule.isCustom) {
      return rule.ruleText;
    }

    let ruleText = '';

    rule.triggers.forEach((trigger, idx) => {
      const triggerText = this.buildTriggerText(trigger);
      const actionsText = rule.actions
        .map(action => this.buildActionText(action))
        .join(' ');

      if (idx > 0) {
        ruleText += ' ';
      }
      ruleText += `ON ${triggerText} DO ${actionsText} ENDON`;
    });

    return ruleText;
  }

  /**
   * Build trigger text
   */
  private buildTriggerText(trigger: any): string {
    switch (trigger.type) {
      case 'system_boot':
        return 'System#Boot';
      case 'wifi_connected':
        return 'Wifi#Connected';
      case 'mqtt_connected':
        return 'Mqtt#Connected';
      case 'time':
        return trigger.condition || 'Time#Minute';
      case 'switch_state':
        return trigger.condition || 'Power1#State';
      case 'button_press':
        return trigger.condition || 'Button1#State';
      case 'sensor_value':
        return trigger.condition || 'AM2301#Temperature';
      case 'timer_trigger':
        return trigger.condition || 'Clock#Timer=1';
      case 'tele_period':
        return trigger.condition || 'Tele-AM2301#Temperature';
      case 'mem_value':
        return trigger.condition || 'Mem1';
      case 'custom':
        return trigger.condition || '';
      default:
        return '';
    }
  }

  /**
   * Build action text
   */
  private buildActionText(action: any): string {
    const cmd = action.command || '';
    const val = action.value !== undefined ? ` ${action.value}` : '';

    if (action.delay && action.delay > 0) {
      return `Backlog Delay ${action.delay * 10}; ${cmd}${val}`;
    }

    return `${cmd}${val}`;
  }

  /**
   * Get predefined rule templates
   */
  getRuleTemplates(): RuleTemplate[] {
    return [
      {
        id: 'auto-off-timer',
        name: 'Auto Off Timer',
        description: 'Automatically turn off device after specified time',
        category: 'timer',
        deviceTypes: ['switch', 'dimmer'],
        template: 'ON Power1#State=1 DO RuleTimer1 {{duration}} ENDON ON Rules#Timer=1 DO Power1 OFF ENDON',
        variables: [
          { key: 'duration', label: 'Duration (seconds)', type: 'number', default: 300 }
        ]
      },
      {
        id: 'temperature-alert',
        name: 'Temperature Alert',
        description: 'Publish alert when temperature exceeds threshold',
        category: 'sensor',
        deviceTypes: ['sensor'],
        template: 'ON Tele-AM2301#Temperature>{{threshold}} DO Publish stat/%topic%/ALERT {"warning":"Temperature exceeds {{threshold}}°C"} ENDON',
        variables: [
          { key: 'threshold', label: 'Temperature Threshold (°C)', type: 'number', default: 30 }
        ]
      },
      {
        id: 'button-toggle',
        name: 'Button Multi-Click',
        description: 'Different actions for single/double/triple click',
        category: 'automation',
        deviceTypes: ['switch', 'dimmer'],
        template: 'ON Button1#State=2 DO Power1 TOGGLE ENDON ON Button1#State=3 DO Dimmer + ENDON ON Button1#State=4 DO Dimmer - ENDON',
        variables: []
      },
      {
        id: 'startup-state',
        name: 'Custom Startup State',
        description: 'Set specific state on device boot',
        category: 'automation',
        deviceTypes: ['switch', 'dimmer', 'shutter'],
        template: 'ON System#Boot DO Backlog Delay 10; Power1 {{state}} ENDON',
        variables: [
          { key: 'state', label: 'Startup State', type: 'string', options: ['ON', 'OFF'], default: 'OFF' }
        ]
      },
      {
        id: 'conditional-automation',
        name: 'Conditional Switch',
        description: 'Control one device based on another sensor',
        category: 'conditional',
        deviceTypes: ['switch'],
        template: 'ON Tele-AM2301#Temperature<{{minTemp}} DO Power1 ON ENDON ON Tele-AM2301#Temperature>{{maxTemp}} DO Power1 OFF ENDON',
        variables: [
          { key: 'minTemp', label: 'Minimum Temperature (°C)', type: 'number', default: 18 },
          { key: 'maxTemp', label: 'Maximum Temperature (°C)', type: 'number', default: 25 }
        ]
      },
      {
        id: 'time-based',
        name: 'Time-Based Control',
        description: 'Turn on/off at specific times',
        category: 'timer',
        deviceTypes: ['switch', 'dimmer'],
        template: 'ON Time#Minute={{onTime}} DO Power1 ON ENDON ON Time#Minute={{offTime}} DO Power1 OFF ENDON',
        variables: [
          { key: 'onTime', label: 'Turn On Time (e.g., 420 = 7:00 AM)', type: 'number', default: 420 },
          { key: 'offTime', label: 'Turn Off Time (e.g., 1320 = 10:00 PM)', type: 'number', default: 1320 }
        ]
      },
      {
        id: 'motion-light',
        name: 'Motion Activated Light',
        description: 'Turn on light when motion detected, auto-off after timeout',
        category: 'automation',
        deviceTypes: ['switch'],
        template: 'ON Switch1#State=1 DO Backlog Power1 ON; RuleTimer1 {{timeout}} ENDON ON Rules#Timer=1 DO Power1 OFF ENDON',
        variables: [
          { key: 'timeout', label: 'Auto-off Timeout (seconds)', type: 'number', default: 300 }
        ]
      },
      {
        id: 'mqtt-republish',
        name: 'MQTT Re-publisher',
        description: 'Forward sensor data to custom MQTT topic',
        category: 'advanced',
        deviceTypes: ['sensor'],
        template: 'ON Tele-AM2301#Temperature DO Publish {{customTopic}} %value% ENDON',
        variables: [
          { key: 'customTopic', label: 'Custom MQTT Topic', type: 'string', default: 'home/sensors/temp' }
        ]
      },
      {
        id: 'dimmer-gradual',
        name: 'Gradual Dimmer Fade',
        description: 'Gradually increase/decrease dimmer value',
        category: 'automation',
        deviceTypes: ['dimmer'],
        template: 'ON Power2#State=1 DO Backlog Dimmer 1; Delay 10; Dimmer +5; Delay 10; Dimmer +5; Delay 10; Dimmer +5 ENDON',
        variables: []
      },
      {
        id: 'energy-monitor',
        name: 'Energy Consumption Alert',
        description: 'Alert when energy consumption exceeds limit',
        category: 'sensor',
        deviceTypes: ['sensor'],
        template: 'ON Tele-ENERGY#Power>{{maxWatts}} DO Publish stat/%topic%/ALERT {"warning":"Power exceeds {{maxWatts}}W"} ENDON',
        variables: [
          { key: 'maxWatts', label: 'Maximum Watts', type: 'number', default: 1000 }
        ]
      }
    ];
  }

  /**
   * Apply template to create rule
   */
  applyTemplate(template: RuleTemplate, deviceId: string, variables: Record<string, any>): TasmotaRule {
    let ruleText = template.template;

    // Replace variables in template
    Object.entries(variables).forEach(([key, value]) => {
      ruleText = ruleText.replace(new RegExp(`{{${key}}}`, 'g'), value.toString());
    });

    const device = deviceService.getDevice(deviceId);
    const deviceName = device?.name || 'Unknown Device';

    // Find available rule slot
    const existingRules = this.getRulesForDevice(deviceId);
    const usedSlots = existingRules.map(r => r.ruleSlot);
    let availableSlot: 1 | 2 | 3 = 1;
    for (let i = 1; i <= 3; i++) {
      if (!usedSlots.includes(i as 1 | 2 | 3)) {
        availableSlot = i as 1 | 2 | 3;
        break;
      }
    }

    return {
      id: `rule_${Date.now()}`,
      deviceId,
      deviceName,
      ruleSlot: availableSlot,
      name: template.name,
      description: template.description,
      enabled: true,
      triggers: [],
      actions: [],
      ruleText,
      isCustom: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Save rule locally
   */
  private saveRule(rule: TasmotaRule): void {
    const deviceRules = this.rules.get(rule.deviceId) || [];
    const existingIndex = deviceRules.findIndex(r => r.id === rule.id);

    if (existingIndex >= 0) {
      deviceRules[existingIndex] = { ...rule, updatedAt: new Date() };
    } else {
      deviceRules.push(rule);
    }

    this.rules.set(rule.deviceId, deviceRules);
    this.notifyListeners();
    this.persistRules();
  }

  /**
   * Remove rule locally
   */
  private removeRule(rule: TasmotaRule): void {
    const deviceRules = this.rules.get(rule.deviceId) || [];
    const filtered = deviceRules.filter(r => r.id !== rule.id);
    this.rules.set(rule.deviceId, filtered);
    this.notifyListeners();
    this.persistRules();
  }

  /**
   * Get rules for specific device
   */
  getRulesForDevice(deviceId: string): TasmotaRule[] {
    return this.rules.get(deviceId) || [];
  }

  /**
   * Get all rules
   */
  getAllRules(): TasmotaRule[] {
    const allRules: TasmotaRule[] = [];
    this.rules.forEach(rules => allRules.push(...rules));
    return allRules;
  }

  /**
   * Subscribe to rule changes
   */
  subscribe(listener: (rules: TasmotaRule[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const allRules = this.getAllRules();
    this.listeners.forEach(listener => listener(allRules));
  }

  /**
   * Persist rules to localStorage
   */
  private persistRules(): void {
    try {
      const rulesArray = this.getAllRules();
      localStorage.setItem('tasmota_rules', JSON.stringify(rulesArray));
    } catch (error) {
      console.error('Failed to persist rules:', error);
    }
  }

  /**
   * Load rules from localStorage
   */
  loadRules(): void {
    try {
      const stored = localStorage.getItem('tasmota_rules');
      if (stored) {
        const rulesArray: TasmotaRule[] = JSON.parse(stored);
        this.rules.clear();

        rulesArray.forEach(rule => {
          const deviceRules = this.rules.get(rule.deviceId) || [];
          deviceRules.push(rule);
          this.rules.set(rule.deviceId, deviceRules);
        });

        this.notifyListeners();
        logger.addLog('success', `Loaded ${rulesArray.length} rules from storage`);
      }
    } catch (error) {
      console.error('Failed to load rules:', error);
    }
  }
}

// Singleton
export const ruleService = new RuleService();