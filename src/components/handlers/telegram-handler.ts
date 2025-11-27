// src/components/handlers/telegram-handler.ts
// Enhanced handler with support for all device types + HISTORY FIX

import { telegramService } from '../../services/telegram.service';
import {
  TelegramAlertConfig,
  TelegramNotification,
  TelegramSettings,
  DEFAULT_ALERT_CONFIG,
  DEFAULT_TELEGRAM_SETTINGS,
  AlertType,
  getAlertTypeUnit,
  alertTypeRequiresThreshold,
  alertTypeRequiresState
} from '../../models/telegram.model';
import { Device } from '../../models/device.model';
import { logger } from '../../utils/logger.util';
import { userSessionManager } from '../../services/user-session.manager';
import { deviceService } from '../../services/device-service';
import { notificationService } from '../../services/notification.service';
import { storageService } from '../../services/storage-service';
import { authService } from '../../services/auth.service';

export class TelegramHandler {
  private alertConfigs: Map<string, TelegramAlertConfig> = new Map();
  private notificationHistory: TelegramNotification[] = [];
  private settings: TelegramSettings = { ...DEFAULT_TELEGRAM_SETTINGS };
  private unsubscribers: (() => void)[] = [];
  private pendingAlerts: Map<string, TelegramNotification[]> = new Map();  // 🆕 For grouping

  // =============================================================================
  // Initialization
  // =============================================================================

  async initialize(): Promise<void> {
    const session = userSessionManager.getCurrentSession();

    if (session?.telegramSettings) {
      this.settings = { ...DEFAULT_TELEGRAM_SETTINGS, ...session.telegramSettings };
      telegramService.initialize(this.settings);
      logger.addLog('info', '📱 Telegram settings loaded from session');
    } else {
      this.settings = { ...DEFAULT_TELEGRAM_SETTINGS };
      userSessionManager.updateSession({
        telegramSettings: this.settings
      });
      logger.addLog('info', '📱 Telegram initialized with default settings');
    }

    if (session?.telegramAlertConfigs) {
      this.alertConfigs = new Map(Object.entries(session.telegramAlertConfigs));
      logger.addLog('info', `📱 Loaded ${this.alertConfigs.size} alert configurations`);
    } else {
      this.alertConfigs = new Map();
      userSessionManager.updateSession({
        telegramAlertConfigs: {}
      });
    }

    // 🆕 Load notification history from session
    if (session?.telegramNotificationHistory) {
      this.notificationHistory = session.telegramNotificationHistory;
      logger.addLog('info', `📱 Loaded ${this.notificationHistory.length} notification history items`);
    } else {
      this.notificationHistory = [];
    }

    this.subscribeToTelegramService();
    logger.addLog('success', '📱 TelegramHandler initialized successfully');
  }

  private subscribeToTelegramService(): void {
    this.unsubscribers.push(
      telegramService.subscribe((settings) => {
        this.settings = settings;
        logger.addLog('info', '📱 Telegram settings synchronized');
      })
    );
  }

  cleanup(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    logger.addLog('info', '📱 TelegramHandler cleanup complete');
  }

  // =============================================================================
  // Settings Management
  // =============================================================================

  updateSettings(settings: TelegramSettings): void {
    this.settings = settings;
    telegramService.updateSettings(settings);

    const session = userSessionManager.getCurrentSession();
    if (session) {
      userSessionManager.updateSession({
        telegramSettings: settings
      });
      logger.addLog('success', '💾 Telegram settings saved to session');
      notificationService.success('📱 Telegram settings saved successfully', 3000);
    }

    this.saveToStorage();
  }

  getSettings(): TelegramSettings {
    return this.settings;
  }

  async testConnection(botToken: string, chatId: string): Promise<{ success: boolean; error?: string }> {
    logger.addLog('info', '🧪 Testing Telegram connection...');
    notificationService.info('🧪 Testing Telegram connection...', 2000);

    const result = await telegramService.testConnection(botToken, chatId);

    if (result.success) {
      logger.addLog('success', '✅ Telegram connection test successful');
      notificationService.success('✅ Connection test successful! Check Telegram.', 5000);
    } else {
      logger.addLog('error', `❌ Telegram test failed: ${result.error}`);
      notificationService.error(`❌ Test failed: ${result.error}`, 5000);
    }

    return result;
  }

  // =============================================================================
  // Alert Configuration Management
  // =============================================================================

