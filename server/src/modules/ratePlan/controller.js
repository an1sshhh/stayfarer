const { ApiResponse } = require('../../core/ApiResponse');
const ratePlanService = require('./service');

async function listByRoomType(req, res, next) {
  try {
    ApiResponse.success(res, { data: await ratePlanService.listByRoomType(req.params.roomTypeId) });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const ratePlan = await ratePlanService.createRatePlan(req.params.roomTypeId, req.body);
    ApiResponse.created(res, { data: ratePlan });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    ApiResponse.success(res, { data: await ratePlanService.updateRatePlan(req.params.id, req.body) });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await ratePlanService.deactivateRatePlan(req.params.id);
    ApiResponse.noContent(res);
  } catch (err) {
    next(err);
  }
}

module.exports = { listByRoomType, create, update, remove };
