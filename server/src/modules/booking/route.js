const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const controller = require('./controller');

const router = express.Router();

router.get('/', requireAuth, requireRole('admin'), controller.list);

// Must come before /:id so "mine" isn't captured as an id param.
router.get('/mine', requireAuth, controller.listMine);
router.get('/:id', requireAuth, controller.getById);
router.post('/', requireAuth, controller.create);
router.put('/:id/status', requireAuth, requireRole('admin'), controller.updateStatus);

module.exports = router;
