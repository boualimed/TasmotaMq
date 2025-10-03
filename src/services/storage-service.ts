import { AppState } from '../models/app-state.model';
import { Device } from '../models/device.model';

const STORAGE_KEY = 'appState';

export class StorageService {
  /**
   * Saves application state to storage
   */
  save(state: AppState): void {
    try {
      const serialized = JSON.stringify(state);
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  /**
   * Loads application state from storage
   */
  load(): AppState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);

      // Deserialize dates
      if (parsed.devices) {
        parsed.devices = parsed.devices.map((d: Device) => ({
          ...d,
          isConnected: false, // Reset connection state on load
          lastSeen: d.lastSeen ? new Date(d.lastSeen) : undefined
        }));
      }

      return parsed;
    } catch (error) {
      console.error('Failed to load state:', error);
      return null;
    }
  }

  /**
   * Clears all stored data
   */
  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear state:', error);
    }
  }

  /**
   * Checks if storage is available
   */
  isAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const storageService = new StorageService();