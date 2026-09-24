const { ApiResponse } = require('../../core/ApiResponse');
const bookingService = require('./service');

async function listMine(req, res, next) {
  try {
    ApiResponse.success(res, { data: await bookingService.listMyBookings(req.user.customerId) });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    ApiResponse.success(res, { data: await bookingService.getBookingById(req.params.id, req.user) });
  } catch (err) {
    next(err);
  }
}

module.exports = { listMine, getById };
