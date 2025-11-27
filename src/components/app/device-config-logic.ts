// device-config-logic-refactored.ts
// Main Orchestrator - Coordinates all handlers (REFACTORED)

import { serviceManager } from '../../services/service-manager';
import { ollamaAIService } from '../../services/ollama-ai.service';
import { mqttService, ConnectionStatus } from '../../services/mqtt-service';
import { deviceService } from '../../services/device-service';
import { notificationService, Notification } from '../../services/notification.service';
import { deviceMonitorService } from '../../services/device-monitor.service';
import { authService } from '../../services/auth.service';
import { supabaseService } from '../../services/supabase.service';
import { logger } from '../../utils/logger.util';
import { indexedDBService } from '../../services/indexeddb.service';
import { checkAndWarnLimits } from '../../utils/feature-guard.util';
import { userSessionManager } from '../../services/user-session.manager';
import { deviceValidationService } from '../../services/device-validation.service';

// Import handlers
import { MqttHandler } from '../handlers/mqtt-handler';
import { DeviceHandler } from '../handlers/device-handler';
import { ValidationHandler } from '../handlers/validation-handler';
import { ShutterHandler } from '../handlers/shutter-handler';
import { TimerHandler } from '../handlers/timer-handler';
import { StorageHandler } from '../handlers/storage-handler';
import { SubscriptionHandler } from '../handlers/subscription-handler';
import { UIStateHandler } from '../handlers/ui-state-handler';
import { RulesScriptsHandler } from '../handlers/rules-scripts-handler';

// Models
import { MqttSettings, DEFAULT_MQTT_SETTINGS } from '../../models/mqtt-settings.model';
import { Device, NewDeviceInput, DEFAULT_NEW_DEVICE, DeviceType, SensorConfig } from '../../models/device.model';
import { LogEntry } from '../../models/app-state.model';
import { TelegramHandler } from '../handlers/telegram-handler';
import { AlertType } from '../../models/telegram.model';
import { commandShield } from '../../services/command-shield.service';
import { shieldHandler } from '../handlers/shield-handler';

export class DeviceConfigLogic {

  // =============================================================================
  // Handlers (Composition over Inheritance)
  // =============================================================================

  private mqttHandler: MqttHandler;
  private deviceHandler: DeviceHandler;
  private validationHandler: ValidationHandler;
  private shutterHandler: ShutterHandler;
  private timerHandler: TimerHandler;
  private storageHandler: StorageHandler;
  private subscriptionHandler: SubscriptionHandler;
  private uiStateHandler: UIStateHandler;
  private rulesScriptsHandler: RulesScriptsHandler;

  // =============================================================================
  // State Properties
  // =============================================================================

  public mqttSettings: MqttSettings = { ...DEFAULT_MQTT_SETTINGS };
  public devices: Device[] = [];
  public newDevice: NewDeviceInput = { ...DEFAULT_NEW_DEVICE };
  public connectionStatus: ConnectionStatus = 'disconnected';
  public logs: LogEntry[] = [];
  public errorMessage = '';
  public notifications: Notification[] = [];
  public currentUser = '';

  // =============================================================================
  // Private Properties
  // =============================================================================

  private unsubscribers: (() => void)[] = [];
  private deviceStatusMap = new Map<string, boolean>();
  private onStateChange: () => void = () => { };
  private telegramHandler!: TelegramHandler;

  // Initialization guards
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;


  // =============================================================================
  // Constructor
  // =============================================================================

  constructor(onStateChange: () => void) {
    this.onStateChange = onStateChange;
    // 🛡️ CRITICAL: Verify shield is active before allowing device control
    if (!serviceManager.isShieldActive()) {
      const error = '🚨 CRITICAL: Command Shield is not active!';
      console.error(error);
      logger.addLog('error', error);
      throw new Error('Cannot initialize device control without Command Shield');
    }

    console.log('✅ Command Shield verified - device control enabled');

    // Initialize all handlers
    this.mqttHandler = new MqttHandler(
      () => this.onStateChange(),
      (msg) => this.showError(msg)
    );

    this.deviceHandler = new DeviceHandler(
      () => this.onStateChange(),
      (msg) => this.showError(msg),
      (feature, amount) =>
        this.subscriptionHandler.trackFeatureUsage(
          feature as 'device' | 'mqtt' | 'ai' | 'storage',
          amount
        )
    );


    this.validationHandler = new ValidationHandler();

    this.shutterHandler = new ShutterHandler(
      () => this.onStateChange(),
      () => this.validateToggle()
    );

    this.timerHandler = new TimerHandler(
      () => this.onStateChange(),
      (msg) => this.showError(msg),
      () => this.getCurrentUserId()
    );

    this.storageHandler = new StorageHandler(
      () => this.onStateChange()
    );

    this.subscriptionHandler = new SubscriptionHandler(

    );

    this.uiStateHandler = new UIStateHandler(
      () => this.onStateChange()
    );

    this.rulesScriptsHandler = new RulesScriptsHandler(
      () => this.onStateChange(),
      (msg) => this.showError(msg),
      () => this.saveState(),
      async (deviceId: string, message: string) => {
        try {
          await this.telegramHandler.sendCustomNotification(deviceId, message);
          return true; // Successfully sent notification
        } catch (error) {
          this.showError('Failed to send Telegram notification');
          return false; // Failed to send notification
        }
      },
      () => this.getCurrentUserId()
    );
  }

  // =============================================================================
  // Public API - Delegates to Handlers
  // =============================================================================

  // Allow updating the state change callback
  public setStateChangeCallback(callback: () => void): void {
    this.onStateChange = callback;
    console.log('🔄 Updated state change callback for new component instance');
  }

