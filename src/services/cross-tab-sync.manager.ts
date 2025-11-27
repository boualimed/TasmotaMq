// services/cross-tab-sync.manager.ts
// Cross-Tab Synchronization Manager with Leader Election

/**
 * Message types for cross-tab communication
 */
export type SyncMessageType =
  | 'SESSION_UPDATE'
  | 'DEVICE_UPDATE'
  | 'DEVICE_ADDED'
  | 'DEVICE_REMOVED'
  | 'DEVICES_CLEARED'
  | 'MQTT_SETTINGS_UPDATE'
  | 'MQTT_CONNECTION'
  | 'MQTT_DISCONNECTION'
  | 'MQTT_CONNECT_REQUEST'     // 🆕
  | 'MQTT_DISCONNECT_REQUEST'  // 🆕
  | 'MQTT_CONNECTION_FAILED'   // 🆕
  | 'MQTT_MESSAGE'             // 🆕 Forward MQTT messages
  | 'MQTT_COMMAND'             // 🆕 Commands from followers
  | 'USAGE_INCREMENT'
  | 'LEADER_ELECTION'
  | 'LEADER_HEARTBEAT'
  | 'TAB_CLOSING'
  | 'FORCE_REFRESH';

export interface SyncMessage {
  type: SyncMessageType;
  tabId: string;
  timestamp: number;
  userId: string;
  data?: any;
  version?: number;
}

export interface TabInfo {
  tabId: string;
  isLeader: boolean;
  lastHeartbeat: number;
  createdAt: number;
}

/**
 * Cross-Tab Synchronization Manager
 * Handles multi-tab coordination, leader election, and conflict resolution
 */
export class CrossTabSyncManager {
  private tabId: string;
  private isLeader: boolean = false;
  private broadcastChannel: BroadcastChannel | null = null;
  private storageListener: ((e: StorageEvent) => void) | null = null;
  private heartbeatInterval: number | null = null;
  private leaderCheckInterval: number | null = null;

  private readonly HEARTBEAT_INTERVAL = 2000; // 2 seconds
  private readonly LEADER_TIMEOUT = 5000; // 5 seconds
  private readonly TAB_REGISTRY_KEY = 'active_tabs';

  private messageHandlers: Map<SyncMessageType, Set<(data: any) => void>> = new Map();
  private currentUserId: string | null = null;

  constructor() {
    this.tabId = this.generateTabId();
    console.log(`🏷️ Tab initialized: ${this.tabId}`);
    this.init();
  }

  // =============================================================================
  // Initialization
  // =============================================================================

