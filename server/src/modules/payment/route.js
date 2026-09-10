const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const controller = require('./controller');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/:id/refunds', controller.createRefund);
router.put('/refunds/:id/status', controller.updateRefundStatus);

module.exports = router;
