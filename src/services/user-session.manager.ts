// user-session.manager.ts
// Centralized User Session Management with Data Isolation

import { User } from '../models/auth.model';
import { Device } from '../models/device.model';
import { MqttSettings } from '../models/mqtt-settings.model';
import { OllamaConfig } from '../services/ollama-ai.service';
import { IndexedDBSettings } from '../services/indexeddb.service';
import { SupabaseSettings } from '../models/supabase.model';
import { TelegramAlertConfig, TelegramSettings } from '../models/telegram.model';
/**
 * User-specific application state
 * All app data is scoped to the authenticated user
 */
export interface UserSession {
  userId: string;
  username: string;
  createdAt: Date;
  lastAccess: Date;

  // App State
  devices: Device[];
  mqttSettings: MqttSettings;
  aiConfig: OllamaConfig;
  indexedDBSettings: IndexedDBSettings;
  supabaseSettings?: SupabaseSettings;

  // Feature Flags & Permissions (for future monetization)
  subscription: UserSubscription;
  features: UserFeatures;

  // Usage Tracking (for analytics & billing)
  usage: UsageMetrics;

  // Preferences
  preferences: UserPreferences;

  // Add this line
  telegramSettings?: TelegramSettings | null;

  // Also store alert configs
  telegramAlertConfigs?: Record<string, TelegramAlertConfig>;

  // 🛡️ NEW: Shield statistics (for monitoring)
  shieldStats?: {
    totalCommands: number;
    blockedCommands: number;
    emergencyStops: number;
    lastEmergencyStop?: Date;
  };
}

/**
 * Subscription tiers for future monetization
 */
export interface UserSubscription {
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'trial' | 'expired' | 'cancelled';
  startDate?: Date;
  endDate?: Date;
  autoRenew: boolean;
  features: string[];
}

/**
 * Feature access control
 */
export interface UserFeatures {
  maxDevices: number;
  maxRules: number;
  maxTimers: number;
  advancedAnalytics: boolean;
  aiInsights: boolean;
  cloudSync: boolean;
  apiAccess: boolean;
  customIntegrations: boolean;
  prioritySupport: boolean;
  whiteLabel: boolean;
}

/**
 * Usage tracking for billing & analytics
 */
export interface UsageMetrics {
  devicesCreated: number;
  mqttMessagesProcessed: number;
  aiQueriesUsed: number;
  storageUsed: number; // bytes
  lastReset: Date;

  // Monthly quotas
  monthlyQuota: {
    devices: number;
    mqttMessages: number;
    aiQueries: number;
    storage: number;
  };
}

/**
 * User preferences
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  autoConnect: boolean;
  compactView: boolean;
}

/**
 * Default subscription tiers configuration
 */
const SUBSCRIPTION_TIERS: Record<string, UserFeatures> = {
  free: {
    maxDevices: 5,
    maxRules: 3,
    maxTimers: 5,
    advancedAnalytics: false,
    aiInsights: false,
    cloudSync: false,
    apiAccess: false,
    customIntegrations: false,
    prioritySupport: false,
    whiteLabel: false
  },
  basic: {
    maxDevices: 20,
    maxRules: 10,
    maxTimers: 20,
    advancedAnalytics: true,
    aiInsights: false,
    cloudSync: true,
    apiAccess: false,
    customIntegrations: false,
    prioritySupport: false,
    whiteLabel: false
  },
  pro: {
    maxDevices: 100,
    maxRules: 50,
    maxTimers: 100,
    advancedAnalytics: true,
    aiInsights: true,
    cloudSync: true,
    apiAccess: true,
    customIntegrations: true,
    prioritySupport: true,
    whiteLabel: false
  },
  enterprise: {
    maxDevices: -1, // unlimited
    maxRules: -1,
    maxTimers: -1,
    advancedAnalytics: true,
    aiInsights: true,
    cloudSync: true,
    apiAccess: true,
    customIntegrations: true,
    prioritySupport: true,
    whiteLabel: true
  }
};

/**
 * Storage key prefix for user sessions
 */
const SESSION_PREFIX = 'user_session_';
const ACTIVE_SESSION_KEY = 'active_session_id';

/**
 * User Session Manager
 * Handles all user-scoped data isolation and access control
 */
export class UserSessionManager {
  private currentSession: UserSession | null = null;
  private sessionListeners: Set<(session: UserSession | null) => void> = new Set();

