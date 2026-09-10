const db = require('../../database/db');

function findByEmail(email) {
  return db('users').whereRaw('LOWER(email) = ?', [email.toLowerCase()]).first();
}

function findById(id) {
  return db('users').where({ id }).first();
}

module.exports = { findByEmail, findById };
