// command-shield.service.ts
// 🛡️ IoT Command Safety Layer - Prevents Dangerous Operations

import { Device } from '../models/device.model';
import { logger } from '../utils/logger.util';
import { mqttService } from './mqtt-service';
import { notificationService } from './notification.service';
import { userSessionManager } from './user-session.manager';

/**
 * Command Shield Service
 *
 * PURPOSE: Act as a safety gatekeeper between UI and MQTT service
 * PREVENTS: Dangerous commands, command storms, conflicts, unauthorized access
 */

const SHIELD_STORAGE_KEY = 'tasmota_shield_state';

// =============================================================================
// Types & Interfaces
// =============================================================================

export interface CommandRequest {
  deviceId: string;
  commandType: CommandType;
  payload: any;
  priority: CommandPriority;
  requestedBy: string; // User ID or tab ID
  timestamp: Date;
  reason?: string; // Why this command is being sent
}

export type CommandType =
  // Switch commands
  | 'switch.on'
  | 'switch.off'
  | 'switch.toggle'

  // Dimmer commands
  | 'dimmer.set'
  | 'dimmer.on'
  | 'dimmer.off'

  // Shutter commands
  | 'shutter.open'
  | 'shutter.close'
  | 'shutter.stop'
  | 'shutter.position'
  | 'shutter.tilt'

  // Advanced relay commands
  | 'relay.pulse'
  | 'relay.blink'
  | 'relay.lock'
  | 'relay.config'
  | 'relay.toggleAll'

  // 🆕 Timer commands
  | 'timer.set'
  | 'timer.delete'
  | 'timer.toggleAll'

  // 🆕 Rule commands
  | 'rule.upload'
  | 'rule.enable'

  // 🆕 Script commands
  | 'script.upload'
  | 'script.enable';


export type CommandPriority = 'normal' | 'high' | 'emergency';

export type CommandStatus =
  | 'pending'      // Waiting for validation
  | 'approved'     // Passed all checks
  | 'denied'       // Failed validation
  | 'executing'    // Being sent to device
  | 'completed'    // Successfully executed
  | 'failed'       // Execution failed
  | 'cancelled'    // User cancelled
  | 'timeout';     // Execution timeout

export interface CommandValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  requiresConfirmation: boolean;
  safetyScore: number; // 0-100 (higher = safer)
}

export interface CommandAuditLog {
  id: string;
  request: CommandRequest;
  validation: CommandValidation;
  status: CommandStatus;
  executedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
}

// 🆕 Persistence Interface
interface ShieldStorageState {
  history: Array<[string, CommandAuditLog[]]>; // Map entry array
  blacklisted: string[]; // Set as array
  rules: Array<[string, Partial<DeviceSafetyRules>]>; // Map entry array
  emergencyStop: boolean;
  globalPause: string | null; // ISO Date string
}

// =============================================================================
// Safety Rules Configuration
// =============================================================================

interface DeviceSafetyRules {
  maxCommandsPerMinute: number;
  minCommandInterval: number; // milliseconds
  requireConfirmation: boolean;
  allowedCommands: CommandType[];
  deniedCommands: CommandType[];
  maxRetries: number;
  timeoutMs: number;
}

const DEFAULT_SAFETY_RULES: Record<string, DeviceSafetyRules> = {
  switch: {
    maxCommandsPerMinute: 30,
    minCommandInterval: 500,
    requireConfirmation: false,
    allowedCommands: [
      'switch.on',
      'switch.off',
      'switch.toggle',
      'relay.pulse',
      'relay.blink',
      'relay.lock',
      'relay.config',
      'relay.toggleAll',
      'timer.set',        // 🆕 Timer commands allowed
      'timer.delete',
      'timer.toggleAll',
      'rule.upload',      // 🆕 Rule commands allowed
      'rule.enable'
    ],
    deniedCommands: [],
    maxRetries: 2,
    timeoutMs: 5000
  },

  dimmer: {
    maxCommandsPerMinute: 60,
    minCommandInterval: 200,
    requireConfirmation: false,
    allowedCommands: [
      'dimmer.set',
      'dimmer.on',
      'dimmer.off',
      'relay.pulse',
      'relay.blink',
      'relay.config',
      'timer.set',        // 🆕 Timer commands allowed
      'timer.delete',
      'timer.toggleAll',
      'rule.upload',      // 🆕 Rule commands allowed
      'rule.enable'
    ],
    deniedCommands: [],
    maxRetries: 2,
    timeoutMs: 5000
  },

  shutter: {
    maxCommandsPerMinute: 10,
    minCommandInterval: 2000,
    requireConfirmation: true,
    allowedCommands: [
      'shutter.open',
      'shutter.close',
      'shutter.stop',
      'shutter.position',
      'shutter.tilt',
      'timer.set',        // 🆕 Timer commands allowed (with caution!)
      'timer.delete',
      'timer.toggleAll',
      'rule.upload',      // 🆕 Rule commands allowed
      'rule.enable'
    ],
    deniedCommands: [],
    maxRetries: 1,
    timeoutMs: 30000
  },

  sensor: {
    maxCommandsPerMinute: 0,
    minCommandInterval: 0,
    requireConfirmation: false,
    allowedCommands: [
      'rule.upload',      // 🆕 Sensors can have rules
      'rule.enable'
    ],
    deniedCommands: [],
    maxRetries: 0,
    timeoutMs: 0
  }
};

