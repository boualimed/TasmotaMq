import { ollamaAIService, OllamaConfig } from './ollama-ai.service';
import { supabaseService } from './supabase.service';
import { SupabaseSettings } from '../models/supabase.model';
import { userSessionManager } from '../services/user-session.manager';
import { logger } from '../utils/logger.util';
import { notificationService } from './notification.service';
import { mqttService } from './mqtt-service';
import { commandShield } from './command-shield.service';

/**
 * Service Manager - Handles initialization order and dependencies
 */
export class ServiceManager {
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private sessionUnsubscribe: (() => void) | null = null;
  private shieldInitialized = false; // 🛡️

  constructor() {
    // Subscribe to session changes
    this.sessionUnsubscribe = userSessionManager.subscribe((session) => {
      if (session) {
        // User logged in - initialize services with their settings
        this.initialize().catch(error => {
          logger.addLog('error', `Failed to initialize services: ${error.message}`);
        });
      } else {
        // User logged out - reset services
        this.reset().catch(error => {
          logger.addLog('error', `Failed to reset services: ${error.message}`);
        });
      }
    });
    // 🛡️ Initialize shield IMMEDIATELY (before user login)
    this.initializeShield();
  }

  /**
   * Initialize all services in correct order
   */
  async initialize(): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (this.initPromise) {
      return this.initPromise;
    }

