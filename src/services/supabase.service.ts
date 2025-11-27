import {
  SupabaseConfig,
  SupabaseSettings,
  MqttMessageRecord,
  DeviceStateRecord,
  DeviceHistoryRecord
} from '../models/supabase.model';
import { Device } from '../models/device.model';
import { logger } from '../utils/logger.util';
import { notificationService } from '../services/notification.service';
import { userSessionManager, UserSession } from '../services/user-session.manager';

// Supabase client will be loaded dynamically
let supabaseClient: any = null;
let currentClientConfig: { url: string; key: string } | null = null;

export class SupabaseService {
  private settings: SupabaseSettings | null = null;
  private initialized = false;
  private messageQueue: MqttMessageRecord[] = [];
  private stateQueue: DeviceStateRecord[] = [];
  private batchTimer: any = null;
  private listeners: Set<(settings: SupabaseSettings) => void> = new Set();
  private insertCount = 0;
  private errorCount = 0;
  private sessionUnsubscribe: (() => void) | null = null;

  constructor() {
    // Subscribe to user session changes
    this.sessionUnsubscribe = userSessionManager.subscribe((session) => {
      this.handleSessionChange(session);
    });

    // Try to restore settings from current session
    const currentSession = userSessionManager.getCurrentSession();
    if (currentSession?.supabaseSettings) {
      this.settings = currentSession.supabaseSettings;
    }
  }

  /**
   * Handle user session changes
   */
  private handleSessionChange(session: UserSession | null): void {
    if (!session) {
      // User logged out - disconnect and cleanup
      console.log('[Supabase] User logged out, cleaning up...');
      this.disconnect();
      return;
    }

    // Load settings from session
    if (session.supabaseSettings) {
      this.settings = session.supabaseSettings;

      // Auto-initialize if enabled
      if (this.settings.enabled && this.settings.config.url && this.settings.config.anonKey) {
        console.log('[Supabase] Auto-initializing from session settings...');
        this.initialize(this.settings.config).catch(error => {
          logger.addLog('error', `Auto-init failed: ${error.message}`);
          notificationService.error(`Supabase auto-init failed: ${error.message}`, 5000);
        });
      }
    }
  }

  /**
   * Gets or creates Supabase client (singleton pattern)
   */
  private async getClient(config: SupabaseConfig): Promise<any> {
    // If client exists and config matches, reuse it
    if (supabaseClient && currentClientConfig &&
        currentClientConfig.url === config.url &&
        currentClientConfig.key === config.anonKey) {
      return supabaseClient;
    }

    // Clean up old client if it exists
    if (supabaseClient) {
      try {
        supabaseClient.auth?.stopAutoRefresh?.();
        supabaseClient = null;
        currentClientConfig = null;
      } catch (error) {
        console.warn('Error cleaning up old Supabase client:', error);
      }
    }

    // Create new client
    const { createClient } = await import('@supabase/supabase-js');

    supabaseClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    currentClientConfig = {
      url: config.url,
      key: config.anonKey
    };

    return supabaseClient;
  }

  /**
   * Initializes Supabase client
   */
  async initialize(config: SupabaseConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const client = await this.getClient(config);

      // Test connection
      const { error } = await client
        .from('mqtt_messages')
        .select('count', { count: 'exact', head: true });

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }

      this.initialized = true;
      this.startBatchProcessor();

      logger.addLog('success', 'Supabase initialized successfully');
      notificationService.success('✅ Supabase connected', 3000);