  /**
   * Initialize a new user session (called after login)
   */
  initializeSession(user: User): UserSession {
    console.log('🔐 Initializing session for user:', user.username);

    // Try to load existing session
    let session = this.loadUserSession(user.id);

    if (!session) {
      // Create new session with defaults
      session = this.createNewSession(user);
      console.log('✨ Created new session for user:', user.username);
    } else {
      console.log('♻️ Restored existing session for user:', user.username);
    }

    // Update last access
    session.lastAccess = new Date();

    // Set as current session
    this.currentSession = session;
    this.saveCurrentSession();
    this.markActiveSession(user.id);

    this.notifyListeners(session);

    return session;
  }

  /**
   * Create a new session with default values
   */
  private createNewSession(user: User): UserSession {
    const tier = 'free'; // Default tier for new users

    return {
      userId: user.id,
      username: user.username,
      createdAt: new Date(),
      lastAccess: new Date(),

      devices: [],
      mqttSettings: this.getDefaultMqttSettings(),
      aiConfig: this.getDefaultAIConfig(),
      indexedDBSettings: this.getDefaultIndexedDBSettings(),
      supabaseSettings: this.getDefaultSupabaseSettings(),
      subscription: {
        tier,
        status: 'active',
        autoRenew: false,
        features: []
      },

      features: SUBSCRIPTION_TIERS[tier],

      usage: {
        devicesCreated: 0,
        mqttMessagesProcessed: 0,
        aiQueriesUsed: 0,
        storageUsed: 0,
        lastReset: new Date(),
        monthlyQuota: {
          devices: 5,
          mqttMessages: 10000,
          aiQueries: 100,
          storage: 50 * 1024 * 1024 // 50MB
        }
      },

      preferences: {
        theme: 'dark',
        language: 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        notifications: {
          email: true,
          push: true,
          inApp: true
        },
        autoConnect: true,
        compactView: false
      },
      telegramSettings: {
        enabled: false,
        botToken: '',
        chatId: '',
        defaultCooldownMinutes: 0,
        quietHoursEnabled: false,
        groupAlerts: false,
        groupAlertDelay: 0
      },
      telegramAlertConfigs: {},

        // 🛡️  Initialize shield stats
    shieldStats: {
      totalCommands: 0,
      blockedCommands: 0,
      emergencyStops: 0
    }
    };

  }
// set default supabase settings
  private getDefaultSupabaseSettings(): SupabaseSettings {
    return {
      enabled: false,
      config: {
        url: '',
        anonKey: ''
      },
      storeMqttMessages: true,
      storeDeviceStates: true,
      batchSize: 50,
      batchInterval: 5000,
      retentionDays: 30
    };
  }

  updateSupabaseSettings(supabaseSettings: SupabaseSettings): void {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession.supabaseSettings = supabaseSettings;
    this.currentSession.lastAccess = new Date();

    this.saveCurrentSession();
    this.notifyListeners(this.currentSession);
  }
  /**
   * Get current active session
   */
  getCurrentSession(): UserSession | null {
    return this.currentSession;
  }

  /**
   * Update session data
   */
  updateSession(updates: Partial<UserSession>): void {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession = {
      ...this.currentSession,
      ...updates,
      lastAccess: new Date()
    };

    this.saveCurrentSession();
   // this.notifyListeners(this.currentSession);// need to be verified
  }

  /**
   * Update MQTT settings in session
   */
  updateMqttSettings(mqttSettings: MqttSettings): void {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession.mqttSettings = mqttSettings;
    this.currentSession.lastAccess = new Date();

    this.saveCurrentSession();
    //this.notifyListeners(this.currentSession);// need to be verified
  }

  /**
   * Update specific session field
   */
  updateSessionField<K extends keyof UserSession>(
    field: K,
    value: UserSession[K]
  ): void {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession[field] = value;
    this.currentSession.lastAccess = new Date();

    this.saveCurrentSession();
    this.notifyListeners(this.currentSession);
  }

  /**
   * Clear current session (on logout)
   */
  clearSession(): void {
    console.log('🚪 Clearing session');
    this.currentSession = null;
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    this.notifyListeners(null);
  }

  /**
   * Delete user session permanently
   */
  deleteUserSession(userId: string): void {
    console.log('🗑️ Deleting session for user:', userId);

    const sessionKey = this.getSessionKey(userId);
    localStorage.removeItem(sessionKey);

    if (this.currentSession?.userId === userId) {
      this.clearSession();
    }
  }

