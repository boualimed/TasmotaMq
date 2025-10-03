export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration: number;
  timestamp: number;
}

class NotificationService {
  private listeners: Set<(notification: Notification) => void> = new Set();
  private notifications: Map<string, Notification> = new Map();

  /**
   * Show a success notification
   */
  success(message: string, duration: number = 3000): void {
    this.show('success', message, duration);
  }

  /**
   * Show an error notification
   */
  error(message: string, duration: number = 5000): void {
    this.show('error', message, duration);
  }

  /**
   * Show a warning notification
   */
  warning(message: string, duration: number = 4000): void {
    this.show('warning', message, duration);
  }

  /**
   * Show an info notification
   */
  info(message: string, duration: number = 3000): void {
    this.show('info', message, duration);
  }

  /**
   * Show a notification
   */
  private show(type: NotificationType, message: string, duration: number): void {
    const notification: Notification = {
      id: `notification-${Date.now()}-${Math.random()}`,
      type,
      message,
      duration,
      timestamp: Date.now()
    };

    this.notifications.set(notification.id, notification);
    this.notifyListeners(notification);

    // Auto-remove notification after duration
    if (duration > 0) {
      setTimeout(() => {
        this.remove(notification.id);
      }, duration);
    }
  }

  /**
   * Remove a notification
   */
  remove(id: string): void {
    this.notifications.delete(id);
  }

  /**
   * Subscribe to notifications
   */
  subscribe(callback: (notification: Notification) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(notification: Notification): void {
    this.listeners.forEach(listener => listener(notification));
  }

  /**
   * Get all active notifications
   */
  getAll(): Notification[] {
    return Array.from(this.notifications.values());
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.notifications.clear();
  }
}

export const notificationService = new NotificationService();