  // =============================================================================
  // Initialization & Lifecycle
  // =============================================================================

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ Already initialized, skipping...');
      return;
    }

    if (this.initializationPromise) {
      console.log('⏳ Initialization in progress, waiting...');
      return this.initializationPromise;
    }

    //  this.telegramHandler = new TelegramHandler();
    // await this.telegramHandler.initialize();

    this.initializationPromise = this._doInitialize();
    await this.initializationPromise;
    this.isInitialized = true;
    this.initializationPromise = null;
  }

  private async _doInitialize(): Promise<void> {
    console.log('Starting initialization...');

    if (this.isInitialized) {
      console.warn('Already initialized, aborting re-initialization');
      return;
    }

    if (!serviceManager.isShieldActive()) {
      throw new Error('Command Shield not active - cannot initialize');
    }

    this.loadCurrentUser();
    const session = userSessionManager.restoreSession();

    // Initialize Shield Handler
    await shieldHandler.initialize();
    console.log('Shield handler initialized');

    // Initialize Telegram Handler (ONLY ONCE!)
    this.telegramHandler = new TelegramHandler();
    await this.telegramHandler.initialize();

    // Restore session
    if (session) {
      console.log('Restored session:', session.username);
      deviceService.setDevices(session.devices);
      this.devices = deviceService.getDevices();

      this.mqttSettings = {
        ...session.mqttSettings,
        wasConnected: session.mqttSettings.wasConnected || false
      };
      console.log('Loaded devices from session:', this.devices.length);
    } else {
      console.log('No session found, loading from storage');
      const state = this.storageHandler.loadState();
      if (state) {
        this.mqttSettings = state.mqttSettings || this.mqttSettings;
        this.devices = state.devices || [];
        deviceService.setDevices(this.devices);
      }
    }

    // Initialize IndexedDB
    try {
      if (indexedDBService.isEnabled()) {
        await indexedDBService.initialize();
        logger.addLog('success', 'IndexedDB ready for sensor data logging');
      }
    } catch (error: any) {
      logger.addLog('error', `IndexedDB initialization failed: ${error.message}`);
    }

    // Register Telegram with MQTT
    mqttService.registerTelegramHandler(this.telegramHandler, deviceService);
    logger.addLog('success', 'Telegram integrated with MQTT for real-time alerts');
    console.log('[MQTT-Telegram] Real-time monitoring enabled');

    // Initialize service manager
    await serviceManager.initialize();
    const shieldStatus = serviceManager.getShieldStatus();
    console.log('Shield Status:', shieldStatus);
    logger.addLog('info', `Shield: ${shieldStatus.activeCommands} active commands, ${shieldStatus.deviceLocks} locks`);

    // Initialize Supabase (if enabled)
    if (session?.supabaseSettings?.enabled) {
      const isSupabaseReady = supabaseService.isEnabled();
      if (isSupabaseReady) {
        console.log('Supabase is initialized and ready');
        logger.addLog('success', 'Supabase ready for data storage');
      } else {
        console.warn('Supabase settings enabled but not initialized');
        if (session.supabaseSettings.config.url && session.supabaseSettings.config.anonKey) {
          const result = await supabaseService.initialize(session.supabaseSettings.config);
          if (result.success) {
            console.log('Supabase initialized successfully');
          } else {
            console.error('Supabase initialization failed:', result.error);
          }
        }
      }
    }
    // Setup subscriptions
    this.setupSubscriptions();

    // Check limits & auto-reconnect
    checkAndWarnLimits();
    await this.attemptAutoReconnect();

    this.isInitialized = true; // Don't forget this!
    console.log('Initialization complete');
  }

  cleanup(): void {
    console.log('🧹 Cleaning up device-config-logic...');

    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    deviceMonitorService.stopAll();
    ollamaAIService.destroy();
    indexedDBService.close();

    // Cleanup handlers
    this.mqttHandler.cleanup();
    this.deviceHandler.cleanup();
    this.timerHandler.cleanup();
    this.uiStateHandler.cleanup();
    // ✅ NEW: Cleanup shield handler
  shieldHandler.cleanup();
    // ✅ STEP 3: Cleanup Telegram handler
    this.telegramHandler.cleanup();
    // 🆕 Unregister Telegram from MQTT
    mqttService.unregisterTelegramHandler();
    logger.addLog('info', '📱 Telegram disconnected from MQTT');

    console.log('✅ Cleanup complete (MQTT connection preserved)');
  }

  public dispose(): void {
    console.log('🗑️ Full disposal - disconnecting MQTT and resetting state');

    this.cleanup();
    mqttService.disconnect();

    this.isInitialized = false;
    this.initializationPromise = null;

    console.log('✅ Full disposal complete');
  }

  private loadCurrentUser(): void {
    const user = authService.getCurrentUser();
    this.currentUser = user?.username || 'User';
  }

  private async attemptAutoReconnect(): Promise<void> {
    if (!this.mqttSettings.wasConnected || !this.mqttSettings.host) {
      console.log('ℹ️ Auto-reconnect skipped (wasConnected: false)');
      return;
    }

    if (mqttService.isConnected() || mqttService.getStatus() === 'connecting') {
      console.log('ℹ️ Auto-reconnect skipped (already connected/connecting)');
      return;
    }

    logger.addLog('info', '🔄 Attempting to auto-reconnect...');

    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      await this.handleConnect();
      logger.addLog('success', `✅ Auto-reconnected with ${this.devices.length} device(s)`);
    } catch (err: any) {
      logger.addLog('warning', `⚠️ Auto-reconnect failed: ${err.message}`);
    }
  }

  // =============================================================================
  // Subscription Management
  // =============================================================================

  private setupSubscriptions(): void {
    this.subscribeToMqttStatus();
    this.subscribeToMqttMessages();
    this.subscribeToDeviceChanges();
    this.subscribeToLogs();
    this.subscribeToNotifications();
    this.subscribeToAIConfig();
    this.setupDeviceMonitorCallback();
    this.subscribeToIndexedDBStatus();
  }

  private subscribeToMqttStatus(): void {
    this.unsubscribers.push(
      mqttService.onStatusChange((status) => {
        this.handleMqttStatusChange(status);
      })
    );
  }

  private subscribeToMqttMessages(): void {
    this.unsubscribers.push(
      mqttService.onMessage((message) => {
        this.mqttHandler.handleMqttMessage(message);
      })
    );
  }

  private subscribeToDeviceChanges(): void {
    this.unsubscribers.push(
      deviceService.subscribe((devices) => {
        this.handleDeviceChanges(devices);
      })
    );
  }

  private subscribeToLogs(): void {
    this.unsubscribers.push(
      logger.subscribe((logs) => {
        this.logs = logs;
        this.onStateChange();
      })
    );
  }

  private subscribeToNotifications(): void {
    this.unsubscribers.push(
      notificationService.subscribe((notifications) => {
        this.notifications = notifications;
        this.onStateChange();
      })
    );
  }

  private subscribeToAIConfig(): void {
    this.unsubscribers.push(
      ollamaAIService.onConfigChange(() => {
        logger.addLog('info', '🤖 AI config synchronized');
      })
    );
  }

  private setupDeviceMonitorCallback(): void {
    deviceMonitorService.onDeviceStatusChange((deviceId, isActive) => {
      deviceService.updateDevice(deviceId, { isConnected: isActive });
    });
  }

  private subscribeToIndexedDBStatus(): void {
    this.unsubscribers.push(
      indexedDBService.onStatusChange((enabled) => {
        logger.addLog('info', `💾 IndexedDB ${enabled ? 'enabled' : 'disabled'}`);
        this.onStateChange();
      })
    );
  }

  private handleMqttStatusChange(status: ConnectionStatus): void {
    const previousStatus = this.connectionStatus;

    if (previousStatus === status) {
      return;
    }

    this.connectionStatus = status;

    this.notifyStatusChange(status, previousStatus);

    if (status === 'connected' && previousStatus !== 'connected') {
      // Subscribe handled by mqttHandler
      this.devices = deviceService.getDevices();
      this.mqttSettings.wasConnected = true;
      this.saveState();
      console.log('✅ MQTT connected - state saved (wasConnected: true)');
    }

    if (status === 'disconnected' && previousStatus === 'connected') {
      console.log('📡 MQTT disconnected - auto-reconnect active in mqtt-service');
    }

    if (status === 'failed' && previousStatus !== 'failed') {
      console.log('⚠️ MQTT connection failed - auto-reconnect will retry');
    }

    this.onStateChange();
  }

  private notifyStatusChange(status: ConnectionStatus, previousStatus: ConnectionStatus): void {
    if (status === 'connected' && previousStatus !== 'connected') {
      notificationService.success('🔗 Connected to MQTT broker successfully!', 4000);
    } else if (status === 'disconnected' && previousStatus === 'connected') {
      notificationService.error('🔌 Disconnected from MQTT broker', 4000);
    } else if (status === 'failed') {
      notificationService.error('❌ Failed to connect to MQTT broker', 5000);
    }
  }

  private handleDeviceChanges(devices: Device[]): void {
        this.notifyDeviceStatusChanges(devices);
        this.devices = devices;
        this.saveState();
        this.storageHandler.syncToFirebase(devices);
        this.onStateChange();

        // ✅ CRITICAL FIX: Check shield status before evaluating rules
        const shieldStatus = commandShield.getStatus();

        if (shieldStatus.emergencyStopActive) {
          logger.addLog('warning', '🚨 Rules evaluation blocked - emergency stop active');
          return; // ← EXIT EARLY if emergency stop
        }

        if (shieldStatus.globalPauseActive) {
          logger.addLog('warning', '⏸️ Rules evaluation blocked - commands paused');
          return; // ← EXIT EARLY if paused
        }

        // ✅ Now safe to evaluate rules
        for (const device of devices) {
          if (device.sensorConfig?.currentValue !== undefined) {
            const sensorType = device.sensorConfig.sensorType;
            const value = device.sensorConfig.currentValue;

            // Telegram check (real-time monitoring)
            this.telegramHandler.checkAndNotify(device, sensorType as AlertType, value);

            // Rule engine evaluation (now protected by shield checks above)
            this.rulesScriptsHandler.evaluateRulesForDevice(device, sensorType, value);
          }
        }
      }

  private notifyDeviceStatusChanges(devices: Device[]): void {
    devices.forEach(device => {
      const previousStatus = this.deviceStatusMap.get(device.id);
      const currentStatus = device.isConnected;

      if (previousStatus !== undefined && previousStatus !== currentStatus) {
        if (currentStatus) {
          notificationService.success(`✅ ${device.name} is now ONLINE`, 3000);
        } else {
          notificationService.warning(`⚠️ ${device.name} is now OFFLINE`, 3000);
        }
      }

      this.deviceStatusMap.set(device.id, currentStatus);
    });
  }

  // =============================================================================
  // MQTT Operations - Delegate to MqttHandler
  // =============================================================================

  async handleConnect(): Promise<void> {
    await this.mqttHandler.handleConnect(this.mqttSettings);
    this.devices = deviceService.getDevices();
    this.onStateChange();
  }

  handleDisconnect(): void {
    this.mqttSettings.wasConnected = false;
    this.saveState();
    this.mqttHandler.handleDisconnect(() => this.saveState());
  }

  handleCancelConnection(): void {
    this.mqttSettings.wasConnected = false;
    this.saveState();
    this.mqttHandler.handleCancelConnection();
  }

  handleMqttSettingChange(field: string, value: any): void {
    this.mqttSettings = { ...this.mqttSettings, [field]: value };
    this.saveState();
    this.storageHandler.syncMqttSettingsToFirebase(this.mqttSettings);
    this.onStateChange();
  }

  // =============================================================================
  // Device Operations - Delegate to DeviceHandler
  // =============================================================================

  handleAddDevice(): void {
    const result = this.deviceHandler.handleAddDevice(
      this.newDevice,
      () => this.validationHandler.validateDeviceForm(this.newDevice),
      () => this.validationHandler.validateShutterConfig(this.newDevice),
      (device) => this.mqttHandler.subscribeToDevice(device),
      () => this.updateUserSession()
    );

    if (result) {
      this.newDevice = result;
      this.devices = deviceService.getDevices();
    }
  }

  handleRemoveDevice(deviceId: string): void {
    this.deviceHandler.handleRemoveDevice(deviceId);
    this.devices = deviceService.getDevices();
  }

  handleToggleDevice(device: Device): void {
    this.deviceHandler.handleToggleDevice(device);
  }

  handleToggleDimmer(device: Device): void {
    this.deviceHandler.handleToggleDimmer(device);
  }

  handleSetDimmer(device: Device, value: number): void {
    this.deviceHandler.handleSetDimmer(device, value);
  }

  handleToggleDeviceEnabled(deviceId: string): void {
    this.deviceHandler.handleToggleDeviceEnabled(deviceId);
  }

  handleDeviceInputChange(field: keyof NewDeviceInput, value: any): void {
    this.newDevice = { ...this.newDevice, [field]: value };
    this.onStateChange();
  }

  handleTypeSelect(type: DeviceType): void {
    this.newDevice = {
      ...this.newDevice,
      type,
      jsonPath: type === 'sensor' ? this.newDevice.jsonPath : '',
      powerChannel: (type === 'switch' || type === 'dimmer')
        ? (this.newDevice.powerChannel || (type === 'dimmer' ? 2 : 1))
        : undefined,
      sensorConfig: type === 'sensor' ? (this.newDevice.sensorConfig || {
        sensorType: 'custom',
        displayName: 'Custom Sensor',
        icon: '⚙️',
        unit: ''
      }) : undefined
    };

    if (type === 'shutter') {
      if (!this.newDevice.shutterIndex) {
        this.newDevice.shutterIndex = 1;
      }
      if (!this.newDevice.shutterMode) {
        this.newDevice.shutterMode = 1;
      }
      if (this.newDevice.shutterInvert === undefined) {
        this.newDevice.shutterInvert = false;
      }
    } else {
      delete this.newDevice.shutterIndex;
      delete this.newDevice.shutterMode;
      delete this.newDevice.shutterInvert;
    }

    this.onStateChange();
  }

  handleShutterConfigChange(field: string, value: any): void {
    this.newDevice = {
      ...this.newDevice,
      [field]: value
    };
    this.onStateChange();
  }

  handleSensorConfigChange(field: keyof SensorConfig, value: any): void {
    const updatedConfig = this.deviceHandler.handleSensorConfigChange(
      this.newDevice.sensorConfig,
      field,
      value
    );
    this.newDevice = {
      ...this.newDevice,
      sensorConfig: updatedConfig
    };
    this.onStateChange();
  }

  // =============================================================================
  // Shutter Operations - Delegate to ShutterHandler
  // =============================================================================

  handleOpenShutter(device: Device): void {
    this.shutterHandler.handleOpenShutter(device);
  }

  handleCloseShutter(device: Device): void {
    this.shutterHandler.handleCloseShutter(device);
  }

  handleSetShutterPosition(device: Device, position: number): void {
    this.shutterHandler.handleSetShutterPosition(device, position);
  }

  handleStopShutter(device: Device): void {
    this.shutterHandler.handleStopShutter(device);
  }

  handleSetShutterTilt(device: Device, angle: number): void {
    this.shutterHandler.handleSetShutterTilt(device, angle);
  }

  async handleStartShutterCalibration(device: Device): Promise<void> {
    await this.shutterHandler.handleStartShutterCalibration(device);
  }

  getShutterModeDescription(mode: number): string {
    return this.shutterHandler.getShutterModeDescription(mode);
  }

  validateShutterConfig() {
    return this.validationHandler.validateShutterConfig(this.newDevice);
  }

  // =============================================================================
  // Timer Operations - Delegate to TimerHandler
  // =============================================================================

  handleToggleTimers(deviceId: string, enabled: boolean): void {
    this.timerHandler.handleToggleTimers(deviceId, enabled);
  }

  async handleSaveTimer(deviceId: string, timerId: number, timer: any): Promise<void> {
    await this.timerHandler.handleSaveTimer(deviceId, timerId, timer);
  }

  async handleDeleteTimer(deviceId: string, timerId: number): Promise<void> {
    await this.timerHandler.handleDeleteTimer(deviceId, timerId);
  }

  openTimerModal(deviceId: string): void {
    this.timerHandler.openTimerModal(deviceId);
  }

  closeTimerModal(deviceId: string): void {
    this.timerHandler.closeTimerModal(deviceId);
  }

  isTimerModalOpen(deviceId: string): boolean {
    return this.timerHandler.isTimerModalOpen(deviceId);
  }

  // =============================================================================
  // Storage Operations - Delegate to StorageHandler
  // =============================================================================

  handleToggleIndexedDB(enabled: boolean): void {
    this.storageHandler.handleToggleIndexedDB(enabled);
  }

  getIndexedDBSettings() {
    return this.storageHandler.getIndexedDBSettings();
  }

  handleToggleAutoCleanup(enabled: boolean): void {
    this.storageHandler.handleToggleAutoCleanup(enabled);
  }

  handleUpdateMaxRecords(maxRecords: number): void {
    this.storageHandler.handleUpdateMaxRecords(maxRecords);
  }

  async handleClearOldData(hours: number): Promise<void> {
    await this.storageHandler.handleClearOldData(hours);
  }

  async handleClearAllSensorData(): Promise<void> {
    await this.storageHandler.handleClearAllSensorData();
  }

  async getDatabaseSize(): Promise<string> {
    return await this.storageHandler.getDatabaseSize();
  }

  async handleExportSensorData(): Promise<void> {
    await this.storageHandler.handleExportSensorData();
  }

  async handleImportSensorData(file: File): Promise<void> {
    await this.storageHandler.handleImportSensorData(file);
  }

  async getSensorStatistics(deviceId: string) {
    return await this.storageHandler.getSensorStatistics(deviceId);
  }

  handleExportData(): void {

  }

  // =============================================================================
  // UI State - Delegate to UIStateHandler
  // =============================================================================

  openChartModal(deviceId: string): void {
    this.uiStateHandler.openChartModal(deviceId);
  }

  closeChartModal(deviceId: string): void {
    this.uiStateHandler.closeChartModal(deviceId);
  }

  isChartModalOpen(deviceId: string): boolean {
    return this.uiStateHandler.isChartModalOpen(deviceId);
  }

  openSensorHistoryModal(deviceId: string): void {
    this.uiStateHandler.openSensorHistoryModal(deviceId);
  }

  closeSensorHistoryModal(deviceId: string): void {
    this.uiStateHandler.closeSensorHistoryModal(deviceId);
  }

  isSensorHistoryModalOpen(deviceId: string): boolean {
    return this.uiStateHandler.isSensorHistoryModalOpen(deviceId);
  }

  openMLModal(deviceId: string): void {
    this.uiStateHandler.openMLModal(deviceId);
  }

  closeMLModal(deviceId: string): void {
    this.uiStateHandler.closeMLModal(deviceId);
  }

  isMLModalOpen(deviceId: string): boolean {
    return this.uiStateHandler.isMLModalOpen(deviceId);
  }

  openScriptModal(deviceId: string): void {
    this.uiStateHandler.openScriptModal(deviceId);
  }

  get openScriptModals(): Set<string> {
    return this.uiStateHandler.getOpenScriptModals();
  }


  closeScriptModal(deviceId: string): void {
    this.uiStateHandler.closeScriptModal(deviceId);
  }

  isScriptModalOpen(deviceId: string): boolean {
    return this.uiStateHandler.isScriptModalOpen(deviceId);
  }

  openRuleModal(deviceId: string): void {
    this.uiStateHandler.openRuleModal(deviceId);
  }

  closeRuleModal(): void {
    this.uiStateHandler.closeRuleModal();
  }

  isRuleModalOpen(deviceId: string): boolean {
    return this.uiStateHandler.isRuleModalOpen(deviceId);
  }

  get showRuleModal(): boolean {
    return this.uiStateHandler.showRuleModal;
  }

  get selectedDeviceForRules(): string | null {
    return this.uiStateHandler.selectedDeviceForRules;
  }

  setActiveCategory(category: DeviceType | 'all'): void {
    this.uiStateHandler.setActiveCategory(category);
  }

  get activeCategory(): DeviceType | 'all' {
    return this.uiStateHandler.activeCategory;
  }

  getFilteredDevices(): Device[] {
    return this.uiStateHandler.getFilteredDevices(this.devices);
  }

  getCategoryCount(category: DeviceType | 'all'): number {
    return this.uiStateHandler.getCategoryCount(this.devices, category);
  }

  handleDragStart(deviceId: string): void {
    this.uiStateHandler.handleDragStart(deviceId);
  }

  handleDragOver(e: DragEvent): void {
    this.uiStateHandler.handleDragOver(e);
  }

  handleDrop(targetDeviceId: string): void {
    this.uiStateHandler.handleDrop(targetDeviceId, this.devices);
    this.devices = deviceService.getDevices();
  }

  handleDragEnd(): void {
    this.uiStateHandler.handleDragEnd();
  }

  get draggedDeviceId(): string | null {
    return this.uiStateHandler.draggedDeviceId;
  }

  resetDeviceOrder(): void {
    this.uiStateHandler.resetDeviceOrder(this.devices);
    this.devices = deviceService.getDevices();
  }

  // =============================================================================
  // Rules & Scripts - Delegate to RulesScriptsHandler
  // =============================================================================

  handleToggleRules(deviceId: string, enabled: boolean): void {
    this.rulesScriptsHandler.handleToggleRules(deviceId, enabled);
  }

  handleToggleScript(deviceId: string, enabled: boolean): void {
    this.rulesScriptsHandler.handleToggleScript(deviceId, enabled);
  }

  // =============================================================================
  // Subscription & Usage - Delegate to SubscriptionHandler
  // =============================================================================

  getSubscriptionInfo() {
    return this.subscriptionHandler.getSubscriptionInfo();
  }

  canAddDevice() {
    return this.subscriptionHandler.canAddDevice();
  }

  isFeatureAvailable(feature: string): boolean {
    return this.subscriptionHandler.isFeatureAvailable(feature);
  }

  getUsageWarnings(): string[] {
    return this.subscriptionHandler.getUsageWarnings();
  }

  showUpgradePrompt(feature: string): void {
    this.subscriptionHandler.showUpgradePrompt(feature);
  }

  getUpgradeBenefits(currentTier: string): string[] {
    return this.subscriptionHandler.getUpgradeBenefits(currentTier);
  }

  getFormattedUsageStats() {
    return this.subscriptionHandler.getFormattedUsageStats();
  }

  getDaysUntilReset(): number {
    return this.subscriptionHandler.getDaysUntilReset();
  }

  getUsageStats() {
    return this.subscriptionHandler.getUsageStats();
  }

  // =============================================================================
  // Validation - Delegate to ValidationHandler
  // =============================================================================

  validateDeviceForm() {
    return this.validationHandler.validateDeviceForm(this.newDevice);
  }

  getFieldError(field: string): string | null {
    return this.validationHandler.getFieldError(this.newDevice, field);
  }

  hasValidationErrors(): boolean {
    return this.validationHandler.hasValidationErrors(this.newDevice);
  }

  getValidationWarnings(): string[] {
    return this.validationHandler.getValidationWarnings(this.newDevice);
  }

  // =============================================================================
  // Device Validation
  // =============================================================================

  async handleValidateDevice(deviceId: string): Promise<void> {
    const device = deviceService.getDevice(deviceId);
    if (!device) return;

    if (!mqttService.isConnected || !mqttService.isConnected()) {
      notificationService.warning('⚠️ MQTT must be connected to validate device', 3000);
      return;
    }

    deviceService.updateDevice(deviceId, {
      validationStatus: 'checking'
    });
    this.onStateChange();

    try {
      const result = await deviceValidationService.validateDevice(
        device,
        (topic, payload) => mqttService.publish(topic, payload),
        (topic) => mqttService.subscribe(topic)
      );

      deviceService.updateDevice(deviceId, {
        validationStatus: result.isValid ? 'valid' : 'invalid',
        lastValidation: result.timestamp,
        validationResult: result,
        capabilities: result.actualCapabilities
      });

      if (result.isValid) {
        notificationService.success(`✅ ${device.name} configuration is valid`, 3000);
        if (result.warnings.length > 0) {
          result.warnings.forEach(warning => {
            notificationService.warning(`⚠️ ${warning}`, 4000);
          });
        }
      } else {
        notificationService.error(`❌ ${device.name} configuration mismatch`, 4000);
        result.mismatches.forEach(mismatch => {
          notificationService.error(`⚠️ ${mismatch}`, 5000);
        });
      }

      this.onStateChange();
    } catch (error: any) {
      deviceService.updateDevice(deviceId, {
        validationStatus: 'unknown'
      });
      notificationService.error(`Failed to validate ${device.name}: ${error.message}`, 4000);
      this.onStateChange();
    }
  }

  // =============================================================================
  // AI Integration
  // =============================================================================

  async handleAnalyzeNow(): Promise<void> {
    await ollamaAIService.analyzeNow();
  }

  handleAIConfigChanged(): void {
    logger.addLog('info', '🤖 AI configuration updated');
  }

  // =============================================================================
  // State Management
  // =============================================================================

  private saveState(): void {
    this.storageHandler.saveState(this.mqttSettings, this.devices);
  }

  private updateUserSession(): void {
    const session = userSessionManager.getCurrentSession();
    if (!session) return;

    userSessionManager.updateSession({
      devices: deviceService.getDevices(),
      mqttSettings: this.mqttSettings,
      lastAccess: new Date()
    });
  }

  // =============================================================================
  // Navigation & Logout
  // =============================================================================

  handleBack(): void {
    this.saveState();
  }

  handleLogout(): void {
    if (!confirm('Are you sure you want to log out?')) return;

    this.saveState();
    this.dispose();
    authService.logout();
    window.location.href = '/login';
  }

  // =============================================================================
  // UI Helpers
  // =============================================================================

  dismissNotification(notificationId: string): void {
    notificationService.dismiss(notificationId);
  }

  showError(message: string): void {
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = '';
      this.onStateChange();
    }, 5000);
    this.onStateChange();
  }

  private validateToggle(): boolean {
    if (!mqttService.isConnected || !mqttService.isConnected()) {
      this.showError('Not connected to MQTT broker');
      logger.addLog('error', 'Not connected to MQTT broker');
      return false;
    }
    return true;
  }

  getStatusClass(): string {
    return this.connectionStatus;
  }

  getStatusText(): string {
    const statusMap: Record<ConnectionStatus, string> = {
      connected: 'Connected',
      disconnected: 'Disconnected',
      connecting: 'Connecting...',
      failed: 'Connection failed'
    };
    return statusMap[this.connectionStatus];
  }

  getNotificationIcon(type: string): string {
    const iconMap: Record<string, string> = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return iconMap[type] || 'ℹ️';
  }

  getDeviceIcon(type: DeviceType): string {
    const icons: Record<DeviceType, string> = {
      switch: '💡',
      dimmer: '🔆',
      shutter: '🪟',
      sensor: '🌡️'
    };
    return icons[type];
  }

  isDeviceAvailable(device: Device): boolean {
    if (device.useAutoDiscovery && device.lwtTopic) {
      return device.isConnected && device.lwtStatus === 'Online';
    }
    return device.isConnected;
  }

