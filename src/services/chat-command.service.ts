import { deviceService } from './device-service';
import { mqttService } from './mqtt-service';
import { ollamaAIService } from './ollama-ai.service';
import { commandShield, CommandRequest, CommandPriority } from './command-shield.service';
import { shieldHandler } from '../components/handlers/shield-handler';
import { logger } from '../utils/logger.util';
import { Device } from '../models/device.model';

export interface CommandResponse {
  success: boolean;
  message: string;
  device?: Device;
  action?: string;
  quotaExceeded?: boolean;
  upgradeRequired?: string;
  shieldBlocked?: boolean;
  safetyScore?: number;
}

export class ChatCommandService {
  /**
   * Process natural language command
   */
  async processCommand(userInput: string): Promise<CommandResponse> {
    if (!ollamaAIService.getConfig().enabled) {
      return {
        success: false,
        message: '🤖 AI service is not enabled. Please enable it in settings.'
      };
    }

    if (!mqttService.isConnected()) {
      return {
        success: false,
        message: '🔌 MQTT broker is not connected. Please connect first.'
      };
    }

    // 🛡️ CRITICAL: Check if shield allows command execution
    if (!shieldHandler.canExecuteRules()) {
      const status = shieldHandler.getStatus();
      if (status.emergencyStopActive) {
        return {
          success: false,
          message: '🚨 EMERGENCY STOP ACTIVE - All commands blocked',
          shieldBlocked: true
        };
      }
      if (status.globalPauseActive) {
        const remaining = Math.ceil((status.globalPauseUntil - Date.now()) / 1000);
        return {
          success: false,
          message: `⏸️ Commands paused for ${remaining}s`,
          shieldBlocked: true
        };
      }
    }

    try {
      // Get all devices for context
      const devices = deviceService.getDevices();

      if (devices.length === 0) {
        return {
          success: false,
          message: '📱 No devices configured. Please add devices first.'
        };
      }

      // Query Ollama to parse the intent
      const intent = await this.parseIntent(userInput, devices);

      if (!intent.success) {
        return {
          success: false,
          message: intent.error || '❌ Could not understand the command.'
        };
      }

      // 🛡️ Execute the command through shield validation
      return await this.executeCommandWithShield(intent, userInput);

    } catch (error: any) {
      logger.addLog('error', `Chat command error: ${error.message}`);
      return {
        success: false,
        message: `❌ Error: ${error.message}`
      };
    }
  }

  /**
   * Parse user intent using Ollama
   */
  private async parseIntent(userInput: string, devices: Device[]): Promise<any> {
    // Build device list for context
    const deviceList = devices.map(d => ({
      id: d.id,
      name: d.name,
      type: d.type,
      isOn: d.isOn,
      dimmerValue: d.dimmerValue,
      shutterPosition: d.shutterPosition,
      sensorData: d.sensorData,
      isConnected: d.isConnected,
      isEnabled: d.isEnabled
    }));

    const prompt = `You are a smart home assistant. Parse the user's command and extract the intent.

Available devices:
${JSON.stringify(deviceList, null, 2)}

User command: "${userInput}"

Task: Analyze the command and respond with ONLY a valid JSON object (no markdown, no code blocks) in this exact format:
{
  "success": true/false,
  "action": "turn_on" | "turn_off" | "set_dimmer" | "set_shutter" | "get_status" | "query_sensor",
  "deviceId": "device ID from the list above",
  "deviceName": "device name",
  "value": number (for dimmer 0-100 or shutter 0-100, omit for on/off),
  "error": "error message if success is false"
}

Examples:
- "Turn off the living room light" → {"success": true, "action": "turn_off", "deviceId": "123", "deviceName": "living room light"}
- "Set bedroom dimmer to 75%" → {"success": true, "action": "set_dimmer", "deviceId": "456", "deviceName": "bedroom dimmer", "value": 75}
- "Open kitchen blinds" → {"success": true, "action": "set_shutter", "deviceId": "789", "deviceName": "kitchen blinds", "value": 100}
- "What's the temperature?" → {"success": true, "action": "query_sensor", "deviceId": "101", "deviceName": "temperature sensor"}

Important rules:
1. Match device names FLEXIBLY (e.g., "living room" matches "Living Room Light")
2. If no exact match, find the closest matching device
3. If the command is ambiguous, set success: false with a helpful error
4. ONLY output valid JSON, nothing else`;

    try {
      const response = await this.queryOllama(prompt);

      // Clean response (remove markdown code blocks if present)
      let cleanResponse = response.trim();
      cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const intent = JSON.parse(cleanResponse);
      return intent;
    } catch (error: any) {
      logger.addLog('error', `Intent parsing error: ${error.message}`);
      return {
        success: false,
        error: 'Failed to understand the command. Please try rephrasing.'
      };
    }
  }

