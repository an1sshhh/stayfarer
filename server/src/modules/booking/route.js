const express = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const controller = require('./controller');

const router = express.Router();

// Guests create bookings through /api/checkout; these are their read-only views.
// Must come before /:id so "mine" isn't captured as an id param.
router.get('/mine', requireAuth, controller.listMine);
router.get('/:id', requireAuth, controller.getById);

module.exports = router;