async handleSetPulseTime(deviceId: string, deciseconds: number): Promise<void> {
  const device = deviceService.getDevice(deviceId);
  if (!device) {
    this.showError('Device not found');
    logger.addLog('error', `Device not found: ${deviceId}`);
    return;
  }

  if (!this.deviceHandler.isMqttReady()) {
    this.showError('MQTT not connected');
    return;
  }

  if (device.isEnabled === false) {
    this.showError('Device is disabled');
    return;
  }

  if (deciseconds < 0 || deciseconds > 3600) {
    this.showError('Pulse time must be between 0-3600 deciseconds');
    return;
  }

  try {
    // ✅ This will now trigger shield events that dashboard listens to
    const result = await commandShield.executeCommand(
      device,
      'relay.pulse' as any,
      deciseconds,
      {
        requestedBy: this.getCurrentUserId(),
        reason: `Set pulse timer to ${deciseconds / 10}s`,
        priority: 'normal'
      }
    );

    if (!result.success) {
      this.showError(result.error || 'Command failed');
      logger.addLog('error', `Pulse time set failed: ${result.error}`);

      // ✅ Track blocked command in session
      userSessionManager.trackShieldEvent('blocked');
      return;
    }

    // ✅ Track successful command
    userSessionManager.trackShieldEvent('command');

    logger.addLog('success', `⏱️ Pulse time set to ${deciseconds / 10}s for ${device.name}`);
    notificationService.success(`⏱️ Pulse time configured`, 2000);

  } catch (error: any) {
    this.showError(`Failed to set pulse time: ${error.message}`);
    logger.addLog('error', `Pulse time error: ${error.message}`);

    // ✅ Track failed command
    userSessionManager.trackShieldEvent('blocked');
  }
}
/**
 * ✅ FIXED: Set blink time with shield protection
 */
