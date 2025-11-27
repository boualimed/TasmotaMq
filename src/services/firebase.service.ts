import { FirebaseConfig, FirebaseSettings } from '../models/firebase.model';
import { Device } from '../models/device.model';
import { MqttSettings } from '../models/mqtt-settings.model';

// Firebase imports will be loaded dynamically
let firebaseApp: any = null;
let firebaseAuth: any = null;
let firebaseDatabase: any = null;

const FIREBASE_STORAGE_KEY = 'firebaseSettings';

export class FirebaseService {
  private settings: FirebaseSettings | null = null;
  private initialized = false;
  private listeners: Set<(settings: FirebaseSettings) => void> = new Set();
  private syncEnabled = false;

  constructor() {
    this.loadSettings();
  }

  /**
   * Initializes Firebase with the provided configuration
   */
  async initialize(config: FirebaseConfig): Promise<{ success: boolean; error?: string }> {
    try {
      // Dynamically import Firebase modules
      const { initializeApp, getApps } = await import('firebase/app');
      const { getDatabase } = await import('firebase/database');

      // Check if already initialized
      const existingApps = getApps();
      if (existingApps.length > 0) {
        firebaseApp = existingApps[0];
      } else {
        // Initialize Firebase app
        firebaseApp = initializeApp(config);
      }

      // Initialize Realtime Database
      firebaseDatabase = getDatabase(firebaseApp);

      this.initialized = true;
      this.syncEnabled = true;

      console.log('Firebase initialized successfully with Realtime Database');
      return { success: true };
    } catch (error: any) {
      console.error('Firebase initialization error:', error);
      return { success: false, error: error.message || 'Failed to initialize Firebase' };
    }
  }

  /**
   * Tests Firebase connection with the provided config
   */
  async testConnection(config: FirebaseConfig): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate config first
      if (!config.apiKey || !config.authDomain || !config.projectId) {
        return { success: false, error: 'Missing required configuration fields' };
      }

      // Validate format
      if (!config.authDomain.includes('.firebaseapp.com') && !config.authDomain.includes('.web.app')) {
        return { success: false, error: 'Invalid authDomain format. Should end with .firebaseapp.com' };
      }

      const { initializeApp, deleteApp } = await import('firebase/app');
      const { getDatabase, ref, set, remove } = await import('firebase/database');

      // Create a temporary app instance for testing
      const testAppName = `test-app-${Date.now()}`;
      const testApp = initializeApp(config, testAppName);
      const testDb = getDatabase(testApp);

      // Try to write and read from database
      const testRef = ref(testDb, `__test__/${Date.now()}`);
      await set(testRef, { test: true, timestamp: Date.now() });

      // Clean up test data
      await remove(testRef);

      // Clean up test app
      await deleteApp(testApp);

