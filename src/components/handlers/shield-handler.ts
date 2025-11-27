// src/components/handlers/shield-handler.ts
// Shield Handler - Bridges command-shield.service with UI layer
// Follows the same pattern as telegram-handler.ts

import { commandShield, CommandAuditLog } from '../../services/command-shield.service';
import { userSessionManager } from '../../services/user-session.manager';
import { deviceService } from '../../services/device-service';
import { logger } from '../../utils/logger.util';
import { notificationService } from '../../services/notification.service';

/**
 * Shield Handler
 *
 * PURPOSE: Act as the application-level coordinator for command shield
 * RESPONSIBILITIES:
 * - Subscribe to shield service events
 * - Update session statistics
 * - Manage shield state in application context
 * - Provide business logic methods for UI components
 * - Persist shield data to session/storage
 */
export class ShieldHandler {
  private unsubscribers: (() => void)[] = [];
  private statusListeners = new Set<(status: any) => void>();
  private metricsListeners = new Set<(metrics: any) => void>();

  // Cached metrics for performance
  private cachedMetrics: any = null;
  private lastMetricsUpdate = 0;
  private metricsUpdateInterval = 2000; // Update every 2 seconds max

  // =============================================================================
  // Initialization
  // =============================================================================

  async initialize(): Promise<void> {
    logger.addLog('info', '🛡️ ShieldHandler initializing...');

    // Verify shield is active
    const status = commandShield.getStatus();
    logger.addLog('info', `🛡️ Shield status: ${JSON.stringify(status)}`);

    // Subscribe to shield events
    this.setupSubscriptions();

    // Initialize session stats if needed
    this.initializeSessionStats();

    // Calculate initial metrics
    this.updateMetrics();

    logger.addLog('success', '✅ ShieldHandler initialized');
  }

  cleanup(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.statusListeners.clear();
    this.metricsListeners.clear();
    logger.addLog('info', '🛡️ ShieldHandler cleanup complete');
  }

  // =============================================================================
  // Subscriptions
  // =============================================================================

  private setupSubscriptions(): void {
    // Subscribe to shield status changes
    const statusUnsub = commandShield.onStatusChange((status) => {
      console.log('🛡️ [ShieldHandler] Status change:', status);

      // Notify all status listeners (e.g., dashboard)
      this.notifyStatusListeners(status);

      // Update metrics
      this.updateMetrics();
    });

    // Subscribe to command executions
    const commandUnsub = commandShield.onCommandExecuted((log) => {
      console.log('🛡️ [ShieldHandler] Command executed:', log.request.commandType, log.status);

      // Track in session stats
      this.trackCommandExecution(log);
      if (log.status === 'denied' || log.status === 'cancelled') {
        // Trigger global pulse event (FAB can listen if needed)
        document.dispatchEvent(new CustomEvent('shield-blocked', { detail: { count: this.getBlockedCount() } }));
      }
      // Update metrics
      this.updateMetrics();
    });

    this.unsubscribers.push(statusUnsub, commandUnsub);

    logger.addLog('success', '✅ Shield subscriptions established');
  }

  // =============================================================================
  // Session Statistics Management
  // =============================================================================

  private initializeSessionStats(): void {
    const session = userSessionManager.getCurrentSession();
    if (!session) {
      logger.addLog('warning', '⚠️ No active session - cannot initialize shield stats');
      return;
    }

    // Initialize shield stats if not present
    if (!session.shieldStats) {
      userSessionManager.updateSession({
        shieldStats: {
          totalCommands: 0,
          blockedCommands: 0,
          emergencyStops: 0,
          lastEmergencyStop: undefined
        }
      });
      logger.addLog('info', '🛡️ Initialized session shield stats');
    }
  }

  private trackCommandExecution(log: CommandAuditLog): void {
    const session = userSessionManager.getCurrentSession();
    if (!session?.shieldStats) return;

    // Update command count
    session.shieldStats.totalCommands++;

    // Track blocked/denied commands
    if (log.status === 'denied' || log.status === 'cancelled') {
      session.shieldStats.blockedCommands++;
    }

    // Save to session
    userSessionManager.updateSession({
      shieldStats: session.shieldStats
    });

    console.log('📊 [ShieldHandler] Session stats updated:', session.shieldStats);
  }

  /**
   * Track emergency stop event
   */
  trackEmergencyStop(): void {
    const session = userSessionManager.getCurrentSession();
    if (!session?.shieldStats) return;

    session.shieldStats.emergencyStops++;
    session.shieldStats.lastEmergencyStop = new Date();

    userSessionManager.updateSession({
      shieldStats: session.shieldStats
    });

    logger.addLog('error', '🚨 Emergency stop tracked in session');
    console.log('🚨 [ShieldHandler] Emergency stop:', session.shieldStats);
  }