      return { success: true };
    } catch (error: any) {
      logger.addLog('error', `Supabase init failed: ${error.message}`);
      notificationService.error(`❌ Supabase init failed: ${error.message}`, 5000);
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
        const error = 'Missing required configuration fields';
        notificationService.error(`❌ ${error}`, 5000);
        return { success: false, error };
      }

      // Validate URL format
      if (!config.url.startsWith('https://') || !config.url.includes('.supabase.co')) {
        const error = 'Invalid Project URL format. Should be https://xxxxx.supabase.co';
        notificationService.error(`❌ ${error}`, 5000);
        return { success: false, error };
      }

      // Validate key format
      if (!config.anonKey.startsWith('eyJ')) {
        const error = 'Invalid Anon Key format. Should be a JWT token starting with eyJ';
        notificationService.error(`❌ ${error}`, 5000);
        return { success: false, error };
      }

      notificationService.info('🔍 Testing Supabase connection...', 2000);

      // Create a test client
      const { createClient } = await import('@supabase/supabase-js');
      const testClient = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      // Try a simple query
      const { error } = await testClient
        .from('mqtt_messages')
        .select('count', { count: 'exact', head: true })
        .limit(0);

      if (error && error.code !== 'PGRST116') {
        if (error.message.includes('JWT')) {
          throw new Error('Invalid API key. Please verify your Anon Key from Supabase dashboard.');
        } else if (error.message.includes('connect')) {
          throw new Error('Cannot connect to Supabase. Check your Project URL.');
        }
        throw new Error(error.message);
      }

      notificationService.success('✅ Connection test successful!', 3000);
      logger.addLog('success', 'Supabase connection test passed');

      return { success: true };
    } catch (error: any) {
      console.error('Supabase connection test failed:', error);
      notificationService.error(`❌ Connection failed: ${error.message}`, 5000);
      logger.addLog('error', `Supabase test failed: ${error.message}`);
      return { success: false, error: error.message || 'Connection test failed' };
    }
  }

  /**
   * Saves settings to user session
   */
  saveSettings(settings: SupabaseSettings): void {
    this.settings = settings;

    // Save to user session instead of localStorage
    const session = userSessionManager.getCurrentSession();
    if (session) {
      userSessionManager.updateSupabaseSettings(settings);
      logger.addLog('success', 'Supabase settings saved to user session');
      notificationService.success('💾 Settings saved', 2000);
    } else {
      logger.addLog('warning', 'No active session - settings not persisted');
      notificationService.warning('⚠️ No active session', 3000);
    }

    this.notifyListeners();
  }

  /**
   * Loads settings from user session
   */
  loadSettings(): SupabaseSettings | null {
    const session = userSessionManager.getCurrentSession();
    if (!session) return null;

    this.settings = session.supabaseSettings || null;
    return this.settings;
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
   * Queues MQTT message for storage
   */
  queueMqttMessage(
    userId: string,
    deviceId: string,
    deviceName: string,
    topic: string,
    payload: any
  ): void {
    if (!this.isEnabled() || !this.settings?.storeMqttMessages) {
      console.log('[Supabase] Queueing disabled:', {
        enabled: this.isEnabled(),
        storeMqttMessages: this.settings?.storeMqttMessages
      });
      return;
    }

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

    console.log('[Supabase] Message queued:', {
      queueSize: this.messageQueue.length,
      deviceName,
      topic
    });

    // If batch size reached, flush immediately
    if (this.messageQueue.length >= (this.settings?.batchSize || 50)) {
      console.log('[Supabase] Batch size reached, flushing...');
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
    if (this.messageQueue.length === 0 || !supabaseClient) {
      console.log('[Supabase] Nothing to flush or client not ready');
      return;
    }

    const batch = this.messageQueue.splice(0, this.settings?.batchSize || 50);

    console.log('[Supabase] Flushing batch:', {
      batchSize: batch.length,
      sample: batch[0]
    });

    try {
      const { data, error } = await supabaseClient
        .from('mqtt_messages')
        .insert(batch);

      if (error) {
        console.error('[Supabase] Insert error:', error);
        this.errorCount++;
        logger.addLog('error', `Failed to insert MQTT messages: ${error.message}`);
        notificationService.error(`❌ Supabase insert failed: ${error.message}`, 5000);
      } else {
        console.log('[Supabase] Insert success:', data);
        this.insertCount += batch.length;
        logger.addLog('info', `Inserted ${batch.length} MQTT messages to Supabase`);
      }
    } catch (error: any) {
      console.error('[Supabase] Catch error:', error);
      this.errorCount++;
      logger.addLog('error', `Batch insert error: ${error.message}`);
      notificationService.error(`❌ Supabase error: ${error.message}`, 5000);
    }
  }

  /**
   * Flushes device state queue
   */
  private async flushStateQueue(): Promise<void> {
    if (this.stateQueue.length === 0 || !supabaseClient) return;

    const batch = this.stateQueue.splice(0, this.settings?.batchSize || 50);

    try {
      const { error } = await supabaseClient
        .from('device_states')
        .upsert(batch, { onConflict: 'user_id,device_id' });

      if (error) {
        this.errorCount++;
        logger.addLog('error', `Failed to update device states: ${error.message}`);
        notificationService.error(`❌ State update failed: ${error.message}`, 5000);
      } else {
        logger.addLog('info', `Updated ${batch.length} device states in Supabase`);
      }
    } catch (error: any) {
      this.errorCount++;
      logger.addLog('error', `State update error: ${error.message}`);
      notificationService.error(`❌ State update error: ${error.message}`, 5000);
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
        logger.addLog('error', `Query failed: ${error.message}`);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      logger.addLog('error', `Query error: ${error.message}`);
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
        logger.addLog('error', `History query failed: ${error.message}`);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      logger.addLog('error', `History query error: ${error.message}`);
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
      notificationService.info(`🧹 Cleanup complete (${this.settings.retentionDays} days retention)`, 3000);
    } catch (error: any) {
      logger.addLog('error', `Cleanup error: ${error.message}`);
      notificationService.error(`❌ Cleanup error: ${error.message}`, 5000);
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

    // Clean up client
    if (supabaseClient) {
      try {
        supabaseClient.auth?.stopAutoRefresh?.();
      } catch (error) {
        console.warn('Error stopping auth refresh:', error);
      }
      supabaseClient = null;
      currentClientConfig = null;
    }

    this.initialized = false;
    logger.addLog('info', 'Supabase disconnected');
    notificationService.info('📊 Supabase disconnected', 2000);
  }

  /**
   * Delete all user data from Supabase
   */
  async deleteUserData(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!currentClientConfig || !supabaseClient) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      notificationService.info('🗑️ Deleting user data from Supabase...', 3000);

      // Delete from all tables
      const { error: historyError } = await supabaseClient
        .from('device_history')
        .delete()
        .eq('user_id', userId);

      if (historyError) throw historyError;

      const { error: statesError } = await supabaseClient
        .from('device_states')
        .delete()
        .eq('user_id', userId);

      if (statesError) throw statesError;

      const { error: mqttError } = await supabaseClient
        .from('mqtt_messages')
        .delete()
        .eq('user_id', userId);

      if (mqttError) throw mqttError;

      const { error: devicesError } = await supabaseClient
        .from('devices')
        .delete()
        .eq('user_id', userId);

      if (devicesError) throw devicesError;

      logger.addLog('success', `Deleted all Supabase data for user ${userId}`);
      notificationService.success('✅ All Supabase data deleted', 3000);

      return { success: true };
    } catch (error: any) {
      console.error('Supabase deletion failed:', error);
      logger.addLog('error', `Supabase deletion failed: ${error.message}`);
      notificationService.error(`❌ Deletion failed: ${error.message}`, 5000);
      return { success: false, error: error.message };
    }
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

  /**
   * Cleanup on service destruction
   */
  destroy(): void {
    if (this.sessionUnsubscribe) {
      this.sessionUnsubscribe();
      this.sessionUnsubscribe = null;
    }
    this.disconnect();
  }
}

// Singleton instance
export const supabaseService = new SupabaseService();