      return { success: true };
    } catch (error: any) {
      console.error('Firebase connection test failed:', error);

      // Provide more helpful error messages
      let errorMessage = error.message || 'Connection test failed';

      if (error.code === 'auth/invalid-api-key') {
        errorMessage = 'Invalid API Key. Please check your Firebase configuration.';
      } else if (error.message.includes('Invalid token')) {
        errorMessage = 'Invalid configuration format. Check that all fields are correctly copied from Firebase Console.';
      } else if (error.message.includes('projectId')) {
        errorMessage = 'Invalid Project ID. Please verify your Firebase project settings.';
      } else if (error.message.includes('Permission denied')) {
        errorMessage = 'Permission denied. Please set Firebase Realtime Database rules to allow read/write access.';
      } else if (error.message.includes('databaseURL')) {
        errorMessage = 'Database URL is required for Realtime Database. Add it to your configuration.';
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Saves Firebase settings
   */
  saveSettings(settings: FirebaseSettings): void {
    this.settings = settings;
    localStorage.setItem(FIREBASE_STORAGE_KEY, JSON.stringify(settings));
    this.syncEnabled = settings.enabled;
    this.notifyListeners();
  }

  /**
   * Loads Firebase settings from storage
   */
  loadSettings(): FirebaseSettings | null {
    try {
      const raw = localStorage.getItem(FIREBASE_STORAGE_KEY);
      if (!raw) return null;

      this.settings = JSON.parse(raw);
      this.syncEnabled = this.settings?.enabled || false;
      return this.settings;
    } catch (error) {
      console.error('Failed to load Firebase settings:', error);
      return null;
    }
  }

  /**
   * Gets current Firebase settings
   */
  getSettings(): FirebaseSettings | null {
    return this.settings;
  }

  /**
   * Checks if Firebase is enabled and initialized
   */
  isEnabled(): boolean {
    return this.syncEnabled && this.initialized && firebaseDatabase !== null;
  }

  /**
   * Syncs devices to Firebase
   */
  async syncDevices(userId: string, devices: Device[]): Promise<{ success: boolean; error?: string }> {
    if (!this.isEnabled() || !firebaseDatabase) {
      return { success: false, error: 'Firebase not initialized' };
    }

    if (!this.settings?.syncDevices) {
      return { success: false, error: 'Device sync is disabled' };
    }

    try {
      const { ref, set } = await import('firebase/database');
      const devicesRef = ref(firebaseDatabase, `users/${userId}/devices`);

      // Convert devices to plain objects (remove Date objects)
      const devicesData = devices.map(d => ({
        ...d,
        lastSeen: d.lastSeen ? d.lastSeen.toISOString() : null
      }));

      await set(devicesRef, devicesData);
      console.log(`Synced ${devices.length} devices to Firebase`);
      return { success: true };
    } catch (error: any) {
      console.error('Failed to sync devices:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Loads devices from Firebase
   */
  async loadDevices(userId: string): Promise<{ success: boolean; devices?: Device[]; error?: string }> {
    if (!this.isEnabled() || !firebaseDatabase) {
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const { ref, get } = await import('firebase/database');
      const devicesRef = ref(firebaseDatabase, `users/${userId}/devices`);
      const snapshot = await get(devicesRef);

      if (snapshot.exists()) {
        const devicesData = snapshot.val();
        // Convert ISO strings back to Date objects
        const devices = devicesData.map((d: any) => ({
          ...d,
          lastSeen: d.lastSeen ? new Date(d.lastSeen) : undefined
        }));
        return { success: true, devices };
      } else {
        return { success: true, devices: [] };
      }
    } catch (error: any) {
      console.error('Failed to load devices:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Syncs MQTT settings to Firebase
   */
  async syncMqttSettings(userId: string, settings: MqttSettings): Promise<{ success: boolean; error?: string }> {
    if (!this.isEnabled() || !firebaseDatabase) {
      return { success: false, error: 'Firebase not initialized' };
    }

    if (!this.settings?.syncMqttSettings) {
      return { success: false, error: 'MQTT settings sync is disabled' };
    }

    try {
      const { ref, set } = await import('firebase/database');
      const mqttRef = ref(firebaseDatabase, `users/${userId}/mqttSettings`);
      await set(mqttRef, settings);
      console.log('Synced MQTT settings to Firebase');
      return { success: true };
    } catch (error: any) {
      console.error('Failed to sync MQTT settings:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Loads MQTT settings from Firebase
   */
  async loadMqttSettings(userId: string): Promise<{ success: boolean; settings?: MqttSettings; error?: string }> {
    if (!this.isEnabled() || !firebaseDatabase) {
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const { ref, get } = await import('firebase/database');
      const mqttRef = ref(firebaseDatabase, `users/${userId}/mqttSettings`);
      const snapshot = await get(mqttRef);

      if (snapshot.exists()) {
        return { success: true, settings: snapshot.val() };
      } else {
        return { success: true, settings: undefined };
      }
    } catch (error: any) {
      console.error('Failed to load MQTT settings:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Queues MQTT message for batch upload to Firebase
   */
  queueMqttMessage(
    userId: string,
    deviceId: string,
    deviceName: string,
    topic: string,
    payload: any
  ): void {
    if (!this.isEnabled() || !this.settings?.syncDevices) return;

    const record: MqttMessageRecord = {
      deviceId,
      deviceName,
      topic,
      payload,
      timestamp: new Date().toISOString()
    };

    this.messageQueue.push(record);

    // If batch size reached, flush immediately
    if (this.messageQueue.length >= this.batchSize) {
      this.flushMessageQueue(userId);
    }
  }

  /**
   * Flushes message queue to Firebase
   */
  private async flushMessageQueue(userId: string): Promise<void> {
    if (this.messageQueue.length === 0 || !firebaseDatabase) return;

    const batch = this.messageQueue.splice(0, this.batchSize);

    try {
      const { ref, push } = await import('firebase/database');
      const messagesRef = ref(firebaseDatabase, `users/${userId}/mqttMessages`);

      // Push all messages as separate entries
      for (const message of batch) {
        await push(messagesRef, message);
      }

      console.log(`Firebase: Flushed ${batch.length} MQTT messages for user ${userId}`);
    } catch (error: any) {
      console.error('Firebase: Failed to flush message queue:', error);
      // Re-queue failed messages
      this.messageQueue.unshift(...batch);
    }
  }

  /**
   * Starts batch processor timer
   */
  private startBatchProcessor(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    this.batchTimer = setInterval(() => {
      // Can't flush without userId - messages will be flushed when devices sync
    }, this.batchInterval);

    console.log(`Firebase: Batch processor started (interval: ${this.batchInterval}ms)`);
  }

  /**
   * Stops batch processor
   */
  private stopBatchProcessor(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
      console.log('Firebase: Batch processor stopped');
    }
  }

  /**
   * Gets queue statistics
   */
  getStats(): { queueSize: number; batchSize: number; batchInterval: number } {
    return {
      queueSize: this.messageQueue.length,
      batchSize: this.batchSize,
      batchInterval: this.batchInterval
    };
  }

  /**
   * Manually flushes message queue
   */
  async flushAll(userId: string): Promise<void> {
    await this.flushMessageQueue(userId);
  }

  /**
   * Disconnects and cleanup
   */
  disconnect(): void {
    this.stopBatchProcessor();
    this.initialized = false;
    console.log('Firebase: Disconnected');
  }

  /**
   * Subscribes to settings changes
   */
  subscribe(listener: (settings: FirebaseSettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    if (this.settings) {
      this.listeners.forEach(listener => listener(this.settings!));
    }
  }
}

// Singleton instance
export const firebaseService = new FirebaseService();