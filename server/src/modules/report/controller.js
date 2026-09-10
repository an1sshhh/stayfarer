const { ApiResponse } = require('../../core/ApiResponse');
const reportService = require('./service');

async function revenue(req, res, next) {
  try {
    ApiResponse.success(res, { data: await reportService.getRevenueReport(req.query) });
  } catch (err) {
    next(err);
  }
}

async function bookings(req, res, next) {
  try {
    ApiResponse.success(res, { data: await reportService.getBookingsReport(req.query) });
  } catch (err) {
    next(err);
  }
}

async function hotelPerformance(req, res, next) {
  try {
    ApiResponse.success(res, { data: await reportService.getHotelPerformance() });
  } catch (err) {
    next(err);
  }
}

async function roomPerformance(req, res, next) {
  try {
    ApiResponse.success(res, { data: await reportService.getRoomPerformance() });
  } catch (err) {
    next(err);
  }
}

async function customers(req, res, next) {
  try {
    ApiResponse.success(res, { data: await reportService.getCustomerReport() });
  } catch (err) {
    next(err);
  }
}

async function couponUsage(req, res, next) {
  try {
    ApiResponse.success(res, { data: await reportService.getCouponUsageReport() });
  } catch (err) {
    next(err);
  }
}

async function cancellations(req, res, next) {
  try {
    ApiResponse.success(res, { data: await reportService.getCancellationReport() });
  } catch (err) {
    next(err);
  }
}

module.exports = { revenue, bookings, hotelPerformance, roomPerformance, customers, couponUsage, cancellations };