async handleSetBlinkTime(deviceId: string, deciseconds: number): Promise<void> {
  // 🔍 Lookup device
  const device = deviceService.getDevice(deviceId);
  if (!device) {
    this.showError('Device not found');
    return;
  }

  if (!this.deviceHandler.isMqttReady()) {
    this.showError('MQTT not connected');
    return;
  }

  if (device.isEnabled === false) {
    this.showError('Device is disabled');
    return;
  }

  // Validate input
  if (deciseconds < 2 || deciseconds > 3600) {
    this.showError('Blink time must be between 2-3600 deciseconds (0.2-360 seconds)');
    return;
  }

  try {
    const result = await commandShield.executeCommand(
      device, // ✅ Device object
      'relay.blink' as any,
      { type: 'time', value: deciseconds },
      {
        requestedBy: this.getCurrentUserId(),
        reason: `Set blink time to ${deciseconds / 10}s`,
        priority: 'normal'
      }
    );

    if (!result.success) {
      this.showError(result.error || 'Command failed');
      return;
    }

    logger.addLog('success', `💫 Blink time set to ${deciseconds / 10}s`);
    notificationService.success(`💫 Blink time configured`, 2000);

  } catch (error: any) {
    this.showError(`Failed to set blink time: ${error.message}`);
  }
}

