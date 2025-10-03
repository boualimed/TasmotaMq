import { initializeApp, FirebaseApp, getApps, deleteApp } from 'firebase/app';
import { getFirestore, Firestore, collection, doc, setDoc, getDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { FirebaseConfig, FirebaseSettings, FirebaseTestResult, FirebaseInitResult } from '../models/firebase.model';

class FirebaseService {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private settings: FirebaseSettings | null = null;
  private unsubscribers: Unsubscribe[] = [];
  private readonly SETTINGS_KEY = 'firebase_settings';

  /**
   * Initialize Firebase with the provided configuration
   */
  async initialize(config: FirebaseConfig): Promise<FirebaseInitResult> {
    try {
      // Delete existing app if any
      if (this.app) {
        await this.cleanup();
      }

      // Initialize Firebase
      this.app = initializeApp(config);
      this.db = getFirestore(this.app);

      return { success: true };
    } catch (error) {
      console.error('Firebase initialization error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test Firebase connection with the provided configuration
   */
  async testConnection(config: FirebaseConfig): Promise<FirebaseTestResult> {
    let testApp: FirebaseApp | null = null;

    try {
      // Create a temporary app for testing
      const testConfig = { ...config, name: `test-${Date.now()}` };
      testApp = initializeApp(config, testConfig.name);
      const testDb = getFirestore(testApp);

      // Try to access Firestore
      const testDocRef = doc(testDb, '_test_', 'connection');
      await getDoc(testDocRef);

      // Clean up test app
      await deleteApp(testApp);

      return { success: true };
    } catch (error) {
      // Clean up test app if it exists
      if (testApp) {
        try {
          await deleteApp(testApp);
        } catch (cleanupError) {
          console.error('Error cleaning up test app:', cleanupError);
        }
      }

      console.error('Firebase connection test error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }

  /**
   * Save Firebase settings to memory
   */
  saveSettings(settings: FirebaseSettings): void {
    this.settings = { ...settings };
    // Store in memory - localStorage is not supported in artifacts
    console.log('Firebase settings saved:', settings);
  }

  /**
   * Get saved Firebase settings from memory
   */
  getSettings(): FirebaseSettings | null {
    return this.settings ? { ...this.settings } : null;
  }

  /**
   * Sync devices to Firebase
   */
  async syncDevices(userId: string, devices: any[]): Promise<void> {
    if (!this.db) {
      throw new Error('Firebase not initialized');
    }

    try {
      const devicesRef = doc(this.db, 'users', userId, 'data', 'devices');
      await setDoc(devicesRef, {
        devices,
        lastUpdated: new Date().toISOString()
      });
      console.log('Devices synced to Firebase');
    } catch (error) {
      console.error('Error syncing devices:', error);
      throw error;
    }
  }

  /**
   * Sync MQTT settings to Firebase
   */
  async syncMqttSettings(userId: string, mqttSettings: any): Promise<void> {
    if (!this.db) {
      throw new Error('Firebase not initialized');
    }

    try {
      const mqttRef = doc(this.db, 'users', userId, 'data', 'mqtt');
      await setDoc(mqttRef, {
        settings: mqttSettings,
        lastUpdated: new Date().toISOString()
      });
      console.log('MQTT settings synced to Firebase');
    } catch (error) {
      console.error('Error syncing MQTT settings:', error);
      throw error;
    }
  }

  /**
   * Subscribe to devices changes from Firebase
   */
  subscribeToDevices(userId: string, callback: (devices: any[]) => void): Unsubscribe {
    if (!this.db) {
      throw new Error('Firebase not initialized');
    }

    const devicesRef = doc(this.db, 'users', userId, 'data', 'devices');
    const unsubscribe = onSnapshot(devicesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback(data.devices || []);
      }
    }, (error) => {
      console.error('Error listening to devices:', error);
    });

    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * Subscribe to MQTT settings changes from Firebase
   */
  subscribeToMqttSettings(userId: string, callback: (settings: any) => void): Unsubscribe {
    if (!this.db) {
      throw new Error('Firebase not initialized');
    }

    const mqttRef = doc(this.db, 'users', userId, 'data', 'mqtt');
    const unsubscribe = onSnapshot(mqttRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback(data.settings || null);
      }
    }, (error) => {
      console.error('Error listening to MQTT settings:', error);
    });

    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * Get Firestore instance
   */
  getFirestore(): Firestore | null {
    return this.db;
  }

  /**
   * Check if Firebase is initialized
   */
  isInitialized(): boolean {
    return this.app !== null && this.db !== null;
  }

  /**
   * Cleanup Firebase instance and unsubscribe from all listeners
   */
  async cleanup(): Promise<void> {
    // Unsubscribe from all listeners
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];

    // Delete Firebase app
    if (this.app) {
      try {
        await deleteApp(this.app);
        this.app = null;
        this.db = null;
        console.log('Firebase cleaned up');
      } catch (error) {
        console.error('Error cleaning up Firebase:', error);
      }
    }
  }
}

export const firebaseService = new FirebaseService();