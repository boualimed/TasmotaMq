// services/mqtt-coordination.service.ts
// MQTT Connection Coordination for Multi-Tab Safety

import { mqttService, ConnectionStatus, MqttMessage } from './mqtt-service';
import { crossTabSync } from './cross-tab-sync.manager';
import { MqttSettings } from '../models/mqtt-settings.model';
import { Device } from '../models/device.model';

/**
 * MqttCoordinationService
 *
 * Coordinates MQTT connections across multiple tabs:
 * - Only leader tab maintains active MQTT connection
 * - Follower tabs receive messages via BroadcastChannel
 * - Automatic failover when leader tab closes
 *
 * IMPORTANT: This prevents duplicate MQTT processing!
 */
export class MqttCoordinationService {
  private isInitialized = false;
  private messageForwardingEnabled = true;
  private localMessageListeners: Set<(message: MqttMessage) => void> = new Set();

  constructor() {
    console.log('📡 MqttCoordinationService initialized');
    this.setupCoordination();
  }

  // =============================================================================
  // Initialization & Coordination
  // =============================================================================

  private setupCoordination(): void {
    // Listen for leader election changes
    crossTabSync.on('LEADER_ELECTION', () => {
      console.log('👑 [MQTT-Coord] Leader election detected');
      this.handleLeadershipChange();
    });

    // Listen for connection events from other tabs
    crossTabSync.on('MQTT_CONNECTION', (data) => {
      console.log('📥 [MQTT-Coord] MQTT connected in another tab');
      this.handleRemoteConnection(data);
    });

    crossTabSync.on('MQTT_DISCONNECTION', (data) => {
      console.log('📥 [MQTT-Coord] MQTT disconnected in another tab');
      this.handleRemoteDisconnection(data);
    });

    // Forward MQTT messages to follower tabs
    mqttService.onMessage((message) => {
      if (this.messageForwardingEnabled && crossTabSync.isLeaderTab()) {
        this.broadcastMessage(message);
      }
    });

    // Listen for broadcasted MQTT messages (for followers)
    crossTabSync.on('MQTT_MESSAGE', (data) => {
      if (!crossTabSync.isLeaderTab()) {
        this.handleBroadcastedMessage(data);
      }
    });

    this.isInitialized = true;
  }

  /**
   * Handle leadership change
   */
  private handleLeadershipChange(): void {
    const isLeader = crossTabSync.isLeaderTab();

    console.log(`🔄 [MQTT-Coord] Leadership changed. I am ${isLeader ? 'LEADER' : 'FOLLOWER'}`);

    if (isLeader) {
      // New leader - check if we need to establish connection
      this.handlePromotionToLeader();
    } else {
      // Demoted to follower - optionally disconnect local MQTT
      this.handleDemotionToFollower();
    }
  }

  private async handlePromotionToLeader(): Promise<void> {
    console.log('👑 [MQTT-Coord] Promoted to leader');

    // Check if MQTT should be connected
    const session = (await import('./user-session.manager')).userSessionManager.getCurrentSession();

    if (session?.mqttSettings.wasConnected && !mqttService.isConnected()) {
      console.log('🔌 [MQTT-Coord] Reconnecting MQTT as new leader');

      try {
        await mqttService.connect(session.mqttSettings);

        // Resubscribe to all devices
        const { deviceService } = await import('./device-service');
        const devices = deviceService.getDevices();

        for (const device of devices) {
          if (device.isEnabled !== false) {
            try {
              if (device.type === 'shutter') {
                mqttService.subscribeToShutter(device);
              } else {
                mqttService.subscribeToDevice(device);
              }
            } catch (error) {
              console.error(`Failed to subscribe to ${device.name}:`, error);
            }
          }
        }

        console.log('✅ [MQTT-Coord] Reconnected and resubscribed as leader');
      } catch (error: any) {
        console.error('❌ [MQTT-Coord] Failed to reconnect:', error.message);
      }
    }
  }

  private handleDemotionToFollower(): void {
    console.log('👥 [MQTT-Coord] Demoted to follower');

    // STRATEGY: Keep local MQTT connection for faster failover
    // OR disconnect to save resources (configurable)

    const KEEP_FOLLOWER_CONNECTION = false; // Set to true for faster failover

    if (!KEEP_FOLLOWER_CONNECTION && mqttService.isConnected()) {
      console.log('🔌 [MQTT-Coord] Disconnecting MQTT as follower');
      mqttService.disconnect();
    }
  }

  // =============================================================================
  // Connection Management (Public API)
  // =============================================================================

