// handlers/ui-state-handler.ts
// UI State Management (Modals, Filters, Drag & Drop)

import { deviceService } from '../../services/device-service';
import { notificationService } from '../../services/notification.service';
import { logger } from '../../utils/logger.util';
import { Device, DeviceType } from '../../models/device.model';

export class UIStateHandler {
  // Modal states
  private openChartModals = new Set<string>();
  private sensorHistoryModals = new Set<string>();
  private mlModals = new Set<string>();
  private openScriptModals = new Set<string>();

  // Rule modal state
  public showRuleModal = false;
  public selectedDeviceForRules: string | null = null;

  // Category/Filter state
  public activeCategory: DeviceType | 'all' = 'all';

  // Drag & drop state
  public draggedDeviceId: string | null = null;

  constructor(
    private onStateChange: () => void
  ) {}

  // =============================================================================
  // Chart Modal
  // =============================================================================

  openChartModal(deviceId: string): void {
    const device = deviceService.getDevice(deviceId);
    if (!device) return;

    // Check if device has sensor data
    if (!device.sensorData) {
      notificationService.warning(
        '⚠️ No sensor data available for this device',
        3000
      );
      return;
    }

    this.openChartModals.add(deviceId);
    this.onStateChange();
  }

  closeChartModal(deviceId: string): void {
    this.openChartModals.delete(deviceId);
    this.onStateChange();
  }

  isChartModalOpen(deviceId: string): boolean {
    return this.openChartModals.has(deviceId);
  }

  // =============================================================================
  // Sensor History Modal
  // =============================================================================

  openSensorHistoryModal(deviceId: string): void {
    const device = deviceService.getDevice(deviceId);
    if (!device) return;

    if (device.type !== 'sensor') {
      notificationService.warning('⚠️ History is only available for sensor devices', 3000);
      return;
    }

    this.sensorHistoryModals.add(deviceId);
    this.onStateChange();
  }

  closeSensorHistoryModal(deviceId: string): void {
    this.sensorHistoryModals.delete(deviceId);
    this.onStateChange();
  }

  isSensorHistoryModalOpen(deviceId: string): boolean {
    return this.sensorHistoryModals.has(deviceId);
  }

  // =============================================================================
  // ML Modal
  // =============================================================================

  openMLModal(deviceId: string): void {
    const device = deviceService.getDevice(deviceId);
    if (!device) return;

    if (device.type !== 'sensor') {
      notificationService.warning('⚠️ ML insights are only available for sensor devices', 3000);
      return;
    }

    this.mlModals.add(deviceId);
    this.onStateChange();
  }

  closeMLModal(deviceId: string): void {
    this.mlModals.delete(deviceId);
    this.onStateChange();
  }

  isMLModalOpen(deviceId: string): boolean {
    return this.mlModals.has(deviceId);
  }

  // =============================================================================
  // Script Modal
  // =============================================================================

  openScriptModal(deviceId: string): void {
    this.openScriptModals.add(deviceId);
    this.onStateChange();
  }

  closeScriptModal(deviceId: string): void {
    this.openScriptModals.delete(deviceId);
    this.onStateChange();
  }

  isScriptModalOpen(deviceId: string): boolean {
    return this.openScriptModals.has(deviceId);
  }

  getOpenScriptModals(): Set<string> {
    return this.openScriptModals;
  }




  // =============================================================================
  // Rule Modal
  // =============================================================================

  openRuleModal(deviceId: string): void {
    this.selectedDeviceForRules = deviceId;
    this.showRuleModal = true;
    this.onStateChange();
  }

  closeRuleModal(): void {
    this.selectedDeviceForRules = null;
    this.showRuleModal = false;
    this.onStateChange();
  }

  isRuleModalOpen(deviceId: string): boolean {
    return this.showRuleModal && this.selectedDeviceForRules === deviceId;
  }

  // =============================================================================
  // Category Filter
  // =============================================================================

  setActiveCategory(category: DeviceType | 'all'): void {
    this.activeCategory = category;
    this.onStateChange();
  }

  getFilteredDevices(devices: Device[]): Device[] {
    let filtered = devices;

    if (this.activeCategory !== 'all') {
      filtered = filtered.filter(d => d.type === this.activeCategory);
    }

    // Sort by custom order, then by name
    return filtered.sort((a, b) => {
      const orderA = a.customOrder ?? 999;
      const orderB = b.customOrder ?? 999;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return a.name.localeCompare(b.name);
    });
  }

