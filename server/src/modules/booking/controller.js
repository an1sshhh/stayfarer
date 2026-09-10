const { ApiResponse } = require('../../core/ApiResponse');
const bookingService = require('./service');

async function list(req, res, next) {
  try {
    ApiResponse.success(res, { data: await bookingService.listBookings(req.query) });
  } catch (err) {
    next(err);
  }
}

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

async function create(req, res, next) {
  try {
    const booking = await bookingService.createBooking(req.body, req.user);
    ApiResponse.created(res, { data: booking });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const booking = await bookingService.updateBookingStatus(req.params.id, req.body.status, req.user.sub);
    ApiResponse.success(res, { data: booking });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, listMine, getById, create, updateStatus };
