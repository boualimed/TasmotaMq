// feature-guard.util.ts
// Utility for enforcing feature access control based on subscription

import { userSessionManager } from '../services/user-session.manager';
import { notificationService } from '../services/notification.service';

/**
 * Feature guard decorator for class methods
 * Usage: @FeatureGuard('add_device')
 */
export function FeatureGuard(action: string) {
  return function (
    //target: any,
    //propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = userSessionManager.canPerformAction(action);

      if (!result.allowed) {
        notificationService.error(
          `🔒 ${result.reason || 'Feature not available'}`,
          4000
        );

        if (result.upgradeRequired) {
          notificationService.warning(
            `💎 Upgrade to ${result.upgradeRequired} to unlock this feature`,
            5000
          );
        }

        return;
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Check if user can perform an action
 */
export function canPerformAction(action: string): boolean {
  const result = userSessionManager.canPerformAction(action);
  return result.allowed;
}

/**
 * Show upgrade prompt if feature is locked
 */
export function showUpgradePrompt(action: string): void {
  const result = userSessionManager.canPerformAction(action);

  if (!result.allowed && result.upgradeRequired) {
    notificationService.warning(
      `💎 Upgrade to ${result.upgradeRequired} to unlock this feature`,
      5000
    );
  }
}

/**
 * Validate and enforce action with user feedback
 */
export function enforceFeatureAccess(
  action: string,
  onSuccess?: () => void,
  onBlocked?: () => void
): boolean {
  const result = userSessionManager.canPerformAction(action);

  if (result.allowed) {
    // Track usage if applicable
    switch (action) {
      case 'add_device':
        userSessionManager.trackUsage('devicesCreated', 1);
        break;
      case 'use_ai':
        userSessionManager.trackUsage('aiQueriesUsed', 1);
        break;
    }

    if (onSuccess) onSuccess();
    return true;
  }

  // Show error notification
  notificationService.error(
    `🔒 ${result.reason || 'Feature not available'}`,
    4000
  );

  if (result.upgradeRequired) {
    notificationService.warning(
      `💎 Upgrade to ${result.upgradeRequired} to unlock this feature`,
      5000
    );
  }

  if (onBlocked) onBlocked();
  return false;
}

/**
 * Get user's feature limits
 */
export function getFeatureLimits() {
  const session = userSessionManager.getCurrentSession();
  return session ? session.features : null;
}

/**
 * Get user's current usage
 */
export function getCurrentUsage() {
  const session = userSessionManager.getCurrentSession();
  return session ? session.usage : null;
}

/**
 * Check if user is approaching limit
 */
export function isApproachingLimit(
  metric: 'devices' | 'rules' | 'aiQueries',
  threshold: number = 0.8
): boolean {
  const session = userSessionManager.getCurrentSession();
  if (!session) return false;

  const { usage, features } = session;

  switch (metric) {
    case 'devices':
      if (features.maxDevices === -1) return false;
      return usage.devicesCreated / features.maxDevices >= threshold;

    case 'rules':
      if (features.maxRules === -1) return false;
      return usage.devicesCreated / features.maxRules >= threshold;

    case 'aiQueries':
      if (usage.monthlyQuota.aiQueries === -1) return false;
      return usage.aiQueriesUsed / usage.monthlyQuota.aiQueries >= threshold;

    default:
      return false;
  }
}

/**
 * Show warning if approaching limit
 */
export function checkAndWarnLimits(): void {
  if (isApproachingLimit('devices', 0.8)) {
    notificationService.warning(
      '⚠️ You are approaching your device limit. Consider upgrading your plan.',
      5000
    );
  }

  if (isApproachingLimit('aiQueries', 0.9)) {
    notificationService.warning(
      '⚠️ You are approaching your AI query limit for this month.',
      5000
    );
  }
}