const { ApiResponse } = require('../../core/ApiResponse');
const { ApiError } = require('../../core/ApiError');
const hotelService = require('./service');

async function search(req, res, next) {
  try {
    ApiResponse.success(res, { data: await hotelService.searchHotels(req.query) });
  } catch (err) {
    next(err);
  }
}

async function suggest(req, res, next) {
  try {
    ApiResponse.success(res, { data: await hotelService.suggestDestinations(req.query.q) });
  } catch (err) {
    next(err);
  }
}

async function destinations(req, res, next) {
  try {
    ApiResponse.success(res, { data: await hotelService.listDestinations() });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    ApiResponse.success(res, { data: await hotelService.getHotelById(req.params.id) });
  } catch (err) {
    next(err);
  }
}

module.exports = { search, suggest, destinations, getById };
