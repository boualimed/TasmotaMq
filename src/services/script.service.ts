import { mqttService } from './mqtt-service';
import { deviceService } from './device-service';
import { TasmotaScript, ScriptTemplate } from '../models/script.model';
import { logger } from '../utils/logger.util';
import { notificationService } from './notification.service';
import { commandShield } from './command-shield.service';

export class ScriptService {
  private scripts: Map<string, TasmotaScript> = new Map();
  private listeners: Set<(scripts: TasmotaScript[]) => void> = new Set();

  /**
   * Upload script to Tasmota device line-by-line
   */
  /**async uploadScript(script: TasmotaScript, onProgress?: (progress: number) => void): Promise<void> {
    const device = deviceService.getDevice(script.deviceId);
    if (!device || !device.baseTopic) {
      throw new Error('Device not found or missing baseTopic');
    }

    if (!mqttService.isConnected()) {
      throw new Error('MQTT not connected');
    }

    try {
      // Split script into lines
      const lines = script.scriptText.split('\n').filter(line => line.trim() !== '');
      const totalLines = lines.length;

      logger.addLog('info', `📜 Uploading script "${script.name}" (${totalLines} lines)...`);
      notificationService.info(`📜 Uploading script... 0%`, 0);

      const jsonTopic = `cmnd/${device.baseTopic}/json`;

      // Upload line by line
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let payloadValue = line.trim();

        // For the first line, send as is; for subsequent lines, prepend '>' to append
        if (i > 0) {
          payloadValue = `>${payloadValue}`;
        }

        const payload = JSON.stringify({ script: payloadValue });
        mqttService.publish(jsonTopic, payload);

        // Calculate progress
        const progress = Math.round(((i + 1) / totalLines) * 100);
        if (onProgress) {
          onProgress(progress);
        }

        // Update notification
        notificationService.dismiss('script-upload');
        notificationService.info(`📜 Uploading script... ${progress}%`, 0);

        // Small delay between lines to avoid overwhelming the device
        await this.delay(50);
      }

      // Enable the script (1 means enable and execute)
      const enablePayload = JSON.stringify({ script: "1" });
      mqttService.publish(jsonTopic, enablePayload);

      logger.addLog('success', `✅ Script "${script.name}" uploaded successfully`);
      notificationService.dismiss('script-upload');
      notificationService.success(`✅ Script uploaded successfully!`, 3000);

      // Save script locally
      script.enabled = true;
      this.saveScript(script);

    } catch (error: any) {
      logger.addLog('error', `Failed to upload script: ${error.message}`);
      notificationService.dismiss('script-upload');
      notificationService.error(`Failed to upload script: ${error.message}`, 4000);
      throw error;
    }
  }**/

  /**
   * ✅ FIXED: Upload script with shield protection
   */
  async uploadScript(script: TasmotaScript, onProgress?: (progress: number) => void): Promise<void> {
    // ✅ CRITICAL: Check shield status FIRST
    const shieldStatus = commandShield.getStatus();

    if (shieldStatus.emergencyStopActive) {
      const error = '🚨 Cannot upload script - Emergency Stop is active';
      logger.addLog('error', error);
      notificationService.error(error, 5000);
      throw new Error(error);
    }

    if (shieldStatus.globalPauseActive) {
      const error = '⏸️ Cannot upload script - Commands are paused';
      logger.addLog('warning', error);
      notificationService.warning(error, 4000);
      throw new Error(error);
    }

    // Check device
    const device = deviceService.getDevice(script.deviceId);
    if (!device || !device.baseTopic) {
      throw new Error('Device not found or missing baseTopic');
    }

    // Check if device is blacklisted
    if (commandShield.isDeviceBlacklisted(script.deviceId)) {
      const error = `⛔ Cannot upload script - Device "${device.name}" is blacklisted`;
      logger.addLog('error', error);
      notificationService.error(error, 5000);
      throw new Error(error);
    }

    if (!mqttService.isConnected()) {
      throw new Error('MQTT not connected');
    }

    try {
      // ✅ Now safe to upload script
      const lines = script.scriptText.split('\n').filter(line => line.trim() !== '');
      const totalLines = lines.length;

      logger.addLog('info', `📜 Uploading script "${script.name}" (${totalLines} lines)...`);
      notificationService.info(`📜 Uploading script... 0%`, 0);

      const jsonTopic = `cmnd/${device.baseTopic}/json`;

      // Upload line by line
      for (let i = 0; i < lines.length; i++) {
        // ✅ SAFETY: Check shield status during upload (long operation)
        const currentStatus = commandShield.getStatus();
        if (currentStatus.emergencyStopActive) {
          const error = '🚨 Script upload cancelled - Emergency Stop activated';
          logger.addLog('error', error);
          notificationService.dismiss('script-upload');
          notificationService.error(error, 5000);
          throw new Error(error);
        }

        const line = lines[i];
        let payloadValue = line.trim();

        if (i > 0) {
          payloadValue = `>${payloadValue}`;
        }

        const payload = JSON.stringify({ script: payloadValue });
        mqttService.publish(jsonTopic, payload);

        const progress = Math.round(((i + 1) / totalLines) * 100);
        if (onProgress) {
          onProgress(progress);
        }

        notificationService.dismiss('script-upload');
        notificationService.info(`📜 Uploading script... ${progress}%`, 0);

        await this.delay(50);
      }

      // Enable the script
      const enablePayload = JSON.stringify({ script: "1" });
      mqttService.publish(jsonTopic, enablePayload);

      logger.addLog('success', `✅ Script "${script.name}" uploaded successfully`);
      notificationService.dismiss('script-upload');
      notificationService.success(`✅ Script uploaded successfully!`, 3000);

      script.enabled = true;
      this.saveScript(script);

    } catch (error: any) {
      logger.addLog('error', `Failed to upload script: ${error.message}`);
      notificationService.dismiss('script-upload');
      notificationService.error(`Failed to upload script: ${error.message}`, 4000);
      throw error;
    }
  }

