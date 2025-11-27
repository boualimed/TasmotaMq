import { AppState } from '../models/app-state.model';
import { Device } from '../models/device.model';
import { OllamaConfig } from '../services/ollama-ai.service';

const STORAGE_KEY = 'appState';
const AI_CONFIG_KEY = 'ollama_ai_config';

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

      // Deserialize dates - but DON'T reset connection state
      if (parsed.devices) {
        parsed.devices = parsed.devices.map((d: Device) => ({
          ...d,
          // Keep the saved connection state instead of resetting
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
   * Saves AI configuration
   */
  saveAIConfig(config: OllamaConfig): void {
    try {
      const serialized = JSON.stringify(config);
      localStorage.setItem(AI_CONFIG_KEY, serialized);
    } catch (error) {
      console.error('Failed to save AI config:', error);
    }
  }

  /**
   * Loads AI configuration
   */
  loadAIConfig(): OllamaConfig | null {
    try {
      const raw = localStorage.getItem(AI_CONFIG_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (error) {
      console.error('Failed to load AI config:', error);
      return null;
    }
  }

  /**
   * Clears all stored data
   */
  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(AI_CONFIG_KEY);
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