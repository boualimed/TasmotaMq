import { deviceService } from '../../services/device-service';
import { notificationService } from '../../services/notification.service';
import { logger } from '../../utils/logger.util';
import { commandShield } from '../../services/command-shield.service';
import { TasmotaRule, RuleAction } from '../../models/rule.model';
import { Device } from '../../models/device.model';

export class RulesScriptsHandler {
  private sendTelegram: (deviceId: string, message: string) => Promise<boolean>;

  constructor(
    private onStateChange: () => void,
    private showError: (message: string) => void,
    private saveState: () => void,
    sendTelegram: (deviceId: string, message: string) => Promise<boolean>,
    private getCurrentUserId: () => string  //
  ) {
    this.sendTelegram = sendTelegram;
  }

  // 🛡️ PROTECTED: Execute rule action through shield
  /**public async executeAction(
    device: Device,
    action: RuleAction,
    context?: { sensorType?: string; value?: number }
  ): Promise<void> {
    try {
      // Handle Telegram separately (doesn't need shield)
      if (action.type === 'send_telegram') {
        return this.handleTelegramAction(device, action, context);
      }

      // Map action types to shield command types
      const commandInfo = this.mapActionToCommand(action);
      if (!commandInfo) {
        logger.addLog('warning', `Unknown action type: ${action.type}`);
        return;
      }

      // 🛡️ ROUTE THROUGH SHIELD
      const result = await commandShield.executeCommand(
        device,
        commandInfo.commandType,
        commandInfo.payload,
        {
          requestedBy: this.getCurrentUserId(),
          reason: `Rule action: ${action.type}`,
          priority: 'normal'
        }
      );

      if (!result.success) {
        logger.addLog('error', `Rule action failed: ${result.error}`);
        this.showError(`Rule action failed: ${result.error}`);
        return;
      }

      logger.addLog('success', `Rule action executed: ${action.type} on ${device.name}`);

      // Apply delay if specified
      if (action.delay && action.delay > 0) {
        await this.delay(action.delay);
      }

    } catch (err: any) {
      this.showError(`Rule action failed: ${err.message}`);
      logger.addLog('error', `Rule action error: ${err.message}`);
    }
  }**/
    public async executeAction(
      device: Device,
      action: RuleAction,
      context?: { sensorType?: string; value?: number }
    ): Promise<void> {
      try {
        // ✅ DOUBLE-CHECK: Shield status before action execution
        const shieldStatus = commandShield.getStatus();

        if (shieldStatus.emergencyStopActive) {
          logger.addLog('error', `🚨 Action blocked by emergency stop: ${action.type}`);
          return;
        }

        // Handle Telegram separately (doesn't need shield)
        if (action.type === 'send_telegram') {
          return this.handleTelegramAction(device, action, context);
        }

        // Map action types to shield command types
        const commandInfo = this.mapActionToCommand(action);
        if (!commandInfo) {
          logger.addLog('warning', `Unknown action type: ${action.type}`);
          return;
        }

        // 🛡️ ROUTE THROUGH SHIELD (will do its own checks)
        const result = await commandShield.executeCommand(
          device,
          commandInfo.commandType,
          commandInfo.payload,
          {
            requestedBy: this.getCurrentUserId(),
            reason: `Rule action: ${action.type}`,
            priority: 'normal'
          }
        );

        if (!result.success) {
          logger.addLog('error', `Rule action failed: ${result.error}`);
          this.showError(`Rule action failed: ${result.error}`);
          return;
        }

        logger.addLog('success', `✅ Rule action executed: ${action.type} on ${device.name}`);

        // Apply delay if specified
        if (action.delay && action.delay > 0) {
          await this.delay(action.delay);
        }

      } catch (err: any) {
        this.showError(`Rule action failed: ${err.message}`);
        logger.addLog('error', `Rule action error: ${err.message}`);
      }
    }
  // ✅ NEW: Map rule actions to shield commands
  private mapActionToCommand(action: RuleAction): {
    commandType: any;
    payload: any;
  } | null {
    switch (action.type) {
      case 'power_control':
        return {
          commandType: action.value === 'on' ? 'switch.on' : 'switch.off',
          payload: {}
        };

      case 'power_toggle':
        return {
          commandType: 'switch.toggle',
          payload: {}
        };

      case 'dimmer_control':
        return {
          commandType: 'dimmer.set',
          payload: action.value
        };

      case 'shutter_control':
        if (action.value === 'open') {
          return { commandType: 'shutter.open', payload: {} };
        } else if (action.value === 'close') {
          return { commandType: 'shutter.close', payload: {} };
        } else if (action.value === 'stop') {
          return { commandType: 'shutter.stop', payload: {} };
        } else if (typeof action.value === 'number') {
          return { commandType: 'shutter.position', payload: action.value };
        }
        return null;

      default:
        return null;
    }
  }

  // ✅ Telegram action (no shield needed - not a device command)
  private async handleTelegramAction(
    device: Device,
    action: RuleAction,
    context?: { sensorType?: string; value?: number }
  ): Promise<void> {
    if (!action.command || typeof action.command !== 'string') {
      logger.addLog('error', `Telegram action missing message for ${device.name}`);
      return;
    }

    let message = action.command;
    if (context) {
      message = message
        .replace(/{device}/g, device.name)
        .replace(/{sensor}/g, context.sensorType ?? '')
        .replace(/{value}/g, String(context.value ?? ''))
        .replace(/{threshold}/g, String(action.value ?? ''));
    }

    const sent = await this.sendTelegram(device.id, message);
    if (sent) {
      logger.addLog('info', `Telegram sent for ${device.name}: ${message.substring(0, 50)}...`);
      notificationService.success(`Telegram → ${device.name}`, 2000);
    } else {
      logger.addLog('warning', `Telegram failed for ${device.name}`);
    }
  }

