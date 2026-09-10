const { ApiResponse } = require('../../core/ApiResponse');
const authService = require('./service');

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    ApiResponse.created(res, { message: 'Account created', data: result });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    ApiResponse.success(res, { message: 'Logged in', data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