/**
 * ✅ FIXED: Set blink count with shield protection
 */
async handleSetBlinkCount(deviceId: string, count: number): Promise<void> {
  // 🔍 Lookup device
  const device = deviceService.getDevice(deviceId);
  if (!device) {
    this.showError('Device not found');
    return;
  }

  if (!this.deviceHandler.isMqttReady()) {
    this.showError('MQTT not connected');
    return;
  }

  if (device.isEnabled === false) {
    this.showError('Device is disabled');
    return;
  }

  // Validate input
  if (count < 0 || count > 32000) {
    this.showError('Blink count must be between 0-32000 (0 = infinite)');
    return;
  }

  try {
    const result = await commandShield.executeCommand(
      device, // ✅ Device object
      'relay.blink' as any,
      { type: 'count', value: count },
      {
        requestedBy: this.getCurrentUserId(),
        reason: `Set blink count to ${count === 0 ? 'infinite' : count}`,
        priority: 'normal'
      }
    );

    if (!result.success) {
      this.showError(result.error || 'Command failed');
      return;
    }

    logger.addLog('success', `💫 Blink count set to ${count === 0 ? 'infinite' : count}`);
    notificationService.success(`💫 Blink count configured`, 2000);

  } catch (error: any) {
    this.showError(`Failed to set blink count: ${error.message}`);
  }
}