  // ✅ Evaluate rules for device
/**  public async evaluateRulesForDevice(
    device: Device,
    sensorType?: string,
    value?: number
  ): Promise<void> {
    if (!device.rulesEnabled || !device.rules || device.rules.length === 0) {
      return;
    }

    for (const rule of device.rules) {
      if (!rule.enabled) continue;

      let triggered = false;
      for (const trigger of rule.triggers) {
        if (trigger.type === 'sensor_value' && sensorType && value !== undefined) {
          if (trigger.condition && trigger.condition.match(/^([><=]+)(\d+\.?\d*)$/)) {
            const [, op, thresh] = trigger.condition.match(/^([><=]+)(\d+\.?\d*)$/)!;
            const numThresh = parseFloat(thresh);

            switch (op) {
              case '>': triggered = value > numThresh; break;
              case '<': triggered = value < numThresh; break;
              case '>=': triggered = value >= numThresh; break;
              case '<=': triggered = value <= numThresh; break;
              case '==': triggered = value === numThresh; break;
            }
          }
        }
      }

      if (triggered) {
        logger.addLog('info', `Rule "${rule.name}" triggered on ${device.name}`);
        for (const action of rule.actions) {
          await this.executeAction(device, action, { sensorType, value });
        }
      }
    }
  }**/

    public async evaluateRulesForDevice(
      device: Device,
      sensorType?: string,
      value?: number
    ): Promise<void> {
      // ✅ CRITICAL FIX: Check shield status before evaluating rules
      const shieldStatus = commandShield.getStatus();

      // 🚨 Block if emergency stop is active
      if (shieldStatus.emergencyStopActive) {
        logger.addLog('warning', `🚨 Rules blocked by emergency stop for ${device.name}`);
        return;
      }

      // ⏸️ Block if commands are globally paused
      if (shieldStatus.globalPauseActive) {
        logger.addLog('warning', `⏸️ Rules blocked by global pause for ${device.name}`);
        return;
      }

      // ⛔ Block if device is blacklisted
      if (shieldStatus.blacklistedDevices > 0) {
        // Check if this specific device is blacklisted
        // (You'll need to expose a method in commandShield to check this)
        const isBlacklisted = commandShield.isDeviceBlacklisted(device.id);
        if (isBlacklisted) {
          logger.addLog('warning', `⛔ Rules blocked - device ${device.name} is blacklisted`);
          return;
        }
      }

      // Check if rules are enabled for this device
      if (!device.rulesEnabled || !device.rules || device.rules.length === 0) {
        return;
      }

      // ✅ Now safe to evaluate rules
      for (const rule of device.rules) {
        if (!rule.enabled) continue;

        let triggered = false;
        for (const trigger of rule.triggers) {
          if (trigger.type === 'sensor_value' && sensorType && value !== undefined) {
            if (trigger.condition && trigger.condition.match(/^([><=]+)(\d+\.?\d*)$/)) {
              const [, op, thresh] = trigger.condition.match(/^([><=]+)(\d+\.?\d*)$/)!;
              const numThresh = parseFloat(thresh);

              switch (op) {
                case '>': triggered = value > numThresh; break;
                case '<': triggered = value < numThresh; break;
                case '>=': triggered = value >= numThresh; break;
                case '<=': triggered = value <= numThresh; break;
                case '==': triggered = value === numThresh; break;
              }
            }
          }
        }

        if (triggered) {
          logger.addLog('info', `🔥 Rule "${rule.name}" triggered on ${device.name}`);

          // Execute each action (these already go through shield)
          for (const action of rule.actions) {
            await this.executeAction(device, action, { sensorType, value });
          }
        }
      }
    }
  // ✅ Rules management (no shield needed - just config changes)
  handleToggleRules(deviceId: string, enabled: boolean): void {
    deviceService.updateDevice(deviceId, {
      rulesEnabled: enabled,
      ...(enabled ? {} : { activeRulesCount: 0 })
    });

    const device = deviceService.getDevice(deviceId);
    if (device) {
      logger.addLog('info', `Rules ${enabled ? 'enabled' : 'disabled'} for ${device.name}`);

      if (enabled) {
        notificationService.info(`📜 Rules enabled for ${device.name}`, 2500);
      } else {
        notificationService.warning(`📜 Rules disabled for ${device.name}`, 2500);
      }
    }

    this.onStateChange();
  }

  // ✅ Script management (no shield needed - just config changes)
  handleToggleScript(deviceId: string, enabled: boolean): void {
    const device = deviceService.getDevice(deviceId);
    if (!device) return;

    if (enabled && device.rulesEnabled) {
      this.showError('⚠️ Cannot enable Scripting while Rules are active. Disable Rules first.');
      notificationService.error('⚠️ Scripting and Rules cannot be enabled simultaneously', 4000);
      return;
    }

    deviceService.updateDevice(deviceId, { scriptEnabled: enabled });

    if (enabled) {
      logger.addLog('info', `🔧 Scripting enabled for ${device.name}`);
      notificationService.warning('⚠️ Scripting requires tasmota32-scripting.bin firmware', 5000);
    } else {
      logger.addLog('info', `🔧 Scripting disabled for ${device.name}`);
      notificationService.info(`🔧 Scripting disabled for ${device.name}`, 2500);
    }

    this.saveState();
    this.onStateChange();
  }

  // ✅ Helper: Delay
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}