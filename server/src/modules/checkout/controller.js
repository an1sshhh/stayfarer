const { ApiResponse } = require('../../core/ApiResponse');
const bookingService = require('../booking/service');
const checkoutService = require('./service');

async function getConfig(req, res, next) {
  try {
    ApiResponse.success(res, { data: await checkoutService.publicConfig() });
  } catch (err) {
    next(err);
  }
}

async function quote(req, res, next) {
  try {
    ApiResponse.success(res, { data: await bookingService.quoteBooking(req.body, req.user) });
  } catch (err) {
    next(err);
  }
}

async function start(req, res, next) {
  try {
    ApiResponse.created(res, { data: await checkoutService.startCheckout(req.body, req.user) });
  } catch (err) {
    next(err);
  }
}

async function pay(req, res, next) {
  try {
    ApiResponse.success(res, { data: await checkoutService.createPaymentOrder(Number(req.params.id), req.user) });
  } catch (err) {
    next(err);
  }
}

async function verify(req, res, next) {
  try {
    ApiResponse.success(res, { data: await checkoutService.verifyPayment(req.body, req.user) });
  } catch (err) {
    next(err);
  }
}

async function paymentFailed(req, res, next) {
  try {
    await checkoutService.reportPaymentFailure(Number(req.params.id), req.body, req.user);
    ApiResponse.success(res, { data: { recorded: true } });
  } catch (err) {
    next(err);
  }
}

async function webhook(req, res, next) {
  try {
    const data = await checkoutService.handleWebhook(req.rawBody, req.headers['x-razorpay-signature']);
    ApiResponse.success(res, { data });
  } catch (err) {
    next(err);
  }
}

module.exports = { getConfig, quote, start, pay, verify, paymentFailed, webhook };
