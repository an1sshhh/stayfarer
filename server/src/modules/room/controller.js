const { ApiResponse } = require('../../core/ApiResponse');
const { ApiError } = require('../../core/ApiError');
const roomService = require('./service');

async function listOffers(req, res, next) {
  try {
    const { checkIn, checkOut, guests, rooms } = req.query;
    const data = await roomService.listRoomOffers(req.params.hotelId, {
      checkIn: checkIn || undefined,
      checkOut: checkOut || undefined,
      guests: guests || undefined,
      rooms: rooms || undefined,
    });
    ApiResponse.success(res, { data });
  } catch (err) {
    next(err);
  }
}

module.exports = { listOffers };
