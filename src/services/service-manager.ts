import { ollamaAIService, OllamaConfig } from './ollama-ai.service';
import { supabaseService } from './supabase.service';
import { SupabaseSettings } from '../models/supabase.model';
import { logger } from '../utils/logger.util';

/**
 * Service Manager - Handles initialization order and dependencies
 */
export class ServiceManager {
  private initialized = false;
  private initPromise: Promise<void> | null = null;

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

      // Step 1: Initialize Supabase first (if enabled)
      const supabaseSettings = supabaseService.getSettings();
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

      // Step 2: Initialize AI service (after Supabase)
      const aiConfig = this.loadAIConfig();
      if (aiConfig) {
        logger.addLog('info', '🤖 Initializing AI service...');
        await ollamaAIService.initialize(aiConfig);
        logger.addLog('success', '✅ AI service ready');
      }

      this.initialized = true;
      logger.addLog('success', '✅ All services initialized');
    } catch (error: any) {
      logger.addLog('error', `❌ Service initialization error: ${error.message}`);
      throw error;
    } finally {
      this.initPromise = null;
    }
  }

  /**
   * Update Supabase settings
   */
  async updateSupabaseSettings(settings: SupabaseSettings): Promise<void> {
    // Save settings first
    supabaseService.saveSettings(settings);

    // If enabled, initialize
    if (settings.enabled) {
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
    }
  }

  /**
   * Update AI configuration
   */
  async updateAIConfig(config: Partial<OllamaConfig>): Promise<void> {
    await ollamaAIService.updateConfig(config);
    logger.addLog('info', '🤖 AI configuration updated');
  }

  /**
   * Load AI config from storage
   */
  private loadAIConfig(): OllamaConfig | null {
    try {
      const raw = localStorage.getItem('ollama_ai_config');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (error) {
      console.error('Failed to load AI config:', error);
      return null;
    }
  }

  /**
   * Reset all services
   */
  async reset(): Promise<void> {
    logger.addLog('info', '🔄 Resetting services...');

    supabaseService.disconnect();
    ollamaAIService.destroy();

    this.initialized = false;
    this.initPromise = null;

    logger.addLog('success', '✅ Services reset');
  }

  /**
   * Check if services are initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance
export const serviceManager = new ServiceManager();