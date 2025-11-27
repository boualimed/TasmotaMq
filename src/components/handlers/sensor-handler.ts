// handlers/sensor-handler.ts
// Sensor-specific helpers (parsing, storing)

import { extractJsonValue } from '../../utils/json-parser.util';
//import { deviceService } from '../../services/device-service';
import { indexedDBService } from '../../services/indexeddb.service';
import { logger } from '../../utils/logger.util';

export class SensorHandler {
  parseSensorPayload(device: any, payload: any): any {
    if (device.jsonPath) {
      const extracted = extractJsonValue(payload, device.jsonPath);
      return extracted !== null ? extracted : payload;
    }
    return payload;
  }

  buildSensorUpdates(device: any, sensorData: any): Partial<any> {
    const updates: Partial<any> = { sensorData, lastSeen: new Date() };
    if (!device.useAutoDiscovery || !device.lwtTopic) {
      updates.isConnected = true;
    } else {
      // delegate to device monitor service to mark activity if available
      try { require('../../services/device-monitor.service').deviceMonitorService.markDeviceActivity(device); } catch {}
    }
    return updates;
  }

  async persistSensorData(deviceId: string, deviceName: string, topic: string, data: any): Promise<void> {
    try {
      await indexedDBService.storeSensorData(deviceId, deviceName, topic, data);
    } catch (err: any) {
      logger.addLog('warning', `Failed to persist sensor data for ${deviceName}: ${err.message || err}`);
    }
  }
}