  /**
   * Delete script from device
   */
  /**async deleteScript(script: TasmotaScript): Promise<void> {
    const device = deviceService.getDevice(script.deviceId);
    if (!device || !device.baseTopic) {
      throw new Error('Device not found or missing baseTopic');
    }

    try {
      // Disable script (0 means disable)
      const jsonTopic = `cmnd/${device.baseTopic}/json`;
      const disablePayload = JSON.stringify({ script: "0" });
      mqttService.publish(jsonTopic, disablePayload);

      // Remove from local storage
      this.scripts.delete(script.id);
      this.notifyListeners();
      this.persistScripts();

      logger.addLog('success', `Script "${script.name}" deleted`);
      notificationService.success('Script deleted successfully', 3000);
    } catch (error: any) {
      logger.addLog('error', `Failed to delete script: ${error.message}`);
      throw error;
    }
  }**/

   /**
   * ✅ FIXED: Delete script with shield protection
   */
   async deleteScript(script: TasmotaScript): Promise<void> {
    // ✅ CRITICAL: Check shield status FIRST
    const shieldStatus = commandShield.getStatus();

    if (shieldStatus.emergencyStopActive) {
      const error = '🚨 Cannot delete script - Emergency Stop is active';
      logger.addLog('error', error);
      notificationService.error(error, 5000);
      throw new Error(error);
    }

    if (shieldStatus.globalPauseActive) {
      const error = '⏸️ Cannot delete script - Commands are paused';
      logger.addLog('warning', error);
      notificationService.warning(error, 4000);
      throw new Error(error);
    }

    const device = deviceService.getDevice(script.deviceId);
    if (!device || !device.baseTopic) {
      throw new Error('Device not found or missing baseTopic');
    }

    // Check if device is blacklisted
    if (commandShield.isDeviceBlacklisted(script.deviceId)) {
      const error = `⛔ Cannot delete script - Device "${device.name}" is blacklisted`;
      logger.addLog('error', error);
      notificationService.error(error, 5000);
      throw new Error(error);
    }

    try {
      // ✅ Now safe to delete script
      const jsonTopic = `cmnd/${device.baseTopic}/json`;
      const disablePayload = JSON.stringify({ script: "0" });
      mqttService.publish(jsonTopic, disablePayload);

      this.scripts.delete(script.id);
      this.notifyListeners();
      this.persistScripts();

      logger.addLog('success', `Script "${script.name}" deleted`);
      notificationService.success('Script deleted successfully', 3000);
    } catch (error: any) {
      logger.addLog('error', `Failed to delete script: ${error.message}`);
      throw error;
    }
  }
  /**
   * Get script templates
   */
  getScriptTemplates(): ScriptTemplate[] {
    return [
      {
        id: 'temp-monitor',
        name: 'Temperature Monitor with Alerts',
        description: 'Monitor temperature and send alerts when thresholds are exceeded',
        category: 'monitoring',
        deviceTypes: ['sensor'],
        complexity: 'beginner',
        sections: [
          {
            type: 'define',
            code: `>D
temp=0
hum=0
high_temp={{highTemp}}
low_temp={{lowTemp}}
alert_sent=0`,
            enabled: true
          },
          {
            type: 'sensor',
            code: `>S
temp=AM2301#Temperature
hum=AM2301#Humidity

if temp>high_temp
then
  if alert_sent==0
  then
    =>publish stat/%topic%/alert "High temperature: "+s(temp)+"°C"
    alert_sent=1
  endif
elsif temp<low_temp
then
  if alert_sent==0
  then
    =>publish stat/%topic%/alert "Low temperature: "+s(temp)+"°C"
    alert_sent=1
  endif
else
  alert_sent=0
endif`,
            enabled: true
          }
        ],
        variables: [
          { key: 'highTemp', label: 'High Temperature Threshold (°C)', type: 'number', default: 30 },
          { key: 'lowTemp', label: 'Low Temperature Threshold (°C)', type: 'number', default: 10 }
        ],
        requirements: ['tasmota32-scripting.bin', 'AM2301 or similar temperature sensor']
      },
      {
        id: 'moving-average',
        name: 'Sensor Moving Average',
        description: 'Calculate and publish moving average of sensor readings',
        category: 'sensor',
        deviceTypes: ['sensor'],
        complexity: 'intermediate',
        sections: [
          {
            type: 'define',
            code: `>D
samples={{samples}}
readings[samples]
idx=0
sum=0
avg=0`,
            enabled: true
          },
          {
            type: 'sensor',
            code: `>S
; Read sensor
temp=AM2301#Temperature

; Store in circular buffer
readings[idx]=temp
idx=(idx+1)%samples

; Calculate average
sum=0
for i 0 samples-1 1
  sum+=readings[i]
next
avg=sum/samples

; Publish average
=>publish stat/%topic%/average %avg%`,
            enabled: true
          }
        ],
        variables: [
          { key: 'samples', label: 'Number of Samples', type: 'number', default: 10 }
        ],
        requirements: ['tasmota32-scripting.bin']
      },
      {
        id: 'dimmer-sunrise',
        name: 'Sunrise Dimmer Effect',
        description: 'Gradually increase dimmer brightness to simulate sunrise',
        category: 'automation',
        deviceTypes: ['dimmer'],
        complexity: 'intermediate',
        sections: [
          {
            type: 'define',
            code: `>D
duration={{duration}}
step_delay=duration*10
current_brightness=0
target_brightness={{maxBrightness}}
sunrise_active=0`,
            enabled: true
          },
          {
            type: 'boot',
            code: `>B
; Initialize at boot
=>Dimmer 0`,
            enabled: true
          },
          {
            type: 'event',
            code: `>E
; Trigger sunrise on MQTT message
if upd[sunrise_active]>0
then
  if sunrise_active==1
  then
    current_brightness=0
    =>Dimmer 0
    =>Power2 ON
  endif
endif

; Gradual increase
if sunrise_active==1
then
  if current_brightness<target_brightness
  then
    current_brightness+=1
    =>Dimmer %current_brightness%
    delay(step_delay)
  else
    sunrise_active=0
  endif
endif`,
            enabled: true
          },
          {
            type: 'mqtt',
            code: `>m
; Listen for sunrise trigger
; Publish to cmnd/device/sunrise with value "1"`,
            enabled: true
          }
        ],
        variables: [
          { key: 'duration', label: 'Duration (seconds)', type: 'number', default: 600 },
          { key: 'maxBrightness', label: 'Maximum Brightness (%)', type: 'number', default: 100 }
        ],
        requirements: ['tasmota32-scripting.bin', 'Dimmer configured on POWER2']
      },
      {
        id: 'web-dashboard',
        name: 'Custom Web Dashboard',
        description: 'Create a custom web interface for device control',
        category: 'web-ui',
        deviceTypes: ['switch', 'dimmer', 'sensor'],
        complexity: 'advanced',
        sections: [
          {
            type: 'define',
            code: `>D
temp=0
status="Unknown"
btn_action=0`,
            enabled: true
          },
          {
            type: 'sensor',
            code: `>S
temp=AM2301#Temperature
if temp>0
then
  status="Online"
else
  status="Offline"
endif`,
            enabled: true
          },
          {
            type: 'web',
            code: `>W
<div style="padding:20px; font-family:Arial">
  <h2 style="color:#3b82f6">{{deviceName}} Dashboard</h2>
  <hr>
  <div style="margin:20px 0">
    <p><strong>Temperature:</strong> <span style="font-size:24px; color:#059669">%temp%</span> °C</p>
    <p><strong>Status:</strong> <span style="color:#3b82f6">%status%</span></p>
  </div>
  <hr>
  <button onclick="la('&btn_action=1')" style="padding:10px 20px; background:#3b82f6; color:white; border:none; border-radius:5px; cursor:pointer">Toggle Power</button>
</div>`,
            enabled: true
          },
          {
            type: 'event',
            code: `>E
if upd[btn_action]>0
then
  =>power1 toggle
  btn_action=0
endif`,
            enabled: true
          }
        ],
        variables: [
          { key: 'deviceName', label: 'Device Display Name', type: 'string', default: 'My Device' }
        ],
        requirements: ['tasmota32-scripting.bin', 'Web interface enabled']
      },
      {
        id: 'http-logger',
        name: 'External HTTP Data Logger',
        description: 'Send sensor data to external API or server',
        category: 'advanced',
        deviceTypes: ['sensor'],
        complexity: 'advanced',
        sections: [
          {
            type: 'define',
            code: `>D
api_url="{{apiUrl}}"
api_key="{{apiKey}}"
send_interval={{interval}}
last_send=0`,
            enabled: true
          },
          {
            type: 'sensor',
            code: `>S
; Read sensor
temp=AM2301#Temperature
hum=AM2301#Humidity

; Check if it's time to send
if (uptime-last_send)>send_interval
then
  ; Build URL with parameters
  url=api_url+"?key="+api_key
  url+="&temp="+s(temp)
  url+="&hum="+s(hum)

  ; Send HTTP GET request
  =>WebQuery GET %url%

  last_send=uptime
  =>publish stat/%topic%/http_sent "Data sent to API"
endif`,
            enabled: true
          }
        ],
        variables: [
          { key: 'apiUrl', label: 'API URL', type: 'string', default: 'https://api.example.com/data' },
          { key: 'apiKey', label: 'API Key', type: 'string', default: 'YOUR_API_KEY' },
          { key: 'interval', label: 'Send Interval (seconds)', type: 'number', default: 300 }
        ],
        requirements: ['tasmota32-scripting.bin', 'Internet connectivity']
      }
    ];
  }

