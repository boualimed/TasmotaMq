// indexeddb.service.ts
// Enhanced IndexedDB Service with enable/disable and date-based clearing

//import { Device } from '../models/device.model';
import { logger } from '../utils/logger.util';
import { notificationService } from './notification.service';

const DB_NAME = 'TasmotaSensorDB';
const DB_VERSION = 1;
const STORE_NAME = 'sensorData';
const MAX_RECORDS_PER_DEVICE = 10000;
const STORAGE_KEY = 'indexeddb_settings';

export interface SensorDataRecord {
  id?: number;
  deviceId: string;
  deviceName: string;
  timestamp: number;
  data: any;
  topic: string;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface QueryOptions {
  deviceId?: string;
  timeRange?: TimeRange;
  limit?: number;
  offset?: number;
}

export interface IndexedDBSettings {
  enabled: boolean;
  autoCleanup: boolean;
  maxRecordsPerDevice: number;
}

const DEFAULT_SETTINGS: IndexedDBSettings = {
  enabled: true,
  autoCleanup: true,
  maxRecordsPerDevice: MAX_RECORDS_PER_DEVICE
};

export class IndexedDBService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private settings: IndexedDBSettings = { ...DEFAULT_SETTINGS };
  private statusListeners: Set<(enabled: boolean) => void> = new Set();

