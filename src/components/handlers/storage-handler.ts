// handlers/storage-handler.ts
// Data Persistence (IndexedDB, Firebase, Supabase)

import { indexedDBService } from '../../services/indexeddb.service';
import { firebaseService } from '../../services/firebase.service';
import { supabaseService } from '../../services/supabase.service';
import { storageService } from '../../services/storage-service';
import { authService } from '../../services/auth.service';
import { notificationService } from '../../services/notification.service';
import { logger } from '../../utils/logger.util';
import { Device } from '../../models/device.model';
import { MqttSettings } from '../../models/mqtt-settings.model';
import { userSessionManager } from '../../services/user-session.manager';

export class StorageHandler {
  constructor(
    private onStateChange: () => void
  ) {}

  // =============================================================================
  // IndexedDB Operations
  // =============================================================================

  handleToggleIndexedDB(enabled: boolean): void {
    indexedDBService.updateSettings({ enabled });

    if (enabled) {
      notificationService.info('💾 Sensor data logging will start on next reading', 3000);
    } else {
      notificationService.warning('⚠️ Sensor data logging stopped', 3000);
    }

    this.onStateChange();
  }

  getIndexedDBSettings() {
    return indexedDBService.getSettings();
  }

  handleToggleAutoCleanup(enabled: boolean): void {
    indexedDBService.updateSettings({ autoCleanup: enabled });
    notificationService.info(`🧹 Auto-cleanup ${enabled ? 'enabled' : 'disabled'}`, 2500);
    this.onStateChange();
  }

  handleUpdateMaxRecords(maxRecords: number): void {
    if (maxRecords < 100 || maxRecords > 50000) {
      notificationService.error('❌ Max records must be between 100 and 50,000', 3000);
      return;
    }

    indexedDBService.updateSettings({ maxRecordsPerDevice: maxRecords });
    notificationService.success('✅ Max records updated', 2500);
    this.onStateChange();
  }

  async handleClearOldData(hours: number): Promise<void> {
    const timeLabel = hours < 24 ? `${hours} hours` : `${hours / 24} days`;

    if (!confirm(`Delete all sensor data older than ${timeLabel}?`)) {
      return;
    }

    try {
      const deletedCount = await indexedDBService.clearDataOlderThan(hours);
      notificationService.success(`✅ Deleted ${deletedCount} old records`, 3000);
    } catch (error: any) {
      notificationService.error(`❌ Failed to clear data: ${error.message}`, 4000);
    }

    this.onStateChange();
  }

  async handleClearAllSensorData(): Promise<void> {
    if (!confirm('⚠️ Delete ALL sensor data? This cannot be undone!')) {
      return;
    }

    try {
      await indexedDBService.clearAllData();
      notificationService.success('✅ All sensor data deleted', 3000);
    } catch (error: any) {
      notificationService.error(`❌ Failed to clear data: ${error.message}`, 4000);
    }

    this.onStateChange();
  }

  async getDatabaseSize(): Promise<string> {
    try {
      return await indexedDBService.getFormattedDatabaseSize();
    } catch (error) {
      return 'Unknown';
    }
  }

  async handleExportSensorData(): Promise<void> {
    try {
      const data = await indexedDBService.exportData();

      if (data.length === 0) {
        notificationService.warning('⚠️ No sensor data to export', 3000);
        return;
      }

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sensor-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      notificationService.success(`✅ Exported ${data.length} records`, 3000);
    } catch (error: any) {
      notificationService.error(`❌ Export failed: ${error.message}`, 4000);
    }
  }

  async handleImportSensorData(file: File): Promise<void> {
    try {
      const text = await file.text();
      const records = JSON.parse(text);

      if (!Array.isArray(records)) {
        throw new Error('Invalid data format');
      }

      await indexedDBService.importData(records);
      notificationService.success(`✅ Imported ${records.length} records`, 3000);
    } catch (error: any) {
      notificationService.error(`❌ Import failed: ${error.message}`, 3000);
    }

    this.onStateChange();
  }

  async storeSensorDataToIndexedDB(
    device: Device,
    topic: string,
    data: any
  ): Promise<void> {
    try {
      await indexedDBService.storeSensorData(
        device.id,
        device.name,
        topic,
        data
      );
    } catch (error: any) {
      // Silent fail - don't interrupt main flow
      console.error('Failed to store sensor data:', error);
    }
  }

  async getSensorStatistics(deviceId: string): Promise<{
    count: number;
    oldest: Date | null;
    newest: Date | null;
  }> {
    try {
      return await indexedDBService.getStatistics(deviceId);
    } catch (error: any) {
      logger.addLog('error', `Failed to get statistics: ${error.message}`);
      return { count: 0, oldest: null, newest: null };
    }
  }

