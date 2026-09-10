const bcrypt = require('bcryptjs');
const db = require('../../database/db');
const { ApiError } = require('../../core/ApiError');

async function listAdminUsers() {
  return db('users')
    .leftJoin('roles', 'roles.id', 'users.role_id')
    .select('users.id', 'users.name', 'users.email', 'users.role', 'users.status', 'roles.name as role_name');
}

async function createAdminUser({ name, email, password, roleId }) {
  if (!name || !email || !password) {
    throw ApiError.badRequest('name, email and password are required');
  }

  const [user] = await db('users')
    .insert({ name, email, password_hash: bcrypt.hashSync(password, 10), role: 'admin', role_id: roleId ?? null })
    .returning(['id', 'name', 'email', 'role', 'role_id']);

  return user;
}

async function updateAdminUser(id, { roleId, status }) {
  const [user] = await db('users')
    .where({ id })
    .update({
      ...(roleId !== undefined ? { role_id: roleId } : {}),
      ...(status !== undefined ? { status } : {}),
    })
    .returning(['id', 'name', 'email', 'role', 'role_id', 'status']);

  if (!user) throw ApiError.notFound('Admin user not found');
  return user;
}

async function listRoles() {
  const roles = await db('roles');
  return Promise.all(
    roles.map(async (role) => ({
      ...role,
      permissions: await db('role_permissions')
        .join('permissions', 'permissions.id', 'role_permissions.permission_id')
        .where('role_permissions.role_id', role.id)
        .pluck('permissions.key'),
    }))
  );
}

async function listPermissions() {
  return db('permissions').orderBy('key');
}

async function createRole({ name, description, permissionIds = [] }) {
  if (!name) throw ApiError.badRequest('Role name is required');

  return db.transaction(async (trx) => {
    const [row] = await trx('roles').insert({ name, description }).returning('*');
    if (permissionIds.length) {
      await trx('role_permissions').insert(permissionIds.map((permission_id) => ({ role_id: row.id, permission_id })));
    }
    return row;
  });
}

async function updateRolePermissions(roleId, permissionIds = []) {
  await db.transaction(async (trx) => {
    await trx('role_permissions').where({ role_id: roleId }).del();
    if (permissionIds.length) {
      await trx('role_permissions').insert(permissionIds.map((permission_id) => ({ role_id: roleId, permission_id })));
    }
  });
}

module.exports = {
  listAdminUsers,
  createAdminUser,
  updateAdminUser,
  listRoles,
  listPermissions,
  createRole,
  updateRolePermissions,
};
