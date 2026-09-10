const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const controller = require('./controller');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/', controller.list);
router.post('/', controller.create);
router.put('/:id', controller.update);

router.get('/roles', controller.listRoles);
router.get('/permissions', controller.listPermissions);
router.post('/roles', controller.createRole);
router.put('/roles/:id/permissions', controller.updateRolePermissions);

module.exports = router;
