const { ApiResponse } = require('../../core/ApiResponse');
const dashboardService = require('./service');

async function ping(req, res) {
  ApiResponse.success(res, { message: 'pong from admin-only route' });
}

async function stats(req, res, next) {
  try {
    ApiResponse.success(res, { data: await dashboardService.getStats() });
  } catch (err) {
    next(err);
  }
}

module.exports = { ping, stats };
