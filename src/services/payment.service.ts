// src/services/payment.service.ts
import { userSessionManager } from './user-session.manager';
import { notificationService } from './notification.service';

export interface PaymentInitRequest {
  tier: 'basic' | 'pro' | 'enterprise';
  billingCycle: 'monthly' | 'yearly';
  currency: 'TND' | 'EUR' | 'USD';
}

export interface PaymentInitResponse {
  payUrl: string;
  paymentRef: string;
  sessionToken: string;
}

export interface PaymentVerificationResponse {
  verified: boolean;
  subscription: {
    tier: string;
    status: string;
    startDate: string;
    expiresAt: string;
    billingCycle: string;
    autoRenew: boolean;
    features: string[];
  };
  payment: {
    amount: number;
    currency: string;
    method: string;
    completedAt: string;
  };
}

export class PaymentService {
  private readonly API_BASE = '/.netlify/functions/server/api/payments';

  /**
   * Initialize payment with Konnect
   */
  async initializePayment(request: PaymentInitRequest): Promise<PaymentInitResponse> {
    try {
      const token = this.getAuthToken();

      const response = await fetch(`${this.API_BASE}/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initialize payment');
      }

      return await response.json();
    } catch (error) {
      console.error('Payment initialization error:', error);
      throw error;
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(paymentRef: string): Promise<{
    status: 'pending' | 'completed' | 'failed' | 'expired';
    amount: number;
    currency: string;
    completedAt: Date | null;
  }> {
    try {
      const token = this.getAuthToken();

      const response = await fetch(`${this.API_BASE}/status/${paymentRef}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to check payment status');
      }

      const data = await response.json();
      return {
        ...data,
        completedAt: data.completedAt ? new Date(data.completedAt) : null
      };
    } catch (error) {
      console.error('Payment status check error:', error);
      throw error;
    }
  }

  /**
   * Verify payment and update local session
   */
  async verifyAndUpgradeSession(
    paymentRef: string,
    sessionToken: string
  ): Promise<boolean> {
    try {
      const token = this.getAuthToken();

      const response = await fetch(`${this.API_BASE}/verify-upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ paymentRef, sessionToken })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Verification failed');
      }

      const verification: PaymentVerificationResponse = await response.json();

      if (verification.verified) {
        // ✅ UPDATE LOCAL SESSION with new subscription
        this.updateLocalSession(verification);

        notificationService.success(
          `🎉 Subscription upgraded to ${verification.subscription.tier}!`
        );

        return true;
      }

      return false;
    } catch (error) {
      console.error('Payment verification error:', error);
      throw error;
    }
  }

  /**
   * Update local user session with new subscription
   */
  private updateLocalSession(verification: PaymentVerificationResponse): void {
    const session = userSessionManager.getCurrentSession();
    if (!session) {
      throw new Error('No active session');
    }

    // Upgrade subscription tier in session manager
    userSessionManager.upgradeSubscription(
      verification.subscription.tier as 'basic' | 'pro' | 'enterprise'
    );

    // Update subscription details
    userSessionManager.updateSession({
      subscription: {
        ...session.subscription,
        tier: verification.subscription.tier as any,
        status: 'active',
        startDate: new Date(verification.subscription.startDate),
        endDate: new Date(verification.subscription.expiresAt),
        autoRenew: verification.subscription.autoRenew
      }
    });

    console.log('✅ Local session updated with new subscription');
  }

  /**
   * Complete payment flow - opens payment window and polls for status
   */
  async completePaymentFlow(
    tier: 'basic' | 'pro' | 'enterprise',
    billingCycle: 'monthly' | 'yearly',
    currency: 'TND' | 'EUR' | 'USD' = 'TND'
  ): Promise<boolean> {
    try {
      // Step 1: Initialize payment
      const payment = await this.initializePayment({ tier, billingCycle, currency });

      // Step 2: Open payment window
      const paymentWindow = this.openPaymentWindow(payment.payUrl);

      // Step 3: Poll for payment status
      const status = await this.pollPaymentStatus(
        payment.paymentRef,
        paymentWindow,
        60, // 60 attempts = 2 minutes
        2000 // 2 seconds interval
      );

      if (status === 'completed') {
        // Step 4: Verify and update session
        await this.verifyAndUpgradeSession(
          payment.paymentRef,
          payment.sessionToken
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error('Payment flow error:', error);
      throw error;
    }
  }

  /**
   * Open payment window (popup or redirect)
   */
  private openPaymentWindow(payUrl: string): Window | null {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

    if (isStandalone || isMobile) {
      // Redirect on mobile/PWA
      window.location.href = payUrl;
      return null;
    }

    // Popup on desktop
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    return window.open(
      payUrl,
      'KonnectPayment',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );
  }

  /**
   * Poll payment status until completed/failed
   */
  private async pollPaymentStatus(
    paymentRef: string,
    paymentWindow: Window | null,
    maxAttempts: number = 60,
    intervalMs: number = 2000
  ): Promise<'completed' | 'failed' | 'expired'> {
    for (let i = 0; i < maxAttempts; i++) {
      // Check if payment window was closed
      if (paymentWindow && paymentWindow.closed) {
        throw new Error('Payment window closed by user');
      }

      const status = await this.checkPaymentStatus(paymentRef);

      if (status.status === 'completed') {
        // Close payment window if open
        if (paymentWindow && !paymentWindow.closed) {
          paymentWindow.close();
        }
        return 'completed';
      }

      if (status.status === 'failed' || status.status === 'expired') {
        if (paymentWindow && !paymentWindow.closed) {
          paymentWindow.close();
        }
        return status.status;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error('Payment status check timeout');
  }

  /**
   * Get authentication token from session
   */
  private getAuthToken(): string {
    // Get from localStorage or your auth service
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token');
    }
    return token;
  }
}

export const paymentService = new PaymentService();