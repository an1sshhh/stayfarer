const { ApiResponse } = require('../../core/ApiResponse');
const adminUserService = require('./service');

async function list(req, res, next) {
  try {
    ApiResponse.success(res, { data: await adminUserService.listAdminUsers() });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const user = await adminUserService.createAdminUser(req.body);
    ApiResponse.created(res, { data: user });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    ApiResponse.success(res, { data: await adminUserService.updateAdminUser(req.params.id, req.body) });
  } catch (err) {
    next(err);
  }
}

async function listRoles(req, res, next) {
  try {
    ApiResponse.success(res, { data: await adminUserService.listRoles() });
  } catch (err) {
    next(err);
  }
}

async function listPermissions(req, res, next) {
  try {
    ApiResponse.success(res, { data: await adminUserService.listPermissions() });
  } catch (err) {
    next(err);
  }
}

async function createRole(req, res, next) {
  try {
    const role = await adminUserService.createRole(req.body);
    ApiResponse.created(res, { data: role });
  } catch (err) {
    next(err);
  }
}

async function updateRolePermissions(req, res, next) {
  try {
    await adminUserService.updateRolePermissions(req.params.id, req.body.permissionIds ?? []);
    ApiResponse.noContent(res);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, listRoles, listPermissions, createRole, updateRolePermissions };