  /**
   * Check if user can perform action based on subscription
   */
  canPerformAction(action: string): {
    allowed: boolean;
    reason?: string;
    upgradeRequired?: string;
  } {
    if (!this.currentSession) {
      return { allowed: false, reason: 'No active session' };
    }

    const { features, usage } = this.currentSession;

    switch (action) {
      case 'add_device':
        if (features.maxDevices === -1) {
          return { allowed: true };
        }
        if (usage.devicesCreated >= features.maxDevices) {
          return {
            allowed: false,
            reason: `Device limit reached (${features.maxDevices})`,
            upgradeRequired: 'basic'
          };
        }
        return { allowed: true };

      case 'add_rule':
        if (features.maxRules === -1) {
          return { allowed: true };
        }
        if (usage.devicesCreated >= features.maxRules) {
          return {
            allowed: false,
            reason: `Rule limit reached (${features.maxRules})`,
            upgradeRequired: 'basic'
          };
        }
        return { allowed: true };

      case 'use_ai':
        if (!features.aiInsights) {
          return {
            allowed: false,
            reason: 'AI insights not available in your plan',
            upgradeRequired: 'pro'
          };
        }
        if (usage.aiQueriesUsed >= usage.monthlyQuota.aiQueries) {
          return {
            allowed: false,
            reason: 'Monthly AI query limit reached',
            upgradeRequired: 'pro'
          };
        }
        return { allowed: true };

      case 'cloud_sync':
        if (!features.cloudSync) {
          return {
            allowed: false,
            reason: 'Cloud sync not available in your plan',
            upgradeRequired: 'basic'
          };
        }
        return { allowed: true };

      case 'api_access':
        if (!features.apiAccess) {
          return {
            allowed: false,
            reason: 'API access not available in your plan',
            upgradeRequired: 'pro'
          };
        }
        return { allowed: true };

      default:
        return { allowed: true };
    }
  }

  /**
   * Track usage for billing
   */
  trackUsage(metric: keyof UsageMetrics, increment: number = 1): void {
    if (!this.currentSession) return;

    if (typeof this.currentSession.usage[metric] === 'number') {
      (this.currentSession.usage[metric] as number) += increment;
      // Clamp to 0 to prevent negative counts
    if ((this.currentSession.usage[metric] as number) < 0) {
      (this.currentSession.usage[metric] as number) = 0;
    }
    }

    this.saveCurrentSession();
  }

  /**
   * Upgrade subscription tier
   */
  upgradeSubscription(newTier: 'basic' | 'pro' | 'enterprise'): void {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    console.log(`⬆️ Upgrading subscription from ${this.currentSession.subscription.tier} to ${newTier}`);

    this.currentSession.subscription.tier = newTier;
    this.currentSession.subscription.status = 'active';
    this.currentSession.subscription.startDate = new Date();
    this.currentSession.features = SUBSCRIPTION_TIERS[newTier];

    // Update monthly quotas based on tier
    switch (newTier) {
      case 'basic':
        this.currentSession.usage.monthlyQuota = {
          devices: 20,
          mqttMessages: 100000,
          aiQueries: 0,
          storage: 200 * 1024 * 1024 // 200MB
        };
        break;
      case 'pro':
        this.currentSession.usage.monthlyQuota = {
          devices: 100,
          mqttMessages: 1000000,
          aiQueries: 10000,
          storage: 1024 * 1024 * 1024 // 1GB
        };
        break;
      case 'enterprise':
        this.currentSession.usage.monthlyQuota = {
          devices: -1,
          mqttMessages: -1,
          aiQueries: -1,
          storage: -1
        };
        break;
    }

    this.saveCurrentSession();
    this.notifyListeners(this.currentSession);
  }

  /**
   * Reset monthly usage (called at billing cycle)
   */
  resetMonthlyUsage(): void {
    if (!this.currentSession) return;

    console.log('🔄 Resetting monthly usage');

    this.currentSession.usage = {
      ...this.currentSession.usage,
      mqttMessagesProcessed: 0,
      aiQueriesUsed: 0,
      lastReset: new Date()
    };

    this.saveCurrentSession();
  }

  /**
   * Export user data (GDPR compliance)
   */
  exportUserData(): string {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    return JSON.stringify(this.currentSession, null, 2);
  }

  /**
   * Subscribe to session changes
   */
  subscribe(listener: (session: UserSession | null) => void): () => void {
    this.sessionListeners.add(listener);
    return () => this.sessionListeners.delete(listener);
  }

  private notifyListeners(session: UserSession | null): void {
    this.sessionListeners.forEach(listener => {
      try {
        listener(session);
      } catch (error) {
        console.error('Session listener error:', error);
      }
    });
  }

  // =============================================================================
  // Storage Methods
  // =============================================================================

  private getSessionKey(userId: string): string {
    return `${SESSION_PREFIX}${userId}`;
  }