  /**
   * Reset session statistics
   */
  resetSessionStats(): void {
    const session = userSessionManager.getCurrentSession();
    if (!session) return;

    userSessionManager.updateSession({
      shieldStats: {
        totalCommands: 0,
        blockedCommands: 0,
        emergencyStops: 0,
        lastEmergencyStop: undefined
      }
    });

    logger.addLog('success', '✅ Shield statistics reset');
    notificationService.success('📊 Shield statistics reset', 2000);
  }

  // =============================================================================
  // Metrics Calculation & Caching
  // =============================================================================

  private updateMetrics(): void {
    const now = Date.now();

    // Throttle updates to avoid performance issues
    if (now - this.lastMetricsUpdate < this.metricsUpdateInterval) {
      return;
    }

    this.lastMetricsUpdate = now;

    // Calculate fresh metrics
    const metrics = this.calculateMetrics();
    this.cachedMetrics = metrics;

    // Notify metrics listeners
    this.notifyMetricsListeners(metrics);

    console.log('📊 [ShieldHandler] Metrics updated:', metrics);
  }

  private calculateMetrics(): any {
    const devices = deviceService.getDevices();
    let totalCommands = 0;
    let completedCommands = 0;
    let failedCommands = 0;
    let deniedCommands = 0;
    let totalSafetyScore = 0;
    let commandsLastHour = 0;
    let commandsLastMinute = 0;

    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const oneMinuteAgo = now - 60000;

    // Aggregate from all devices
    devices.forEach((device) => {
      const history = commandShield.getCommandHistory(device.id, 1000);

      history.forEach((log) => {
        totalCommands++;
        totalSafetyScore += log.validation.safetyScore;

        if (log.status === 'completed') completedCommands++;
        if (log.status === 'failed') failedCommands++;
        if (log.status === 'denied') deniedCommands++;

        const timestamp = log.request.timestamp.getTime();
        if (timestamp > oneHourAgo) commandsLastHour++;
        if (timestamp > oneMinuteAgo) commandsLastMinute++;
      });
    });

    // Get blocked commands from session
    const session = userSessionManager.getCurrentSession();
    const blockedCommands = session?.shieldStats?.blockedCommands || 0;

    return {
      totalCommands,
      completedCommands,
      failedCommands,
      blockedCommands,
      deniedCommands,
      averageSafetyScore: totalCommands > 0 ? Math.round(totalSafetyScore / totalCommands) : 100,
      commandsLastHour,
      commandsLastMinute,
      timestamp: new Date()
    };
  }

  // =============================================================================
  // Public API for Components
  // =============================================================================

  /**
   * Get current shield status
   */
  getStatus(): any {
    return commandShield.getStatus();
  }

  /**
   * Get cached metrics (performance optimized)
   */
  getMetrics(): any {
    if (!this.cachedMetrics) {
      this.updateMetrics();
    }
    return this.cachedMetrics;
  }

  /**
   * Force metrics refresh
   */
  refreshMetrics(): any {
    this.lastMetricsUpdate = 0; // Reset throttle
    this.updateMetrics();
    return this.cachedMetrics;
  }

  /**
   * Get session statistics
   */
  getSessionStats(): any {
    const session = userSessionManager.getCurrentSession();
    return session?.shieldStats || {
      totalCommands: 0,
      blockedCommands: 0,
      emergencyStops: 0,
      lastEmergencyStop: undefined
    };
  }

  /**
   * Get command history for device
   */
  getDeviceHistory(deviceId: string, limit: number = 100): CommandAuditLog[] {
    return commandShield.getCommandHistory(deviceId, limit);
  }

  /**
   * Get aggregate statistics
   */
  getAggregateStats(): any {
    return commandShield.getAggregateStats();
  }

  /**
   * Export all logs to JSON
   */
  exportLogs(): string {
    const devices = deviceService.getDevices();
    const allHistory: any = {};

    devices.forEach((device) => {
      allHistory[device.id] = {
        deviceName: device.name,
        deviceType: device.type,
        history: commandShield.getCommandHistory(device.id, 1000)
      };
    });

    return JSON.stringify({
      exportDate: new Date().toISOString(),
      sessionStats: this.getSessionStats(),
      shieldStatus: this.getStatus(),
      deviceHistories: allHistory
    }, null, 2);
  }

