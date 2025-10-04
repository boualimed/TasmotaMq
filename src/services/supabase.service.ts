import {
  SupabaseConfig,
  SupabaseSettings,
  MqttMessageRecord,
  DeviceStateRecord,
  DeviceHistoryRecord
} from '../models/supabase.model';
import { Device } from '../models/device.model';
import { logger } from '../utils/logger.util';

// Supabase client will be loaded dynamically
let supabaseClient: any = null;

const SUPABASE_STORAGE_KEY = 'supabaseSettings';

export class SupabaseService {
  private settings: SupabaseSettings | null = null;
  private initialized = false;
  private messageQueue: MqttMessageRecord[] = [];
  private stateQueue: DeviceStateRecord[] = [];
  private batchTimer: any = null;
  private listeners: Set<(settings: SupabaseSettings) => void> = new Set();
  private insertCount = 0;
  private errorCount = 0;

  constructor() {
    this.loadSettings();
  }

  /**
   * Initializes Supabase client
   */
  async initialize(config: SupabaseConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const { createClient } = await import('@supabase/supabase-js');

      supabaseClient = createClient(config.url, config.anonKey);

      // Test connection
      const { error } = await supabaseClient.from('mqtt_messages').select('count', { count: 'exact', head: true });

      if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist yet
        throw new Error(error.message);
      }

      this.initialized = true;
      this.startBatchProcessor();
      logger.addLog('success', 'Supabase initialized successfully');