  configureAlert(deviceId: string, config: Partial<TelegramAlertConfig>): void {
    const device = deviceService.getDevice(deviceId);
    if (!device) {
      notificationService.error('❌ Device not found', 3000);
      return;
    }

    const existingConfig = this.alertConfigs.get(deviceId);

    // 🆕 Use global default cooldown if not specified
    const cooldownMinutes = config.cooldownMinutes ??
                           existingConfig?.cooldownMinutes ??
                           this.settings.defaultCooldownMinutes;

    const newConfig: TelegramAlertConfig = {
      ...DEFAULT_ALERT_CONFIG,
      ...existingConfig,
      ...config,
      deviceId,
      deviceName: device.name,
      deviceType: device.type,
      cooldownMinutes
    } as TelegramAlertConfig;

    this.alertConfigs.set(deviceId, newConfig);
    this.saveConfigs();

    logger.addLog('success', `📱 Alert configured: ${device.name}`);
    notificationService.success(`📱 Alert configured for ${device.name}`, 3000);
  }

  getAlertConfig(deviceId: string): TelegramAlertConfig | undefined {
    return this.alertConfigs.get(deviceId);
  }

  getAllAlertConfigs(): Map<string, TelegramAlertConfig> {
    return this.alertConfigs;
  }

  removeAlertConfig(deviceId: string): void {
    this.alertConfigs.delete(deviceId);
    this.saveConfigs();

    const device = deviceService.getDevice(deviceId);
    const deviceName = device?.name || deviceId;

    logger.addLog('info', `📱 Alert removed: ${deviceName}`);
    notificationService.info(`🗑️ Alert removed for ${deviceName}`, 3000);
  }

  toggleAlert(deviceId: string, enabled: boolean): void {
    const config = this.alertConfigs.get(deviceId);
    if (config) {
      config.enabled = enabled;
      this.alertConfigs.set(deviceId, config);
      this.saveConfigs();

      const device = deviceService.getDevice(deviceId);
      const deviceName = device?.name || deviceId;
      const status = enabled ? 'enabled' : 'disabled';

      logger.addLog('info', `📱 Alert ${status}: ${deviceName}`);
      notificationService.info(`📱 Telegram alert ${status} for ${deviceName}`, 3000);
    }
  }

  // =============================================================================
  // Enhanced Threshold Monitoring (All Device Types)
  // =============================================================================

  /**
   * 🆕 Universal alert checker - supports all device types
   */
  checkAndNotify(device: Device, alertType: AlertType, value: number | string | boolean): void {
    if (!telegramService.isEnabled()) {
      return;
    }

    const config = this.alertConfigs.get(device.id);
    if (!config || !config.enabled) {
      return;
    }

    // Check if alert type matches
    if (config.alertType !== alertType) {
      return;
    }

    // Check quiet hours
    if (this.isQuietHours()) {
      console.log('🔕 [Telegram] Quiet hours active - alert suppressed');
      return;
    }

    // Check cooldown period
    if (this.isInCooldown(config)) {
      console.log('⏰ [Telegram] Cooldown active - alert suppressed');
      return;
    }

    // Check thresholds or state based on alert type
    const violation = this.checkAlertCondition(config, value);

    if (!violation) {
      // Check if we should send restore notification
      if (config.alertOnRestore && config.lastAlertTime) {
        this.sendRestoreNotification(device, config, value);
      }
      return;
    }

    // Send alert notification
    this.sendAlertNotification(device, config, value, violation);
  }