// =============================================================================
// Command Shield Service
// =============================================================================

export class CommandShieldService {
  private static instance: CommandShieldService;

  // Command tracking
  private commandHistory = new Map<string, CommandAuditLog[]>();
  private activeCommands = new Map<string, CommandAuditLog>();
  private commandQueue = new Map<string, CommandRequest[]>();

  // Rate limiting
  private commandCounts = new Map<string, number[]>(); // deviceId -> timestamps
  private lastCommandTime = new Map<string, number>();

  // Global safety
  private emergencyStopActive = false;
  private globalPauseUntil: Date | null = null;
  private blacklistedDevices = new Set<string>();

  // ✅  Event listeners for real-time updates
  private statusListeners = new Set<(status: any) => void>();
  private commandListeners = new Set<(log: CommandAuditLog) => void>();

  // Conflict detection
  private deviceLocks = new Map<string, {
    commandId: string;
    lockedAt: Date;
    lockedBy: string;
  }>();

  // Safety rules
  private customRules = new Map<string, Partial<DeviceSafetyRules>>();

  // Persistence helpers
  private saveTimeout: any = null;

  private constructor() {
    logger.addLog('info', '🛡️ Command Shield Service initialized');
    this.loadState(); // 🆕 Load persisted state on init
    this.startMonitoring();
  }

