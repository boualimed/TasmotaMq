export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration: number;
  timestamp: Date;
}

export class NotificationService {
  private notifications: Notification[] = [];
  private listeners: Set<(notifications: Notification[]) => void> = new Set();

  /**
   * Shows a notification
   * @param type Type of notification
   * @param message Message to display
   * @param duration Duration in milliseconds (0 = no auto-dismiss)
   * @returns Notification ID
   */
  show(type: NotificationType, message: string, duration: number = 4000): string {
    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      duration,
      timestamp: new Date()
    };

    this.notifications = [...this.notifications, notification];
    this.notifyListeners();

    // Auto-dismiss if duration is set
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(notification.id);
      }, duration);
    }

    return notification.id;
  }

  /**
   * Shows a success notification
   */
  success(message: string, duration?: number): string {
    return this.show('success', message, duration);
  }

  /**
   * Shows an error notification
   */
  error(message: string, duration?: number): string {
    return this.show('error', message, duration);
  }

  /**
   * Shows a warning notification
   */
  warning(message: string, duration?: number): string {
    return this.show('warning', message, duration);
  }

  /**
   * Shows an info notification
   */
  info(message: string, duration?: number): string {
    return this.show('info', message, duration);
  }

  /**
   * Dismisses a notification
   */
  dismiss(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.notifyListeners();
  }

  /**
   * Clears all notifications
   */
  clearAll(): void {
    this.notifications = [];
    this.notifyListeners();
  }

  /**
   * Gets all active notifications
   */
  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  /**
   * Subscribes to notification changes
   */
  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }
}

// Singleton instance
export const notificationService = new NotificationService();