/**
 * ✅ FIXED: Blink device command
 */
async handleBlinkDevice(deviceId: string): Promise<void> {
  // 🔍 Lookup device
  const device = deviceService.getDevice(deviceId);
  if (!device) {
    this.showError('Device not found');
    return;
  }

  if (!this.deviceHandler.isMqttReady()) {
    this.showError('MQTT not connected');
    return;
  }

  if (device.isEnabled === false) {
    this.showError('Device is disabled');
    return;
  }

  try {
    const result = await commandShield.executeCommand(
      device, // ✅ Device object
      'relay.blink' as any,
      { type: 'start' },
      {
        requestedBy: this.getCurrentUserId(),
        reason: 'Start blinking relay',
        priority: 'normal'
      }
    );

    if (!result.success) {
      this.showError(result.error || 'Command failed');
      return;
    }

    logger.addLog('success', `💡 Blink command sent to ${device.name}`);
    notificationService.success(`💡 Blinking started`, 2000);

  } catch (error: any) {
    this.showError(`Failed to send blink command: ${error.message}`);
  }
}

/**
 * Trigger BLINK_TOGGLE command (toggle state and start blinking)
 * @param deviceId Device ID
 */
handleBlinkToggleDevice(deviceId: string): void {
  const device = deviceService.getDevice(deviceId);
  if (!device) return;

  if (!mqttService.isConnected() || !this.isDeviceAvailable(device)) {
    this.showError('Device is not available');
    return;
  }

  try {
    mqttService.sendBlinkToggleCommand(device);
    notificationService.success(`🔄 Toggle & blink: ${device.name}`, 3000);
    logger.addLog('info', `Blink toggle sent: ${device.name}`);
  } catch (error: any) {
    this.showError(`Failed to blink toggle: ${error.message}`);
    logger.addLog('error', `Blink toggle failed: ${error.message}`);
  }
}

