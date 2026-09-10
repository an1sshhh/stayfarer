const express = require('express');
const controller = require('./controller');

const router = express.Router();

// NOTE: matches original behavior — this resource has no auth guard.
router.post('/', controller.create);
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.put('/:id/status', controller.updateStatus);

module.exports = router;
