// handlers/subscription-handler.ts
// Subscription & Usage Tracking

import { userSessionManager } from '../../services/user-session.manager';
import { notificationService } from '../../services/notification.service';
import { logger } from '../../utils/logger.util';
import { getCurrentUsage } from '../../utils/feature-guard.util';

export class SubscriptionHandler {
  constructor(
    //private onStateChange: () => void
  ) {}

  // =============================================================================
  // Subscription Info
  // =============================================================================

  getSubscriptionInfo() {
    const session = userSessionManager.getCurrentSession();
    if (!session) {
      return {
        tier: 'free',
        status: 'active',
        features: {
          maxDevices: 5,
          maxRules: 3,
          maxTimers: 5,
          advancedAnalytics: false,
          aiInsights: false,
          cloudSync: false,
          apiAccess: false,
          customIntegrations: false,
          prioritySupport: false,
          whiteLabel: false
        },
        usage: {
          devicesCreated: 0,
          mqttMessagesProcessed: 0,
          aiQueriesUsed: 0,
          storageUsed: 0,
          lastReset: new Date(),
          monthlyQuota: {
            devices: 5,
            mqttMessages: 10000,
            aiQueries: 100,
            storage: 50 * 1024 * 1024
          }
        }
      };
    }

    return {
      tier: session.subscription.tier,
      status: session.subscription.status,
      features: session.features,
      usage: session.usage
    };
  }

  // =============================================================================
  // Feature Access Control
  // =============================================================================

  canAddDevice(): { allowed: boolean; reason?: string; current: number; max: number } {
    const session = userSessionManager.getCurrentSession();
    if (!session) {
      return {
        allowed: false,
        reason: 'No active session',
        current: 0,
        max: 0
      };
    }

    const { features, usage } = session;
    const current = usage.devicesCreated;
    const max = features.maxDevices;

    if (max === -1) {
      return {
        allowed: true,
        current,
        max: -1
      };
    }

    if (current >= max) {
      return {
        allowed: false,
        reason: `Device limit reached (${max}/${max})`,
        current,
        max
      };
    }

    return {
      allowed: true,
      current,
      max
    };
  }

  isFeatureAvailable(feature: string): boolean {
    const result = userSessionManager.canPerformAction(feature);
    return result.allowed;
  }

  // =============================================================================
  // Usage Tracking
  // =============================================================================

  trackFeatureUsage(
    feature: 'device' | 'mqtt' | 'ai' | 'storage',
    amount: number = 1
  ): void {
    const session = userSessionManager.getCurrentSession();
    if (!session) return;

    switch (feature) {
      case 'device':
        userSessionManager.trackUsage('devicesCreated', amount);
        break;
      case 'mqtt':
        userSessionManager.trackUsage('mqttMessagesProcessed', amount);
        break;
      case 'ai':
        userSessionManager.trackUsage('aiQueriesUsed', amount);
        break;
      case 'storage':
        userSessionManager.trackUsage('storageUsed', amount);
        break;
    }

    // Check for warnings after tracking
    const warnings = this.getUsageWarnings();
    if (warnings.length > 0) {
      warnings.forEach(warning => {
        notificationService.warning(warning, 5000);
      });
    }
  }

  getUsageWarnings(): string[] {
    const warnings: string[] = [];
    const session = userSessionManager.getCurrentSession();

    if (!session) return warnings;

    const { features, usage } = session;

    // Check device limit
    if (features.maxDevices !== -1) {
      const devicePercentage = (usage.devicesCreated / features.maxDevices) * 100;
      if (devicePercentage >= 90) {
        warnings.push(`⚠️ Device limit almost reached: ${usage.devicesCreated}/${features.maxDevices}`);
      }
    }

    // Check MQTT message limit
    if (usage.monthlyQuota.mqttMessages !== -1) {
      const mqttPercentage = (usage.mqttMessagesProcessed / usage.monthlyQuota.mqttMessages) * 100;
      if (mqttPercentage >= 90) {
        warnings.push(`⚠️ MQTT message quota almost used: ${usage.mqttMessagesProcessed.toLocaleString()}/${usage.monthlyQuota.mqttMessages.toLocaleString()}`);
      }
    }

    // Check AI query limit (if feature enabled)
    if (features.aiInsights && usage.monthlyQuota.aiQueries !== -1) {
      const aiPercentage = (usage.aiQueriesUsed / usage.monthlyQuota.aiQueries) * 100;
      if (aiPercentage >= 90) {
        warnings.push(`⚠️ AI query quota almost used: ${usage.aiQueriesUsed}/${usage.monthlyQuota.aiQueries}`);
      }
    }

    return warnings;
  }

