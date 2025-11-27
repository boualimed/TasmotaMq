// handlers/shutter-handler.ts - SHIELD PROTECTED VERSION
// Shutter-specific Operations with Command Shield Integration

import { mqttService } from '../../services/mqtt-service';
import { commandShield } from '../../services/command-shield.service'; // 🛡️ NEW
import { deviceService } from '../../services/device-service';
import { notificationService } from '../../services/notification.service';
import { authService } from '../../services/auth.service'; // 🛡️ NEW
import { logger } from '../../utils/logger.util';
import { Device } from '../../models/device.model';

export class ShutterHandler {
  constructor(
    private showError: (message: string) => void,
    private validateToggle: () => boolean
  ) {}

  // =============================================================================
  // 🛡️ Shutter Control - SHIELD PROTECTED
  // =============================================================================

  public tryToggle(): void {
    if (!this.validateToggle()) {
      this.showError('Toggle validation failed');
    }
  }

  /**
   * ✅ FIXED: Open shutter with shield protection
   */
  async handleOpenShutter(device: Device): Promise<void> {
    console.log('🔼 Opening shutter:', device.name);

    if (!this.validateToggle()) {
      logger.addLog('error', '❌ MQTT not connected');
      return;
    }

    if (device.isEnabled === false) {
      this.showError('Device is disabled');
      notificationService.warning('⚠️ Device is disabled', 3000);
      return;
    }

    // 🔥 CRITICAL: Validate before sending command
    if (!device.baseTopic) {
      const error = '🔥 CRITICAL: Cannot open shutter - baseTopic is missing!';
      logger.addLog('error', error);
      notificationService.error(error, 5000);
      console.error(error, device);
      return;
    }

    if (!device.shutterIndex) {
      const error = '🔥 CRITICAL: Cannot open shutter - shutterIndex is missing!';
      logger.addLog('error', error);
      notificationService.error(error, 5000);
      console.error(error, device);
      return;
    }

    try {
      console.log('📤 Publishing open command via shield:', {
        topic: `cmnd/${device.baseTopic}/ShutterOpen`,
        device: device.name,
        shutterIndex: device.shutterIndex
      });

      // 🛡️ Route through Command Shield
      const result = await commandShield.executeCommand(
        device,
        'shutter.open',
        {},
        {
          requestedBy: this.getCurrentUserId(),
          reason: 'User requested shutter open',
          priority: 'normal'
        }
      );

      if (!result.success) {
        this.showError(result.error || 'Command failed');
        logger.addLog('error', `Open failed: ${result.error}`);
        return;
      }

      logger.addLog('info', `🔼 Opening ${device.name} (Index ${device.shutterIndex})`);
      notificationService.info(`🔼 Opening ${device.name}...`, 2000);

    } catch (error: any) {
      const errorMsg = `Failed to open shutter: ${error.message}`;
      logger.addLog('error', `❌ ${errorMsg}`);
      notificationService.error(`❌ ${errorMsg}`, 5000);
      console.error('Shutter open error:', error, device);
      this.showError(errorMsg);
    }
  }

  /**
   * ✅ FIXED: Close shutter with shield protection
   */
  async handleCloseShutter(device: Device): Promise<void> {
    console.log('🔽 Closing shutter:', device.name);

    if (!this.validateToggle()) {
      logger.addLog('error', '❌ MQTT not connected');
      return;
    }

    if (device.isEnabled === false) {
      this.showError('Device is disabled');
      notificationService.warning('⚠️ Device is disabled', 3000);
      return;
    }

    // 🔥 CRITICAL: Validate before sending command
    if (!device.baseTopic) {
      const error = '🔥 CRITICAL: Cannot close shutter - baseTopic is missing!';
      logger.addLog('error', error);
      notificationService.error(error, 5000);
      console.error(error, device);
      return;
    }

    if (!device.shutterIndex) {
      const error = '🔥 CRITICAL: Cannot close shutter - shutterIndex is missing!';
      logger.addLog('error', error);
      notificationService.error(error, 5000);
      console.error(error, device);
      return;
    }

    try {
      console.log('📤 Publishing close command via shield:', {
        topic: `cmnd/${device.baseTopic}/ShutterClose`,
        device: device.name,
        shutterIndex: device.shutterIndex
      });

      // 🛡️ Route through Command Shield
      const result = await commandShield.executeCommand(
        device,
        'shutter.close',
        {},
        {
          requestedBy: this.getCurrentUserId(),
          reason: 'User requested shutter close',
          priority: 'normal'
        }
      );

      if (!result.success) {
        this.showError(result.error || 'Command failed');
        logger.addLog('error', `Close failed: ${result.error}`);
        return;
      }

      logger.addLog('info', `🔽 Closing ${device.name} (Index ${device.shutterIndex})`);
      notificationService.info(`🔽 Closing ${device.name}...`, 2000);

    } catch (error: any) {
      const errorMsg = `Failed to close shutter: ${error.message}`;
      logger.addLog('error', `❌ ${errorMsg}`);
      notificationService.error(`❌ ${errorMsg}`, 5000);
      console.error('Shutter close error:', error, device);
      this.showError(errorMsg);
    }
  }