  // =============================================================================
  // Firebase Sync
  // =============================================================================

  async syncToFirebase(devices: Device[]): Promise<void> {
    if (!firebaseService.isEnabled()) return;

    const user = authService.getCurrentUser();
    if (!user) return;

    const result = await firebaseService.syncDevices(user.id, devices);
    if (!result.success) {
      console.error('Firebase sync failed:', result.error);
    }
  }

  async syncMqttSettingsToFirebase(mqttSettings: MqttSettings): Promise<void> {
    if (!firebaseService.isEnabled()) return;

    const user = authService.getCurrentUser();
    if (!user) return;

    const result = await firebaseService.syncMqttSettings(user.id, mqttSettings);
    if (!result.success) {
      console.error('Firebase MQTT sync failed:', result.error);
    }
  }

  // =============================================================================
  // Supabase Integration
  // =============================================================================

  queueMqttMessageToSupabase(
    device: Device,
    topic: string,
    payload: any
  ): void {
    if (!supabaseService.isEnabled()) return;

    const user = authService.getCurrentUser();
    if (!user) return;

    supabaseService.queueMqttMessage(user.id, device.id, device.name, topic, payload);
  }

  recordDeviceHistoryToSupabase(
    deviceId: string,
    status: string,
    previousState: boolean,
    currentState: boolean
  ): void {
    if (!supabaseService.isEnabled()) return;

    const user = authService.getCurrentUser();
    if (!user) return;

    const mappedStatus = ((): "online" | "offline" | "on" | "off" => {
      const s = String(status).toLowerCase();
      if (s === 'online' || s === 'offline' || s === 'on' || s === 'off') {
        return s as "online" | "offline" | "on" | "off";
      }
      if (s === 'connected' || s === 'active') return 'online';
      if (s === 'disconnected' || s === 'idle' || s === 'inactive') return 'offline';
      if (s === 'true') return 'on';
      if (s === 'false') return 'off';
      return currentState ? 'on' : 'off';
    })();

    supabaseService.recordDeviceHistory(user.id, deviceId, mappedStatus, previousState, currentState);
  }

  queueDeviceStateToSupabase(device: Device): void {
    if (!supabaseService.isEnabled()) return;

    const user = authService.getCurrentUser();
    if (!user) return;

    supabaseService.queueDeviceState(user.id, device);
  }

  // =============================================================================
  // Local Storage
  // =============================================================================

  saveState(mqttSettings: MqttSettings, devices: Device[]): void {
    const user = authService.getCurrentUser();
    if (!user) {
      console.warn('Cannot save state: No authenticated user');
      return;
    }

    storageService.save({
      mqttSettings,
      devices
    }, user.id);

    // Update user session
    this.updateUserSession(mqttSettings, devices);
  }

  loadState(): { mqttSettings?: MqttSettings; devices?: Device[] } | null {
    const user = authService.getCurrentUser();
    if (!user) {
      logger.addLog('error', 'Cannot load state: No authenticated user');
      return null;
    }

    // Try to load from session first
    const session = userSessionManager.getCurrentSession();
    if (session && session.userId === user.id) {
      console.log('✅ Loading from session');
      return {
        mqttSettings: session.mqttSettings,
        devices: session.devices.map((d: Device) => ({
          ...d,
          isEnabled: d.isEnabled !== undefined ? d.isEnabled : true
        }))
      };

    }

    // Fallback to localStorage
    const savedState = storageService.load(user.id);
    if (!savedState) {
      console.log('ℹ️ No saved state found');
      return null;
    }

    return {
      mqttSettings: savedState.mqttSettings,
      devices: savedState.devices.map((d: Device) => ({
        ...d,
        isEnabled: d.isEnabled ?? true
      }))
    };
  }

  // =============================================================================
  // Export/Import Configuration
  // =============================================================================

  handleExportData(): void {
    const user = authService.getCurrentUser();
    if (!user) {
      notificationService.warning('Please log in to export data', 3000);
      return;
    }

    // Include session data in export
    const sessionData = userSessionManager.exportUserData();
    const state = storageService.load(user.id);

    const exportData = {
      user: {
        id: user.id,
        username: user.username
      },
      session: JSON.parse(sessionData),
      state: state,
      exportedAt: new Date().toISOString()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tasmota-full-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    notificationService.success('✅ Full configuration exported!', 3000);
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private updateUserSession(mqttSettings: MqttSettings, devices: Device[]): void {
    const session = userSessionManager.getCurrentSession();
    if (!session) return;

    userSessionManager.updateSession({
      devices,
      mqttSettings,
      lastAccess: new Date()
    });
  }
}