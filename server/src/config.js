require('dotenv').config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set');
}
const knexConfig = require('../knexfile');

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET,
  knex: knexConfig,
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },
  // Public website address, for links in queued emails (admin/server renders and sends them).
  siteUrl: (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  // How long a pending booking holds its rooms while the guest pays.
  bookingHoldMinutes: Number(process.env.BOOKING_HOLD_MINUTES) || 15,
};

module.exports = config;