  getUsageStats() {
    return getCurrentUsage();
  }

  // =============================================================================
  // Formatted Stats
  // =============================================================================

  getFormattedUsageStats(): {
    devices: string;
    mqttMessages: string;
    aiQueries: string;
    storage: string;
  } {
    const session = userSessionManager.getCurrentSession();
    if (!session) {
      return {
        devices: '0/5',
        mqttMessages: '0/10,000',
        aiQueries: 'N/A',
        storage: '0 MB'
      };
    }

    const { usage, features } = session;

    const formatQuota = (used: number, quota: number): string => {
      if (quota === -1) return `${used.toLocaleString()} / ∞`;
      return `${used.toLocaleString()} / ${quota.toLocaleString()}`;
    };

    return {
      devices: formatQuota(usage.devicesCreated, features.maxDevices),
      mqttMessages: formatQuota(usage.mqttMessagesProcessed, usage.monthlyQuota.mqttMessages),
      aiQueries: features.aiInsights
        ? formatQuota(usage.aiQueriesUsed, usage.monthlyQuota.aiQueries)
        : 'Not Available',
      storage: `${(usage.storageUsed / (1024 * 1024)).toFixed(2)} MB`
    };
  }

  getDaysUntilReset(): number {
    const session = userSessionManager.getCurrentSession();
    if (!session) return 0;

    const lastReset = new Date(session.usage.lastReset);
    const nextReset = new Date(lastReset);
    nextReset.setMonth(nextReset.getMonth() + 1);

    const now = new Date();
    const diffTime = nextReset.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }

  // =============================================================================
  // Upgrade Prompts
  // =============================================================================

  showUpgradePrompt(feature: string): void {
    const session = userSessionManager.getCurrentSession();
    if (!session) return;

    const tier = session.subscription.tier;

    let message = '';
    let suggestedTier = '';

    switch (feature) {
      case 'devices':
        message = `You've reached your device limit (${session.features.maxDevices}). Upgrade to add more devices!`;
        suggestedTier = tier === 'free' ? 'Basic' : 'Pro';
        break;
      case 'ai':
        message = `AI Insights is not available in your current plan. Upgrade to Pro to unlock AI features!`;
        suggestedTier = 'Pro';
        break;
      case 'cloud':
        message = `Cloud Sync is not available in your current plan. Upgrade to Basic to sync across devices!`;
        suggestedTier = 'Basic';
        break;
      case 'api':
        message = `API Access is not available in your current plan. Upgrade to Pro to use the API!`;
        suggestedTier = 'Pro';
        break;
      default:
        message = `This feature is not available in your current plan. Consider upgrading!`;
        suggestedTier = tier === 'free' ? 'Basic' : 'Pro';
    }

    // Show notification with upgrade button
    notificationService.warning(
      `${message} Suggested: ${suggestedTier} plan`,
      8000
    );

    // Log for analytics
    logger.addLog('warning', `Upgrade prompt shown: ${feature}`);
  }

  getUpgradeBenefits(currentTier: string): string[] {
    const benefits: Record<string, string[]> = {
      free: [
        '⬆️ Upgrade to Basic for 20 devices',
        '☁️ Enable Cloud Sync',
        '📊 Access Advanced Analytics',
        '💎 Get 100K MQTT messages/month'
      ],
      basic: [
        '⬆️ Upgrade to Pro for 100 devices',
        '🤖 Unlock AI Insights',
        '🔌 Get API Access',
        '🎨 Add Custom Integrations',
        '🎯 Priority Support'
      ],
      pro: [
        '⬆️ Upgrade to Enterprise for unlimited devices',
        '🏷️ White Label option',
        '💼 Dedicated Account Manager',
        '🚀 Premium support SLA'
      ],
      enterprise: [
        '✅ You have the highest tier!',
        '🎉 All features unlocked'
      ]
    };

    return benefits[currentTier] || [];
  }
}