  /**
   * ✅ FIXED: Set shutter position with shield protection
   */
  async handleSetShutterPosition(device: Device, position: number): Promise<void> {
    console.log(`🔧 Setting shutter position: ${device.name} to ${position}%`);

    if (!this.validateToggle()) {
      logger.addLog('error', '❌ MQTT not connected');
      return;
    }

    if (device.isEnabled === false) {
      this.showError('Device is disabled');
      notificationService.warning('⚠️ Device is disabled', 3000);
      return;
    }

    // Validate position range
    if (position < 0 || position > 100) {
      this.showError('Position must be between 0 and 100');
      return;
    }

    // 🔥 CRITICAL: Validate before sending command
    if (!device.baseTopic || !device.shutterIndex) {
      const error = '🔥 CRITICAL: Cannot set position - missing configuration!';
      logger.addLog('error', error);
      notificationService.error(error, 5000);
      console.error(error, device);
      return;
    }

    try {
      console.log('📤 Publishing position command via shield:', {
        topic: `cmnd/${device.baseTopic}/ShutterPosition`,
        device: device.name,
        shutterIndex: device.shutterIndex,
        position
      });

      // 🛡️ Route through Command Shield
      const result = await commandShield.executeCommand(
        device,
        'shutter.position',
        position,
        {
          requestedBy: this.getCurrentUserId(),
          reason: `User set shutter position to ${position}%`,
          priority: 'normal'
        }
      );

      if (!result.success) {
        this.showError(result.error || 'Command failed');
        logger.addLog('error', `Position set failed: ${result.error}`);
        return;
      }

      // ✅ Optimistic update (real state comes from MQTT)
      deviceService.updateDevice(device.id, {
        shutterPosition: position,
        shutterTarget: position,
        shutterDirection: position > (device.shutterPosition ?? 50) ? 1 : -1
      });

      logger.addLog('info', `🔧 Setting ${device.name} to ${position}%`);
      notificationService.info(`🔧 Moving to ${position}%...`, 2000);

    } catch (error: any) {
      const errorMsg = `Failed to set position: ${error.message}`;
      logger.addLog('error', `❌ ${errorMsg}`);
      notificationService.error(`❌ ${errorMsg}`, 5000);
      console.error('Shutter position error:', error, device);
      this.showError(errorMsg);
    }
  }