  /**
   * Connect to MQTT (leader-aware)
   */
  async connect(settings: MqttSettings): Promise<void> {
    const isLeader = crossTabSync.isLeaderTab();

    console.log(`🔌 [MQTT-Coord] Connect request (Leader: ${isLeader})`);

    if (!isLeader) {
      console.log('👥 [MQTT-Coord] Follower tab - broadcasting connect intent');

      // Follower: Broadcast intent to leader
      crossTabSync.broadcast('MQTT_CONNECT_REQUEST', { settings });

      // Wait for leader to connect
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connect timeout - leader did not respond'));
        }, 15000);

        const unsubscribe = crossTabSync.on('MQTT_CONNECTION', () => {
          clearTimeout(timeout);
          unsubscribe();
          resolve();
        });
      });
    }

    // Leader: Actually connect
    try {
      await mqttService.connect(settings);

      // Broadcast success to followers
      crossTabSync.broadcast('MQTT_CONNECTION', { settings });

      console.log('✅ [MQTT-Coord] Leader connected successfully');
    } catch (error) {
      // Broadcast failure to followers
      crossTabSync.broadcast('MQTT_CONNECTION_FAILED', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Disconnect from MQTT (leader-aware)
   */
  disconnect(): void {
    const isLeader = crossTabSync.isLeaderTab();

    console.log(`🔌 [MQTT-Coord] Disconnect request (Leader: ${isLeader})`);

    if (!isLeader) {
      console.log('👥 [MQTT-Coord] Follower tab - broadcasting disconnect intent');
      crossTabSync.broadcast('MQTT_DISCONNECT_REQUEST', {});
      return;
    }

    // Leader: Actually disconnect
    mqttService.disconnect();

    // Broadcast to followers
    crossTabSync.broadcast('MQTT_DISCONNECTION', {});

    console.log('✅ [MQTT-Coord] Leader disconnected');
  }

  /**
   * Check if connected (considers cross-tab state)
   */
  isConnected(): boolean {
    // If we're the leader, check our local connection
    if (crossTabSync.isLeaderTab()) {
      return mqttService.isConnected();
    }

    // If we're a follower, check session state (reflects leader's connection)
    const session = (require('./user-session.manager')).userSessionManager.getCurrentSession();
    return session?.mqttSettings.wasConnected || false;
  }

  /**
   * Get connection status (considers cross-tab state)
   */
  getStatus(): ConnectionStatus {
    if (crossTabSync.isLeaderTab()) {
      return mqttService.getStatus();
    }

    // Follower: Return status based on session
    const session = (require('./user-session.manager')).userSessionManager.getCurrentSession();
    return session?.mqttSettings.wasConnected ? 'connected' : 'disconnected';
  }

  // =============================================================================
  // Message Broadcasting
  // =============================================================================

  /**
   * Broadcast MQTT message to all tabs
   */
  private broadcastMessage(message: MqttMessage): void {
    crossTabSync.broadcast('MQTT_MESSAGE', {
      topic: message.topic,
      payload: message.payload,
      timestamp: Date.now()
    });
  }

  /**
   * Handle broadcasted message from leader tab
   */
  private handleBroadcastedMessage(data: any): void {
    const message: MqttMessage = {
      topic: data.topic,
      payload: data.payload
    };

    // Notify local listeners
    this.localMessageListeners.forEach(listener => {
      try {
        listener(message);
      } catch (error) {
        console.error('[MQTT-Coord] Message listener error:', error);
      }
    });
  }

  // =============================================================================
  // Remote Event Handlers
  // =============================================================================

  private handleRemoteConnection(_data: any): void {
    console.log('📡 [MQTT-Coord] Remote connection established');
    // Update local state if needed
  }

  private handleRemoteDisconnection(_data: any): void {
    console.log('📡 [MQTT-Coord] Remote disconnection');
    // Update local state if needed
  }

  // =============================================================================
  // Message Subscription (Unified API)
  // =============================================================================

  /**
   * Subscribe to MQTT messages (works for both leader and follower tabs)
   */
  onMessage(listener: (message: MqttMessage) => void): () => void {
    this.localMessageListeners.add(listener);

    // If leader, also subscribe to actual MQTT service
    let mqttUnsubscribe: (() => void) | null = null;
    if (crossTabSync.isLeaderTab()) {
      mqttUnsubscribe = mqttService.onMessage(listener);
    }

    // Return combined unsubscribe function
    return () => {
      this.localMessageListeners.delete(listener);
      if (mqttUnsubscribe) {
        mqttUnsubscribe();
      }
    };
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    // Always listen to actual MQTT service status
    const mqttUnsubscribe = mqttService.onStatusChange(listener);

    // Also listen to cross-tab connection events
    const connectionUnsubscribe = crossTabSync.on('MQTT_CONNECTION', () => {
      listener('connected');
    });

    const disconnectionUnsubscribe = crossTabSync.on('MQTT_DISCONNECTION', () => {
      listener('disconnected');
    });

    // Return combined unsubscribe
    return () => {
      mqttUnsubscribe();
      connectionUnsubscribe();
      disconnectionUnsubscribe();
    };
  }

  // =============================================================================
  // Device Operations (Proxied to MQTT Service)
  // =============================================================================

  /**
   * Subscribe to device (leader-only operation)
   */
  subscribeToDevice(device: Device): void {
    if (!crossTabSync.isLeaderTab()) {
      console.log('👥 [MQTT-Coord] Follower tab - skipping device subscription');
      return;
    }

    mqttService.subscribeToDevice(device);
  }

  /**
   * Unsubscribe from device (leader-only operation)
   */
  unsubscribeFromDevice(device: Device): void {
    if (!crossTabSync.isLeaderTab()) {
      console.log('👥 [MQTT-Coord] Follower tab - skipping device unsubscription');
      return;
    }

    mqttService.unsubscribeFromDevice(device);
  }

  /**
   * Toggle switch (proxied, can be done from any tab)
   */
  toggleSwitch(device: Device, turnOn: boolean): void {
    if (!this.isConnected()) {
      throw new Error('MQTT not connected');
    }

    if (crossTabSync.isLeaderTab()) {
      mqttService.toggleSwitch(device, turnOn);
    } else {
      // Broadcast command to leader
      crossTabSync.broadcast('MQTT_COMMAND', {
        type: 'toggle_switch',
        deviceId: device.id,
        turnOn
      });
    }
  }

  /**
   * Set dimmer (proxied)
   */
  setDimmer(device: Device, value: number): void {
    if (!this.isConnected()) {
      throw new Error('MQTT not connected');
    }

    if (crossTabSync.isLeaderTab()) {
      mqttService.setDimmer(device, value);
    } else {
      crossTabSync.broadcast('MQTT_COMMAND', {
        type: 'set_dimmer',
        deviceId: device.id,
        value
      });
    }
  }

  /**
   * Set shutter position (proxied)
   */
  setShutterPosition(device: Device, position: number): void {
    if (!this.isConnected()) {
      throw new Error('MQTT not connected');
    }

    if (crossTabSync.isLeaderTab()) {
      mqttService.setShutterPosition(device, position);
    } else {
      crossTabSync.broadcast('MQTT_COMMAND', {
        type: 'set_shutter_position',
        deviceId: device.id,
        position
      });
    }
  }

  /**
   * Stop shutter (proxied)
   */
  stopShutter(device: Device): void {
    if (!this.isConnected()) {
      throw new Error('MQTT not connected');
    }

    if (crossTabSync.isLeaderTab()) {
      mqttService.stopShutter(device);
    } else {
      crossTabSync.broadcast('MQTT_COMMAND', {
        type: 'stop_shutter',
        deviceId: device.id
      });
    }
  }

  // =============================================================================
  // Command Handler for Follower Broadcasts
  // =============================================================================

  private setupCommandHandler(): void {
    crossTabSync.on('MQTT_COMMAND', async (data) => {
      if (!crossTabSync.isLeaderTab()) {
        return; // Only leader processes commands
      }

      console.log('📥 [MQTT-Coord] Received command from follower:', data.type);

      try {
        const { deviceService } = await import('./device-service');
        const device = deviceService.getDevice(data.deviceId);

        if (!device) {
          console.error('❌ [MQTT-Coord] Device not found:', data.deviceId);
          return;
        }

        switch (data.type) {
          case 'toggle_switch':
            mqttService.toggleSwitch(device, data.turnOn);
            break;
          case 'set_dimmer':
            mqttService.setDimmer(device, data.value);
            break;
          case 'set_shutter_position':
            mqttService.setShutterPosition(device, data.position);
            break;
          case 'stop_shutter':
            mqttService.stopShutter(device);
            break;
          default:
            console.warn('⚠️ [MQTT-Coord] Unknown command type:', data.type);
        }
      } catch (error: any) {
        console.error('❌ [MQTT-Coord] Command execution failed:', error.message);
      }
    });
  }

  // =============================================================================
  // Initialization
  // =============================================================================

  initialize(): void {
    if (this.isInitialized) {
      console.log('⚠️ [MQTT-Coord] Already initialized');
      return;
    }

    this.setupCommandHandler();
    console.log('✅ [MQTT-Coord] Initialized successfully');
  }

  // =============================================================================
  // Cleanup
  // =============================================================================

  cleanup(): void {
    console.log('🧹 [MQTT-Coord] Cleaning up');
    this.localMessageListeners.clear();
    this.messageForwardingEnabled = false;
  }
}

// Singleton instance
export const mqttCoordination = new MqttCoordinationService();

// Auto-initialize
mqttCoordination.initialize();