  /**
   * 🆕 Check if we're in quiet hours
   */
  private isQuietHours(): boolean {
    if (!this.settings.quietHoursEnabled || !this.settings.quietHoursStart || !this.settings.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const start = this.settings.quietHoursStart;
    const end = this.settings.quietHoursEnd;

    // Handle overnight periods (e.g., 22:00 to 07:00)
    if (start > end) {
      return currentTime >= start || currentTime < end;
    }

    return currentTime >= start && currentTime < end;
  }

  private isInCooldown(config: TelegramAlertConfig): boolean {
    if (!config.lastAlertTime) {
      return false;
    }

    const now = new Date();
    const lastAlert = new Date(config.lastAlertTime);
    const diffMinutes = (now.getTime() - lastAlert.getTime()) / (1000 * 60);

    return diffMinutes < config.cooldownMinutes;
  }

  /**
   * 🆕 Check alert condition based on type
   */
  private checkAlertCondition(
    config: TelegramAlertConfig,
    value: number | string | boolean
  ): { type: 'min' | 'max' | 'state'; threshold?: number; state?: string } | null {

    // Threshold-based alerts
    if (alertTypeRequiresThreshold(config.alertType)) {
      const numValue = typeof value === 'number' ? value : parseFloat(String(value));

      if (isNaN(numValue)) {
        return null;
      }

      if (config.maxThreshold !== undefined && numValue > config.maxThreshold) {
        return { type: 'max', threshold: config.maxThreshold };
      }

      if (config.minThreshold !== undefined && numValue < config.minThreshold) {
        return { type: 'min', threshold: config.minThreshold };
      }
    }

    // State-based alerts
    if (alertTypeRequiresState(config.alertType)) {
      // Alert on any state change
      return { type: 'state', state: String(value) };
    }

    return null;
  }

  /**
   * 🆕 Send alert notification with enhanced formatting
   * 🔧 FIX: Add to history IMMEDIATELY before queueing
   */
  private sendAlertNotification(
    device: Device,
    config: TelegramAlertConfig,
    value: number | string | boolean,
    violation: { type: 'min' | 'max' | 'state'; threshold?: number; state?: string }
  ): void {
    const notification: TelegramNotification = {
      id: `${device.id}-${Date.now()}`,
      deviceId: device.id,
      deviceName: device.name,
      deviceType: device.type,
      alertType: config.alertType,
      sensorType: config.alertType, // 🆕 Backward compatibility
      value,
      threshold: violation.threshold,
      type: this.determineAlertType(config, value, violation),
      message: this.createAlertMessage(config, value, violation),
      timestamp: new Date(),
      sent: false,
      priority: config.priority || 'normal'
    };

    // 🔧 FIX: Add to history IMMEDIATELY (before queueing)
    this.notificationHistory.unshift(notification);
    if (this.notificationHistory.length > 100) {
      this.notificationHistory = this.notificationHistory.slice(0, 100);
    }

    // Group alerts if enabled
    if (this.settings.groupAlerts) {
      this.queueGroupedAlert(notification);
    } else {
      telegramService.queueNotification(notification);
    }

    // Update last alert time
    config.lastAlertTime = new Date();
    this.alertConfigs.set(device.id, config);
    this.saveConfigs();

    // Log and notify in UI
    const emoji = notification.type === 'critical' ? '🚨' : '⚠️';
    logger.addLog(notification.type === 'critical' ? 'error' : 'warning',
      `${emoji} Alert: ${device.name} ${config.alertType}`);

    notificationService[notification.type === 'critical' ? 'error' : 'warning'](
      `${emoji} ${device.name}: ${config.alertType} alert triggered!`,
      5000
    );
  }

  /**
   * 🆕 Queue grouped alerts
   */
  private queueGroupedAlert(notification: TelegramNotification): void {
    const key = notification.deviceId;
    const queue = this.pendingAlerts.get(key) || [];
    queue.push(notification);
    this.pendingAlerts.set(key, queue);

    // Send after delay
    setTimeout(() => {
      const alerts = this.pendingAlerts.get(key);
      if (alerts && alerts.length > 0) {
        if (alerts.length === 1) {
          telegramService.queueNotification(alerts[0]);
        } else {
          // Combine multiple alerts
          const combined = this.combineAlerts(alerts);
          telegramService.queueNotification(combined);
        }
        this.pendingAlerts.delete(key);
      }
    }, this.settings.groupAlertDelay * 1000);
  }

  /**
   * 🆕 Combine multiple alerts into one message
   */
  private combineAlerts(alerts: TelegramNotification[]): TelegramNotification {
    const first = alerts[0];
    const messages = alerts.map(a => a.message).join('\n\n');

    return {
      ...first,
      message: `📊 Multiple alerts for ${first.deviceName}:\n\n${messages}`,
      type: alerts.some(a => a.type === 'critical') ? 'critical' : 'warning'
    };
  }

  /**
   * 🆕 Determine alert type (warning/critical)
   */
  private determineAlertType(
    config: TelegramAlertConfig,
    value: number | string | boolean,
    violation: { type: 'min' | 'max' | 'state'; threshold?: number }
  ): 'warning' | 'critical' {
    if (config.priority === 'high') {
      return 'critical';
    }

    if (config.priority === 'low') {
      return 'warning';
    }

    // Threshold-based criticality
    if (violation.threshold !== undefined && typeof value === 'number') {
      const diff = Math.abs(value - violation.threshold);
      const percentage = (diff / violation.threshold) * 100;
      return percentage > 20 ? 'critical' : 'warning';
    }

    return 'warning';
  }

  /**
   * 🆕 Create enhanced alert message
   */
  private createAlertMessage(
    config: TelegramAlertConfig,
    value: number | string | boolean,
    violation: { type: 'min' | 'max' | 'state'; threshold?: number; state?: string }
  ): string {
    // Use custom message if provided
    if (config.customMessage) {
      return config.customMessage
        .replace('{value}', String(value))
        .replace('{threshold}', String(violation.threshold || ''))
        .replace('{device}', config.deviceName);
    }

    const unit = getAlertTypeUnit(config.alertType);

    if (violation.type === 'state') {
      return `${config.alertType} changed to: ${value}`;
    }

    if (violation.type === 'max') {
      return `${config.alertType} exceeded maximum! Current: ${value}${unit}, Max: ${violation.threshold}${unit}`;
    }

    if (violation.type === 'min') {
      return `${config.alertType} below minimum! Current: ${value}${unit}, Min: ${violation.threshold}${unit}`;
    }

    return `Alert triggered: ${config.alertType} = ${value}${unit}`;
  }

  /**
   * 🔧 FIX: Add to history IMMEDIATELY
   */
  private sendRestoreNotification(device: Device, config: TelegramAlertConfig, value: number | string | boolean): void {
    const notification: TelegramNotification = {
      id: `${device.id}-restore-${Date.now()}`,
      deviceId: device.id,
      deviceName: device.name,
      deviceType: device.type,
      alertType: config.alertType,
      sensorType: config.alertType, // 🆕 Backward compatibility
      value,
      threshold: 0,
      type: 'restore',
      message: `${config.alertType} returned to normal: ${value}${getAlertTypeUnit(config.alertType)}`,
      timestamp: new Date(),
      sent: false,
      priority: config.priority || 'normal'
    };

    // 🔧 FIX: Add to history IMMEDIATELY
    this.notificationHistory.unshift(notification);
    if (this.notificationHistory.length > 100) {
      this.notificationHistory = this.notificationHistory.slice(0, 100);
    }

    telegramService.queueNotification(notification);

    config.lastAlertTime = undefined;
    this.alertConfigs.set(device.id, config);
    this.saveConfigs();

    logger.addLog('success', `✅ Restored: ${device.name} ${config.alertType}`);
    notificationService.success(`✅ ${device.name}: ${config.alertType} returned to normal`, 4000);
  }

  // =============================================================================
  // Custom Notifications (for Rules Engine)
  // =============================================================================

  async sendCustomNotification(deviceId: string, message: string): Promise<void> {
    if (!telegramService.isEnabled()) {
      logger.addLog('warning', '📱 Telegram not enabled - cannot send notification');
      return;
    }

    const device = deviceService.getDevice(deviceId);
    const deviceName = device?.name || deviceId;

    logger.addLog('info', `📱 Sending custom Telegram notification for ${deviceName}`);

    await telegramService.sendCustomNotification(deviceName, message);

    notificationService.info(`📱 Telegram message sent to ${deviceName}`, 3000);
  }

  // =============================================================================
  // Notification History
  // =============================================================================

  getNotificationHistory(): TelegramNotification[] {
    return this.notificationHistory;
  }

  clearNotificationHistory(): void {
    this.notificationHistory = [];

    // 🆕 Save cleared history to session
    const session = userSessionManager.getCurrentSession();
    if (session) {
      userSessionManager.updateSession({
        telegramNotificationHistory: []
      });
    }

    logger.addLog('info', '📱 Telegram notification history cleared');
    notificationService.info('🗑️ Notification history cleared', 3000);
  }

  // =============================================================================
  // Persistence
  // =============================================================================

  private saveConfigs(): void {
    const session = userSessionManager.getCurrentSession();
    if (session) {
      const configsObject = Object.fromEntries(this.alertConfigs);
      userSessionManager.updateSession({
        telegramAlertConfigs: configsObject,
        telegramNotificationHistory: this.notificationHistory  // 🆕 Save history too
      });
    }

    this.saveToStorage();
  }

  private saveToStorage(): void {
    const user = authService.getCurrentUser();
    if (!user) {
      logger.addLog('warning', '⚠️ Cannot save Telegram settings - no active user');
      return;
    }

    const session = userSessionManager.getCurrentSession();
    if (session) {
      storageService.save(
        {
          devices: session.devices,
          mqttSettings: session.mqttSettings
        },
        user.id
      );

      logger.addLog('success', '💾 Telegram settings saved to storage');
    }
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  getStats(): {
    totalConfigs: number;
    activeConfigs: number;
    totalNotifications: number;
    successfulNotifications: number;
  } {
    const activeConfigs = Array.from(this.alertConfigs.values()).filter(c => c.enabled).length;
    const successfulNotifications = this.notificationHistory.filter(n => n.sent).length;

    return {
      totalConfigs: this.alertConfigs.size,
      activeConfigs,
      totalNotifications: this.notificationHistory.length,
      successfulNotifications
    };
  }
}