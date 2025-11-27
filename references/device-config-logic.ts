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
