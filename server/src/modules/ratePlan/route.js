const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const controller = require('./controller');

const router = express.Router();
const adminOnly = [requireAuth, requireRole('admin')];

// Mounted at '/' in app.js, so auth is per-route rather than router.use().
router.get('/room-types/:roomTypeId/rate-plans', controller.listByRoomType);
router.post('/room-types/:roomTypeId/rate-plans', ...adminOnly, controller.create);

router.put('/rate-plans/:id', ...adminOnly, controller.update);
router.delete('/rate-plans/:id', ...adminOnly, controller.remove);

module.exports = router;