  // ✅ Subscribe to status changes
  public onStatusChange(callback: (status: any) => void): () => void {
    this.statusListeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  // ✅  Subscribe to command executions
  public onCommandExecuted(callback: (log: CommandAuditLog) => void): () => void {
    this.commandListeners.add(callback);

    return () => {
      this.commandListeners.delete(callback);
    };
  }

   // ✅  Notify all status listeners
   private notifyStatusChange(): void {
    const status = this.getStatus();
    this.statusListeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Shield status listener error:', error);
      }
    });
  }

   // ✅   Notify all command listeners
   private notifyCommandExecuted(log: CommandAuditLog): void {
    this.commandListeners.forEach(callback => {
      try {
        callback(log);
      } catch (error) {
        console.error('Shield command listener error:', error);
      }
    });
  }
  static getInstance(): CommandShieldService {
    if (!CommandShieldService.instance) {
      CommandShieldService.instance = new CommandShieldService();
    }
    return CommandShieldService.instance;
  }

  // =============================================================================
  // 🛡️ PERSISTENCE LAYER
  // =============================================================================

  /**
   * 🆕 Save current state to localStorage
   * @param immediate If true, skips debounce and saves immediately (for safety critical changes)
   */
  private saveState(immediate: boolean = false): void {
    const doSave = () => {
      try {
        const state: ShieldStorageState = {
          history: Array.from(this.commandHistory.entries()),
          blacklisted: Array.from(this.blacklistedDevices),
          rules: Array.from(this.customRules.entries()),
          emergencyStop: this.emergencyStopActive,
          globalPause: this.globalPauseUntil ? this.globalPauseUntil.toISOString() : null
        };

        localStorage.setItem(SHIELD_STORAGE_KEY, JSON.stringify(state));
        // Only log on verbose debug or critical changes to avoid console spam
        if (immediate) {
          console.log('💾 Shield state saved (Critical)');
        }
      } catch (error) {
        console.error('❌ Failed to save Shield state:', error);
      }
    };

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    if (immediate) {
      doSave();
    } else {
      // Debounce non-critical saves (like history updates) to avoid thrashing storage
      this.saveTimeout = setTimeout(doSave, 2000);
    }
  }

  /**
   * 🆕 Load state from localStorage
   */
  private loadState(): void {
    try {
      const raw = localStorage.getItem(SHIELD_STORAGE_KEY);
      if (!raw) return;

      const state: ShieldStorageState = JSON.parse(raw);

      // Rehydrate Emergency Stop & Pause (Critical Safety)
      this.emergencyStopActive = !!state.emergencyStop;
      if (state.globalPause) {
        const pauseDate = new Date(state.globalPause);
        // Only restore if still in the future
        if (pauseDate > new Date()) {
          this.globalPauseUntil = pauseDate;
        }
      }

      // Rehydrate Blacklist (Safety)
      if (Array.isArray(state.blacklisted)) {
        this.blacklistedDevices = new Set(state.blacklisted);
      }

      // Rehydrate Custom Rules
      if (Array.isArray(state.rules)) {
        this.customRules = new Map(state.rules);
      }

      // Rehydrate History (Audit Logs)
      if (Array.isArray(state.history)) {
        const revivedHistory = new Map<string, CommandAuditLog[]>();

        state.history.forEach(([deviceId, logs]) => {
          // revive dates in logs
          const revivedLogs = logs.map(log => ({
            ...log,
            executedAt: log.executedAt ? new Date(log.executedAt) : undefined,
            completedAt: log.completedAt ? new Date(log.completedAt) : undefined,
            request: {
              ...log.request,
              timestamp: new Date(log.request.timestamp)
            }
          }));
          revivedHistory.set(deviceId, revivedLogs);
        });

        this.commandHistory = revivedHistory;
      }

      console.log('✅ Shield state loaded:', {
        history: this.commandHistory.size,
        blacklisted: this.blacklistedDevices.size,
        emergency: this.emergencyStopActive
      });

    } catch (error) {
      console.error('❌ Failed to load Shield state:', error);
      // If state is corrupt, we start fresh for safety, but default to SAFE state
      this.emergencyStopActive = false;
    }
  }

  // =============================================================================
  // 🛡️ CORE: Command Validation & Execution
  // =============================================================================

  /**
   * Main entry point - validates and executes command safely
   */
  async executeCommand(
    device: Device,
    commandType: CommandType,
    payload: any,
    options: {
      priority?: CommandPriority;
      requestedBy?: string;
      reason?: string;
      skipConfirmation?: boolean;
    } = {}
  ): Promise<{ success: boolean; commandId?: string; error?: string }> {
    // Track command attempt
    userSessionManager.trackShieldEvent('command');
    // Create command request
    const request: CommandRequest = {
      deviceId: device.id,
      commandType,
      payload,
      priority: options.priority || 'normal',
      requestedBy: options.requestedBy || 'user',
      timestamp: new Date(),
      reason: options.reason
    };

    const commandId = this.generateCommandId();

    console.log('🛡️ [Shield] Validating command:', {
      commandId,
      device: device.name,
      type: commandType,
      payload
    });

    // STEP 1: Pre-validation checks
    const preCheck = this.preValidationCheck(device, request);
    if (!preCheck.passed) {
      logger.addLog('error', `🚫 Command denied: ${preCheck.reason}`);
      notificationService.error(`⛔ ${preCheck.reason}`, 5000);
      return { success: false, error: preCheck.reason };
    }

    // STEP 2: Validate command
    const validation = await this.validateCommand(device, request);
    if (!validation.isValid) {
      const errorMsg = validation.errors.join(', ');
      logger.addLog('error', `🚫 Command validation failed: ${errorMsg}`);
      notificationService.error(`⛔ Command denied: ${errorMsg}`, 5000);

      this.recordAudit(commandId, request, validation, 'denied');
      return { success: false, error: errorMsg };
    }

    // STEP 3: Show warnings if any
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warning => {
        notificationService.warning(`⚠️ ${warning}`, 3000);
      });
    }

    // STEP 4: Check if confirmation required
    if (validation.requiresConfirmation && !options.skipConfirmation) {
      const confirmed = await this.requestUserConfirmation(device, request, validation);
      if (!confirmed) {
        logger.addLog('info', '❌ User cancelled command');
        this.recordAudit(commandId, request, validation, 'cancelled');
        return { success: false, error: 'User cancelled' };
      }
    }

    // STEP 5: Acquire device lock
    const lockAcquired = this.acquireDeviceLock(device.id, commandId, request.requestedBy);
    if (!lockAcquired) {
      logger.addLog('error', '🔒 Device is locked by another command');
      notificationService.warning('⏳ Device busy, please wait...', 3000);
      return { success: false, error: 'Device locked' };
    }

    try {
      // STEP 6: Execute command
      logger.addLog('info', `✅ Command approved: ${commandType} on ${device.name}`);
      this.recordAudit(commandId, request, validation, 'executing');

      const result = await this.executeCommandSafely(device, request);

      // STEP 7: Record completion
      this.recordAudit(commandId, request, validation, 'completed', result);
      this.updateRateLimiting(device.id);
      logger.addLog('success', `✅ Command completed: ${commandType} on ${device.name}`);

      return { success: true, commandId };

    } catch (error: any) {
      // STEP 8: Handle failure
      logger.addLog('error', `❌ Command failed: ${error.message}`);
      this.recordAudit(commandId, request, validation, 'failed', undefined, error.message);

      return { success: false, error: error.message };

    } finally {
      // STEP 9: Release device lock
      this.releaseDeviceLock(device.id, commandId);
    }
  }

  // =============================================================================
  // 🛡️ PRE-VALIDATION: Emergency & Global Checks
  // =============================================================================

  private preValidationCheck(
    device: Device,
    request: CommandRequest
  ): { passed: boolean; reason?: string } {

    // Check 1: Emergency stop active
    if (this.emergencyStopActive) {
      return {
        passed: false,
        reason: '🚨 EMERGENCY STOP ACTIVE - All commands blocked'
      };
    }

    // Check 2: Global pause
    if (this.globalPauseUntil && new Date() < this.globalPauseUntil) {
      const secondsLeft = Math.ceil(
        (this.globalPauseUntil.getTime() - Date.now()) / 1000
      );
      return {
        passed: false,
        reason: `⏸️ Commands paused for ${secondsLeft}s`
      };
    }

    // Check 3: Device blacklisted
    if (this.blacklistedDevices.has(device.id)) {
      return {
        passed: false,
        reason: `⛔ Device "${device.name}" is blacklisted (safety)`
      };
    }

    // Check 4: Device offline (except emergency commands)
    if (!device.isConnected && request.priority !== 'emergency') {
      return {
        passed: false,
        reason: `📡 Device "${device.name}" is offline`
      };
    }

    // Check 5: Device disabled
    if (device.isEnabled === false) {
      return {
        passed: false,
        reason: `🚫 Device "${device.name}" is disabled`
      };
    }

    return { passed: true };
  }

  // =============================================================================
  // 🛡️ VALIDATION: Safety Rules & Checks
  // =============================================================================

  private async validateCommand(
    device: Device,
    request: CommandRequest
  ): Promise<CommandValidation> {

    const errors: string[] = [];
    const warnings: string[] = [];
    let requiresConfirmation = false;
    let safetyScore = 100;

    const rules = this.getSafetyRules(device);

    // Rule 1: Command allowed for device type
    if (rules.allowedCommands.length > 0 &&
        !rules.allowedCommands.includes(request.commandType)) {
      errors.push(`Command "${request.commandType}" not allowed for ${device.type}`);
      safetyScore -= 50;
    }

    // Rule 2: Command explicitly denied
    if (rules.deniedCommands.includes(request.commandType)) {
      errors.push(`Command "${request.commandType}" is explicitly denied`);
      safetyScore -= 100;
    }

    // Rule 3: Rate limiting
    const rateLimitCheck = this.checkRateLimit(device.id, rules);
    if (!rateLimitCheck.passed) {
      errors.push(rateLimitCheck.reason!);
      safetyScore -= 30;
    }

    // Rule 4: Command interval
    const intervalCheck = this.checkCommandInterval(device.id, rules);
    if (!intervalCheck.passed) {
      warnings.push(intervalCheck.reason!);
      safetyScore -= 10;
    }

    // Rule 5: Shutter-specific safety checks
    if (device.type === 'shutter') {
      const shutterCheck = this.validateShutterCommand(device, request);
      errors.push(...shutterCheck.errors);
      warnings.push(...shutterCheck.warnings);
      requiresConfirmation = shutterCheck.requiresConfirmation || rules.requireConfirmation;
      safetyScore -= shutterCheck.safetyPenalty;
    }

    // Rule 6: Conflicting command detection
    const conflictCheck = this.detectCommandConflicts(device.id, request);
    if (conflictCheck.hasConflict) {
      warnings.push(conflictCheck.message!);
      safetyScore -= 15;
    }

    // Rule 7: Payload validation
    const payloadCheck = this.validatePayload(device, request);
    if (!payloadCheck.valid) {
      errors.push(...payloadCheck.errors);
      safetyScore -= 20;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requiresConfirmation: requiresConfirmation || rules.requireConfirmation,
      safetyScore: Math.max(0, safetyScore)
    };
  }

  // =============================================================================
  // 🛡️ SHUTTER SAFETY: Critical Physical Device Checks
  // =============================================================================

  private validateShutterCommand(
    device: Device,
    request: CommandRequest
  ): {
    errors: string[];
    warnings: string[];
    requiresConfirmation: boolean;
    safetyPenalty: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let requiresConfirmation = false;
    let safetyPenalty = 0;

    // Check 1: Shutter already moving
    if (device.shutterDirection !== 0 && request.commandType !== 'shutter.stop') {
      errors.push('⚠️ Shutter is moving - must stop first');
      safetyPenalty += 25;
    }

    // Check 2: Position validation
    if (request.commandType === 'shutter.position') {
      const position = request.payload;
      if (typeof position !== 'number' || position < 0 || position > 100) {
        errors.push('Invalid shutter position (must be 0-100)');
        safetyPenalty += 20;
      }

      // Warn about extreme positions
      if (position === 0 || position === 100) {
        warnings.push('⚠️ Moving to extreme position (fully closed/open)');
        requiresConfirmation = true;
        safetyPenalty += 10;
      }
    }

    // Check 3: Rapid direction changes
    const recentCommands = this.getRecentCommands(device.id, 5000); // Last 5 seconds
    const hasDirectionChanges = this.detectRapidDirectionChanges(recentCommands);
    if (hasDirectionChanges) {
      errors.push('🚫 Too many direction changes - potential motor damage');
      safetyPenalty += 40;
    }

    // Check 4: Night-time operation (if time-based rules configured)
    const hour = new Date().getHours();
    if ((hour >= 22 || hour < 6) && request.commandType !== 'shutter.stop') {
      warnings.push('🌙 Operating shutters at night - confirm this is intentional');
      requiresConfirmation = true;
      safetyPenalty += 5;
    }

    // Check 5: Multiple simultaneous shutter commands (fire risk)
    const activeShutterCommands = Array.from(this.activeCommands.values())
      .filter(cmd => cmd.request.commandType.startsWith('shutter.'));

    if (activeShutterCommands.length >= 3) {
      warnings.push('⚠️ Multiple shutters moving simultaneously');
      safetyPenalty += 15;
    }

    return { errors, warnings, requiresConfirmation, safetyPenalty };
  }

  // =============================================================================
  // 🛡️ RATE LIMITING & INTERVAL CHECKS
  // =============================================================================

  private checkRateLimit(
    deviceId: string,
    rules: DeviceSafetyRules
  ): { passed: boolean; reason?: string } {

    const timestamps = this.commandCounts.get(deviceId) || [];
    const oneMinuteAgo = Date.now() - 60000;

    // Clean old timestamps
    const recentCommands = timestamps.filter(ts => ts > oneMinuteAgo);
    this.commandCounts.set(deviceId, recentCommands);

    if (recentCommands.length >= rules.maxCommandsPerMinute) {
      return {
        passed: false,
        reason: `⏱️ Rate limit exceeded (max ${rules.maxCommandsPerMinute}/min)`
      };
    }

    return { passed: true };
  }

  private checkCommandInterval(
    deviceId: string,
    rules: DeviceSafetyRules
  ): { passed: boolean; reason?: string } {

    const lastCommand = this.lastCommandTime.get(deviceId);
    if (!lastCommand) return { passed: true };

    const timeSinceLastCommand = Date.now() - lastCommand;

    if (timeSinceLastCommand < rules.minCommandInterval) {
      const waitMs = rules.minCommandInterval - timeSinceLastCommand;
      return {
        passed: false,
        reason: `⏳ Please wait ${Math.ceil(waitMs / 100) / 10}s between commands`
      };
    }

    return { passed: true };
  }

  private updateRateLimiting(deviceId: string): void {
    // Update command count
    const timestamps = this.commandCounts.get(deviceId) || [];
    timestamps.push(Date.now());
    this.commandCounts.set(deviceId, timestamps);

    // Update last command time
    this.lastCommandTime.set(deviceId, Date.now());
  }

  // =============================================================================
  // 🛡️ CONFLICT DETECTION
  // =============================================================================

  private detectCommandConflicts(
    deviceId: string,
    request: CommandRequest
  ): { hasConflict: boolean; message?: string } {

    const queuedCommands = this.commandQueue.get(deviceId) || [];

    if (queuedCommands.length > 0) {
      const lastQueued = queuedCommands[queuedCommands.length - 1];

      // Check for opposite commands
      if (this.areOppositeCommands(lastQueued.commandType, request.commandType)) {
        return {
          hasConflict: true,
          message: `⚠️ Conflicting with queued command: ${lastQueued.commandType}`
        };
      }
    }

    return { hasConflict: false };
  }

  private areOppositeCommands(cmd1: CommandType, cmd2: CommandType): boolean {
    const opposites: Record<string, string> = {
      'switch.on': 'switch.off',
      'switch.off': 'switch.on',
      'dimmer.on': 'dimmer.off',
      'dimmer.off': 'dimmer.on',
      'shutter.open': 'shutter.close',
      'shutter.close': 'shutter.open'
    };

    return opposites[cmd1] === cmd2 || opposites[cmd2] === cmd1;
  }

  private detectRapidDirectionChanges(commands: CommandAuditLog[]): boolean {
    if (commands.length < 3) return false;

    let directionChanges = 0;
    for (let i = 1; i < commands.length; i++) {
      const prev = commands[i - 1].request.commandType;
      const curr = commands[i].request.commandType;

      if (this.areOppositeCommands(prev, curr)) {
        directionChanges++;
      }
    }

    return directionChanges >= 2; // 2+ direction changes in 5 seconds
  }

  // =============================================================================
  // 🛡️ PAYLOAD VALIDATION
  // =============================================================================

  private validatePayload(
    device: Device,
    request: CommandRequest
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (request.commandType) {
      case 'dimmer.set':
        if (typeof request.payload !== 'number') {
          errors.push('Dimmer value must be a number');
        } else if (request.payload < 0 || request.payload > 100) {
          errors.push('Dimmer value must be 0-100');
        }
        break;

      case 'shutter.position':
        if (typeof request.payload !== 'number') {
          errors.push('Shutter position must be a number');
        } else if (request.payload < 0 || request.payload > 100) {
          errors.push('Shutter position must be 0-100');
        }
        break;

      case 'shutter.tilt':
        if (typeof request.payload !== 'number') {
          errors.push('Tilt angle must be a number');
        }
        break;
    }

    return { valid: errors.length === 0, errors };
  }

  // =============================================================================
  // 🛡️ USER CONFIRMATION
  // =============================================================================

  private async requestUserConfirmation(
    device: Device,
    request: CommandRequest,
    validation: CommandValidation
  ): Promise<boolean> {

    const message = this.buildConfirmationMessage(device, request, validation);

    // In a real app, this would show a modal dialog
    // For now, we'll use browser's confirm()
    return new Promise((resolve) => {
      const confirmed = confirm(message);
      resolve(confirmed);
    });
  }

  private buildConfirmationMessage(
    device: Device,
    request: CommandRequest,
    validation: CommandValidation
  ): string {
    let message = `🛡️ SAFETY CONFIRMATION REQUIRED\n\n`;
    message += `Device: ${device.name}\n`;
    message += `Command: ${request.commandType}\n`;
    message += `Safety Score: ${validation.safetyScore}/100\n\n`;

    if (validation.warnings.length > 0) {
      message += `⚠️ WARNINGS:\n`;
      validation.warnings.forEach(w => {
        message += `• ${w}\n`;
      });
      message += `\n`;
    }

    message += `Do you want to proceed?`;
    return message;
  }

  // =============================================================================
  // 🛡️ COMMAND EXECUTION
  // =============================================================================

  private async executeCommandSafely(
    device: Device,
    request: CommandRequest
  ): Promise<any> {

    // Generate shield token for verification
    const shieldToken = this.generateShieldToken();

    // Call MQTT service through secure interface
    try {
      await mqttService.executeShieldedCommand(
        device,
        request.commandType,
        request.payload,
        shieldToken
      );

      return { success: true };
    } catch (error: any) {
      logger.addLog('error', `Command execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * ✅ Generate shield token for MQTT verification
   */
  private generateShieldToken(): string {
    // Simple token - in production use cryptographic signing
    return `shield_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // =============================================================================
  // 🛡️ DEVICE LOCKING
  // =============================================================================

  private acquireDeviceLock(
    deviceId: string,
    commandId: string,
    requestedBy: string
  ): boolean {

    const existingLock = this.deviceLocks.get(deviceId);

    if (existingLock) {
      // Check if lock expired (5 seconds timeout)
      const lockAge = Date.now() - existingLock.lockedAt.getTime();
      if (lockAge < 5000) {
        return false; // Lock still active
      }

      // Lock expired, remove it
      logger.addLog('warning', `🔓 Expired lock removed for device ${deviceId}`);
      this.deviceLocks.delete(deviceId);
    }

    // Acquire new lock
    this.deviceLocks.set(deviceId, {
      commandId,
      lockedAt: new Date(),
      lockedBy: requestedBy
    });

    return true;
  }

  private releaseDeviceLock(deviceId: string, commandId: string): void {
    const lock = this.deviceLocks.get(deviceId);

    if (lock && lock.commandId === commandId) {
      this.deviceLocks.delete(deviceId);
    }
  }

  // =============================================================================
  // 🛡️ EMERGENCY CONTROLS
  // =============================================================================

  /**
   * EMERGENCY STOP - Halts ALL commands immediately
   */
  activateEmergencyStop(reason: string): void {
    console.error('🚨 EMERGENCY STOP ACTIVATED:', reason);
    logger.addLog('error', `🚨 EMERGENCY STOP: ${reason}`);
    // Track emergency stop
    userSessionManager.trackShieldEvent('emergency_stop');
    this.emergencyStopActive = true;

    // Cancel all active commands
    this.activeCommands.forEach((cmd, id) => {
      this.recordAudit(id, cmd.request, cmd.validation, 'cancelled', undefined, 'Emergency stop');
    });
    this.activeCommands.clear();

    // Clear all queues
    this.commandQueue.clear();

    notificationService.error('🚨 EMERGENCY STOP ACTIVE - All commands blocked!', 0);
     // ✅  Notify status change
     this.notifyStatusChange();
     this.saveState(true); // 🆕 Save immediately
  }

  /**
   * Deactivate emergency stop
   */
  deactivateEmergencyStop(): void {
    this.emergencyStopActive = false;
    logger.addLog('success', '✅ Emergency stop deactivated');
    notificationService.success('✅ Emergency stop cleared - Normal operation resumed', 5000);
    // ✅  Notify status change
    this.notifyStatusChange();
    this.saveState(true); // 🆕 Save immediately
  }
    // ✅   Get aggregate statistics across all devices
    public getAggregateStats(): {
      totalCommands: number;
      completedCommands: number;
      failedCommands: number;
      deniedCommands: number;
      blockedCommands: number;
      averageSafetyScore: number;
      commandsLastHour: number;
      commandsLastMinute: number;
    } {
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

      this.commandHistory.forEach((history) => {
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
        deniedCommands,
        blockedCommands,
        averageSafetyScore: totalCommands > 0 ? Math.round(totalSafetyScore / totalCommands) : 100,
        commandsLastHour,
        commandsLastMinute
      };
    }

  /**
   * Pause all commands for specified duration
   */
  pauseCommands(durationMs: number, reason: string): void {
    this.globalPauseUntil = new Date(Date.now() + durationMs);
    logger.addLog('warning', `⏸️ Commands paused for ${durationMs/1000}s: ${reason}`);
    notificationService.warning(`⏸️ Commands paused: ${reason}`, 5000);
    this.saveState(true); // 🆕 Save immediately
  }

  /**
   * Blacklist device (prevent all commands)
   */
  blacklistDevice(deviceId: string, reason: string): void {
    this.blacklistedDevices.add(deviceId);
    logger.addLog('error', `⛔ Device blacklisted: ${reason}`);
    notificationService.error(`⛔ Device blacklisted: ${reason}`, 8000);
    this.saveState(true); // 🆕 Save immediately
  }

  /**
   * Remove device from blacklist
   */
  whitelistDevice(deviceId: string): void {
    this.blacklistedDevices.delete(deviceId);
    logger.addLog('success', `✅ Device removed from blacklist`);
    this.saveState(true); // 🆕 Save immediately
  }

  // =============================================================================
  // 🛡️ AUDIT & HISTORY
  // =============================================================================

  private recordAudit(
    commandId: string,
    request: CommandRequest,
    validation: CommandValidation,
    status: CommandStatus,
    result?: any,
    error?: string
  ): void {

    const log: CommandAuditLog = {
      id: commandId,
      request,
      validation,
      status,
      executedAt: status === 'executing' ? new Date() : undefined,
      completedAt: ['completed', 'failed', 'cancelled'].includes(status) ? new Date() : undefined,
      result,
      error
    };

    // Store in device history
    const history = this.commandHistory.get(request.deviceId) || [];
    history.push(log);

    // Keep only last 100 commands per device
    if (history.length > 100) {
      history.shift();
    }

    this.commandHistory.set(request.deviceId, history);

    // Track active commands
    if (status === 'executing') {
      this.activeCommands.set(commandId, log);
    } else if (['completed', 'failed', 'cancelled', 'timeout'].includes(status)) {
      this.activeCommands.delete(commandId);
    }
    // ✅   Notify listeners of command execution
    this.notifyCommandExecuted(log);

    // ✅   Notify status change
    this.notifyStatusChange();

    this.saveState(); // 🆕 Persist updated history (debounced)
  }

  /**
   * Get command history for device
   */
  getCommandHistory(deviceId: string, limit: number = 50): CommandAuditLog[] {
    const history = this.commandHistory.get(deviceId) || [];
    return history.slice(-limit);
  }

  /**
   * Get recent commands (for conflict detection)
   */
  private getRecentCommands(deviceId: string, windowMs: number): CommandAuditLog[] {
    const history = this.commandHistory.get(deviceId) || [];
    const cutoff = Date.now() - windowMs;

    return history.filter(cmd =>
      cmd.request.timestamp.getTime() > cutoff
    );
  }

  // =============================================================================
  // 🛡️ CONFIGURATION
  // =============================================================================

  private getSafetyRules(device: Device): DeviceSafetyRules {
    const defaultRules = DEFAULT_SAFETY_RULES[device.type] || DEFAULT_SAFETY_RULES.switch;
    const customRules = this.customRules.get(device.id) || {};

    return { ...defaultRules, ...customRules };
  }

  /**
   * Set custom safety rules for specific device
   */
  setDeviceSafetyRules(deviceId: string, rules: Partial<DeviceSafetyRules>): void {
    this.customRules.set(deviceId, rules);
    logger.addLog('info', `🛡️ Custom safety rules set for device ${deviceId}`);
    this.saveState(true); // 🆕 Save immediately (config change)
  }

  // =============================================================================
  // 🛡️ MONITORING
  // =============================================================================

  private startMonitoring(): void {
    // Clean up expired locks every 10 seconds
    setInterval(() => {
      const now = Date.now();

      this.deviceLocks.forEach((lock, deviceId) => {
        const lockAge = now - lock.lockedAt.getTime();
        if (lockAge > 5000) {
          logger.addLog('warning', `🔓 Auto-released expired lock for device ${deviceId}`);
          this.deviceLocks.delete(deviceId);
        }
      });
    }, 10000);
  }

  // =============================================================================
  // 🛡️ UTILITIES
  // =============================================================================

  private generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current shield status
   */
  getStatus(): {
    emergencyStopActive: boolean;
    globalPauseActive: boolean;
    blacklistedDevices: number;
    activeCommands: number;
    deviceLocks: number;
    blacklistedDeviceIds?: string[];  // ✅ NEW: Expose IDs
  } {
    return {
      emergencyStopActive: this.emergencyStopActive,
      globalPauseActive: this.globalPauseUntil ? new Date() < this.globalPauseUntil : false,
      blacklistedDevices: this.blacklistedDevices.size,
      activeCommands: this.activeCommands.size,
      deviceLocks: this.deviceLocks.size,
      blacklistedDeviceIds: Array.from(this.blacklistedDevices)  // ✅ NEW
    };
  }

  /**
   * Debug information
   */
  debugInfo(): void {
    console.group('🛡️ Command Shield Status');
    console.log('Status:', this.getStatus());
    console.log('Command History:', this.commandHistory.size, 'devices tracked');
    console.log('Rate Limits:', this.commandCounts);
    console.log('Device Locks:', Array.from(this.deviceLocks.entries()));
    console.groupEnd();
  }
  /**
   * Check if specific device is blacklisted
   */
  public isDeviceBlacklisted(deviceId: string): boolean {
    return this.blacklistedDevices.has(deviceId);
  }

}

// Singleton export
export const commandShield = CommandShieldService.getInstance();