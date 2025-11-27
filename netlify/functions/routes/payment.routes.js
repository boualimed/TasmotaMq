const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const KonnectService = require('../services/konnect.service');
const { generateSessionToken } = require('../utils/session.utils');

const konnect = new KonnectService();

// Pricing configuration (matches your subscription tiers)
const PRICING = {
  basic: {
    monthly: { TND: 15000, EUR: 5000, USD: 5000 },
    yearly: { TND: 150000, EUR: 50000, USD: 50000 }
  },
  pro: {
    monthly: { TND: 35000, EUR: 12000, USD: 12000 },
    yearly: { TND: 350000, EUR: 120000, USD: 120000 }
  },
  enterprise: {
    monthly: { TND: 75000, EUR: 25000, USD: 25000 },
    yearly: { TND: 750000, EUR: 250000, USD: 250000 }
  }
};

/**
 * POST /api/payments/init
 * Initialize payment with Konnect
 */
router.post('/init', authenticateToken, async (req, res) => {
  try {
    const { tier, billingCycle, currency } = req.body;
    const userId = req.user.userId;
    const username = req.user.username;

    // Validate input
    if (!['basic', 'pro', 'enterprise'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid subscription tier' });
    }

    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return res.status(400).json({ error: 'Invalid billing cycle' });
    }

    if (!['TND', 'EUR', 'USD'].includes(currency)) {
      return res.status(400).json({ error: 'Invalid currency' });
    }

    // Get amount from pricing
    const amount = PRICING[tier][billingCycle][currency];

    console.log(`💳 Initializing payment: ${tier} ${billingCycle} ${amount/1000} ${currency} for user ${username}`);

    // Initialize payment with Konnect
    const paymentResponse = await konnect.initPayment({
      userId,
      username,
      amount,
      tier,
      billingCycle,
      currency
    });

    // Generate session token for verification
    const sessionToken = generateSessionToken({
      userId,
      username,
      tier,
      billingCycle,
      paymentRef: paymentResponse.paymentRef
    });

    res.json({
      payUrl: paymentResponse.payUrl,
      paymentRef: paymentResponse.paymentRef,
      sessionToken
    });
  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({
      error: 'Failed to initialize payment',
      message: error.message
    });
  }
});

/**
 * GET /api/payments/status/:paymentRef
 * Check payment status
 */
router.get('/status/:paymentRef', authenticateToken, async (req, res) => {
  try {
    const { paymentRef } = req.params;
    const userId = req.user.userId;

    console.log(`🔍 Checking payment status: ${paymentRef} for user ${userId}`);

    // Get payment details from Konnect
    const payment = await konnect.getPaymentDetails(paymentRef);

    res.json({
      status: payment.status,
      amount: payment.amount,
      currency: payment.token,
      completedAt: payment.status === 'completed' ? new Date() : null
    });
  } catch (error) {
    console.error('Payment status check error:', error);
    res.status(500).json({
      error: 'Failed to check payment status',
      message: error.message
    });
  }
});

/**
 * POST /api/payments/webhook
 * Handle Konnect webhook (NO AUTH - Konnect calls this)
 */
router.post('/webhook', async (req, res) => {
  try {
    const { payment_ref } = req.query;

    if (!payment_ref) {
      return res.status(400).json({ error: 'Missing payment_ref' });
    }

    console.log(`🔔 Webhook received for payment: ${payment_ref}`);

    // Get payment details from Konnect
    const payment = await konnect.getPaymentDetails(payment_ref);

    console.log(`Payment status: ${payment.status}`);

    // Just log for now - the frontend will poll for status
    // and update the local session when payment is confirmed

    res.json({ success: true, status: payment.status });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      error: 'Webhook processing failed',
      message: error.message
    });
  }
});
/**
 * POST /api/payments/verify-upgrade
 * Verify payment and return subscription data for session update
 */
router.post('/verify-upgrade', authenticateToken, async (req, res) => {
    try {
      const { paymentRef, sessionToken } = req.body;
      const userId = req.user.userId;

      console.log(`✅ Verifying upgrade for payment: ${paymentRef}`);

      // Verify session token
      const sessionData = require('../utils/session.utils').verifySessionToken(sessionToken);

      if (sessionData.userId !== userId) {
        return res.status(403).json({ error: 'Session mismatch' });
      }

      if (sessionData.paymentRef !== paymentRef) {
        return res.status(403).json({ error: 'Payment reference mismatch' });
      }

      // Get payment status from Konnect
      const payment = await konnect.getPaymentDetails(paymentRef);

      if (payment.status !== 'completed') {
        return res.status(400).json({
          error: 'Payment not completed',
          status: payment.status
        });
      }

      // Calculate subscription dates
      const now = new Date();
      const expiresAt = new Date(now);

      if (sessionData.billingCycle === 'monthly') {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }

      // Return subscription data for session update
      res.json({
        verified: true,
        subscription: {
          tier: sessionData.tier,
          status: 'active',
          startDate: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          billingCycle: sessionData.billingCycle,
          autoRenew: false,
          features: []
        },
        payment: {
          amount: payment.amount,
          currency: payment.token,
          method: payment.transactions[0]?.paymentMethod,
          completedAt: now.toISOString()
        }
      });
    } catch (error) {
      console.error('Verification error:', error);
      res.status(500).json({
        error: 'Verification failed',
        message: error.message
      });
    }
  });

  module.exports = router;