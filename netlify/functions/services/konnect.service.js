const axios = require('axios');

class KonnectService {
  constructor() {
    this.apiKey = process.env.KONNECT_API_KEY;
    this.walletId = process.env.KONNECT_WALLET_ID;
    this.mode = process.env.KONNECT_MODE || 'sandbox';

    this.baseURL = this.mode === 'production'
      ? 'https://api.konnect.network/api/v2'
      : 'https://api.preprod.konnect.network/api/v2';

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  async initPayment({ userId, username, amount, tier, billingCycle, currency }) {
    try {
      const orderId = this.generateOrderId(userId);
      const webhookUrl = `${process.env.APP_URL}/.netlify/functions/server/api/payments/webhook`;

      const response = await this.client.post('/payments/init-payment', {
        receiverId: this.walletId,
        amount,
        token: currency,
        type: 'immediate',
        description: `Tasmota ${tier} - ${billingCycle}`,
        acceptedPaymentMethods: ['bank_card', 'wallet', 'e-DINAR', 'flouci'],
        lifespan: 15,
        checkoutForm: true,
        addPaymentFeesToAmount: false,
        firstName: username,
        lastName: '',
        email: `${userId}@tasmota.local`,
        orderId,
        webhook: webhookUrl,
        successUrl: `${process.env.APP_URL}/payment/success`,
        failUrl: `${process.env.APP_URL}/payment/failed`,
        theme: 'dark',
        silentWebhook: false
      });

      return {
        payUrl: response.data.payUrl,
        paymentRef: response.data.paymentRef,
        orderId
      };
    } catch (error) {
      console.error('Konnect init payment error:', error.response?.data || error.message);
      throw new Error('Failed to initialize payment with Konnect');
    }
  }

  async getPaymentDetails(paymentRef) {
    try {
      const response = await this.client.get(`/payments/${paymentRef}`);
      return response.data.payment;
    } catch (error) {
      console.error('Konnect get payment error:', error.response?.data || error.message);
      throw new Error('Failed to get payment details');
    }
  }

  generateOrderId(userId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `TAS-${userId.substring(0, 8)}-${timestamp}-${random}`;
  }
}

module.exports = KonnectService;