  // =============================================================================
  // Emergency Controls (proxied with tracking)
  // =============================================================================

  /**
   * Activate emergency stop
   */
  activateEmergencyStop(reason: string): void {
    commandShield.activateEmergencyStop(reason);
    this.trackEmergencyStop();

    logger.addLog('error', `🚨 EMERGENCY STOP: ${reason}`);
    notificationService.error(`🚨 EMERGENCY STOP ACTIVE: ${reason}`, 0);
  }

  /**
   * Deactivate emergency stop
   */
  deactivateEmergencyStop(): void {
    commandShield.deactivateEmergencyStop();

    logger.addLog('success', '✅ Emergency stop deactivated');
    notificationService.success('✅ Emergency stop cleared', 5000);
  }

  /**
   * Pause commands for duration
   */
  pauseCommands(durationMs: number, reason: string): void {
    commandShield.pauseCommands(durationMs, reason);

    logger.addLog('warning', `⏸️ Commands paused: ${reason}`);
    notificationService.warning(`⏸️ Commands paused for ${durationMs / 1000}s`, 3000);
  }

  /**
   * Blacklist device
   */
  blacklistDevice(deviceId: string, reason: string): void {
    const device = deviceService.getDevice(deviceId);
    const deviceName = device?.name || deviceId;

    commandShield.blacklistDevice(deviceId, reason);

    logger.addLog('error', `⛔ Device blacklisted: ${deviceName}`);
    notificationService.error(`⛔ ${deviceName} blacklisted: ${reason}`, 5000);
  }

  /**
   * Whitelist device
   */
  whitelistDevice(deviceId: string): void {
    const device = deviceService.getDevice(deviceId);
    const deviceName = device?.name || deviceId;

    commandShield.whitelistDevice(deviceId);

    logger.addLog('success', `✅ Device whitelisted: ${deviceName}`);
    notificationService.success(`✅ ${deviceName} removed from blacklist`, 3000);
  }

  // =============================================================================
  // Event Listener Management (for Dashboard)
  // =============================================================================

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: (status: any) => void): () => void {
    this.statusListeners.add(callback);

    // Immediately call with current status
    callback(this.getStatus());

    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Subscribe to metrics updates
   */
  onMetricsChange(callback: (metrics: any) => void): () => void {
    this.metricsListeners.add(callback);

    // Immediately call with current metrics
    callback(this.getMetrics());

    return () => {
      this.metricsListeners.delete(callback);
    };
  }

  private notifyStatusListeners(status: any): void {
    this.statusListeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Shield status listener error:', error);
      }
    });
  }

  private notifyMetricsListeners(metrics: any): void {
    this.metricsListeners.forEach(callback => {
      try {
        callback(metrics);
      } catch (error) {
        console.error('Shield metrics listener error:', error);
      }
    });
  }

  // =============================================================================
  // Debug & Utilities
  // =============================================================================

  /**
   * Get handler statistics
   */
  getHandlerStats(): {
    statusListeners: number;
    metricsListeners: number;
    lastMetricsUpdate: Date;
    cachedMetrics: boolean;
  } {
    return {
      statusListeners: this.statusListeners.size,
      metricsListeners: this.metricsListeners.size,
      lastMetricsUpdate: new Date(this.lastMetricsUpdate),
      cachedMetrics: this.cachedMetrics !== null
    };
  }

  /**
   * Debug information
   */
  debugInfo(): void {
    console.group('🛡️ Shield Handler Status');
    console.log('Handler Stats:', this.getHandlerStats());
    console.log('Session Stats:', this.getSessionStats());
    console.log('Shield Status:', this.getStatus());
    console.log('Cached Metrics:', this.cachedMetrics);
    console.groupEnd();

    // Also log shield service debug
    commandShield.debugInfo();
    }

    /**
   *  Check if rules can execute
   */
  public canExecuteRules(): boolean {
    const status = commandShield.getStatus();
    return !status.emergencyStopActive && !status.globalPauseActive;
  }

  /**
   *  Check if device can execute rules
   */
  public canDeviceExecuteRules(deviceId: string): boolean {
    if (!this.canExecuteRules()) {
      return false;
    }

    return !commandShield.isDeviceBlacklisted(deviceId);
  }

  /**
 * Get count of recently blocked commands (for FAB pulse)
 */
public getBlockedCount(): number {
  return this.getMetrics()?.blockedCommands || 0;
}
}

// ============================================================================
// Singleton Export (like telegram-handler)
// ============================================================================

export const shieldHandler = new ShieldHandler();