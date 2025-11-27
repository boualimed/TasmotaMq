const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const paymentRoutes = require('./routes/payment.routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Payment routes
app.use('/api/payments', paymentRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Export as serverless function
exports.handler = serverless(app);