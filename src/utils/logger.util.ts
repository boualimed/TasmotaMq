import { LogEntry } from '../models/app-state.model';
import { MQTT_CONFIG } from '../constants/mqtt.constants';

export class Logger {
  private logs: LogEntry[] = [];
  private listeners: Set<(logs: LogEntry[]) => void> = new Set();

  addLog(type: 'info' | 'success' | 'error', message: string): void {
    this.logs = [...this.logs.slice(-MQTT_CONFIG.MAX_LOGS + 1), {
      type,
      message,
      timestamp: new Date()
    }];
    this.notifyListeners();
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getRecentLogs(count: number = MQTT_CONFIG.DISPLAY_LOGS): LogEntry[] {
    return this.logs.slice(-count);
  }

  clearLogs(): void {
    this.logs = [];
    this.notifyListeners();
  }

  subscribe(listener: (logs: LogEntry[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.logs]));
  }
}

// Singleton instance
export const logger = new Logger();