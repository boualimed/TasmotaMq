import { commandShield } from '../../services/command-shield.service';
import { deviceService } from '../../services/device-service';
import { notificationService } from '../../services/notification.service';
import { logger } from '../../utils/logger.util';
import { TasmotaTimer } from '../../models/device.model';

export class TimerHandler {
  private openTimerModals = new Set<string>();

  constructor(
    private onStateChange: () => void,
    private showError: (message: string) => void,
    private getCurrentUserId: () => string  // ✅ NEW
  ) {}

  // 🛡️ PROTECTED: Toggle all timers through shield
  async handleToggleTimers(deviceId: string, enabled: boolean): Promise<void> {
    const device = deviceService.getDevice(deviceId);
    if (!device) return;

    try {
      const result = await commandShield.executeCommand(
        device,
        'timer.toggleAll',
        { enabled },
        {
          requestedBy: this.getCurrentUserId(),
          reason: `${enabled ? 'Enable' : 'Disable'} all timers`,
          priority: 'normal'
        }
      );

      if (!result.success) {
        this.showError(result.error || 'Failed to toggle timers');
        return;
      }

      deviceService.updateDevice(deviceId, { timersEnabled: enabled });
      logger.addLog('info', `Timers ${enabled ? 'enabled' : 'disabled'} for ${device.name}`);
      notificationService.success(`⏰ Timers ${enabled ? 'enabled' : 'disabled'}`, 2500);
      this.onStateChange();

    } catch (error: any) {
      this.showError(`Failed to toggle timers: ${error.message}`);
    }
  }

  // 🛡️ PROTECTED: Set timer through shield
  async handleSaveTimer(
    deviceId: string,
    timerId: number,
    timer: Partial<TasmotaTimer>
  ): Promise<void> {
    const device = deviceService.getDevice(deviceId);
    if (!device) return;

    try {
      const result = await commandShield.executeCommand(
        device,
        'timer.set',
        { timerId, timer },
        {
          requestedBy: this.getCurrentUserId(),
          reason: `Configure timer ${timerId}`,
          priority: 'normal'
        }
      );

      if (!result.success) {
        this.showError(result.error || 'Failed to save timer');
        return;
      }

      logger.addLog('success', `Timer ${timerId} configured for ${device.name}`);
      notificationService.success(`✅ Timer ${timerId} saved`, 2500);

      // Update local state
      const currentConfig = device.timerConfig || { timers: [] };
      const existingIndex = currentConfig.timers.findIndex(t => t.id === timerId);

      if (existingIndex >= 0) {
        currentConfig.timers[existingIndex] = {
          ...currentConfig.timers[existingIndex],
          ...timer,
          id: timerId
        } as TasmotaTimer;
      } else {
        currentConfig.timers.push({ id: timerId, ...timer } as TasmotaTimer);
      }

      deviceService.updateDevice(deviceId, { timerConfig: currentConfig });

    } catch (error: any) {
      this.showError(`Failed to save timer: ${error.message}`);
    }
  }

  // 🛡️ PROTECTED: Delete timer through shield
  async handleDeleteTimer(deviceId: string, timerId: number): Promise<void> {
    if (!confirm(`Delete timer ${timerId}?`)) return;

    const device = deviceService.getDevice(deviceId);
    if (!device) return;

    try {
      const result = await commandShield.executeCommand(
        device,
        'timer.delete',
        { timerId },
        {
          requestedBy: this.getCurrentUserId(),
          reason: `Delete timer ${timerId}`,
          priority: 'normal'
        }
      );

      if (!result.success) {
        this.showError(result.error || 'Failed to delete timer');
        return;
      }

      logger.addLog('info', `Timer ${timerId} deleted from ${device.name}`);
      notificationService.success(`🗑️ Timer ${timerId} deleted`, 2500);

      // Update local state
      const currentConfig = device.timerConfig || { timers: [] };
      currentConfig.timers = currentConfig.timers.filter(t => t.id !== timerId);
      deviceService.updateDevice(deviceId, { timerConfig: currentConfig });

    } catch (error: any) {
      this.showError(`Failed to delete timer: ${error.message}`);
    }
  }

  // Rest of the methods stay the same...
  openTimerModal(deviceId: string): void {
    this.openTimerModals.add(deviceId);
    this.onStateChange();
  }

  closeTimerModal(deviceId: string): void {
    this.openTimerModals.delete(deviceId);
    this.onStateChange();
  }

  isTimerModalOpen(deviceId: string): boolean {
    return this.openTimerModals.has(deviceId);
  }

  cleanup(): void {
    this.openTimerModals.clear();
  }
}