/**
 * ✅ FIXED: Set power-on state with shield protection
 */
async handleSetPowerOnState(deviceId: string, state: number): Promise<void> {
  // 🔍 Lookup device
  const device = deviceService.getDevice(deviceId);
  if (!device) {
    this.showError('Device not found');
    return;
  }

  if (!this.deviceHandler.isMqttReady()) {
    this.showError('MQTT not connected');
    return;
  }

  if (device.isEnabled === false) {
    this.showError('Device is disabled');
    return;
  }

  // Validate input
  if (state < 0 || state > 5) {
    this.showError('Power-on state must be 0-5');
    return;
  }

  try {
    const result = await commandShield.executeCommand(
      device, // ✅ Device object
      'relay.config' as any,
      { type: 'powerOnState', value: state },
      {
        requestedBy: this.getCurrentUserId(),
        reason: `Set power-on state to ${state}`,
        priority: 'normal'
      }
    );

    if (!result.success) {
      this.showError(result.error || 'Command failed');
      return;
    }

    const stateNames = ['OFF', 'ON', 'Toggle', 'Restore', 'ON no pulse', 'Restore reset pulse'];
    logger.addLog('success', `🔌 Power-on state set to: ${stateNames[state]}`);
    notificationService.success(`🔌 Power-on state configured`, 2000);

  } catch (error: any) {
    this.showError(`Failed to set power-on state: ${error.message}`);
  }
}

/**
 * ✅ FIXED: Set power lock with shield protection
 */
async handleSetPowerLock(deviceId: string, enabled: boolean): Promise<void> {
  // 🔍 Lookup device
  const device = deviceService.getDevice(deviceId);
  if (!device) {
    this.showError('Device not found');
    return;
  }

  if (!this.deviceHandler.isMqttReady()) {
    this.showError('MQTT not connected');
    return;
  }

  if (device.isEnabled === false) {
    this.showError('Device is disabled');
    return;
  }

  // ⚠️ Important: Confirm if locking
  if (enabled) {
    const confirmed = confirm(
      `⚠️ LOCK RELAY\n\n` +
      `This will prevent all relay control changes for ${device.name}.\n\n` +
      `You will need to unlock it before controlling the relay again.\n\n` +
      `Continue?`
    );

    if (!confirmed) {
      return;
    }
  }

  try {
    const result = await commandShield.executeCommand(
      device, // ✅ Device object
      'relay.lock',
      enabled,
      {
        requestedBy: this.getCurrentUserId(),
        reason: enabled ? 'Lock relay control' : 'Unlock relay control',
        priority: enabled ? 'high' : 'normal'
      }
    );

    if (!result.success) {
      this.showError(result.error || 'Command failed');
      return;
    }

    logger.addLog(enabled ? 'warning' : 'success',
      `🔒 Relay ${enabled ? 'locked' : 'unlocked'} for ${device.name}`
    );
    notificationService[enabled ? 'warning' : 'success'](
      `🔒 Relay ${enabled ? 'locked' : 'unlocked'}`,
      3000
    );

  } catch (error: any) {
    this.showError(`Failed to set power lock: ${error.message}`);
  }
}

/**
 * Set power retain (MQTT retain for power state)
 * @param deviceId Device ID
 * @param enabled true to retain, false to not retain
 */
handleSetPowerRetain(deviceId: string, enabled: boolean): void {
  const device = deviceService.getDevice(deviceId);
  if (!device) return;

  if (!mqttService.isConnected() || !this.isDeviceAvailable(device)) {
    this.showError('Device is not available');
    return;
  }

  try {
    mqttService.setPowerRetain(device, enabled);

    if (enabled) {
      notificationService.success(`💾 MQTT retain enabled for ${device.name}`, 3000);
      logger.addLog('info', `Power retain enabled: ${device.name}`);
    } else {
      notificationService.success(`💾 MQTT retain disabled for ${device.name}`, 3000);
      logger.addLog('info', `Power retain disabled: ${device.name}`);
    }
  } catch (error: any) {
    this.showError(`Failed to set power retain: ${error.message}`);
    logger.addLog('error', `Power retain failed: ${error.message}`);
  }
}