  private init(): void {
    // Initialize BroadcastChannel for modern browsers
    if (typeof BroadcastChannel !== 'undefined') {
      this.broadcastChannel = new BroadcastChannel('tasmota_sync');
      this.broadcastChannel.onmessage = (event) => this.handleBroadcastMessage(event.data);
      console.log('📡 BroadcastChannel initialized');
    }

    // Fallback: localStorage event listener for cross-tab sync
    this.storageListener = (e: StorageEvent) => this.handleStorageEvent(e);
    window.addEventListener('storage', this.storageListener);

    // Register this tab
    this.registerTab();

    // Start leader election
    this.startLeaderElection();

    // Handle tab close
    window.addEventListener('beforeunload', () => this.handleTabClose());

    // Handle visibility change (tab becomes active/inactive)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkLeaderStatus();
      }
    });
  }

  /**
   * Set current user (called after login)
   */
  setUser(userId: string): void {
    this.currentUserId = userId;
    console.log(`👤 User set: ${userId}`);
  }

  /**
   * Clear user (called on logout)
   */
  clearUser(): void {
    this.currentUserId = null;
  }

  // =============================================================================
  // Tab Registry & Leader Election
  // =============================================================================

  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private registerTab(): void {
    const tabs = this.getActiveTabs();
    tabs[this.tabId] = {
      tabId: this.tabId,
      isLeader: false,
      lastHeartbeat: Date.now(),
      createdAt: Date.now()
    };
    this.saveActiveTabs(tabs);
    console.log('📝 Tab registered in registry');
  }

  private unregisterTab(): void {
    const tabs = this.getActiveTabs();
    delete tabs[this.tabId];
    this.saveActiveTabs(tabs);
    console.log('🗑️ Tab unregistered from registry');
  }

  private getActiveTabs(): Record<string, TabInfo> {
    try {
      const raw = localStorage.getItem(this.TAB_REGISTRY_KEY);
      if (!raw) return {};

      const tabs = JSON.parse(raw);
      const now = Date.now();

      // Clean up stale tabs
      const activeTabs: Record<string, TabInfo> = {};
      for (const [tabId, info] of Object.entries(tabs as Record<string, TabInfo>)) {
        if (now - info.lastHeartbeat < this.LEADER_TIMEOUT) {
          activeTabs[tabId] = info;
        }
      }

      return activeTabs;
    } catch (error) {
      console.error('Failed to get active tabs:', error);
      return {};
    }
  }

  private saveActiveTabs(tabs: Record<string, TabInfo>): void {
    try {
      localStorage.setItem(this.TAB_REGISTRY_KEY, JSON.stringify(tabs));
    } catch (error) {
      console.error('Failed to save active tabs:', error);
    }
  }

  private startLeaderElection(): void {
    // Initial election
    this.electLeader();

    // Start heartbeat
    this.heartbeatInterval = window.setInterval(() => {
      this.sendHeartbeat();
    }, this.HEARTBEAT_INTERVAL);

    // Periodic leader check
    this.leaderCheckInterval = window.setInterval(() => {
      this.checkLeaderStatus();
    }, this.LEADER_TIMEOUT);
  }

  private electLeader(): void {
    const tabs = this.getActiveTabs();
    const tabIds = Object.keys(tabs).sort(); // Sort for deterministic election

    if (tabIds.length === 0) {
      this.promoteToLeader();
      return;
    }

    // Check if there's already a valid leader
    const currentLeader = Object.values(tabs).find(tab => tab.isLeader);
    const now = Date.now();

    if (currentLeader && (now - currentLeader.lastHeartbeat) < this.LEADER_TIMEOUT) {
      // Valid leader exists
      this.isLeader = currentLeader.tabId === this.tabId;
      if (!this.isLeader) {
        console.log(`👥 Following leader: ${currentLeader.tabId}`);
      }
      return;
    }

    // No valid leader - elect oldest tab
    const oldestTabId = tabIds[0];
    if (oldestTabId === this.tabId) {
      this.promoteToLeader();
    } else {
      this.isLeader = false;
      console.log(`👥 Another tab is leader: ${oldestTabId}`);
    }
  }

  private promoteToLeader(): void {
    if (this.isLeader) return;

    this.isLeader = true;
    console.log('👑 Promoted to LEADER tab');

    const tabs = this.getActiveTabs();

    // Demote all other tabs
    for (const tabId in tabs) {
      tabs[tabId].isLeader = false;
    }

    // Promote this tab
    if (tabs[this.tabId]) {
      tabs[this.tabId].isLeader = true;
    }

    this.saveActiveTabs(tabs);
    this.broadcast('LEADER_ELECTION', { newLeaderId: this.tabId });
  }

  private sendHeartbeat(): void {
    const tabs = this.getActiveTabs();

    if (tabs[this.tabId]) {
      tabs[this.tabId].lastHeartbeat = Date.now();
      tabs[this.tabId].isLeader = this.isLeader;
      this.saveActiveTabs(tabs);
    }

    if (this.isLeader) {
      this.broadcast('LEADER_HEARTBEAT', { tabId: this.tabId });
    }
  }

  private checkLeaderStatus(): void {
    const tabs = this.getActiveTabs();
    const leaders = Object.values(tabs).filter(tab => tab.isLeader);
    const now = Date.now();

    // No leader or leader is stale
    if (leaders.length === 0 || (now - leaders[0].lastHeartbeat) > this.LEADER_TIMEOUT) {
      console.log('⚠️ Leader timeout detected, initiating election');
      this.electLeader();
    }

    // Multiple leaders (split-brain) - oldest wins
    if (leaders.length > 1) {
      console.warn('⚠️ Split-brain detected, resolving...');
      const oldestLeader = leaders.sort((a, b) => a.createdAt - b.createdAt)[0];
      this.isLeader = oldestLeader.tabId === this.tabId;

      if (!this.isLeader) {
        console.log(`👥 Demoted, following: ${oldestLeader.tabId}`);
      }
    }
  }

  private handleTabClose(): void {
    console.log('🚪 Tab closing, broadcasting...');
    this.broadcast('TAB_CLOSING', { tabId: this.tabId });
    this.unregisterTab();
    this.cleanup();
  }

  // =============================================================================
  // Message Broadcasting
  // =============================================================================

  /**
   * Broadcast message to all other tabs
   */
  broadcast(type: SyncMessageType, data?: any): void {
    if (!this.currentUserId) return;

    const message: SyncMessage = {
      type,
      tabId: this.tabId,
      timestamp: Date.now(),
      userId: this.currentUserId,
      data
    };

    // Primary: BroadcastChannel (fast, modern)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch (error) {
        console.error('BroadcastChannel error:', error);
      }
    }

    // Fallback: localStorage (for older browsers)
    this.broadcastViaStorage(message);
  }

  private broadcastViaStorage(message: SyncMessage): void {
    try {
      const key = `sync_message_${Date.now()}_${Math.random()}`;
      localStorage.setItem(key, JSON.stringify(message));

      // Clean up immediately (message is received via storage event)
      setTimeout(() => localStorage.removeItem(key), 1000);
    } catch (error) {
      console.error('Storage broadcast error:', error);
    }
  }

  private handleBroadcastMessage(message: SyncMessage): void {
    // Ignore messages from this tab
    if (message.tabId === this.tabId) return;

    // Ignore messages from different users
    if (message.userId !== this.currentUserId) return;

    console.log(`📨 Received broadcast: ${message.type} from ${message.tabId}`);

    // Handle special system messages
    switch (message.type) {
      case 'LEADER_ELECTION':
        if (message.data?.newLeaderId !== this.tabId) {
          this.isLeader = false;
        }
        break;

      case 'TAB_CLOSING':
        if (message.data?.tabId) {
          const tabs = this.getActiveTabs();
          delete tabs[message.data.tabId];
          this.saveActiveTabs(tabs);

          // If closing tab was leader, trigger election
          if (message.data.tabId !== this.tabId) {
            setTimeout(() => this.checkLeaderStatus(), 100);
          }
        }
        break;

      case 'FORCE_REFRESH':
        console.log('🔄 Force refresh requested');
        window.location.reload();
        break;
    }

    // Notify registered handlers
    this.notifyHandlers(message.type, message.data);
  }

  private handleStorageEvent(event: StorageEvent): void {
    if (!event.key || !event.newValue) return;

    // Check if this is a sync message
    if (event.key.startsWith('sync_message_')) {
      try {
        const message: SyncMessage = JSON.parse(event.newValue);
        this.handleBroadcastMessage(message);
      } catch (error) {
        console.error('Failed to parse storage sync message:', error);
      }
    }

    // Check if this is tab registry update
    if (event.key === this.TAB_REGISTRY_KEY) {
      this.checkLeaderStatus();
    }
  }

  // =============================================================================
  // Message Handlers
  // =============================================================================

  /**
   * Subscribe to specific message types
   */
  on(type: SyncMessageType, handler: (data: any) => void): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }

    this.messageHandlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  private notifyHandlers(type: SyncMessageType, data: any): void {
    const handlers = this.messageHandlers.get(type);
    if (!handlers) return;

    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Handler error for ${type}:`, error);
      }
    });
  }

  // =============================================================================
  // Public API
  // =============================================================================

  /**
   * Check if this tab is the leader
   */
  isLeaderTab(): boolean {
    return this.isLeader;
  }

  /**
   * Get this tab's ID
   */
  getTabId(): string {
    return this.tabId;
  }

  /**
   * Get count of active tabs
   */
  getActiveTabCount(): number {
    return Object.keys(this.getActiveTabs()).length;
  }

  /**
   * Force this tab to become leader (use with caution)
   */
  forceLeader(): void {
    console.warn('⚠️ Forcing tab to become leader');
    this.promoteToLeader();
  }

  /**
   * Request all tabs to refresh
   */
  requestGlobalRefresh(): void {
    console.log('🔄 Broadcasting global refresh request');
    this.broadcast('FORCE_REFRESH');
    setTimeout(() => window.location.reload(), 100);
  }

  // =============================================================================
  // Cleanup
  // =============================================================================

  cleanup(): void {
    console.log('🧹 Cleaning up CrossTabSyncManager');

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.leaderCheckInterval) {
      clearInterval(this.leaderCheckInterval);
      this.leaderCheckInterval = null;
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }

    this.messageHandlers.clear();
  }
}

// Singleton instance
export const crossTabSync = new CrossTabSyncManager();