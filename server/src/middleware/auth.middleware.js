const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../database/db');
const { ApiError } = require('../core/ApiError');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Missing or invalid Authorization header'));
  }

  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch (err) {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) return next(ApiError.forbidden());
    next();
  };
}

/**
 * Permission-based guard, layered on top of the legacy role check.
 * A plain `role: 'admin'` JWT (no role_id) is treated as having every
 * permission, so existing admin logins keep working unchanged.
 */
function requirePermission(key) {
  return async (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (req.user.role === 'admin' && !req.user.roleId) return next();
    if (!req.user.roleId) return next(ApiError.forbidden());

    const hasPermission = await db('role_permissions')
      .join('permissions', 'permissions.id', 'role_permissions.permission_id')
      .where('role_permissions.role_id', req.user.roleId)
      .andWhere('permissions.key', key)
      .first();

    if (!hasPermission) return next(ApiError.forbidden());
    next();
  };
}

module.exports = { requireAuth, requireRole, requirePermission };