// =============================================================================
// Advanced Relay Control UI State
// =============================================================================

  openAdvancedRelayControl(deviceId: string): void {
    this.uiStateHandler.openAdvancedRelayControl(deviceId);
    this.onStateChange();
  }

  closeAdvancedRelayControl(deviceId: string): void {
    this.uiStateHandler.closeAdvancedRelayControl(deviceId);
    this.onStateChange();
  }

  isAdvancedRelayControlOpen(deviceId: string): boolean {
    return this.uiStateHandler.isAdvancedRelayControlOpen(deviceId);
    }
  /**
   * Get Telegram handler for UI components
   */
  getTelegramHandler(): TelegramHandler {
    return this.telegramHandler;
  }

  /**
   * Check if Telegram is enabled
   */
  isTelegramEnabled(): boolean {
    const settings = this.telegramHandler.getSettings();
    return settings?.enabled || false;
  }

  /**
   * Get active Telegram alert count
   */
  getActiveTelegramAlertCount(): number {
    const configs = this.telegramHandler.getAllAlertConfigs();
    return Array.from(configs.values()).filter(c => c.enabled).length;
  }

  /**
   * Get current user ID for shield tracking
   * Returns user ID or fallback identifier
   */
  private getCurrentUserId(): string {
    try {
      // Try to get from auth service first
      const user = authService.getCurrentUser();
      if (user?.id) {
        return user.id;
      }

      // Fallback to username
      if (user?.username) {
        return `user_${user.username}`;
      }

      // Fallback to session
      const session = userSessionManager.getCurrentSession();
      if (session?.userId) {
        return session.userId;
      }

      // Last resort: use 'anonymous'
      return 'anonymous';

    } catch (error) {
      console.warn('Failed to get user ID:', error);
      return 'anonymous';
    }
  }
  /**
   * ✅ FIXED: Send blink command with shield protection
   */
  async handleSendBlinkCommand(device: Device): Promise<void> {
    if (!this.deviceHandler.isMqttReady()) {
      this.showError('MQTT not connected');
      return;
    }

    if (device.isEnabled === false) {
      this.showError('Device is disabled');
      return;
    }

    try {
      // 🛡️ Route through Command Shield
      const result = await commandShield.executeCommand(
        device,
        'relay.blink' as any,
        { type: 'start' },
        {
          requestedBy: this.getCurrentUserId(),
          reason: 'Start blinking relay',
          priority: 'normal'
        }
      );

      if (!result.success) {
        this.showError(result.error || 'Command failed');
        return;
      }

      logger.addLog('success', `💡 Blink command sent to ${device.name}`);
      notificationService.success(`💡 Blinking started`, 2000);

    } catch (error: any) {
      this.showError(`Failed to send blink command: ${error.message}`);
    }
    }

    /**
   * ✅ FIXED: Send blink toggle command with shield protection
   */
  async handleSendBlinkToggleCommand(device: Device): Promise<void> {
    if (!this.deviceHandler.isMqttReady()) {
      this.showError('MQTT not connected');
      return;
    }

    if (device.isEnabled === false) {
      this.showError('Device is disabled');
      return;
    }

    try {
      // 🛡️ Route through Command Shield
      const result = await commandShield.executeCommand(
        device,
        'relay.blink' as any,
        { type: 'toggle' },
        {
          requestedBy: this.getCurrentUserId(),
          reason: 'Toggle and blink relay',
          priority: 'normal'
        }
      );

      if (!result.success) {
        this.showError(result.error || 'Command failed');
        return;
      }

      logger.addLog('success', `🔄 Blink toggle sent to ${device.name}`);
      notificationService.success(`🔄 Toggled and blinking`, 2000);

    } catch (error: any) {
      this.showError(`Failed to send blink toggle: ${error.message}`);
    }
  }

  /**
   * ✅ FIXED: Set interlock with shield protection
   */
  async handleSetInterlock(deviceId: string, relays: string): Promise<void> {
    // 🔍 Lookup device
    const device = deviceService.getDevice(deviceId);
    if (!device) {
      this.showError('Device not found');
      return;
    }

    if (!this.deviceHandler.isMqttReady()) {
      this.showError('MQTT not connected');
      return;
    }

    if (device.isEnabled === false) {
      this.showError('Device is disabled');
      return;
    }

    // Validate input
    if (relays.toUpperCase() !== 'OFF' && !/^[\d,]+$/.test(relays)) {
      this.showError('Invalid interlock format. Use "1,2,3" or "OFF"');
      return;
    }

    try {
      const result = await commandShield.executeCommand(
        device, // ✅ Device object
        'relay.config' as any,
        { type: 'interlock', value: relays },
        {
          requestedBy: this.getCurrentUserId(),
          reason: `Set interlock to ${relays}`,
          priority: 'normal'
        }
      );

      if (!result.success) {
        this.showError(result.error || 'Command failed');
        return;
      }

      logger.addLog('success', `🔗 Interlock set to ${relays}`);
      notificationService.success(`🔗 Interlock configured`, 2000);

    } catch (error: any) {
      this.showError(`Failed to set interlock: ${error.message}`);
    }
  }

  /**
   * ✅ FIXED: Toggle all relays with shield protection
   */
  async handleToggleAllRelays(deviceId: string): Promise<void> {
    // 🔍 Lookup device
    const device = deviceService.getDevice(deviceId);
    if (!device) {
      this.showError('Device not found');
      return;
    }

    if (!this.deviceHandler.isMqttReady()) {
      this.showError('MQTT not connected');
      return;
    }

    if (device.isEnabled === false) {
      this.showError('Device is disabled');
      return;
    }

    // ⚠️ Important: Confirm bulk action
    const confirmed = confirm(
      `⚠️ TOGGLE ALL RELAYS\n\n` +
      `This will toggle ALL relays on ${device.name} simultaneously.\n\n` +
      `Continue?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const result = await commandShield.executeCommand(
        device, // ✅ Device object
        'relay.toggleAll' as any,
        {},
        {
          requestedBy: this.getCurrentUserId(),
          reason: 'Toggle all relays simultaneously',
          priority: 'normal'
        }
      );

      if (!result.success) {
        this.showError(result.error || 'Command failed');
        return;
      }

      logger.addLog('success', `🔄 All relays toggled for ${device.name}`);
      notificationService.success(`🔄 All relays toggled`, 2000);

    } catch (error: any) {
      this.showError(`Failed to toggle all relays: ${error.message}`);
    }


  }

  public getShieldBlockedCount(): number {
    return shieldHandler.getBlockedCount();
  }

  }