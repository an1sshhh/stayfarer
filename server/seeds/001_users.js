const bcrypt = require('bcryptjs');

// Demo account credentials come from env so no credentials live in the repo.
function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set to run seeds`);
  return value;
}

exports.seed = async function (knex) {
  const guestEmail = requireEnv('SEED_GUEST_EMAIL');
  const adminEmail = requireEnv('SEED_ADMIN_EMAIL');
  const guestPassword = requireEnv('SEED_GUEST_PASSWORD');
  const adminPassword = requireEnv('SEED_ADMIN_PASSWORD');

  await knex('users').del();
  await knex('users').insert([
    {
      name: 'Guest User',
      email: guestEmail,
      password_hash: bcrypt.hashSync(guestPassword, 10),
      role: 'guest',
    },
    {
      name: 'Admin User',
      email: adminEmail,
      password_hash: bcrypt.hashSync(adminPassword, 10),
      role: 'admin',
    },
  ]);
};
