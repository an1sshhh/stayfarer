const crypto = require('crypto');
const Razorpay = require('razorpay');
const config = require('../../config');
const { ApiError } = require('../../core/ApiError');

let client = null;

function isConfigured() {
  return Boolean(config.razorpay.keyId && config.razorpay.keySecret);
}

/** Lazily built so the server still boots (and serves search) without keys. */
function getClient() {
  if (!isConfigured()) {
    throw ApiError.unavailable('Online payments are not configured yet. Please try again later.');
  }
  if (!client) {
    client = new Razorpay({ key_id: config.razorpay.keyId, key_secret: config.razorpay.keySecret });
  }
  return client;
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

/** Checkout handler signature: HMAC-SHA256(order_id|payment_id, key_secret). */
function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return safeEqual(expected, signature);
}

/** Webhook signature: HMAC-SHA256(raw request body, webhook_secret). */
function verifyWebhookSignature(rawBody, signature) {
  if (!config.razorpay.webhookSecret || !rawBody || !signature) return false;
  const expected = crypto.createHmac('sha256', config.razorpay.webhookSecret).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}

const toPaise = (rupees) => Math.round(Number(rupees) * 100);

module.exports = { isConfigured, getClient, verifyPaymentSignature, verifyWebhookSignature, toPaise };
