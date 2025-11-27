const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SESSION_SECRET = process.env.SESSION_SECRET || 'session-secret-change-in-production';

/**
 * Generate session token for payment verification
 */
function generateSessionToken(data) {
  return jwt.sign(data, SESSION_SECRET, { expiresIn: '1h' });
}

/**
 * Verify session token
 */
function verifySessionToken(token) {
  try {
    return jwt.verify(token, SESSION_SECRET);
  } catch (error) {
    throw new Error('Invalid session token');
  }
}

/**
 * Generate JWT for user authentication
 */
function generateUserToken(userId, username) {
  return jwt.sign(
    { userId, username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = {
  generateSessionToken,
  verifySessionToken,
  generateUserToken
};