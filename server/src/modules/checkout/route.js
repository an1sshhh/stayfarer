const express = require('express');
const { requireAuth, optionalAuth } = require('../../middleware/auth.middleware');
const controller = require('./controller');

const router = express.Router();

router.get('/config', controller.getConfig);
// Razorpay calls this server-to-server; authenticity comes from the HMAC signature, not a JWT.
router.post('/webhooks/razorpay', controller.webhook);

// Anonymous visitors can review price + policy; a signed-in guest also gets per-customer coupon checks.
router.post('/quote', optionalAuth, controller.quote);
router.post('/bookings', requireAuth, controller.start);
router.post('/bookings/:id/pay', requireAuth, controller.pay);
router.post('/bookings/:id/payment-failed', requireAuth, controller.paymentFailed);
router.post('/verify', requireAuth, controller.verify);

module.exports = router;