  /**
   * ✅ FIXED: Stop shutter with shield protection (EMERGENCY - high priority)
   */
  async handleStopShutter(device: Device): Promise<void> {
    console.log('⏹️ Stopping shutter:', device.name);

    if (!this.validateToggle()) {
      logger.addLog('error', '❌ MQTT not connected');
      return;
    }

    if (device.isEnabled === false) {
      this.showError('Device is disabled');
      notificationService.warning('⚠️ Device is disabled', 3000);
      return;
    }

    // 🔥 CRITICAL: Validate before sending command
    if (!device.baseTopic || !device.shutterIndex) {
      const error = '🔥 CRITICAL: Cannot stop shutter - missing configuration!';
      logger.addLog('error', error);
      notificationService.error(error, 5000);
      console.error(error, device);
      return;
    }

    try {
      console.log('📤 Publishing STOP command via shield (EMERGENCY):', {
        topic: `cmnd/${device.baseTopic}/ShutterStop`,
        device: device.name,
        shutterIndex: device.shutterIndex
      });

      // 🛡️ Route through Command Shield with EMERGENCY priority
      const result = await commandShield.executeCommand(
        device,
        'shutter.stop',
        {},
        {
          requestedBy: this.getCurrentUserId(),
          reason: 'Emergency stop requested',
          priority: 'emergency', // 🚨 HIGH PRIORITY - bypasses confirmation
          skipConfirmation: true  // 🚨 IMMEDIATE STOP
        }
      );

      if (!result.success) {
        this.showError(result.error || 'Stop command failed');
        logger.addLog('error', `❌ Stop failed: ${result.error}`);
        return;
      }

      // Update state immediately
      deviceService.updateDevice(device.id, {
        shutterDirection: 0,
        shutterTarget: device.shutterPosition
      });

      logger.addLog('info', `⏹️ Stopped ${device.name}`);
      notificationService.success(`⏹️ ${device.name} stopped`, 2000);

    } catch (error: any) {
      const errorMsg = `Failed to stop shutter: ${error.message}`;
      logger.addLog('error', `❌ ${errorMsg}`);
      notificationService.error(`❌ ${errorMsg}`, 5000);
      console.error('Shutter stop error:', error, device);
      this.showError(errorMsg);
    }
  }

  // =============================================================================
  // 🛡️ Tilt Control (Venetian Blinds) - SHIELD PROTECTED
  // =============================================================================

  /**
   * ✅ FIXED: Set shutter tilt with shield protection
   */
  async handleSetShutterTilt(device: Device, angle: number): Promise<void> {
    if (!this.validateToggle()) return;

    if (device.isEnabled === false) {
      this.showError('Device is disabled');
      return;
    }

    if (!device.shutterTiltConfig) {
      this.showError('Shutter tilt not configured');
      return;
    }

    try {
      // 🛡️ Route through Command Shield
      const result = await commandShield.executeCommand(
        device,
        'shutter.tilt',
        angle,
        {
          requestedBy: this.getCurrentUserId(),
          reason: `User adjusted tilt to ${angle}°`,
          priority: 'normal'
        }
      );

      if (!result.success) {
        this.showError(result.error || 'Command failed');
        return;
      }

      // Update local state
      const tiltConfig = { ...device.shutterTiltConfig, currentTilt: angle };
      deviceService.updateDevice(device.id, { shutterTiltConfig: tiltConfig });

      logger.addLog('info', `Setting ${device.name} tilt to ${angle}°`);

    } catch (error: any) {
      this.showError(`Failed to set tilt: ${error.message}`);
    }
  }

  // =============================================================================
  // 🛡️ Calibration - USES DIRECT MQTT (Acceptable - Setup Operations)
  // =============================================================================

