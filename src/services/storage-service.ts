// storage-service.ts (Updated with Session Support)

import { AppState } from '../models/app-state.model';
import { userSessionManager } from './user-session.manager';

const STORAGE_KEY_PREFIX = 'tasmota_app_';

export class StorageService {
  /**
   * Save app state to user session
   */
  save(state: AppState, userId: string): void {
    try {
      // 🆕 FIX: Update user session with current state
      const session = userSessionManager.getCurrentSession();
      if (session && session.userId === userId) {
        userSessionManager.updateSession({
          devices: state.devices,
          mqttSettings: state.mqttSettings,
          lastAccess: new Date()
        });
        console.log('💾 State saved to session:', state.devices.length, 'devices');
      }

      // Also save to user-specific localStorage key (backward compatibility)
      const key = this.getUserStorageKey(userId);
      localStorage.setItem(key, JSON.stringify(state));

      console.log('💾 State saved for user:', userId);
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  /**
   * Load app state from user session
   */
  load(userId: string): AppState | null {
    try {
      // First try to load from user session
      const session = userSessionManager.getCurrentSession();

      if (session && session.userId === userId) {
        console.log('✅ Loading state from active session:', session.devices.length, 'devices');
        return {
          devices: session.devices,
          mqttSettings: session.mqttSettings
        };
      }

      // Fallback to localStorage
      const key = this.getUserStorageKey(userId);
      const raw = localStorage.getItem(key);

      if (!raw) {
        console.log('ℹ️ No saved state found for user:', userId);
        return null;
      }

      const state = JSON.parse(raw);

      // 🆕 FIX: Deserialize dates in devices
      if (state.devices && Array.isArray(state.devices)) {
        state.devices = state.devices.map((device: any) => ({
          ...device,
          lastSeen: device.lastSeen ? new Date(device.lastSeen) : undefined,
          createdAt: device.createdAt ? new Date(device.createdAt) : undefined,
          lastValidation: device.lastValidation ? new Date(device.lastValidation) : undefined
        }));
      }

      console.log('✅ State loaded from storage for user:', userId, state.devices?.length || 0, 'devices');
      return state;
    } catch (error) {
      console.error('Failed to load state:', error);
      return null;
    }
  }

  /**
   * Delete all user data (GDPR compliance)
   */
  deleteUserData(userId: string): { success: boolean; deletedItems: string[] } {
    const deletedItems: string[] = [];

    try {
      console.log('🗑️ Starting user data deletion for:', userId);

      // 1. Delete user session
      userSessionManager.deleteUserSession(userId);
      deletedItems.push('user_session');

      // 2. Delete user-specific storage
      const userKey = this.getUserStorageKey(userId);
      if (localStorage.getItem(userKey)) {
        localStorage.removeItem(userKey);
        deletedItems.push(userKey);
        console.log('✅ Deleted:', userKey);
      }

      // 3. Delete any user-prefixed keys
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.includes(userId)) {
          localStorage.removeItem(key);
          deletedItems.push(key);
          console.log('✅ Deleted:', key);
        }
      });

      console.log('✅ User data deletion complete:', deletedItems);
      return { success: true, deletedItems };
    } catch (error) {
      console.error('❌ Failed to delete user data:', error);
      return { success: false, deletedItems };
    }
  }

  /**
   * Get storage key for specific user
   */
  private getUserStorageKey(userId: string): string {
    return `${STORAGE_KEY_PREFIX}${userId}`;
  }

  /**
   * Export all user data (GDPR compliance)
   */
  exportUserData(userId: string): string {
    try {
      const session = userSessionManager.getCurrentSession();
      if (session && session.userId === userId) {
        return userSessionManager.exportUserData();
      }

      const state = this.load(userId);
      return JSON.stringify({ userId, state }, null, 2);
    } catch (error) {
      console.error('Failed to export user data:', error);
      return '';
    }
  }

  /**
   * Get storage usage for user
   */
  getUserStorageSize(userId: string): number {
    let totalSize = 0;

    try {
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.includes(userId)) {
          const value = localStorage.getItem(key);
          if (value) {
            // Approximate size (UTF-16 encoding)
            totalSize += value.length * 2;
          }
        }
      });
    } catch (error) {
      console.error('Failed to calculate storage size:', error);
    }

    return totalSize;
  }

  /**
   * Clear all app data (admin/debug)
   */
  clearAll(): void {
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log('🗑️ Cleared all app data');
  }
}

export const storageService = new StorageService();