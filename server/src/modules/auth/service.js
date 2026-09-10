const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../database/db');
const config = require('../../config');
const { findByEmail } = require('../../shared/utils/user');
const { ApiError } = require('../../core/ApiError');

/**
 * Guests log in against `users`, but bookings hang off `customers`.
 * Every guest gets a matching customer row (found-or-created here) so
 * the booking flow always has somewhere to attach.
 */
async function findOrCreateCustomer({ name, email }) {
  const existing = await db('customers').whereRaw('LOWER(email) = ?', [email.toLowerCase()]).first();
  if (existing) return existing;
  const [customer] = await db('customers').insert({ name, email }).returning('*');
  return customer;
}

function issueToken(user, customerId) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      roleId: user.role_id ?? null,
      name: user.name,
      customerId: customerId ?? null,
    },
    config.jwtSecret,
    { expiresIn: '8h' }
  );
}

function toPublicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, roleId: user.role_id ?? null };
}

async function register({ name, email, password }) {
  if (!name || !email || !password) {
    throw ApiError.badRequest('Name, email, and password are required');
  }
  if (password.length < 6) {
    throw ApiError.badRequest('Password must be at least 6 characters');
  }

  const existing = await findByEmail(email);
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const password_hash = await bcrypt.hash(password, 10);
  const [user] = await db('users').insert({ name, email, password_hash, role: 'guest' }).returning('*');
  const customer = await findOrCreateCustomer({ name, email });

  return { token: issueToken(user, customer.id), user: toPublicUser(user) };
}

async function login({ email, password }) {
  if (!email || !password) {
    throw ApiError.badRequest('Email and password are required');
  }

  const user = await findByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const customer = user.role === 'guest' ? await findOrCreateCustomer(user) : null;
  return { token: issueToken(user, customer?.id), user: toPublicUser(user) };
}

module.exports = { register, login };