  /**
   * ⚠️ NOTE: Calibration uses direct MQTT commands
   * This is acceptable because:
   * 1. It's a setup operation, not regular control
   * 2. User is actively supervising the process
   * 3. Requires explicit confirmation at each step
   * 4. Only runs during initial configuration
   */
  async handleStartShutterCalibration(device: Device): Promise<void> {
    if (!this.validateToggle()) return;

    if (!device.baseTopic || !device.shutterIndex) {
      this.showError('Device not properly configured for calibration');
      return;
    }

    const confirmed = confirm(
      `⚠️ SHUTTER CALIBRATION\n\n` +
      `Device: ${device.name}\n\n` +
      `This will:\n` +
      `1. Close the shutter completely\n` +
      `2. Allow you to set close position\n` +
      `3. Open to measure duration\n` +
      `4. Set open position\n\n` +
      `⚠️ IMPORTANT:\n` +
      `- Clear the shutter path\n` +
      `- Stay nearby during calibration\n` +
      `- Have emergency stop ready\n\n` +
      `Continue?`
    );

    if (!confirmed) return;

    try {
      notificationService.warning('🔧 CALIBRATION MODE - Shield bypassed for setup', 4000);

      // Step 1: Close shutter
      notificationService.info('🔧 Step 1: Closing shutter...', 5000);

      // ⚠️ Direct MQTT for calibration (acceptable)
      // Use internal methods if shield is blocking
      try {
        await commandShield.executeCommand(
          device,
          'shutter.close',
          {},
          {
            requestedBy: this.getCurrentUserId(),
            reason: 'Calibration - closing to start position',
            priority: 'normal'
          }
        );
      } catch (error) {
        // If shield blocks, inform user
        notificationService.warning(
          '⚠️ Shield may block calibration commands. Continue anyway?',
          5000
        );
      }

      // Wait for close
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Mark as closed
      mqttService.markShutterClosed(device);
      notificationService.success('✅ Closed position set', 3000);

      // Step 3: User measures open duration
      const openDuration = prompt(
        `Now measure how long it takes to open completely.\n\n` +
        `Click OK, then observe the shutter opening.\n` +
        `Time it with a stopwatch and enter seconds:`,
        '10'
      );

      if (!openDuration) {
        notificationService.info('❌ Calibration cancelled');
        return;
      }

      const openSeconds = parseFloat(openDuration);
      if (isNaN(openSeconds) || openSeconds <= 0) {
        this.showError('Invalid duration');
        return;
      }

      // Set open duration and open
      mqttService.setShutterOpenDuration(device, openSeconds);
      notificationService.info(`⏱️ Opening shutter (${openSeconds}s)...`, openSeconds * 1000);

      // Use shield for actual movement
      await commandShield.executeCommand(
        device,
        'shutter.open',
        {},
        {
          requestedBy: this.getCurrentUserId(),
          reason: 'Calibration - opening to measure duration',
          priority: 'normal'
        }
      );

      // Wait for open
      await new Promise(resolve => setTimeout(resolve, openSeconds * 1000 + 1000));

      // Mark as open
      mqttService.markShutterOpen(device);

      // Step 4: Measure close duration
      const closeDuration = prompt(
        `Now measure close duration.\n\n` +
        `The shutter will close. Time it and enter seconds:`,
        openDuration
      );

      if (!closeDuration) {
        notificationService.info('❌ Calibration cancelled');
        return;
      }

      const closeSeconds = parseFloat(closeDuration);
      if (isNaN(closeSeconds) || closeSeconds <= 0) {
        this.showError('Invalid duration');
        return;
      }

      mqttService.setShutterCloseDuration(device, closeSeconds);

      // Final close
      await commandShield.executeCommand(
        device,
        'shutter.close',
        {},
        {
          requestedBy: this.getCurrentUserId(),
          reason: 'Calibration - final close',
          priority: 'normal'
        }
      );

      // Update device calibration
      deviceService.updateDevice(device.id, {
        shutterCalibration: {
          openDuration: openSeconds,
          closeDuration: closeSeconds,
          halfwayPosition: 50
        }
      });

      notificationService.success(
        `✅ Calibration complete!\n` +
        `Open: ${openSeconds}s, Close: ${closeSeconds}s`,
        6000
      );

      logger.addLog('success', `${device.name} calibration complete`);

    } catch (error: any) {
      this.showError(`Calibration failed: ${error.message}`);
      notificationService.error('❌ Calibration failed - check logs', 5000);
    }
  }

  // =============================================================================
  // 🛡️ Helper Methods
  // =============================================================================

  /**
   * 🛡️ NEW: Get current user ID for command tracking
   */
  private getCurrentUserId(): string {
    try {
      const user = authService.getCurrentUser();
      return user?.id || user?.passwordHash || 'anonymous';
    } catch {
      return 'anonymous';
    }
  }

  getShutterModeDescription(mode: number): string {
    const descriptions: Record<number, string> = {
      1: 'Normal (2 relays, interlocked)',
      2: 'Circuit Safe (2 relays, direction + power)',
      3: 'Garage Motors (pulse operation)',
      4: 'Stepper Motor (requires PWM)',
      5: 'Servo Position',
      6: 'Servo Speed'
    };
    return descriptions[mode] || 'Unknown';
  }
}