  constructor() {
    this.loadSettings();
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Failed to load IndexedDB settings:', error);
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save IndexedDB settings:', error);
    }
  }

  /**
   * Get current settings
   */
  getSettings(): IndexedDBSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  updateSettings(updates: Partial<IndexedDBSettings>): void {
    const wasEnabled = this.settings.enabled;
    this.settings = { ...this.settings, ...updates };
    this.saveSettings();

    // Handle enable/disable state change
    if (wasEnabled !== this.settings.enabled) {
      this.notifyStatusChange(this.settings.enabled);

      if (this.settings.enabled) {
        logger.addLog('success', '💾 IndexedDB enabled');
        notificationService.success('💾 Sensor data logging enabled', 3000);
        this.initialize().catch(error => {
          logger.addLog('error', `Failed to initialize IndexedDB: ${error.message}`);
        });
      } else {
        logger.addLog('info', '💾 IndexedDB disabled');
        notificationService.info('💾 Sensor data logging disabled', 3000);
        this.close();
      }
    }

    logger.addLog('info', '⚙️ IndexedDB settings updated');
  }

  /**
   * Check if IndexedDB is enabled
   */
  isEnabled(): boolean {
    return this.settings.enabled;
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: (enabled: boolean) => void): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  /**
   * Notify status change listeners
   */
  private notifyStatusChange(enabled: boolean): void {
    this.statusListeners.forEach(callback => {
      try {
        callback(enabled);
      } catch (error) {
        console.error('Error in IndexedDB status listener:', error);
      }
    });
  }

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    if (!this.settings.enabled) {
      logger.addLog('info', '💾 IndexedDB is disabled, skipping initialization');
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        const error = new Error(`Failed to open IndexedDB: ${request.error?.message}`);
        logger.addLog('error', error.message);
        notificationService.error('❌ Failed to initialize sensor data storage', 4000);
        reject(error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        logger.addLog('success', '💾 IndexedDB initialized successfully');
        notificationService.success('✅ Sensor data logging ready', 3000);
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createSchema(db);
      };
    });

    return this.initPromise;
  }

  /**
   * Create database schema
   */
  private createSchema(db: IDBDatabase): void {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      const store = db.createObjectStore(STORE_NAME, {
        keyPath: 'id',
        autoIncrement: true
      });

      store.createIndex('deviceId', 'deviceId', { unique: false });
      store.createIndex('timestamp', 'timestamp', { unique: false });
      store.createIndex('deviceId_timestamp', ['deviceId', 'timestamp'], { unique: false });

      logger.addLog('info', '🗄️ IndexedDB schema created');
    }
  }

  /**
   * Store sensor data
   */
  async storeSensorData(
    deviceId: string,
    deviceName: string,
    topic: string,
    data: any
  ): Promise<void> {
    if (!this.settings.enabled) {
      return; // Silently skip if disabled
    }

    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const record: SensorDataRecord = {
      deviceId,
      deviceName,
      timestamp: Date.now(),
      data,
      topic
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(record);

      request.onsuccess = () => {
        if (this.settings.autoCleanup) {
          this.cleanupOldRecords(deviceId);
        }
        resolve();
      };

      request.onerror = () => {
        const error = new Error(`Failed to store sensor data: ${request.error?.message}`);
        logger.addLog('error', error.message);
        reject(error);
      };
    });
  }

  /**
   * Get sensor data with query options
   */
  async getSensorData(options: QueryOptions = {}): Promise<SensorDataRecord[]> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      let request: IDBRequest;

      if (options.deviceId && options.timeRange) {
        const index = store.index('deviceId_timestamp');
        const range = IDBKeyRange.bound(
          [options.deviceId, options.timeRange.start.getTime()],
          [options.deviceId, options.timeRange.end.getTime()]
        );
        request = index.getAll(range, options.limit);
      } else if (options.deviceId) {
        const index = store.index('deviceId');
        request = index.getAll(IDBKeyRange.only(options.deviceId), options.limit);
      } else if (options.timeRange) {
        const index = store.index('timestamp');
        const range = IDBKeyRange.bound(
          options.timeRange.start.getTime(),
          options.timeRange.end.getTime()
        );
        request = index.getAll(range, options.limit);
      } else {
        request = store.getAll(undefined, options.limit);
      }

      request.onsuccess = () => {
        resolve(request.result as SensorDataRecord[]);
      };

      request.onerror = () => {
        reject(new Error(`Failed to query sensor data: ${request.error?.message}`));
      };
    });
  }

  /**
   * Get latest sensor reading for a device
   */
  async getLatestReading(deviceId: string): Promise<SensorDataRecord | null> {
    const records = await this.getSensorData({
      deviceId,
      limit: 1
    });

    return records.length > 0 ? records[records.length - 1] : null;
  }

  /**
   * Get sensor data statistics
   */
  async getStatistics(deviceId: string, timeRange?: TimeRange): Promise<{
    count: number;
    oldest: Date | null;
    newest: Date | null;
  }> {
    const records = await this.getSensorData({
      deviceId,
      timeRange
    });

    if (records.length === 0) {
      return { count: 0, oldest: null, newest: null };
    }

    const timestamps = records.map(r => r.timestamp);
    return {
      count: records.length,
      oldest: new Date(Math.min(...timestamps)),
      newest: new Date(Math.max(...timestamps))
    };
  }

  /**
   * Delete sensor data for a device
   */
  async deleteSensorData(deviceId: string): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('deviceId');
      const request = index.openCursor(IDBKeyRange.only(deviceId));

      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          logger.addLog('info', `🗑️ Deleted ${deletedCount} records for device ${deviceId}`);
          notificationService.success(`✅ Deleted ${deletedCount} records`, 2500);
          resolve();
        }
      };

      request.onerror = () => {
        reject(new Error(`Failed to delete sensor data: ${request.error?.message}`));
      };
    });
  }

  /**
   * Clear data older than specified time period
   */
  async clearDataOlderThan(hours: number): Promise<number> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoffTime);
      const request = index.openCursor(range);

      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          const timeLabel = hours < 24 ? `${hours}h` : `${hours / 24}d`;
          logger.addLog('success', `🧹 Cleared ${deletedCount} records older than ${timeLabel}`);
          notificationService.success(`✅ Cleared ${deletedCount} old records`, 3000);
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        const error = new Error(`Failed to clear old data: ${request.error?.message}`);
        logger.addLog('error', error.message);
        notificationService.error('❌ Failed to clear old data', 3000);
        reject(error);
      };
    });
  }

  /**
   * Clear data within a date range
   */
  async clearDataInRange(startDate: Date, endDate: Date): Promise<number> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const range = IDBKeyRange.bound(startDate.getTime(), endDate.getTime());
      const request = index.openCursor(range);

      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          logger.addLog('success', `🧹 Cleared ${deletedCount} records in date range`);
          notificationService.success(`✅ Cleared ${deletedCount} records`, 3000);
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        const error = new Error(`Failed to clear data range: ${request.error?.message}`);
        logger.addLog('error', error.message);
        notificationService.error('❌ Failed to clear data range', 3000);
        reject(error);
      };
    });
  }

  /**
   * Clean up old records for a device (keep only MAX_RECORDS_PER_DEVICE)
   */
  private async cleanupOldRecords(deviceId: string): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('deviceId');
      const request = index.openCursor(IDBKeyRange.only(deviceId));

      const records: { key: IDBValidKey; timestamp: number }[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          records.push({
            key: cursor.primaryKey,
            timestamp: cursor.value.timestamp
          });
          cursor.continue();
        } else {
          const maxRecords = this.settings.maxRecordsPerDevice;
          if (records.length > maxRecords) {
            records.sort((a, b) => a.timestamp - b.timestamp);
            const toDelete = records.slice(0, records.length - maxRecords);

            toDelete.forEach(record => {
              store.delete(record.key);
            });

            logger.addLog('info', `🧹 Auto-cleaned ${toDelete.length} old records for device ${deviceId}`);
          }
        }
      };
    } catch (error) {
      console.error('Failed to cleanup old records:', error);
    }
  }

  /**
   * Clear all sensor data
   */
  async clearAllData(): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        logger.addLog('success', '🗑️ Cleared all sensor data');
        notificationService.success('✅ All sensor data cleared', 3000);
        resolve();
      };

      request.onerror = () => {
        const error = new Error(`Failed to clear data: ${request.error?.message}`);
        logger.addLog('error', error.message);
        notificationService.error('❌ Failed to clear all data', 3000);
        reject(error);
      };
    });
  }

  /**
   * Get database size estimate
   */
  async getDatabaseSize(): Promise<number> {
    if (!navigator.storage || !navigator.storage.estimate) {
      return 0;
    }

    const estimate = await navigator.storage.estimate();
    return estimate.usage || 0;
  }

  /**
   * Get human-readable database size
   */
  async getFormattedDatabaseSize(): Promise<string> {
    const bytes = await this.getDatabaseSize();

    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
  }

  /**
   * Export data as JSON
   */
  async exportData(deviceId?: string): Promise<SensorDataRecord[]> {
    return this.getSensorData({ deviceId });
  }

  /**
   * Import data from JSON
   */
  async importData(records: SensorDataRecord[]): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      let completed = 0;
      const total = records.length;

      records.forEach(record => {
        const request = store.add(record);
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            logger.addLog('success', `✅ Imported ${total} records`);
            notificationService.success(`✅ Imported ${total} records`, 3000);
            resolve();
          }
        };
      });

      transaction.onerror = () => {
        const error = new Error(`Failed to import data: ${transaction.error?.message}`);
        logger.addLog('error', error.message);
        notificationService.error('❌ Import failed', 3000);
        reject(error);
      };
    });
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
      logger.addLog('info', '💾 IndexedDB connection closed');
    }
  }
}

// Singleton instance
export const indexedDBService = new IndexedDBService();