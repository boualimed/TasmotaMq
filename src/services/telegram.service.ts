// src/services/telegram.service.ts
// Service for Telegram Bot API communication

import { TelegramSettings, TelegramNotification, AlertSeverity, SENSOR_ICONS } from '../models/telegram.model';
import { logger } from '../utils/logger.util';

class TelegramService {
  private settings: TelegramSettings | null = null;
  private listeners: Array<(settings: TelegramSettings) => void> = [];
  private notificationQueue: TelegramNotification[] = [];
  private isProcessing = false;

  // =============================================================================
  // Initialization
  // =============================================================================

  initialize(settings: TelegramSettings): void {
    this.settings = settings;
    logger.addLog('info', '📱 Telegram service initialized');
    this.notifyListeners();
  }

  isEnabled(): boolean {
    return !!this.settings?.enabled
        && !!this.settings?.botToken
        && !!this.settings?.chatId;
  }

  getSettings(): TelegramSettings | null {
    return this.settings;
  }

  updateSettings(settings: TelegramSettings): void {
    this.settings = settings;
    this.notifyListeners();
  }

  // =============================================================================
  // API Communication
  // =============================================================================

  /**
   * Send a message via Telegram Bot API
   */
  async sendMessage(
    message: string,
    options: {
      parseMode?: 'Markdown' | 'HTML';
      disableNotification?: boolean;
      disableWebPagePreview?: boolean;
    } = {}
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isEnabled()) {
      logger.addLog('warning', '📱 Telegram not configured - message not sent');
      return { success: false, error: 'Telegram is not configured' };
    }

    const { botToken, chatId } = this.settings!;
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    logger.addLog('info', '📱 Sending Telegram message...');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: options.parseMode || 'HTML',
          disable_notification: options.disableNotification || false,
          disable_web_page_preview: options.disableWebPagePreview !== false
        })
      });

      const data = await response.json();

      if (data.ok) {
        logger.addLog('success', '✅ Telegram message sent successfully');
        return { success: true };
      } else {
        const error = data.description || 'Unknown error';
        logger.addLog('error', `❌ Telegram error: ${error}`);
        return { success: false, error };
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Network error';
      logger.addLog('error', `❌ Telegram request failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Test Telegram connection
   */
  async testConnection(botToken: string, chatId: string): Promise<{ success: boolean; error?: string }> {
    const url = `https://api.telegram.org/bot${botToken}/getMe`;

    try {
      // First, verify bot token
      const botResponse = await fetch(url);
      const botData = await botResponse.json();

      if (!botData.ok) {
        return { success: false, error: 'Invalid bot token' };
      }

      // Then, try to send a test message
      const testUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const testResponse = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: '✅ <b>Connection Test Successful!</b>\n\nYour Telegram bot is connected to the IoT Dashboard.',
          parse_mode: 'HTML'
        })
      });

      const testData = await testResponse.json();

      if (testData.ok) {
        logger.addLog('success', '✅ Telegram connection test passed');
        return { success: true };
      } else {
        const error = testData.description || 'Invalid chat ID or bot has no access';
        logger.addLog('error', `❌ Telegram test failed: ${error}`);
        return { success: false, error };
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Network error';
      logger.addLog('error', `❌ Telegram test failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Get bot information
   */
  async getBotInfo(): Promise<{ success: boolean; botName?: string; botUsername?: string; error?: string }> {
    if (!this.settings?.botToken) {
      return { success: false, error: 'No bot token configured' };
    }

    const url = `https://api.telegram.org/bot${this.settings.botToken}/getMe`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.ok) {
        return {
          success: true,
          botName: data.result.first_name,
          botUsername: data.result.username
        };
      } else {
        return { success: false, error: data.description || 'Failed to get bot info' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Network error' };
    }
  }

  // =============================================================================
  // Notification Queue Management
  // =============================================================================

  /**
   * Queue a notification for sending
   */
  queueNotification(notification: TelegramNotification): void {
    this.notificationQueue.push(notification);
    this.processQueue();
  }

  /**
   * Process queued notifications
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift()!;
      await this.sendNotification(notification);
      // Rate limiting: wait 1 second between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.isProcessing = false;
  }

  /**
   * Send a sensor alert notification
   */
  private async sendNotification(notification: TelegramNotification): Promise<void> {
    const message = this.formatNotificationMessage(notification);
    const result = await this.sendMessage(message, {
      parseMode: 'HTML',
      disableNotification: notification.type === 'restore'
    });

    if (result.success) {
      notification.sent = true;
      logger.addLog('success', `📱 Alert sent for ${notification.deviceName}`);
    } else {
      notification.sent = false;
      notification.error = result.error;
      logger.addLog('error', `📱 Failed to send alert for ${notification.deviceName}: ${result.error}`);
    }
  }

  /**
   * Format notification message for Telegram
   */
  private formatNotificationMessage(notification: TelegramNotification): string {
   const icon = notification.sensorType && SENSOR_ICONS[notification.sensorType]
  ? SENSOR_ICONS[notification.sensorType]
  : SENSOR_ICONS.custom;
    const severityIcon = this.getSeverityIcon(notification.type);
    const timestamp = new Date(notification.timestamp).toLocaleString();

    let message = `${severityIcon} <b>Sensor Alert</b>\n\n`;
    message += `${icon} <b>Device:</b> ${notification.deviceName}\n`;
    message += `📊 <b>Sensor:</b> ${notification.sensorType}\n`;
    message += `📈 <b>Current Value:</b> ${notification.value}\n`;

    if (notification.type !== 'restore') {
      message += `⚠️ <b>Threshold:</b> ${notification.threshold}\n`;
    }

    message += `🕐 <b>Time:</b> ${timestamp}\n\n`;
    message += `<i>${notification.message}</i>`;

    return message;
  }

  /**
   * Send custom notification (used by rules engine)
   */
  async sendCustomNotification(deviceName: string, message: string): Promise<void> {
    const formattedMessage = `🔔 <b>Rule Triggered</b>\n\n📱 <b>Device:</b> ${deviceName}\n\n${message}`;
    await this.sendMessage(formattedMessage);
  }

  /**
   * Get severity icon
   */
  private getSeverityIcon(type: 'warning' | 'critical' | 'restore' | 'info'): string {
    switch (type) {
      case 'critical':
        return AlertSeverity.CRITICAL;
      case 'warning':
        return AlertSeverity.WARNING;
      case 'restore':
        return AlertSeverity.RESTORE;
      case 'info':
        return AlertSeverity.INFO;
    }
  }

  // =============================================================================
  // Event Listeners
  // =============================================================================

  subscribe(callback: (settings: TelegramSettings) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notifyListeners(): void {
    if (this.settings) {
      this.listeners.forEach(callback => callback(this.settings!));
    }
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  /**
   * Clear all queued notifications
   */
  clearQueue(): void {
    this.notificationQueue = [];
    logger.addLog('info', '📱 Telegram notification queue cleared');
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { pending: number; isProcessing: boolean } {
    return {
      pending: this.notificationQueue.length,
      isProcessing: this.isProcessing
    };
  }
}

export const telegramService = new TelegramService();