  /**
   * 🛡️ Execute command WITH shield validation and protection
   * Uses the shield's executeCommand() method which handles all validation
   */
  private async executeCommandWithShield(intent: any, originalPrompt: string): Promise<CommandResponse> {
    const device = deviceService.getDevice(intent.deviceId);

    if (!device) {
      return {
        success: false,
        message: `❌ Device "${intent.deviceName}" not found.`
      };
    }

    // 🛡️ Check if device is blacklisted
    if (!shieldHandler.canDeviceExecuteRules(device.id)) {
      return {
        success: false,
        message: `🛑 Device "${device.name}" is blacklisted and cannot execute commands`,
        device,
        shieldBlocked: true
      };
    }

    if (!device.isConnected) {
      return {
        success: false,
        message: `⚠️ Device "${device.name}" is offline.`,
        device
      };
    }

    if (device.isEnabled === false) {
      return {
        success: false,
        message: `🔕 Device "${device.name}" is disabled.`,
        device
      };
    }

    // Handle read-only operations (no shield needed)
    if (intent.action === 'query_sensor' || intent.action === 'get_status') {
      return await this.executeReadOnlyCommand(intent, device);
    }

    // 🛡️ Map AI intent to shield command type
    const commandMapping = this.mapIntentToShieldCommand(intent);

    if (!commandMapping) {
      return {
        success: false,
        message: `❌ Cannot perform "${intent.action}" on ${device.name} (type: ${device.type})`,
        device
      };
    }

    try {
      console.log('🛡️ [ChatService] Executing through shield:', {
        device: device.name,
        commandType: commandMapping.commandType,
        payload: commandMapping.payload,
        reason: `AI: ${originalPrompt}`
      });

      // 🛡️ CRITICAL: Execute through shield service
      // This handles ALL validation, rate limiting, safety checks, and audit logging
      const result = await commandShield.executeCommand(
        device,
        commandMapping.commandType,
        commandMapping.payload,
        {
          priority: 'normal' as CommandPriority,
          requestedBy: 'ai-chat',
          reason: `AI: ${originalPrompt}`,
          skipConfirmation: false // Let shield decide if confirmation needed
        }
      );

      if (!result.success) {
        // Shield blocked the command
        logger.addLog('warning', `🛡️ Shield blocked AI command: ${result.error}`);

        return {
          success: false,
          message: `🛡️ ${result.error}`,
          device,
          shieldBlocked: true
        };
      }

      // Command approved and executed by shield
      const successMessage = this.buildSuccessMessage(intent, device);
      logger.addLog('success', `🛡️ AI command executed: ${successMessage}`);

      // Get safety score from audit log
      const history = commandShield.getCommandHistory(device.id, 1);
      const lastCommand = history[history.length - 1];
      const safetyScore = lastCommand?.validation?.safetyScore;

      return {
        success: true,
        message: successMessage,
        device,
        action: intent.action,
        safetyScore
      };

    } catch (error: any) {
      logger.addLog('error', `Shield execution error: ${error.message}`);
      return {
        success: false,
        message: `❌ Failed to execute command: ${error.message}`,
        device
      };
    }
  }

  /**
   * Map AI intent to shield command format
   */
  private mapIntentToShieldCommand(intent: any): { commandType: any; payload: any } | null {
    const { action, value } = intent;

    switch (action) {
      case 'turn_on':
        return {
          commandType: 'switch.on',
          payload: null
        };

      case 'turn_off':
        return {
          commandType: 'switch.off',
          payload: null
        };

      case 'set_dimmer':
        return {
          commandType: 'dimmer.set',
          payload: Math.max(0, Math.min(100, value))
        };

      case 'set_shutter':
        return {
          commandType: 'shutter.position',
          payload: Math.max(0, Math.min(100, value))
        };

      default:
        return null;
    }
  }

  /**
   * Build user-friendly success message
   */
  private buildSuccessMessage(intent: any, device: Device): string {
    switch (intent.action) {
      case 'turn_on':
        return `✅ Turned ON ${device.name}`;

      case 'turn_off':
        return `✅ Turned OFF ${device.name}`;

      case 'set_dimmer':
        return `✅ Set ${device.name} to ${intent.value}%`;

      case 'set_shutter':
        const state = intent.value === 0 ? 'closed' :
                     intent.value === 100 ? 'open' :
                     `${intent.value}% open`;
        return `✅ Set ${device.name} to ${state}`;

      default:
        return `✅ Command completed`;
    }
  }

  /**
   * Execute read-only commands (no shield validation needed)
   */
  private async executeReadOnlyCommand(intent: any, device: Device): Promise<CommandResponse> {
    try {
      switch (intent.action) {
        case 'query_sensor':
          if (device.type === 'sensor' && device.sensorData) {
            const dataStr = JSON.stringify(device.sensorData, null, 2);
            return {
              success: true,
              message: `📊 ${device.name} data:\n${dataStr}`,
              device,
              action: 'query_sensor'
            };
          } else {
            return {
              success: false,
              message: `❌ No sensor data available for ${device.name}`,
              device
            };
          }

        case 'get_status':
          let status = `📱 ${device.name}\n`;
          status += `Type: ${device.type}\n`;
          status += `Status: ${device.isConnected ? '🟢 Online' : '🔴 Offline'}\n`;

          if (device.type === 'switch' || device.type === 'dimmer') {
            status += `Power: ${device.isOn ? 'ON' : 'OFF'}\n`;
          }
          if (device.type === 'dimmer' && device.dimmerValue !== undefined) {
            status += `Brightness: ${device.dimmerValue}%\n`;
          }
          if (device.type === 'shutter' && device.shutterPosition !== undefined) {
            status += `Position: ${device.shutterPosition}%\n`;
          }
          if (device.type === 'sensor' && device.sensorData) {
            status += `Data: ${JSON.stringify(device.sensorData)}`;
          }

          return {
            success: true,
            message: status,
            device,
            action: 'get_status'
          };

        default:
          return {
            success: false,
            message: `❌ Unknown read-only command: ${intent.action}`,
            device
          };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `❌ Error: ${error.message}`,
        device
      };
    }
  }

  /**
   * Query Ollama API
   */
  private async queryOllama(prompt: string): Promise<string> {
    const config = ollamaAIService.getConfig();
    const url = `http://${config.host}:${config.port}/api/generate`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        prompt: prompt,
        stream: false,
        temperature: 0.1  // Low temperature for more consistent parsing
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  }
}

// Singleton
export const chatService = new ChatCommandService();