  private loadUserSession(userId: string): UserSession | null {
    try {
      const key = this.getSessionKey(userId);
      const raw = localStorage.getItem(key);

      if (!raw) return null;

      const session = JSON.parse(raw);

      // Parse dates in session
      session.createdAt = new Date(session.createdAt);
      session.lastAccess = new Date(session.lastAccess);
      if (session.subscription.startDate) {
        session.subscription.startDate = new Date(session.subscription.startDate);
      }
      if (session.subscription.endDate) {
        session.subscription.endDate = new Date(session.subscription.endDate);
      }
      session.usage.lastReset = new Date(session.usage.lastReset);

      // 🆕 FIX: Deserialize dates in devices array
      if (session.devices && Array.isArray(session.devices)) {
        session.devices = session.devices.map((device: any) => ({
          ...device,
          lastSeen: device.lastSeen ? new Date(device.lastSeen) : undefined,
          createdAt: device.createdAt ? new Date(device.createdAt) : undefined,
          lastValidation: device.lastValidation ? new Date(device.lastValidation) : undefined,
          deletedAt: device.deletedAt ? new Date(device.deletedAt) : undefined,
          deleteScheduledFor: device.deleteScheduledFor ? new Date(device.deleteScheduledFor) : undefined
        }));
      }

      return session;
    } catch (error) {
      console.error('Failed to load user session:', error);
      return null;
    }
  }

  private saveCurrentSession(): void {
    if (!this.currentSession) return;

    try {
      const key = this.getSessionKey(this.currentSession.userId);
      localStorage.setItem(key, JSON.stringify(this.currentSession));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  private markActiveSession(userId: string): void {
    localStorage.setItem(ACTIVE_SESSION_KEY, userId);
  }

  /**
   * Restore session on app startup
   */
  /**restoreSession(): UserSession | null {
    try {
      const activeUserId = localStorage.getItem(ACTIVE_SESSION_KEY);
      if (!activeUserId) return null;

      const session = this.loadUserSession(activeUserId);
      if (session) {
        this.currentSession = session;
        this.notifyListeners(session);
      }

      return session;
    } catch (error) {
      console.error('Failed to restore session:', error);
      return null;
    }
  }**/

    /**
   * Restore session on app startup - FIXED to not trigger on every call
   */
    restoreSession(): UserSession | null {
      try {
        const activeUserId = localStorage.getItem(ACTIVE_SESSION_KEY);
        if (!activeUserId) return null;

        // 🆕 FIX: Check if session already in memory
        if (this.currentSession && this.currentSession.userId === activeUserId) {
          console.log('✅ Using existing session from memory');
          return this.currentSession;
        }

        console.log('📂 Restoring session from storage...');
        const session = this.loadUserSession(activeUserId);
        if (session) {
          // 🆕 Sync devicesCreated with actual device count on restore
          session.usage.devicesCreated = session.devices.length;
          this.currentSession = session;
          this.notifyListeners(session);
        }

        return session;
      } catch (error) {
        console.error('Failed to restore session:', error);
        return null;
      }
    }

  // =============================================================================
  // Default Config Getters
  // =============================================================================

  private getDefaultMqttSettings(): MqttSettings {
    return {
      host: '127.0.0.1',
      port: 9001,
      username: '',
      password: '',
      clientId: `tasmota_${Math.random().toString(36).substr(2, 9)}`,
      useSSL: false,
      wasConnected: false
    };
  }

  private getDefaultAIConfig(): OllamaConfig {
    return {
      enabled: false,
      host: 'http://localhost:11434',
      model: 'llama2',
      autoAnalyze: false,
      analysisInterval: 300000,
      port: 11434
    };
  }

  private getDefaultIndexedDBSettings(): IndexedDBSettings {
    return {
      enabled: true,
      autoCleanup: true,
      maxRecordsPerDevice: 10000
    };
  }
// 🛡️ NEW: Track shield statistics
trackShieldEvent(event: 'command' | 'blocked' | 'emergency_stop'): void {
  if (!this.currentSession || !this.currentSession.shieldStats) return;

  switch (event) {
    case 'command':
      this.currentSession.shieldStats.totalCommands++;
      break;
    case 'blocked':
      this.currentSession.shieldStats.blockedCommands++;
      break;
    case 'emergency_stop':
      this.currentSession.shieldStats.emergencyStops++;
      this.currentSession.shieldStats.lastEmergencyStop = new Date();
      break;
  }

  this.saveCurrentSession();
}
}

// Singleton instance
export const userSessionManager = new UserSessionManager();