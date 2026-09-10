require('dotenv').config();
const knexConfig = require('../knexfile');

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET,
  knex: knexConfig,
};

module.exports = config;