    if (this.initialized) {
      return Promise.resolve();
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      logger.addLog('info', '🔧 Initializing services...');

      // 🛡️ VERIFY: Shield must be active before proceeding
      if (!this.isShieldActive()) {
        throw new Error('Command Shield is not active - cannot initialize services');
      }
      // Get current user session
      const session = userSessionManager.getCurrentSession();
      if (!session) {
        logger.addLog('warning', '⚠️ No active session - skipping service initialization');
        return;
      }

      // Step 1: Initialize Supabase (if enabled in user session)
      const supabaseSettings = session.supabaseSettings;
      if (supabaseSettings?.enabled) {
        logger.addLog('info', '📊 Initializing Supabase...');
        const result = await supabaseService.initialize({
          url: supabaseSettings.config.url,
          anonKey: supabaseSettings.config.anonKey
        });

        if (result.success) {
          logger.addLog('success', '✅ Supabase ready');
        } else {
          logger.addLog('warning', `⚠️ Supabase init failed: ${result.error}`);
        }
      }

      // Step 2: Initialize AI service (from user session)
      const aiConfig = session.aiConfig;
      if (aiConfig?.enabled) {
        logger.addLog('info', '🤖 Initializing AI service...');
        await ollamaAIService.initialize(aiConfig);
        logger.addLog('success', '✅ AI service ready');
      }

      this.initialized = true;
      logger.addLog('success', '✅ All services initialized');
      notificationService.success('🚀 Services initialized', 2000);
    } catch (error: any) {
      logger.addLog('error', `❌ Service initialization error: ${error.message}`);
      notificationService.error(`❌ Service init failed: ${error.message}`, 5000);
      throw error;
    } finally {
      this.initPromise = null;
    }
  }

    /**
   * 🛡️ Initialize Command Shield
   * This runs BEFORE user login - shield is always active
   */
    private initializeShield(): void {
      if (this.shieldInitialized) {
        return;
      }

      try {
        console.log('🛡️ Initializing Command Shield...');

        // Register shield with MQTT service
        mqttService.registerCommandShield(commandShield);

        this.shieldInitialized = true;
        logger.addLog('success', '🛡️ Command Shield active and protecting devices');
        console.log('✅ Command Shield initialized successfully');

      } catch (error: any) {
        console.error('❌ CRITICAL: Command Shield initialization failed:', error);
        logger.addLog('error', `🚨 Shield init failed: ${error.message}`);

        // Show blocking error - shield MUST be initialized
        this.showShieldError();
      }
    }

  /**
   * 🛡️  Show critical error if shield fails
   */
  private showShieldError(): void {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 0, 0, 0.95);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    errorDiv.innerHTML = `
      <div style="text-align: center; max-width: 600px; padding: 40px;">
        <h1 style="font-size: 48px; margin-bottom: 20px;">🚨 CRITICAL ERROR</h1>
        <p style="font-size: 24px; margin-bottom: 30px;">
          Safety system initialization failed.
        </p>
        <p style="font-size: 18px; opacity: 0.9; margin-bottom: 40px;">
          The Command Shield safety system could not start. Device control is disabled for your safety.
        </p>
        <button onclick="location.reload()" style="
          padding: 16px 32px;
          font-size: 18px;
          background: white;
          color: black;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
        ">
          Reload Application
        </button>
      </div>
    `;
    document.body.appendChild(errorDiv);
  }

   /**
   * 🛡️ Check if shield is active
   */
   isShieldActive(): boolean {
    return this.shieldInitialized && mqttService.isShieldActive();
  }

  /**
     * 🛡️  Get shield status
     */
  getShieldStatus() {
    if (!this.shieldInitialized) {
      return {
        emergencyStopActive: false,
        globalPauseActive: false,
        blacklistedDevices: 0,
        activeCommands: 0,
        deviceLocks: 0
      };
    }
    return commandShield.getStatus();
  }

  /**
   * Update Supabase settings
   * This will save to user session and reinitialize if needed
   */
  async updateSupabaseSettings(settings: SupabaseSettings): Promise<void> {
    try {
      // Save settings (this will update user session via supabaseService)
      supabaseService.saveSettings(settings);

      // If enabled, initialize
      if (settings.enabled && settings.config.url && settings.config.anonKey) {
        logger.addLog('info', '📊 Updating Supabase configuration...');
        const result = await supabaseService.initialize({
          url: settings.config.url,
          anonKey: settings.config.anonKey
        });

        if (!result.success) {
          logger.addLog('error', `Failed to initialize Supabase: ${result.error}`);
          throw new Error(result.error);
        }
      } else {
        // Disable if needed
        supabaseService.disconnect();
        logger.addLog('info', '📊 Supabase disabled');
      }
    } catch (error: any) {
      logger.addLog('error', `Failed to update Supabase settings: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update AI configuration
   * This will save to user session
   */
  async updateAIConfig(config: Partial<OllamaConfig>): Promise<void> {
    try {
      await ollamaAIService.updateConfig(config);

      // Update user session
      const session = userSessionManager.getCurrentSession();
      if (session) {
        userSessionManager.updateSessionField('aiConfig', {
          ...session.aiConfig,
          ...config
        });
      }

      logger.addLog('info', '🤖 AI configuration updated');
      notificationService.success('✅ AI config updated', 2000);
    } catch (error: any) {
      logger.addLog('error', `Failed to update AI config: ${error.message}`);
      notificationService.error(`❌ AI config update failed: ${error.message}`, 5000);
      throw error;
    }
  }

  /**
   * Get Supabase statistics
   */
  getSupabaseStats(): { insertCount: number; errorCount: number; queueSize: number } {
    return supabaseService.getStats();
  }

  /**
   * Check if Supabase is enabled
   */
  isSupabaseEnabled(): boolean {
    return supabaseService.isEnabled();
  }

  /**
   * Flush Supabase queues manually
   */
  async flushSupabaseQueues(): Promise<void> {
    await supabaseService.flushAll();
    logger.addLog('info', '💾 Supabase queues flushed');
  }

  /**
   * Cleanup old Supabase records
   */
  async cleanupSupabaseRecords(userId: string): Promise<void> {
    await supabaseService.cleanupOldRecords(userId);
  }

  /**
   * Delete all user data from Supabase
   */
  async deleteUserSupabaseData(userId: string): Promise<{ success: boolean; error?: string }> {
    return await supabaseService.deleteUserData(userId);
  }

  /**
   * Reset all services (called on logout)
   */
  async reset(): Promise<void> {
    logger.addLog('info', '🔄 Resetting services...');

    try {
      // Flush any pending data before disconnecting
      await supabaseService.flushAll();

      // Disconnect services
      supabaseService.disconnect();
      ollamaAIService.destroy();

      this.initialized = false;
      this.initPromise = null;
      // 🛡️ NOTE: Shield remains active (never reset)
      logger.addLog('info', '🛡️ Command Shield remains active');
      logger.addLog('success', '✅ Services reset');
      notificationService.info('👋 Services disconnected', 2000);
    } catch (error: any) {
      logger.addLog('error', `Reset error: ${error.message}`);
      notificationService.error(`❌ Reset error: ${error.message}`, 5000);
    }
  }

  /**
   * Check if services are initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Cleanup on destruction
   */
  destroy(): void {
    if (this.sessionUnsubscribe) {
      this.sessionUnsubscribe();
      this.sessionUnsubscribe = null;
    }
    this.reset();
  }
}

// Singleton instance
export const serviceManager = new ServiceManager();