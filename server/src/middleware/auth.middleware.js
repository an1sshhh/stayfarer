const jwt = require('jsonwebtoken');
const config = require('../config');
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

/** Attaches req.user when a valid token is sent, but never rejects the request. */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.split(' ')[1], config.jwtSecret);
    } catch {
      // Expired/invalid tokens are treated as anonymous here.
    }
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