      return { success: true };
    } catch (error: any) {
      logger.addLog('error', `Supabase init failed: ${error.message}`);
      return { success: false, error: error.message || 'Failed to initialize Supabase' };
    }
  }

  /**
   * Tests Supabase connection
   */
  async testConnection(config: SupabaseConfig): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate config first
      if (!config.url || !config.anonKey) {
        return { success: false, error: 'Missing required configuration fields' };
      }

      // Validate URL format
      if (!config.url.startsWith('https://') || !config.url.includes('.supabase.co')) {
        return { success: false, error: 'Invalid Project URL format. Should be https://xxxxx.supabase.co' };
      }

      // Validate key format (JWT should start with eyJ)
      if (!config.anonKey.startsWith('eyJ')) {
        return { success: false, error: 'Invalid Anon Key format. Should be a JWT token starting with eyJ' };
      }

      const { createClient } = await import('@supabase/supabase-js');
      const testClient = createClient(config.url, config.anonKey);

      // Try a simple query to test connection
      // This will work even if tables don't exist yet
      const { error } = await testClient
        .from('mqtt_messages')
        .select('count', { count: 'exact', head: true })
        .limit(0);

      // PGRST116 means table doesn't exist - that's OK for test
      if (error && error.code !== 'PGRST116') {
        // Check for common errors
        if (error.message.includes('JWT')) {
          return { success: false, error: 'Invalid API key. Please verify your Anon Key from Supabase dashboard.' };
        } else if (error.message.includes('connect')) {
          return { success: false, error: 'Cannot connect to Supabase. Check your Project URL.' };
        }
        throw new Error(error.message);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Supabase connection test failed:', error);
      return { success: false, error: error.message || 'Connection test failed' };
    }
  }

  /**
   * Saves settings
   */
  saveSettings(settings: SupabaseSettings): void {
    this.settings = settings;
    localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(settings));
    this.notifyListeners();
  }

  /**
   * Loads settings
   */
  loadSettings(): SupabaseSettings | null {
    try {
      const raw = localStorage.getItem(SUPABASE_STORAGE_KEY);
      if (!raw) return null;

      this.settings = JSON.parse(raw);
      return this.settings;
    } catch (error) {
      console.error('Failed to load Supabase settings:', error);
      return null;
    }
  }

  /**
   * Gets current settings
   */
  getSettings(): SupabaseSettings | null {
    return this.settings;
  }

  /**
   * Checks if enabled
   */
  isEnabled(): boolean {
    return this.settings?.enabled === true && this.initialized;
  }

  /**
   * Queues MQTT message for storage (real-time approach)
   */
  queueMqttMessage(
    userId: string,
    deviceId: string,
    deviceName: string,
    topic: string,
    payload: any
  ): void {
    if (!this.isEnabled() || !this.settings?.storeMqttMessages) return;

    const payloadType = this.getPayloadType(payload);

    const record: MqttMessageRecord = {
      user_id: userId,
      device_id: deviceId,
      device_name: deviceName,
      topic,
      payload: payloadType === 'json' ? payload : String(payload),
      payload_type: payloadType,
      timestamp: new Date().toISOString()
    };

    this.messageQueue.push(record);

    // If batch size reached, flush immediately
    if (this.messageQueue.length >= (this.settings?.batchSize || 50)) {
      this.flushMessageQueue();
    }
  }

  /**
   * Queues device state for storage
   */
  queueDeviceState(userId: string, device: Device): void {
    if (!this.isEnabled() || !this.settings?.storeDeviceStates) return;

    const record: DeviceStateRecord = {
      user_id: userId,
      device_id: device.id,
      device_name: device.name,
      device_type: device.type,
      is_connected: device.isConnected,
      is_on: device.isOn,
      sensor_data: device.sensorData,
      lwt_status: device.lwtStatus,
      last_seen: device.lastSeen ? device.lastSeen.toISOString() : new Date().toISOString()
    };

    this.stateQueue.push(record);
  }

  /**
   * Records device history event
   */
  async recordDeviceHistory(
    userId: string,
    deviceId: string,
    stateChange: 'online' | 'offline' | 'on' | 'off',
    previousValue?: any,
    newValue?: any
  ): Promise<void> {
    if (!this.isEnabled() || !supabaseClient) return;

    try {
      const record: DeviceHistoryRecord = {
        user_id: userId,
        device_id: deviceId,
        state_change: stateChange,
        previous_value: previousValue,
        new_value: newValue,
        timestamp: new Date().toISOString()
      };

      const { error } = await supabaseClient
        .from('device_history')
        .insert([record]);

      if (error) {
        logger.addLog('error', `Failed to record history: ${error.message}`);
      }
    } catch (error: any) {
      logger.addLog('error', `History recording error: ${error.message}`);
    }
  }

  /**
   * Flushes message queue to Supabase
   */
  private async flushMessageQueue(): Promise<void> {
    if (this.messageQueue.length === 0 || !supabaseClient) return;

    const batch = this.messageQueue.splice(0, this.settings?.batchSize || 50);

    try {
      const { error } = await supabaseClient
        .from('mqtt_messages')
        .insert(batch);

      if (error) {
        this.errorCount++;
        logger.addLog('error', `Failed to insert MQTT messages: ${error.message}`);
        // Re-queue failed messages (optional, may cause duplicates)
        // this.messageQueue.unshift(...batch);
      } else {
        this.insertCount += batch.length;
        logger.addLog('info', `Inserted ${batch.length} MQTT messages to Supabase`);
      }
    } catch (error: any) {
      this.errorCount++;
      logger.addLog('error', `Batch insert error: ${error.message}`);
    }
  }

  /**
   * Flushes device state queue
   */
  private async flushStateQueue(): Promise<void> {
    if (this.stateQueue.length === 0 || !supabaseClient) return;

    const batch = this.stateQueue.splice(0, this.settings?.batchSize || 50);

    try {
      // Upsert device states (update if exists, insert if new)
      const { error } = await supabaseClient
        .from('device_states')
        .upsert(batch, { onConflict: 'user_id,device_id' });

      if (error) {
        this.errorCount++;
        logger.addLog('error', `Failed to update device states: ${error.message}`);
      } else {
        logger.addLog('info', `Updated ${batch.length} device states in Supabase`);
      }
    } catch (error: any) {
      this.errorCount++;
      logger.addLog('error', `State update error: ${error.message}`);
    }
  }

  /**
   * Starts batch processor timer
   */
  private startBatchProcessor(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    const interval = this.settings?.batchInterval || 5000;

    this.batchTimer = setInterval(() => {
      this.flushMessageQueue();
      this.flushStateQueue();
    }, interval);

    logger.addLog('info', `Batch processor started (interval: ${interval}ms)`);
  }

  /**
   * Stops batch processor
   */
  private stopBatchProcessor(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
      logger.addLog('info', 'Batch processor stopped');
    }
  }

  /**
   * Queries MQTT messages
   */
  async queryMessages(
    userId: string,
    filters?: {
      deviceId?: string;
      topic?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<{ success: boolean; data?: MqttMessageRecord[]; error?: string }> {
    if (!this.isEnabled() || !supabaseClient) {
      return { success: false, error: 'Supabase not initialized' };
    }

    try {
      let query = supabaseClient
        .from('mqtt_messages')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (filters?.deviceId) {
        query = query.eq('device_id', filters.deviceId);
      }

      if (filters?.topic) {
        query = query.eq('topic', filters.topic);
      }

      if (filters?.startDate) {
        query = query.gte('timestamp', filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        query = query.lte('timestamp', filters.endDate.toISOString());
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Gets device state history
   */
  async getDeviceHistory(
    userId: string,
    deviceId: string,
    limit: number = 100
  ): Promise<{ success: boolean; data?: DeviceHistoryRecord[]; error?: string }> {
    if (!this.isEnabled() || !supabaseClient) {
      return { success: false, error: 'Supabase not initialized' };
    }

    try {
      const { data, error } = await supabaseClient
        .from('device_history')
        .select('*')
        .eq('user_id', userId)
        .eq('device_id', deviceId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Gets statistics
   */
  getStats(): { insertCount: number; errorCount: number; queueSize: number } {
    return {
      insertCount: this.insertCount,
      errorCount: this.errorCount,
      queueSize: this.messageQueue.length + this.stateQueue.length
    };
  }

  /**
   * Cleans up old records based on retention policy
   */
  async cleanupOldRecords(userId: string): Promise<void> {
    if (!this.isEnabled() || !supabaseClient || !this.settings) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.settings.retentionDays);

    try {
      await supabaseClient
        .from('mqtt_messages')
        .delete()
        .eq('user_id', userId)
        .lt('timestamp', cutoffDate.toISOString());

      logger.addLog('info', `Cleaned up records older than ${this.settings.retentionDays} days`);
    } catch (error: any) {
      logger.addLog('error', `Cleanup error: ${error.message}`);
    }
  }

  /**
   * Manually flushes all queues
   */
  async flushAll(): Promise<void> {
    await this.flushMessageQueue();
    await this.flushStateQueue();
  }

  /**
   * Disconnects and cleanup
   */
  disconnect(): void {
    this.stopBatchProcessor();
    this.flushAll(); // Final flush
    this.initialized = false;
    logger.addLog('info', 'Supabase disconnected');
  }

  /**
   * Subscribe to settings changes
   */
  subscribe(listener: (settings: SupabaseSettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    if (this.settings) {
      this.listeners.forEach(listener => listener(this.settings!));
    }
  }

  private getPayloadType(payload: any): 'json' | 'string' | 'number' | 'boolean' {
    if (typeof payload === 'object' && payload !== null) return 'json';
    if (typeof payload === 'number') return 'number';
    if (typeof payload === 'boolean') return 'boolean';
    return 'string';
  }
}

// Singleton instance
export const supabaseService = new SupabaseService();