  getCategoryCount(devices: Device[], category: DeviceType | 'all'): number {
    if (category === 'all') {
      return devices.length;
    }
    return devices.filter(d => d.type === category).length;
  }

  // =============================================================================
  // Drag & Drop
  // =============================================================================

  handleDragStart(deviceId: string): void {
    this.draggedDeviceId = deviceId;
    this.onStateChange();
  }

  handleDragOver(e: DragEvent): void {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
  }

  handleDrop(targetDeviceId: string, devices: Device[]): void {
    if (!this.draggedDeviceId || this.draggedDeviceId === targetDeviceId) {
      this.draggedDeviceId = null;
      return;
    }

    const draggedDevice = deviceService.getDevice(this.draggedDeviceId);
    const targetDevice = deviceService.getDevice(targetDeviceId);

    if (!draggedDevice || !targetDevice) {
      this.draggedDeviceId = null;
      return;
    }

    // Only allow reordering within same category
    if (this.activeCategory !== 'all' && draggedDevice.type !== targetDevice.type) {
      notificationService.warning('Can only reorder devices within the same category', 3000);
      this.draggedDeviceId = null;
      return;
    }

    // Get filtered devices for reordering
    const filteredDevices = this.getFilteredDevices(devices);
    const draggedIndex = filteredDevices.findIndex(d => d.id === this.draggedDeviceId);
    const targetIndex = filteredDevices.findIndex(d => d.id === targetDeviceId);

    if (draggedIndex === -1 || targetIndex === -1) {
      this.draggedDeviceId = null;
      return;
    }

    // Reorder logic
    const reorderedDevices = [...filteredDevices];
    const [removed] = reorderedDevices.splice(draggedIndex, 1);
    reorderedDevices.splice(targetIndex, 0, removed);

    // Update customOrder for all affected devices
    reorderedDevices.forEach((device, index) => {
      deviceService.updateDevice(device.id, { customOrder: index });
    });

    logger.addLog('info', `Reordered ${draggedDevice.name}`);
    notificationService.success(`✅ ${draggedDevice.name} moved`, 2000);

    this.draggedDeviceId = null;
    this.onStateChange();
  }

  handleDragEnd(): void {
    this.draggedDeviceId = null;
    this.onStateChange();
  }

  resetDeviceOrder(devices: Device[]): void {
    if (!confirm('Reset all devices to alphabetical order?')) return;

    devices.forEach((device) => {
      deviceService.updateDevice(device.id, { customOrder: undefined });
    });

    logger.addLog('info', 'Device order reset to default');
    notificationService.success('✅ Device order reset', 2500);

    this.onStateChange();
  }


  // =============================================================================
// Advanced Relay Control State
// =============================================================================

private advancedRelayControlOpen = new Set<string>();

/**
 * Open advanced relay control panel for a device
 */
openAdvancedRelayControl(deviceId: string): void {
  this.advancedRelayControlOpen.add(deviceId);
  console.log('🔧 [UIState] Opened advanced relay control:', deviceId);
  this.onStateChange();
}

/**
 * Close advanced relay control panel for a device
 */
closeAdvancedRelayControl(deviceId: string): void {
  this.advancedRelayControlOpen.delete(deviceId);
  console.log('🔧 [UIState] Closed advanced relay control:', deviceId);
  this.onStateChange();
}

/**
 * Check if advanced relay control panel is open for a device
 */
isAdvancedRelayControlOpen(deviceId: string): boolean {
  return this.advancedRelayControlOpen.has(deviceId);
}

/**
 * Close all advanced relay control panels
 */
closeAllAdvancedRelayControls(): void {
  this.advancedRelayControlOpen.clear();
  console.log('🔧 [UIState] Closed all advanced relay controls');
  this.onStateChange();
}

/**
 * Get all open advanced relay control panels
 */
getOpenAdvancedRelayControls(): Set<string> {
  return new Set(this.advancedRelayControlOpen);
}
  // =============================================================================
  // Cleanup
  // =============================================================================

  cleanup(): void {
    this.openChartModals.clear();
    this.sensorHistoryModals.clear();
    this.mlModals.clear();
    this.advancedRelayControlOpen.clear();
    this.openScriptModals.clear();
    this.showRuleModal = false;
    this.selectedDeviceForRules = null;
    this.draggedDeviceId = null;
    console.log('🧹 [UIState] Cleanup complete');
  }
}