  /**
   * Apply template to create script
   */
  applyTemplate(template: ScriptTemplate, deviceId: string, variables: Record<string, any>): TasmotaScript {
    const device = deviceService.getDevice(deviceId);
    const deviceName = device?.name || 'Unknown Device';

    // Build script text from sections
    let scriptText = '';
    template.sections.forEach(section => {
      if (section.enabled) {
        let code = section.code;

        // Replace variables
        Object.entries(variables).forEach(([key, value]) => {
          code = code.replace(new RegExp(`{{${key}}}`, 'g'), value.toString());
        });

        scriptText += code + '\n\n';
      }
    });

    return {
      id: `script_${Date.now()}`,
      deviceId,
      deviceName,
      name: template.name,
      description: template.description,
      enabled: false,
      sections: template.sections,
      scriptText: scriptText.trim(),
      isTemplate: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Build script from sections
   */
  buildScriptText(sections: any[]): string {
    return sections
      .filter(s => s.enabled)
      .map(s => s.code)
      .join('\n\n');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private saveScript(script: TasmotaScript): void {
    this.scripts.set(script.id, script);
    this.notifyListeners();
    this.persistScripts();
  }

  getScriptForDevice(deviceId: string): TasmotaScript | undefined {
    return Array.from(this.scripts.values()).find(s => s.deviceId === deviceId);
  }

  getAllScripts(): TasmotaScript[] {
    return Array.from(this.scripts.values());
  }

  subscribe(listener: (scripts: TasmotaScript[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const allScripts = this.getAllScripts();
    this.listeners.forEach(listener => listener(allScripts));
  }

  private persistScripts(): void {
    try {
      const scriptsArray = this.getAllScripts();
      localStorage.setItem('tasmota_scripts', JSON.stringify(scriptsArray));
    } catch (error) {
      console.error('Failed to persist scripts:', error);
    }
  }

  loadScripts(): void {
    try {
      const stored = localStorage.getItem('tasmota_scripts');
      if (stored) {
        const scriptsArray: TasmotaScript[] = JSON.parse(stored);
        scriptsArray.forEach(script => {
          this.scripts.set(script.id, script);
        });
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Failed to load scripts:', error);
    }
  }
}

// Singleton
export const scriptService = new ScriptService();