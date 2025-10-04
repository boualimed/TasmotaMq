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

  constructor() {
    this.loadSettings();
  }

  /**
   * Initializes Firebase with the provided configuration
   */
  async initialize(config: FirebaseConfig): Promise<{ success: boolean; error?: string }> {
    try {
      // Dynamically import Firebase modules
      const { initializeApp } = await import('firebase/app');
      const { getAuth, signInAnonymously } = await import('firebase/auth');
      const { getDatabase, ref, set } = await import('firebase/database');

      // Initialize Firebase app
      firebaseApp = initializeApp(config);
      firebaseAuth = getAuth(firebaseApp);
      firebaseDatabase = getDatabase(firebaseApp);

      // Authenticate anonymously (required for Realtime Database access)
      try {
        await signInAnonymously(firebaseAuth);
        console.log('Firebase: Anonymous authentication successful');
      } catch (authError: any) {
        console.warn('Firebase: Anonymous auth failed, continuing anyway:', authError.message);
        // Continue - some setups allow unauthenticated access
      }

      this.initialized = true;
      return { success: true };
    } catch (error: any) {
      console.error('Firebase initialization error:', error);
      return { success: false, error: error.message || 'Failed to initialize Firebase' };
    }
  }

  /**
   * Tests Firebase connection with the provided config
   * Now actually verifies credentials by attempting a database operation
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

      // Validate database URL if provided
      if (!config.databaseURL) {
        return { success: false, error: 'Database URL is required for Realtime Database sync' };
      }

      const { initializeApp, deleteApp } = await import('firebase/app');
      const { getAuth, signInAnonymously } = await import('firebase/auth');
      const { getDatabase, ref, set, get } = await import('firebase/database');

      // Create a temporary app instance for testing
      const testAppName = `test-app-${Date.now()}`;
      const testApp = initializeApp(config, testAppName);
      const testAuth = getAuth(testApp);
      const testDb = getDatabase(testApp);

      try {
        // Try anonymous authentication
        await signInAnonymously(testAuth);

        // Try to write a test value to verify database access
        const testRef = ref(testDb, '_connection_test');
        await set(testRef, {
          timestamp: Date.now(),
          test: true
        });

        // Try to read it back
        const snapshot = await get(testRef);
        if (!snapshot.exists()) {
          throw new Error('Could not verify database write');
        }

        // Clean up test data
        await set(testRef, null);

        // Clean up test app
        await deleteApp(testApp);

        return { success: true };
      } catch (dbError: any) {
        await deleteApp(testApp);

        // Provide specific error messages
        if (dbError.code === 'PERMISSION_DENIED') {
          return {
            success: false,
            error: 'Permission denied. Please configure Firebase Realtime Database rules to allow access. Set rules to: { "rules": { ".read": true, ".write": true } } for testing.'
          };
        }

        throw dbError;
      }
    } catch (error: any) {
      console.error('Firebase connection test failed:', error);

      // Provide more helpful error messages
      let errorMessage = error.message || 'Connection test failed';

      if (error.code === 'auth/configuration-not-found') {
        errorMessage = 'Firebase Authentication is not enabled. Please enable Anonymous authentication in Firebase Console: Authentication → Sign-in method → Anonymous → Enable';
      } else if (error.code === 'auth/invalid-api-key') {
        errorMessage = 'Invalid API Key. Please check your Firebase configuration.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection and Firebase configuration.';
      } else if (error.message?.includes('Invalid token')) {
        errorMessage = 'Invalid configuration format. Check that all fields are correctly copied from Firebase Console.';
      } else if (error.message?.includes('projectId')) {
        errorMessage = 'Invalid Project ID. Please verify your Firebase project settings.';
      } else if (error.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key') {
        errorMessage = 'Invalid API Key format. Please copy the correct API key from Firebase Console.';
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Saves Firebase settings
   */
  saveSettings(settings: FirebaseSettings): void {
    this.settings = settings;
    // Store settings in memory instead of localStorage
    this.notifyListeners();
  }

  /**
   * Loads Firebase settings from storage
   */
  loadSettings(): FirebaseSettings | null {
    // Settings are stored in memory only
    return this.settings;
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
    return this.settings?.enabled === true && this.initialized;
  }

  /**
   * Syncs devices to Firebase
   */
  async syncDevices(userId: string, devices: Device[]): Promise<{ success: boolean; error?: string }> {
    if (!this.isEnabled() || !firebaseDatabase) {
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const { ref, set } = await import('firebase/database');
      const devicesRef = ref(firebaseDatabase, `users/${userId}/devices`);
      await set(devicesRef, devices);

      console.log(`Firebase: Synced ${devices.length} devices for user ${userId}`);
      return { success: true };
    } catch (error: any) {
      console.error('Failed to sync devices:', error);

      if (error.code === 'PERMISSION_DENIED') {
        return {
          success: false,
          error: 'Permission denied. Please check Firebase Database rules.'
        };
      }

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
        const devices = snapshot.val();
        console.log(`Firebase: Loaded ${devices.length} devices for user ${userId}`);
        return { success: true, devices };
      } else {
        console.log(`Firebase: No devices found for user ${userId}`);
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

    try {
      const { ref, set } = await import('firebase/database');
      const mqttRef = ref(firebaseDatabase, `users/${userId}/mqttSettings`);
      await set(mqttRef, settings);

      console.log(`Firebase: Synced MQTT settings for user ${userId}`);
      return { success: true };
    } catch (error: any) {
      console.error('Failed to sync MQTT settings:', error);

      if (error.code === 'PERMISSION_DENIED') {
        return {
          success: false,
          error: 'Permission denied. Please check Firebase Database rules.'
        };
      }

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