// models/payment.model.ts
// Payment models for Konnect integration

export interface KonnectConfig {
  apiKey: string;
  receiverId: string; // Your Konnect wallet ID
  environment: 'sandbox' | 'production';
  webhookSecret: string;
}

export interface PaymentRequest {
  amount: number; // in millimes (1 TND = 1000 millimes)
  tier: 'basic' | 'pro' | 'enterprise';
  userId: string;
  userEmail: string;
  successUrl: string;
  failUrl: string;
  webhookUrl?: string;
  metadata?: {
    subscriptionTier: string;
    userId: string;
    duration: 'monthly' | 'yearly';
  };
}

export interface KonnectPaymentResponse {
  payUrl: string; // URL to redirect user for payment
  paymentRef: string; // Unique payment reference
}

export interface KonnectWebhookPayload {
  receivedAmount: number;
  paymentRef: string;
  transactionDate: string;
  status: 'completed' | 'failed' | 'pending';
  orderId: string;
  paymentMethod: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  tier: 'basic' | 'pro' | 'enterprise';
  amount: number;
  currency: 'TND';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentRef: string;
  paymentMethod?: string;
  createdAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

export const SUBSCRIPTION_PRICES = {
  basic: {
    monthly: 27000, // 27 TND in millimes
    yearly: 270000  // 270 TND (10% discount)
  },
  pro: {
    monthly: 87000, // 87 TND
    yearly: 870000
  },
  enterprise: {
    monthly: 297000, // 297 TND
    yearly: 2970000
  }
} as const;
